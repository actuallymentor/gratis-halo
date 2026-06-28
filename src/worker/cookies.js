import { now_iso } from '../modules/dates.js'
import { sign_payload, verify_signed_payload } from './crypto.js'

export const COOKIE_NAMES = {
    session: `halo_session`,
    pre_auth: `halo_pre_auth`,
    oauth_state: `halo_oura_state`,
}

/**
 * Parses request cookies into a plain object.
 * @param {Request} request - Incoming request.
 * @returns {Object} Cookie map.
 */
export function parse_cookies( request ) {

    const header = request.headers.get( `cookie` ) || ``

    return header
        .split( `;` )
        .map( cookie => cookie.trim() )
        .filter( Boolean )
        .reduce( ( cookies, cookie ) => {
            const [ name, ...value_parts ] = cookie.split( `=` )

            return {
                ...cookies,
                [ decodeURIComponent( name ) ]: decodeURIComponent( value_parts.join( `=` ) ),
            }
        }, {} )
}

/**
 * Returns whether cookies should be marked secure for a request.
 * @param {Request} request - Incoming request.
 * @returns {boolean} True for HTTPS-like origins.
 */
export function should_secure_cookie( request ) {

    const url = new URL( request.url )

    return url.protocol === `https:`
}

/**
 * Serializes a cookie.
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {Object} options - Cookie options.
 * @returns {string} Serialized cookie.
 */
export function serialize_cookie( name, value, options = {} ) {

    const {
        max_age = null,
        http_only = true,
        secure = true,
        same_site = `Lax`,
        path = `/`,
    } = options

    return [
        `${ encodeURIComponent( name ) }=${ encodeURIComponent( value ) }`,
        `Path=${ path }`,
        max_age === null ? null : `Max-Age=${ max_age }`,
        same_site ? `SameSite=${ same_site }` : null,
        http_only ? `HttpOnly` : null,
        secure ? `Secure` : null,
    ].filter( Boolean ).join( `; ` )
}

/**
 * Creates a signed cookie for a JSON payload.
 * @param {Request} request - Incoming request.
 * @param {string} name - Cookie name.
 * @param {Object} payload - Cookie payload.
 * @param {Object} options - Cookie options.
 * @returns {Promise<string>} Serialized cookie.
 */
export async function create_signed_cookie( request, name, payload, { secret, max_age } ) {

    const token = await sign_payload( {
        ...payload,
        issued_at: now_iso(),
    }, secret )

    return serialize_cookie( name, token, {
        max_age,
        secure: should_secure_cookie( request ),
    } )
}

/**
 * Reads and verifies a signed cookie.
 * @param {Request} request - Incoming request.
 * @param {string} name - Cookie name.
 * @param {string} secret - Signing secret.
 * @returns {Promise<Object|null>} Cookie payload.
 */
export async function read_signed_cookie( request, name, secret ) {

    const cookies = parse_cookies( request )

    return verify_signed_payload( cookies[ name ], secret )
}

/**
 * Builds a cookie deletion header.
 * @param {Request} request - Incoming request.
 * @param {string} name - Cookie name.
 * @returns {string} Deletion cookie.
 */
export function clear_cookie( request, name ) {

    return serialize_cookie( name, ``, {
        max_age: 0,
        secure: should_secure_cookie( request ),
    } )
}

