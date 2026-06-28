export const PVT_CONSTANTS = {
    duration_seconds: 180,
    practice_duration_seconds: 25,
    minimum_valid_rt_ms: 100,
    lapse_355_ms: 355,
    lapse_500_ms: 500,
    no_response_timeout_ms: 30_000,
    stimulus_min_delay_ms: 1_000,
    stimulus_max_delay_ms: 4_000,
    median_baseline_ms: 250,
    median_penalty_step_ms: 10,
    lapse_penalty: 5,
    false_start_penalty: 3,
    variability_penalty_cap: 20,
    variability_penalty_divisor: 20,
}

/**
 * Clamps a number to a closed range.
 * @param {number} value - Raw value.
 * @param {number} min - Minimum.
 * @param {number} max - Maximum.
 * @returns {number} Clamped number.
 */
export function clamp( value, min, max ) {

    return Math.min( Math.max( value, min ), max )
}

/**
 * Computes a median from numeric values.
 * @param {number[]} values - Numeric values.
 * @returns {number|null} Median value.
 */
export function median( values ) {

    if( !values.length ) return null

    const sorted_values = [ ...values ].sort( ( left, right ) => left - right )
    const midpoint = Math.floor( sorted_values.length / 2 )

    if( sorted_values.length % 2 ) return sorted_values[ midpoint ]

    return ( sorted_values[ midpoint - 1 ] + sorted_values[ midpoint ] ) / 2
}

/**
 * Computes a population standard deviation.
 * @param {number[]} values - Numeric values.
 * @returns {number|null} Standard deviation.
 */
export function rt_standard_deviation( values ) {

    if( !values.length ) return null
    if( values.length === 1 ) return 0

    const average = values.reduce( ( sum, value ) => sum + value, 0 ) / values.length
    const variance = values.reduce( ( sum, value ) => sum +  ( value - average ) ** 2 , 0 ) / values.length

    return Math.sqrt( variance )
}

/**
 * Normalizes raw trial timing into the v1 scoring booleans.
 * @param {Object} trial - Raw trial event.
 * @returns {Object} Normalized trial.
 */
export function normalize_trial( trial ) {

    const {
        trial_index,
        planned_stimulus_at_ms = null,
        actual_stimulus_at_ms = null,
        response_at_ms = null,
    } = trial

    const has_stimulus = Number.isFinite( actual_stimulus_at_ms )
    const has_response = Number.isFinite( response_at_ms )
    const reaction_time_ms = has_stimulus && has_response
        ? response_at_ms - actual_stimulus_at_ms
        : null
    const false_start = !has_stimulus && has_response
        || Number.isFinite( reaction_time_ms ) && reaction_time_ms < PVT_CONSTANTS.minimum_valid_rt_ms
    const no_response = has_stimulus && !has_response
    const valid_response = Number.isFinite( reaction_time_ms ) && !false_start
    const lapse_355_ms = no_response || valid_response && reaction_time_ms >= PVT_CONSTANTS.lapse_355_ms
    const lapse_500_ms = no_response || valid_response && reaction_time_ms >= PVT_CONSTANTS.lapse_500_ms

    return {
        trial_index,
        planned_stimulus_at_ms,
        actual_stimulus_at_ms,
        response_at_ms,
        reaction_time_ms,
        valid_response,
        false_start,
        lapse_355_ms,
        lapse_500_ms,
    }
}

/**
 * Computes deterministic v1 PVT aggregate metrics from raw trials.
 * @param {Object[]} raw_trials - Trial records.
 * @returns {Object} Aggregate metrics.
 */
export function score_pvt_trials( raw_trials ) {

    const trials = raw_trials.map( normalize_trial )
    const valid_reaction_times = trials
        .filter( ( { valid_response } ) => valid_response )
        .map( ( { reaction_time_ms } ) => reaction_time_ms )
    const valid_response_count = valid_reaction_times.length
    const mean_rt_ms = valid_response_count
        ? valid_reaction_times.reduce( ( sum, value ) => sum + value, 0 ) / valid_response_count
        : null
    const median_rt_ms = median( valid_reaction_times )
    const rt_stddev_ms = rt_standard_deviation( valid_reaction_times )
    const lapses_355_ms = trials.filter( ( { lapse_355_ms } ) => lapse_355_ms ).length
    const lapses_500_ms = trials.filter( ( { lapse_500_ms } ) => lapse_500_ms ).length
    const false_starts = trials.filter( ( { false_start } ) => false_start ).length
    const mean_response_speed = valid_response_count
        ? valid_reaction_times
            .map( reaction_time_ms => 1 / ( reaction_time_ms / 1000 ) )
            .reduce( ( sum, value ) => sum + value, 0 ) / valid_response_count
        : null

    if( !valid_response_count ) return {
        score: 0,
        valid_response_count,
        mean_rt_ms,
        median_rt_ms,
        rt_stddev_ms,
        lapses_355_ms,
        lapses_500_ms,
        false_starts,
        mean_response_speed,
        trials,
    }

    const median_penalty = Math.max( 0, median_rt_ms - PVT_CONSTANTS.median_baseline_ms ) / PVT_CONSTANTS.median_penalty_step_ms
    const lapse_penalty = lapses_355_ms * PVT_CONSTANTS.lapse_penalty
    const false_start_penalty = false_starts * PVT_CONSTANTS.false_start_penalty
    const variability_penalty = Math.min(
        PVT_CONSTANTS.variability_penalty_cap,
        rt_stddev_ms / PVT_CONSTANTS.variability_penalty_divisor,
    )
    const raw_score = 100 - median_penalty - lapse_penalty - false_start_penalty - variability_penalty

    return {
        score: Math.round( clamp( raw_score, 0, 100 ) ),
        valid_response_count,
        mean_rt_ms,
        median_rt_ms,
        rt_stddev_ms,
        lapses_355_ms,
        lapses_500_ms,
        false_starts,
        mean_response_speed,
        trials,
    }
}

