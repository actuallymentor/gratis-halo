import { log } from 'mentie/modules/logging.js'
import { all_rows } from './db.js'
import { build_dashboard } from './dashboard.js'
import { timing_safe_equal } from './crypto.js'
import { clear_cookie, COOKIE_NAMES } from './cookies.js'
import { error_response, ok_response, read_json, redirect_response, require_method, with_cookies } from './http.js'
import {
    create_oura_oauth_start,
    create_pre_auth_cookie,
    get_invite_ip_hash,
    handle_oura_callback,
    is_invite_limited,
    read_pre_auth_cookie,
    record_invite_attempt,
    start_oura_auth,
    sync_oura_sleep,
} from './oura.js'
import {
    complete_pvt_session,
    create_pvt_session,
    get_pvt_history,
    invalidate_pvt_session,
    store_pvt_trials,
} from './pvt.js'
import { clear_session_cookie, get_authenticated_user, require_user } from './session.js'

/**
 * Converts thrown errors into stable API responses.
 * @param {Error} error - Thrown error.
 * @returns {Response} API error response.
 */
export function response_from_error( error ) {

    if( error.message === `Authentication required` ) {
        return error_response( `unauthenticated`, `Sign in with Oura to continue.`, { status: 401 } )
    }

    if( error.message === `Method not allowed` ) {
        return error_response( `method_not_allowed`, `That method is not supported here.`, { status: 405 } )
    }

    if( error.message === `Invalid JSON body` ) {
        return error_response( `invalid_json`, `The request body is not valid JSON.`, { status: 400 } )
    }

    log.error( `Worker request failed`, error )

    return error_response( `server_error`, error.message || `Halo hit an unexpected error.`, { status: 500 } )
}

/**
 * Handles invite verification.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Response>} API response.
 */
export async function handle_invite_verify( request, env ) {

    require_method( request, `POST` )

    const payload = await read_json( request )
    const code = `${ payload.code || `` }`.trim()
    const ip_hash = await get_invite_ip_hash( request, env )
    const limited = await is_invite_limited( { env, ip_hash } )

    if( limited ) return error_response( `rate_limited`, `Too many invite attempts. Try again later.`, { status: 429 } )

    const success = timing_safe_equal( code, env.INVITE_CODE )

    await record_invite_attempt( { env, ip_hash, success } )

    if( !success ) return error_response( `invalid_invite`, `That invite code is not valid.`, { status: 403 } )

    const pre_auth_cookie = await create_pre_auth_cookie( request, env )
    const { start_url, state_cookie } = await create_oura_oauth_start( { env, request } )

    return with_cookies( ok_response( {
        can_start_oauth: true,
        start_url,
    } ), [ pre_auth_cookie, state_cookie ] )
}

/**
 * Starts Oura OAuth from a JSON API request.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Response>} API response.
 */
export async function handle_oura_start_api( request, env ) {

    require_method( request, `POST` )

    const pre_auth = await read_pre_auth_cookie( request, env )

    if( !pre_auth ) {
        return error_response( `invite_required`, `Enter the invite code again before connecting Oura.`, { status: 401 } )
    }

    const { start_url, state_cookie } = await create_oura_oauth_start( { env, request } )

    return with_cookies( ok_response( {
        start_url,
    } ), [ state_cookie ] )
}

/**
 * Handles authenticated API routes.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Response>} API response.
 */
export async function handle_api_request( request, env ) {

    const url = new URL( request.url )
    const path = url.pathname

    try {
        if( path === `/api/me` ) {
            require_method( request, `GET` )

            const user = await get_authenticated_user( request, env )

            return ok_response( {
                authenticated: Boolean( user ),
                user,
            } )
        }

        if( path === `/api/invite/verify` ) return handle_invite_verify( request, env )
        if( path === `/api/oura/start` ) return handle_oura_start_api( request, env )

        if( path === `/api/logout` ) {
            require_method( request, `POST` )

            return with_cookies( ok_response( { logged_out: true } ), [
                clear_session_cookie( request ),
                clear_cookie( request, COOKIE_NAMES.pre_auth ),
                clear_cookie( request, COOKIE_NAMES.oauth_state ),
            ] )
        }

        const user = await require_user( request, env )

        if( path === `/api/oura/sync` ) {
            require_method( request, `POST` )

            return ok_response( await sync_oura_sleep( { env, user_id: user.id } ) )
        }

        if( path === `/api/dashboard` ) {
            require_method( request, `GET` )

            return ok_response( await build_dashboard( { env, user } ) )
        }

        if( path === `/api/hrv/history` ) {
            require_method( request, `GET` )

            return ok_response( {
                nights: await all_rows( env.DB, `
                    SELECT *
                    FROM oura_sleep_nights
                    WHERE user_id = ?
                    ORDER BY day DESC
                    LIMIT 430
                `, [ user.id ] ),
            } )
        }

        if( path === `/api/pvt/sessions` ) {
            require_method( request, `POST` )

            return ok_response( {
                session: await create_pvt_session( {
                    env,
                    user_id: user.id,
                    payload: await read_json( request ),
                } ),
            }, { status: 201 } )
        }

        const trials_match = path.match( /^\/api\/pvt\/sessions\/([^/]+)\/trials$/ )

        if( trials_match ) {
            require_method( request, `POST` )

            const payload = await read_json( request )
            const trials = Array.isArray( payload.trials ) ? payload.trials : [ payload ]

            await store_pvt_trials( {
                env,
                user_id: user.id,
                session_id: trials_match[ 1 ],
                trials,
            } )

            return ok_response( { stored: trials.length } )
        }

        const complete_match = path.match( /^\/api\/pvt\/sessions\/([^/]+)\/complete$/ )

        if( complete_match ) {
            require_method( request, `POST` )

            const payload = await read_json( request )

            return ok_response( await complete_pvt_session( {
                env,
                user_id: user.id,
                session_id: complete_match[ 1 ],
                trials: payload.trials || null,
            } ) )
        }

        const invalidate_match = path.match( /^\/api\/pvt\/sessions\/([^/]+)\/invalidate$/ )

        if( invalidate_match ) {
            require_method( request, `POST` )

            const payload = await read_json( request )

            return ok_response( {
                session: await invalidate_pvt_session( {
                    env,
                    user_id: user.id,
                    session_id: invalidate_match[ 1 ],
                    reason: payload.reason,
                } ),
            } )
        }

        if( path === `/api/pvt/history` ) {
            require_method( request, `GET` )

            return ok_response( {
                sessions: await get_pvt_history( { env, user_id: user.id } ),
            } )
        }

        return error_response( `not_found`, `That API route does not exist.`, { status: 404 } )
    } catch ( error ) {
        return response_from_error( error )
    }
}

/**
 * Handles all Worker requests.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Response>} Response.
 */
export async function handle_request( request, env ) {

    const url = new URL( request.url )

    if( url.pathname.startsWith( `/api/` ) ) return handle_api_request( request, env )
    if( url.pathname === `/auth/oura/start` ) return start_oura_auth( request, env )
    if( url.pathname === `/auth/oura/callback` ) return handle_oura_callback( request, env )
    if( url.pathname === `/logout` ) {
        return with_cookies( redirect_response( `/login` ), [
            clear_session_cookie( request ),
            clear_cookie( request, COOKIE_NAMES.pre_auth ),
            clear_cookie( request, COOKIE_NAMES.oauth_state ),
        ] )
    }

    if( env.ASSETS ) return env.ASSETS.fetch( request )

    return error_response( `not_found`, `Halo could not find that route.`, { status: 404 } )
}

export default {
    /**
     * Cloudflare Worker fetch handler.
     * @param {Request} request - Incoming request.
     * @param {Object} env - Worker environment.
     * @returns {Promise<Response>} Response.
     */
    fetch( request, env ) {

        return handle_request( request, env )
    },
}
