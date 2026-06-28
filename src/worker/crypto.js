const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Encodes bytes or text as base64url.
 * @param {Uint8Array|string} value - Value to encode.
 * @returns {string} Base64url text.
 */
export function base64url_encode( value ) {

    const bytes = typeof value === `string` ? encoder.encode( value ) : value
    const binary = Array.from( bytes ).map( byte => String.fromCharCode( byte ) ).join( `` )

    return btoa( binary )
        .replaceAll( `+`, `-` )
        .replaceAll( `/`, `_` )
        .replaceAll( `=`, `` )
}

/**
 * Decodes base64url text to a string.
 * @param {string} value - Encoded value.
 * @returns {string} Decoded text.
 */
export function base64url_decode_to_string( value ) {

    const padded_value = value
        .replaceAll( `-`, `+` )
        .replaceAll( `_`, `/` )
        .padEnd( Math.ceil( value.length / 4 ) * 4, `=` )
    const binary = atob( padded_value )
    const bytes = Uint8Array.from( binary, character => character.charCodeAt( 0 ) )

    return decoder.decode( bytes )
}

/**
 * Signs a message with HMAC SHA-256.
 * @param {string} secret - Secret key.
 * @param {string} message - Message to sign.
 * @returns {Promise<string>} Base64url signature.
 */
export async function hmac_sha256( secret, message ) {

    const key = await crypto.subtle.importKey(
        `raw`,
        encoder.encode( secret ),
        { name: `HMAC`, hash: `SHA-256` },
        false,
        [ `sign` ],
    )
    const signature = await crypto.subtle.sign( `HMAC`, key, encoder.encode( message ) )

    return base64url_encode( new Uint8Array( signature ) )
}

/**
 * Compares two strings without early-returning on partial matches.
 * @param {string} left - First value.
 * @param {string} right - Second value.
 * @returns {boolean} True when equal.
 */
export function timing_safe_equal( left, right ) {

    const left_bytes = encoder.encode( left )
    const right_bytes = encoder.encode( right )
    const max_length = Math.max( left_bytes.length, right_bytes.length )
    const mismatch = Array.from( { length: max_length } ).reduce( ( difference, _, index ) => {
        const left_byte = left_bytes[ index ] || 0
        const right_byte = right_bytes[ index ] || 0

        return difference |  left_byte ^ right_byte 
    }, left_bytes.length ^ right_bytes.length )

    return mismatch === 0
}

/**
 * Creates a signed payload token.
 * @param {Object} payload - JSON payload.
 * @param {string} secret - Signing secret.
 * @returns {Promise<string>} Signed token.
 */
export async function sign_payload( payload, secret ) {

    const encoded_payload = base64url_encode( JSON.stringify( payload ) )
    const signature = await hmac_sha256( secret, encoded_payload )

    return `${ encoded_payload }.${ signature }`
}

/**
 * Verifies and decodes a signed payload token.
 * @param {string|null} token - Signed token.
 * @param {string} secret - Signing secret.
 * @returns {Promise<Object|null>} Decoded payload.
 */
export async function verify_signed_payload( token, secret ) {

    if( !token || !token.includes( `.` ) ) return null

    const [ encoded_payload, signature ] = token.split( `.` )
    const expected_signature = await hmac_sha256( secret, encoded_payload )

    if( !timing_safe_equal( signature, expected_signature ) ) return null

    try {
        return JSON.parse( base64url_decode_to_string( encoded_payload ) )
    } catch {
        return null
    }
}

/**
 * Hashes text for privacy-minimized rate-limit keys.
 * @param {string} text - Text to hash.
 * @param {string} secret - Secret salt.
 * @returns {Promise<string>} Stable hash.
 */
export async function secret_hash( text, secret ) {

    return hmac_sha256( secret, text )
}
