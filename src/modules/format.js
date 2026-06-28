/**
 * Formats a number or returns an empty marker.
 * @param {number|null} value - Raw number.
 * @param {Object} options - Formatting options.
 * @returns {string} Formatted metric.
 */
export function format_number( value, { decimals = 0, suffix = `` } = {} ) {

    if( !Number.isFinite( value ) ) return `--`

    return `${ value.toFixed( decimals ) }${ suffix }`
}

/**
 * Formats signed deltas for compact metric cards.
 * @param {number|null} value - Delta value.
 * @param {Object} options - Formatting options.
 * @returns {string} Signed delta.
 */
export function format_delta( value, { decimals = 0, suffix = `` } = {} ) {

    if( !Number.isFinite( value ) ) return `--`

    const sign = value > 0 ? `+` : ``

    return `${ sign }${ value.toFixed( decimals ) }${ suffix }`
}

/**
 * Converts an ISO timestamp into a readable local date/time.
 * @param {string|null} value - ISO timestamp.
 * @returns {string} Local text.
 */
export function format_datetime( value ) {

    if( !value ) return `Never`

    return new Intl.DateTimeFormat( undefined, {
        month: `short`,
        day: `numeric`,
        hour: `numeric`,
        minute: `2-digit`,
    } ).format( new Date( value ) )
}

