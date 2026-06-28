import { log } from 'mentie/modules/logging.js'

/**
 * Sends an API request and unwraps Halo's response envelope.
 * @param {string} path - API path.
 * @param {Object} options - Fetch options.
 * @returns {Promise<Object>} Unwrapped data.
 */
export async function api_request( path, options = {} ) {

    const response = await fetch( path, {
        credentials: `same-origin`,
        headers: {
            accept: `application/json`,
            ... options.body ? { 'content-type': `application/json` } : {} ,
            ... options.headers || {} ,
        },
        ...options,
        body: options.body && typeof options.body !== `string`
            ? JSON.stringify( options.body )
            : options.body,
    } )
    const envelope = await response.json().catch( () => ( {
        ok: false,
        error: {
            message: `Halo returned an unreadable response.`,
        },
    } ) )

    if( !response.ok || !envelope.ok ) {
        const error = new Error( envelope.error?.message || `Halo request failed` )

        error.status = response.status
        error.code = envelope.error?.code
        log.warn( `API request failed`, path, error.message )
        throw error
    }

    return envelope.data
}

/**
 * Logs the current user out.
 * @returns {Promise<void>} Completion promise.
 */
export async function logout() {

    await api_request( `/api/logout`, {
        method: `POST`,
    } )
    window.location.assign( `/login` )
}
