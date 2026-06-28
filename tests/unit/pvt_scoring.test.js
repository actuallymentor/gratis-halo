import { describe, expect, it } from 'vitest'
import { normalize_trial, score_pvt_trials } from '../../src/modules/pvt_scoring.js'

describe( `PVT scoring`, () => {
    it( `scores valid responses, lapses, and false starts from raw trials`, () => {
        const score = score_pvt_trials( [
            { trial_index: 0, actual_stimulus_at_ms: 1000, response_at_ms: 1240 },
            { trial_index: 1, actual_stimulus_at_ms: 3000, response_at_ms: 3370 },
            { trial_index: 2, actual_stimulus_at_ms: 5000, response_at_ms: 5050 },
            { trial_index: 3, planned_stimulus_at_ms: 8000, response_at_ms: 7600 },
            { trial_index: 4, actual_stimulus_at_ms: 9000, response_at_ms: null },
        ] )

        expect( score.valid_response_count ).toBe( 2 )
        expect( score.lapses_355_ms ).toBe( 2 )
        expect( score.false_starts ).toBe( 2 )
        expect( score.score ).toBeGreaterThanOrEqual( 0 )
        expect( score.score ).toBeLessThanOrEqual( 100 )
    } )

    it( `returns zero score and null RT aggregates with no valid responses`, () => {
        const score = score_pvt_trials( [
            { trial_index: 0, planned_stimulus_at_ms: 1000, response_at_ms: 900 },
            { trial_index: 1, actual_stimulus_at_ms: 3000, response_at_ms: null },
        ] )

        expect( score.score ).toBe( 0 )
        expect( score.mean_rt_ms ).toBeNull()
        expect( score.median_rt_ms ).toBeNull()
    } )

    it( `normalizes sub-100ms responses as false starts`, () => {
        const trial = normalize_trial( {
            trial_index: 0,
            actual_stimulus_at_ms: 1000,
            response_at_ms: 1099,
        } )

        expect( trial.false_start ).toBe( true )
        expect( trial.valid_response ).toBe( false )
    } )
} )

