import { baseline_end_day, baseline_start_day } from './dates.js'

export const BASELINE_WINDOWS = [
    { days: 7, minimum_samples: 4 },
    { days: 30, minimum_samples: 14 },
    { days: 90, minimum_samples: 30 },
    { days: 365, minimum_samples: 90 },
]

export const Z_SCORE_BANDS = {
    normal: 1.0,
    watch: 1.5,
    high: 2.0,
}

/**
 * Computes a population mean.
 * @param {number[]} values - Numeric values.
 * @returns {number|null} Mean or null.
 */
export function mean( values ) {

    if( !values.length ) return null

    return values.reduce( ( sum, value ) => sum + value, 0 ) / values.length
}

/**
 * Computes a population standard deviation.
 * @param {number[]} values - Numeric values.
 * @returns {number|null} Standard deviation or null.
 */
export function population_standard_deviation( values ) {

    if( !values.length ) return null

    const average = mean( values )
    const variance = values.reduce( ( sum, value ) => sum +  ( value - average ) ** 2 , 0 ) / values.length

    return Math.sqrt( variance )
}

/**
 * Classifies a z-score into Halo's neutral status vocabulary.
 * @param {number|null} z_score - Baseline z-score.
 * @returns {string} Status key.
 */
export function classify_z_score( z_score ) {

    if( z_score === null || Number.isNaN( z_score ) ) return `building`

    const absolute_z_score = Math.abs( z_score )

    if( absolute_z_score < Z_SCORE_BANDS.normal ) return `usual`
    if( absolute_z_score < Z_SCORE_BANDS.watch ) return `notable`
    if( absolute_z_score < Z_SCORE_BANDS.high ) return `outside`

    return `far_outside`
}

/**
 * Computes rolling calendar-day baseline comparisons for one metric.
 * @param {Object} options
 * @param {Array<Object>} options.measurements - Measurements with day and metric keys.
 * @param {string} options.current_day - Current measurement day.
 * @param {number|null} options.current_value - Current metric value.
 * @param {string} options.value_key - Metric key to compare.
 * @returns {Array<Object>} Window comparison objects.
 */
export function compute_baseline_comparisons( { measurements, current_day, current_value, value_key } ) {

    return BASELINE_WINDOWS.map( ( { days, minimum_samples } ) => {

        const start_day = baseline_start_day( current_day, days )
        const end_day = baseline_end_day( current_day )

        const baseline_values = measurements
            .filter( measurement => measurement.day >= start_day && measurement.day <= end_day )
            .map( measurement => measurement[ value_key ] )
            .filter( value => Number.isFinite( value ) )

        const rolling_mean = mean( baseline_values )
        const standard_deviation = population_standard_deviation( baseline_values )
        const has_enough_samples = baseline_values.length >= minimum_samples
        const can_score = has_enough_samples && standard_deviation > 0 && Number.isFinite( current_value )
        const delta = rolling_mean === null || !Number.isFinite( current_value )
            ? null
            : current_value - rolling_mean
        const z_score = can_score ? delta / standard_deviation : null

        return {
            days,
            start_day,
            end_day,
            minimum_samples,
            sample_count: baseline_values.length,
            mean: rolling_mean,
            standard_deviation,
            delta,
            z_score,
            status: classify_z_score( z_score ),
            building_baseline: !has_enough_samples,
        }
    } )
}

/**
 * Rounds a numeric metric for UI payloads.
 * @param {number|null} value - Raw number.
 * @param {number} decimals - Decimal places.
 * @returns {number|null} Rounded number.
 */
export function round_metric( value, decimals = 1 ) {

    if( !Number.isFinite( value ) ) return null

    const scale = 10 ** decimals
    return Math.round( value * scale ) / scale
}

/**
 * Rounds comparison values without losing null semantics.
 * @param {Array<Object>} comparisons - Baseline comparison objects.
 * @returns {Array<Object>} Rounded comparison objects.
 */
export function round_comparisons( comparisons ) {

    return comparisons.map( comparison => ( {
        ...comparison,
        mean: round_metric( comparison.mean ),
        standard_deviation: round_metric( comparison.standard_deviation ),
        delta: round_metric( comparison.delta ),
        z_score: round_metric( comparison.z_score, 2 ),
    } ) )
}

