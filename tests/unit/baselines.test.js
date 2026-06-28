import { describe, expect, it } from 'vitest'
import { compute_baseline_comparisons } from '../../src/modules/baselines.js'
import { add_calendar_days } from '../../src/modules/dates.js'

/**
 * Builds calendar-day measurements for tests.
 * @param {string} end_day - End day.
 * @param {number} count - Measurement count.
 * @returns {Object[]} Measurements.
 */
function build_measurements( end_day, count ) {

    return Array.from( { length: count }, ( _, index ) => ( {
        day: add_calendar_days( end_day, -( count - index ) ),
        value: 50 + index,
    } ) )
}

describe( `baseline comparisons`, () => {
    it( `excludes the current measurement day from every window`, () => {
        const measurements = [
            ...build_measurements( `2026-06-28`, 7 ),
            {
                day: `2026-06-28`,
                value: 500,
            },
        ]
        const [ seven_day ] = compute_baseline_comparisons( {
            measurements,
            current_day: `2026-06-28`,
            current_value: 500,
            value_key: `value`,
        } )

        expect( seven_day.sample_count ).toBe( 7 )
        expect( seven_day.mean ).toBe( 53 )
    } )

    it( `marks low sample windows as building baseline`, () => {
        const [ seven_day ] = compute_baseline_comparisons( {
            measurements: [
                { day: `2026-06-26`, value: 10 },
                { day: `2026-06-27`, value: 12 },
            ],
            current_day: `2026-06-28`,
            current_value: 14,
            value_key: `value`,
        } )

        expect( seven_day.building_baseline ).toBe( true )
        expect( seven_day.z_score ).toBeNull()
        expect( seven_day.status ).toBe( `building` )
    } )
} )

