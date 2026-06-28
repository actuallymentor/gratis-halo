import { describe, expect, it } from 'vitest'
import { choose_long_sleep_records, compute_max_sleep_hrv, duration_to_seconds } from '../../src/modules/hrv.js'

describe( `HRV helpers`, () => {
    it( `parses Oura ISO durations`, () => {
        expect( duration_to_seconds( `PT7H30M10S` ) ).toBe( 27_010 )
    } )

    it( `filters awake-aligned HRV samples when phases are available`, () => {
        const result = compute_max_sleep_hrv( {
            hrv: {
                interval: 300,
                items: [ 40, 120, 55 ],
            },
            sleep_phase_5_min: `242`,
        } )

        expect( result.max_sleep_hrv_ms ).toBe( 55 )
        expect( result.max_hrv_filter_quality ).toBe( `phase_filtered` )
    } )

    it( `chooses the longest long_sleep record per day`, () => {
        const [ sleep ] = choose_long_sleep_records( [
            { id: `nap`, day: `2026-06-27`, type: `sleep`, time_in_bed: `PT1H` },
            { id: `short`, day: `2026-06-27`, type: `long_sleep`, time_in_bed: `PT6H` },
            { id: `long`, day: `2026-06-27`, type: `long_sleep`, time_in_bed: `PT8H` },
        ] )

        expect( sleep.id ).toBe( `long` )
    } )
} )

