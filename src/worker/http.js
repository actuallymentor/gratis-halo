/**
 * Builds a JSON response with Halo's envelope shape.
 * @param {Object} body - JSON body.
 * @param {Object} options - Response options.
 * @returns {Response} JSON response.
 */
export function json_response( body, { status = 200, headers = {} } = {} ) {

    return new Response( JSON.stringify( body ), {
        status,
        headers: {
            'content-type': `application/json; charset=utf-8`,
            ...headers,
        },
    } )
}

/**
 * Builds a successful API response.
 * @param {Object} data - Response data.
 * @param {Object} options - Response options.
 * @returns {Response} JSON response.
 */
export function ok_response( data = {}, options = {} ) {

    return json_response( {
        ok: true,
        data,
    }, options )
}

/**
 * Builds a consistent API error response.
 * @param {string} code - Stable error code.
 * @param {string} message - User-readable error.
 * @param {Object} options - Response options.
 * @returns {Response} JSON response.
 */
export function error_response( code, message, { status = 400, details = {}, headers = {} } = {} ) {

    return json_response( {
        ok: false,
        error: {
            code,
            message,
            details,
        },
    }, {
        status,
        headers,
    } )
}

/**
 * Reads a JSON request body.
 * @param {Request} request - Incoming request.
 * @returns {Promise<Object>} Parsed body.
 */
export async function read_json( request ) {

    const text = await request.text()

    if( !text.trim() ) return {}

    try {
        return JSON.parse( text )
    } catch ( error ) {
        throw new Error( `Invalid JSON body`, { cause: error } )
    }
}

/**
 * Builds a redirect response.
 * @param {string} location - Redirect target.
 * @param {Object} options - Response options.
 * @returns {Response} Redirect response.
 */
export function redirect_response( location, { status = 302, headers = {} } = {} ) {

    return new Response( null, {
        status,
        headers: {
            location,
            ...headers,
        },
    } )
}

/**
 * Appends cookies to a response without losing existing Set-Cookie headers.
 * @param {Response} response - Source response.
 * @param {string[]} cookies - Serialized cookies.
 * @returns {Response} Response with cookies.
 */
export function with_cookies( response, cookies ) {

    const headers = new Headers( response.headers )
    cookies.filter( Boolean ).forEach( cookie => headers.append( `set-cookie`, cookie ) )

    return new Response( response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    } )
}

/**
 * Ensures an HTTP method matches.
 * @param {Request} request - Incoming request.
 * @param {string} method - Expected method.
 * @returns {void}
 */
export function require_method( request, method ) {

    if( request.method !== method ) throw new Error( `Method not allowed` )
}
