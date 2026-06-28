import { add_calendar_days, now_iso, to_yyyy_mm_dd } from '../modules/dates.js'
import { choose_long_sleep_records, compute_max_sleep_hrv, duration_to_seconds } from '../modules/hrv.js'
import { COOKIE_NAMES, clear_cookie, create_signed_cookie, read_signed_cookie } from './cookies.js'
import { first_row, new_id, run_query } from './db.js'
import { secret_hash } from './crypto.js'
import { redirect_response, with_cookies } from './http.js'
import { create_session_cookie } from './session.js'

const OURA_AUTHORIZE_URL = `https://cloud.ouraring.com/oauth/authorize`
const OURA_TOKEN_URL = `https://api.ouraring.com/oauth/token`
const OURA_PERSONAL_INFO_URL = `https://api.ouraring.com/v2/usercollection/personal_info`
const OURA_SLEEP_URL = `https://api.ouraring.com/v2/usercollection/sleep`
const PRE_AUTH_MAX_AGE_SECONDS = 10 * 60
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60
const INVITE_LIMIT_WINDOW_MINUTES = 15
const INVITE_LIMIT_ATTEMPTS = 10

/**
 * Builds the redirect URI matching the current Halo origin.
 * @param {Request} request - Incoming request.
 * @returns {string} Redirect URI.
 */
export function get_redirect_uri( request ) {

    const url = new URL( request.url )

    return `${ url.origin }/auth/oura/callback`
}

/**
 * Builds an Oura OAuth authorization URL.
 * @param {Object} options - URL options.
 * @returns {string} Oura authorize URL.
 */
export function build_oura_authorize_url( { env, request, state } ) {

    const url = new URL( OURA_AUTHORIZE_URL )

    url.searchParams.set( `response_type`, `code` )
    url.searchParams.set( `client_id`, env.OURA_CLIENT_ID )
    url.searchParams.set( `redirect_uri`, get_redirect_uri( request ) )
    url.searchParams.set( `scope`, `daily email` )
    url.searchParams.set( `state`, state )

    return url.toString()
}

/**
 * Creates an invite pre-auth cookie.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<string>} Serialized cookie.
 */
export async function create_pre_auth_cookie( request, env ) {

    return create_signed_cookie( request, COOKIE_NAMES.pre_auth, {
        authorized: true,
        expires_at: new Date( Date.now() +  PRE_AUTH_MAX_AGE_SECONDS * 1000  ).toISOString(),
    }, {
        secret: env.SESSION_SECRET,
        max_age: PRE_AUTH_MAX_AGE_SECONDS,
    } )
}

/**
 * Reads an invite pre-auth cookie.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Object|null>} Pre-auth payload.
 */
export async function read_pre_auth_cookie( request, env ) {

    const payload = await read_signed_cookie( request, COOKIE_NAMES.pre_auth, env.SESSION_SECRET )

    if( !payload?.authorized || payload.expires_at <= now_iso() ) return null

    return payload
}

/**
 * Returns a privacy-minimized IP key for invite rate limiting.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<string>} Secret hash.
 */
export async function get_invite_ip_hash( request, env ) {

    const raw_ip = request.headers.get( `cf-connecting-ip` )
        || request.headers.get( `x-forwarded-for` )
        || `local`

    return secret_hash( raw_ip.split( `,` )[ 0 ].trim(), env.SESSION_SECRET )
}

/**
 * Records an invite attempt.
 * @param {Object} options - Attempt options.
 * @returns {Promise<void>}
 */
export async function record_invite_attempt( { env, ip_hash, success } ) {

    await run_query( env.DB, `
        INSERT INTO invite_attempts ( id, ip_hash, attempted_at, success )
        VALUES ( ?, ?, ?, ? )
    `, [ new_id(), ip_hash, now_iso(), success ? 1 : 0 ] )
}

/**
 * Checks whether an invite attempt should be rate limited.
 * @param {Object} options - Rate-limit options.
 * @returns {Promise<boolean>} True when blocked.
 */
export async function is_invite_limited( { env, ip_hash } ) {

    const cutoff = new Date( Date.now() -  INVITE_LIMIT_WINDOW_MINUTES * 60 * 1000  ).toISOString()
    const row = await first_row( env.DB, `
        SELECT count(*) AS attempts
        FROM invite_attempts
        WHERE ip_hash = ? AND attempted_at >= ? AND success = 0
    `, [ ip_hash, cutoff ] )

    return Number( row?.attempts || 0 ) >= INVITE_LIMIT_ATTEMPTS
}

/**
 * Starts the Oura OAuth redirect after invite verification.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Response>} Redirect response.
 */
export async function start_oura_auth( request, env ) {

    const pre_auth = await read_pre_auth_cookie( request, env )

    if( !pre_auth ) return redirect_response( `/login?error=invite_required` )

    const state = crypto.randomUUID()
    const state_cookie = await create_signed_cookie( request, COOKIE_NAMES.oauth_state, {
        state,
        expires_at: new Date( Date.now() +  OAUTH_STATE_MAX_AGE_SECONDS * 1000  ).toISOString(),
    }, {
        secret: env.SESSION_SECRET,
        max_age: OAUTH_STATE_MAX_AGE_SECONDS,
    } )

    return with_cookies( redirect_response( build_oura_authorize_url( { env, request, state } ) ), [ state_cookie ] )
}

/**
 * Exchanges an Oura authorization code for tokens.
 * @param {Object} options - Exchange options.
 * @returns {Promise<Object>} Token payload.
 */
export async function exchange_oura_code( { env, request, code } ) {

    const body = new URLSearchParams( {
        grant_type: `authorization_code`,
        code,
        redirect_uri: get_redirect_uri( request ),
        client_id: env.OURA_CLIENT_ID,
        client_secret: env.OURA_CLIENT_SECRET,
    } )
    const response = await fetch( OURA_TOKEN_URL, {
        method: `POST`,
        headers: {
            'content-type': `application/x-www-form-urlencoded`,
        },
        body,
    } )
    const payload = await response.json().catch( () => ( {} ) )

    if( !response.ok ) throw new Error( payload.error_description || payload.error || `Oura token exchange failed` )

    return payload
}

/**
 * Fetches the authenticated Oura user's identity.
 * @param {string} access_token - Oura access token.
 * @returns {Promise<Object>} Identity payload.
 */
export async function fetch_oura_identity( access_token ) {

    const response = await fetch( OURA_PERSONAL_INFO_URL, {
        headers: {
            authorization: `Bearer ${ access_token }`,
        },
    } )
    const payload = await response.json().catch( () => ( {} ) )

    if( !response.ok ) throw new Error( payload?.message || `Oura identity fetch failed` )

    return payload
}

/**
 * Upserts a Halo user from Oura identity.
 * @param {Object} options - Upsert options.
 * @returns {Promise<Object>} User row.
 */
export async function upsert_user_from_oura( { env, identity } ) {

    const oura_user_id = identity.id || identity.oura_user_id || null
    const email = identity.email ? identity.email.toLowerCase().trim() : null

    if( !oura_user_id && !email ) throw new Error( `Oura did not return a stable account id or email` )

    const existing_user = oura_user_id
        ? await first_row( env.DB, `SELECT * FROM users WHERE oura_user_id = ?`, [ oura_user_id ] )
        : await first_row( env.DB, `SELECT * FROM users WHERE lower( email ) = ?`, [ email ] )
    const email_user = !existing_user && email
        ? await first_row( env.DB, `SELECT * FROM users WHERE lower( email ) = ?`, [ email ] )
        : null
    const user = existing_user || email_user
    const timestamp = now_iso()

    if( user ) {
        await run_query( env.DB, `
            UPDATE users
            SET oura_user_id = coalesce( ?, oura_user_id ),
                email = coalesce( ?, email ),
                updated_at = ?,
                last_login_at = ?
            WHERE id = ?
        `, [ oura_user_id, email, timestamp, timestamp, user.id ] )

        return first_row( env.DB, `SELECT * FROM users WHERE id = ?`, [ user.id ] )
    }

    const id = new_id()

    await run_query( env.DB, `
        INSERT INTO users ( id, oura_user_id, email, created_at, updated_at, last_login_at )
        VALUES ( ?, ?, ?, ?, ?, ? )
    `, [ id, oura_user_id, email, timestamp, timestamp, timestamp ] )

    return first_row( env.DB, `SELECT * FROM users WHERE id = ?`, [ id ] )
}

/**
 * Upserts Oura token storage for a user.
 * @param {Object} options - Token options.
 * @returns {Promise<void>}
 */
export async function upsert_oura_connection( { env, user_id, tokens } ) {

    const timestamp = now_iso()
    const expires_at = new Date( Date.now() +  Number( tokens.expires_in || 0 ) * 1000  ).toISOString()
    const existing_connection = await first_row( env.DB, `SELECT id FROM oura_connections WHERE user_id = ?`, [ user_id ] )
    const values = [
        tokens.access_token,
        expires_at,
        tokens.refresh_token,
        tokens.scope || tokens.granted_scopes || `daily email`,
        0,
        timestamp,
        user_id,
    ]

    if( existing_connection ) {
        await run_query( env.DB, `
            UPDATE oura_connections
            SET access_token = ?,
                access_token_expires_at = ?,
                refresh_token = ?,
                granted_scopes = ?,
                needs_reauth = ?,
                updated_at = ?
            WHERE user_id = ?
        `, values )

        return
    }

    await run_query( env.DB, `
        INSERT INTO oura_connections (
            id, user_id, access_token, access_token_expires_at, refresh_token,
            granted_scopes, needs_reauth, created_at, updated_at
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ? )
    `, [
        new_id(),
        user_id,
        tokens.access_token,
        expires_at,
        tokens.refresh_token,
        tokens.scope || tokens.granted_scopes || `daily email`,
        0,
        timestamp,
        timestamp,
    ] )
}

/**
 * Completes Oura OAuth and creates a Halo session.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Response>} Redirect response.
 */
export async function handle_oura_callback( request, env ) {

    const url = new URL( request.url )
    const state_payload = await read_signed_cookie( request, COOKIE_NAMES.oauth_state, env.SESSION_SECRET )
    const expected_state = state_payload?.state
    const returned_state = url.searchParams.get( `state` )
    const code = url.searchParams.get( `code` )
    const oauth_error = url.searchParams.get( `error` )

    if( oauth_error ) return redirect_response( `/login?error=${ encodeURIComponent( oauth_error ) }` )
    if( !code || !expected_state || expected_state !== returned_state || state_payload.expires_at <= now_iso() ) {
        return redirect_response( `/login?error=invalid_oauth_state` )
    }

    const tokens = await exchange_oura_code( { env, request, code } )
    const identity = await fetch_oura_identity( tokens.access_token )
    const user = await upsert_user_from_oura( { env, identity } )

    await upsert_oura_connection( { env, user_id: user.id, tokens } )

    const session_cookie = await create_session_cookie( request, { env, user_id: user.id } )

    return with_cookies( redirect_response( `/` ), [
        session_cookie,
        clear_cookie( request, COOKIE_NAMES.pre_auth ),
        clear_cookie( request, COOKIE_NAMES.oauth_state ),
    ] )
}

/**
 * Refreshes a single-use Oura refresh token when needed.
 * @param {Object} options - Refresh options.
 * @returns {Promise<Object>} Fresh connection.
 */
export async function ensure_fresh_oura_connection( { env, user_id } ) {

    const connection = await first_row( env.DB, `SELECT * FROM oura_connections WHERE user_id = ?`, [ user_id ] )

    if( !connection ) return null
    if( connection.needs_reauth ) return connection

    const expires_soon = new Date( connection.access_token_expires_at ).getTime() <= Date.now() + 60_000

    if( !expires_soon ) return connection

    const body = new URLSearchParams( {
        grant_type: `refresh_token`,
        refresh_token: connection.refresh_token,
        client_id: env.OURA_CLIENT_ID,
        client_secret: env.OURA_CLIENT_SECRET,
    } )
    const response = await fetch( OURA_TOKEN_URL, {
        method: `POST`,
        headers: {
            'content-type': `application/x-www-form-urlencoded`,
        },
        body,
    } )
    const payload = await response.json().catch( () => ( {} ) )

    if( !response.ok ) {
        await run_query( env.DB, `
            UPDATE oura_connections
            SET needs_reauth = 1, updated_at = ?
            WHERE user_id = ?
        `, [ now_iso(), user_id ] )

        return {
            ...connection,
            needs_reauth: 1,
        }
    }

    await upsert_oura_connection( { env, user_id, tokens: payload } )

    return first_row( env.DB, `SELECT * FROM oura_connections WHERE user_id = ?`, [ user_id ] )
}

/**
 * Fetches Oura sleep pages.
 * @param {Object} options - Fetch options.
 * @returns {Promise<Object[]>} Sleep records.
 */
export async function fetch_oura_sleep_records( { connection, start_date, end_date } ) {

    const records = []
    let next_token = null

    do {
        const url = new URL( OURA_SLEEP_URL )

        url.searchParams.set( `start_date`, start_date )
        url.searchParams.set( `end_date`, end_date )
        if( next_token ) url.searchParams.set( `next_token`, next_token )

        const response = await fetch( url, {
            headers: {
                authorization: `Bearer ${ connection.access_token }`,
            },
        } )
        const payload = await response.json().catch( () => ( {} ) )

        if( response.status === 429 ) throw new Error( `Oura rate limit reached; retry later` )
        if( !response.ok ) throw new Error( payload?.message || `Oura sleep sync failed` )

        records.push( ... payload.data || []  )
        next_token = payload.next_token || null
    } while( next_token )

    return records
}

/**
 * Stores one Oura long-sleep record.
 * @param {Object} options - Store options.
 * @returns {Promise<void>}
 */
export async function store_sleep_record( { env, user_id, sleep } ) {

    const timestamp = now_iso()
    const { max_sleep_hrv_ms, max_hrv_filter_quality } = compute_max_sleep_hrv( sleep )
    const hrv = sleep.hrv || {}

    await run_query( env.DB, `
        INSERT INTO oura_sleep_nights (
            id, user_id, oura_sleep_id, day, type, bedtime_start, bedtime_end,
            time_in_bed_seconds, average_hrv_ms, max_sleep_hrv_ms,
            max_hrv_filter_quality, hrv_sample_interval_seconds, hrv_sample_start,
            hrv_items_json, sleep_phase_5_min, sleep_algorithm_version, synced_at
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
        ON CONFLICT ( user_id, oura_sleep_id ) DO UPDATE SET
            day = excluded.day,
            type = excluded.type,
            bedtime_start = excluded.bedtime_start,
            bedtime_end = excluded.bedtime_end,
            time_in_bed_seconds = excluded.time_in_bed_seconds,
            average_hrv_ms = excluded.average_hrv_ms,
            max_sleep_hrv_ms = excluded.max_sleep_hrv_ms,
            max_hrv_filter_quality = excluded.max_hrv_filter_quality,
            hrv_sample_interval_seconds = excluded.hrv_sample_interval_seconds,
            hrv_sample_start = excluded.hrv_sample_start,
            hrv_items_json = excluded.hrv_items_json,
            sleep_phase_5_min = excluded.sleep_phase_5_min,
            sleep_algorithm_version = excluded.sleep_algorithm_version,
            synced_at = excluded.synced_at
    `, [
        new_id(),
        user_id,
        sleep.id,
        sleep.day,
        sleep.type,
        sleep.bedtime_start,
        sleep.bedtime_end,
        duration_to_seconds( sleep.time_in_bed ),
        sleep.average_hrv ?? null,
        max_sleep_hrv_ms,
        max_hrv_filter_quality,
        hrv.interval ?? null,
        hrv.timestamp ?? null,
        JSON.stringify( hrv.items || [] ),
        sleep.sleep_phase_5_min || sleep.app_sleep_phase_5_min || null,
        sleep.sleep_algorithm_version || sleep.algorithm_version || null,
        timestamp,
    ] )
}

/**
 * Syncs Oura sleep data for a user.
 * @param {Object} options - Sync options.
 * @returns {Promise<Object>} Sync summary.
 */
export async function sync_oura_sleep( { env, user_id } ) {

    const started_at = now_iso()
    const sync_id = new_id()

    await run_query( env.DB, `
        INSERT INTO sync_events ( id, user_id, source, started_at, status )
        VALUES ( ?, ?, ?, ?, ? )
    `, [ sync_id, user_id, `oura_sleep`, started_at, `running` ] )

    try {
        const connection = await ensure_fresh_oura_connection( { env, user_id } )

        if( !connection || connection.needs_reauth ) throw new Error( `Oura needs re-authentication` )

        const latest_night = await first_row( env.DB, `
            SELECT max( day ) AS latest_day
            FROM oura_sleep_nights
            WHERE user_id = ?
        `, [ user_id ] )
        const end_date = to_yyyy_mm_dd()
        const start_date = latest_night?.latest_day
            ? add_calendar_days( latest_night.latest_day, -3 )
            : add_calendar_days( end_date, -400 )
        const raw_records = await fetch_oura_sleep_records( {
            connection,
            start_date,
            end_date,
        } )
        const sleep_records = choose_long_sleep_records( raw_records )

        await Promise.all( sleep_records.map( sleep => store_sleep_record( { env, user_id, sleep } ) ) )

        await run_query( env.DB, `
            UPDATE sync_events
            SET finished_at = ?, status = ?, records_seen = ?, records_written = ?
            WHERE id = ?
        `, [ now_iso(), `success`, raw_records.length, sleep_records.length, sync_id ] )

        return {
            status: `success`,
            started_at,
            finished_at: now_iso(),
            records_seen: raw_records.length,
            records_written: sleep_records.length,
        }
    } catch ( error ) {
        await run_query( env.DB, `
            UPDATE sync_events
            SET finished_at = ?, status = ?, error_message = ?
            WHERE id = ?
        `, [ now_iso(), `error`, error.message, sync_id ] )

        return {
            status: `error`,
            started_at,
            finished_at: now_iso(),
            error_message: error.message,
        }
    }
}

