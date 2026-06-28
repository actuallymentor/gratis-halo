/**
 * Infers a broad device category from viewport and user-agent hints.
 * @param {Object} options - Device hints.
 * @returns {string} Device category.
 */
export function infer_device_category( { user_agent = ``, width = 0 } = {} ) {

    const normalized_user_agent = user_agent.toLowerCase()

    if( /ipad|tablet/.test( normalized_user_agent ) ) return `tablet`
    if( /mobile|iphone|android/.test( normalized_user_agent ) && width < 900 ) return `mobile`
    if( width >= 900 ) return `desktop`

    return `unknown`
}

/**
 * Captures browser context for a PVT session.
 * @returns {Object} Measurement device metadata.
 */
export function capture_device_context() {

    const user_agent = navigator.userAgent || ``
    const width = window.innerWidth
    const height = window.innerHeight

    return {
        user_agent,
        viewport_width: width,
        viewport_height: height,
        device_category: infer_device_category( { user_agent, width } ),
        wake_lock_supported: `wakeLock` in navigator,
    }
}

