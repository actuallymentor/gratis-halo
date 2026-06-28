/**
 * Converts Oura duration strings or seconds into seconds.
 * @param {string|number|null} value - Oura time_in_bed value.
 * @returns {number|null} Seconds.
 */
export function duration_to_seconds( value ) {

    if( Number.isFinite( value ) ) return value
    if( !value || typeof value !== `string` ) return null

    const iso_match = value.match( /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/ )
    if( !iso_match ) return null

    const [ , hours = `0`, minutes = `0`, seconds = `0` ] = iso_match

    return  Number( hours ) * 3600  +  Number( minutes ) * 60  + Number( seconds )
}

/**
 * Determines whether a sleep phase marker represents awake time.
 * @param {string|number|null} phase - Sleep phase marker.
 * @returns {boolean} True when awake.
 */
export function is_awake_phase( phase ) {

    if( phase === null || phase === undefined ) return false

    const normalized_phase = `${ phase }`.toLowerCase()

    return [ `4`, `awake`, `wake`, `w` ].includes( normalized_phase )
}

/**
 * Computes max sleeping HRV from Oura hrv items and optional phase alignment.
 * @param {Object} sleep - Oura sleep document.
 * @returns {Object} Max HRV and filter quality.
 */
export function compute_max_sleep_hrv( sleep ) {

    const hrv_items = sleep?.hrv?.items || []
    const interval_seconds = sleep?.hrv?.interval || null
    const phases = sleep?.sleep_phase_5_min || sleep?.app_sleep_phase_5_min || null
    const numeric_items = hrv_items
        .map( ( value, index ) => ( { value, index } ) )
        .filter( ( { value } ) => Number.isFinite( value ) )

    if( !numeric_items.length ) return {
        max_sleep_hrv_ms: null,
        max_hrv_filter_quality: `missing`,
    }

    if( !phases || !interval_seconds ) return {
        max_sleep_hrv_ms: Math.max( ...numeric_items.map( ( { value } ) => value ) ),
        max_hrv_filter_quality: `unfiltered`,
    }

    const phase_marks = Array.isArray( phases ) ? phases : `${ phases }`.split( `` )
    const filtered_items = numeric_items.filter( ( { index } ) => {
        const seconds_from_start = index * interval_seconds
        const phase_index = Math.floor( seconds_from_start / 300 )
        const phase = phase_marks[ phase_index ]

        return !is_awake_phase( phase )
    } )

    if( !filtered_items.length ) return {
        max_sleep_hrv_ms: Math.max( ...numeric_items.map( ( { value } ) => value ) ),
        max_hrv_filter_quality: `unfiltered`,
    }

    return {
        max_sleep_hrv_ms: Math.max( ...filtered_items.map( ( { value } ) => value ) ),
        max_hrv_filter_quality: `phase_filtered`,
    }
}

/**
 * Chooses one long sleep document for each Oura day.
 * @param {Object[]} records - Oura sleep records.
 * @returns {Object[]} One long sleep per day.
 */
export function choose_long_sleep_records( records ) {

    const long_sleep_records = records.filter( ( { type, deleted } ) => type === `long_sleep` && !deleted )
    const grouped_records = long_sleep_records.reduce( ( groups, record ) => {
        const day_records = groups[ record.day ] || []

        return {
            ...groups,
            [ record.day ]: [ ...day_records, record ],
        }
    }, {} )

    return Object.values( grouped_records ).map( day_records => {
        const sorted_records = [ ...day_records ].sort( ( left, right ) => {
            const left_time_in_bed = duration_to_seconds( left.time_in_bed ) || 0
            const right_time_in_bed = duration_to_seconds( right.time_in_bed ) || 0

            if( left_time_in_bed !== right_time_in_bed ) return right_time_in_bed - left_time_in_bed

            return `${ right.bedtime_end || `` }`.localeCompare( `${ left.bedtime_end || `` }` )
        } )

        return sorted_records[ 0 ]
    } )
}

