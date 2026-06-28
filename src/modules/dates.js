const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Formats a Date-like value as a UTC calendar day.
 * @param {Date|string|number} value - Date input.
 * @returns {string} YYYY-MM-DD.
 */
export function to_yyyy_mm_dd( value = new Date() ) {

    return new Date( value ).toISOString().slice( 0, 10 )
}

/**
 * Adds calendar days to a YYYY-MM-DD date in UTC.
 * @param {string} day - Source calendar day.
 * @param {number} offset - Number of days to add.
 * @returns {string} Shifted YYYY-MM-DD.
 */
export function add_calendar_days( day, offset ) {

    const date = new Date( `${ day }T00:00:00.000Z` )
    return to_yyyy_mm_dd( date.getTime() +  offset * DAY_MS  )
}

/**
 * Returns the inclusive start day for a baseline window.
 * @param {string} current_day - Current measurement day.
 * @param {number} window_days - Baseline window size.
 * @returns {string} First baseline day.
 */
export function baseline_start_day( current_day, window_days ) {

    return add_calendar_days( current_day, -window_days )
}

/**
 * Returns the inclusive end day for a baseline window.
 * @param {string} current_day - Current measurement day.
 * @returns {string} Last baseline day, excluding current day.
 */
export function baseline_end_day( current_day ) {

    return add_calendar_days( current_day, -1 )
}

/**
 * Reads a day from an ISO timestamp without applying local timezone rules.
 * @param {string} timestamp - ISO timestamp.
 * @returns {string|null} Calendar day.
 */
export function day_from_timestamp( timestamp ) {

    if( !timestamp ) return null
    return timestamp.slice( 0, 10 )
}

/**
 * Returns a stable ISO timestamp for storage.
 * @returns {string} ISO timestamp.
 */
export function now_iso() {

    return new Date().toISOString()
}

