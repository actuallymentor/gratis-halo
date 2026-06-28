import { now_iso } from '../modules/dates.js'
import { COOKIE_NAMES, clear_cookie, create_signed_cookie, read_signed_cookie } from './cookies.js'
import { first_row } from './db.js'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * Creates a Halo session cookie.
 * @param {Request} request - Incoming request.
 * @param {Object} options - Session options.
 * @returns {Promise<string>} Serialized session cookie.
 */
export async function create_session_cookie( request, { env, user_id } ) {

    return create_signed_cookie( request, COOKIE_NAMES.session, {
        user_id,
        expires_at: new Date( Date.now() +  SESSION_MAX_AGE_SECONDS * 1000  ).toISOString(),
    }, {
        secret: env.SESSION_SECRET,
        max_age: SESSION_MAX_AGE_SECONDS,
    } )
}

/**
 * Clears the Halo session cookie.
 * @param {Request} request - Incoming request.
 * @returns {string} Deletion cookie.
 */
export function clear_session_cookie( request ) {

    return clear_cookie( request, COOKIE_NAMES.session )
}

/**
 * Reads the authenticated session payload.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Object|null>} Session payload.
 */
export async function read_session( request, env ) {

    const payload = await read_signed_cookie( request, COOKIE_NAMES.session, env.SESSION_SECRET )

    if( !payload?.user_id || !payload?.expires_at ) return null
    if( payload.expires_at <= now_iso() ) return null

    return payload
}

/**
 * Reads the authenticated user.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Object|null>} User row.
 */
export async function get_authenticated_user( request, env ) {

    const session = await read_session( request, env )

    if( !session ) return null

    return first_row( env.DB, `
        SELECT id, oura_user_id, email, created_at, updated_at, last_login_at
        FROM users
        WHERE id = ?
    `, [ session.user_id ] )
}

/**
 * Requires an authenticated user.
 * @param {Request} request - Incoming request.
 * @param {Object} env - Worker environment.
 * @returns {Promise<Object>} User row.
 */
export async function require_user( request, env ) {

    const user = await get_authenticated_user( request, env )

    if( !user ) throw new Error( `Authentication required` )

    return user
}

