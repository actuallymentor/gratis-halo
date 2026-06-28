import { PVT_CONSTANTS, score_pvt_trials } from '../modules/pvt_scoring.js'
import { now_iso } from '../modules/dates.js'
import { all_rows, first_row, new_id, run_query } from './db.js'

/**
 * Creates a PVT session.
 * @param {Object} options - Session options.
 * @returns {Promise<Object>} Created session.
 */
export async function create_pvt_session( { env, user_id, payload } ) {

    const id = new_id()
    const started_at = now_iso()

    await run_query( env.DB, `
        INSERT INTO pvt_sessions (
            id, user_id, started_at, status, duration_seconds, device_category,
            input_type, user_agent, viewport_width, viewport_height,
            wake_lock_supported, wake_lock_active
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
    `, [
        id,
        user_id,
        started_at,
        `running`,
        payload.duration_seconds || PVT_CONSTANTS.duration_seconds,
        payload.device_category || `unknown`,
        payload.input_type || `unknown`,
        payload.user_agent || ``,
        payload.viewport_width || null,
        payload.viewport_height || null,
        payload.wake_lock_supported ? 1 : 0,
        payload.wake_lock_active ? 1 : 0,
    ] )

    return first_row( env.DB, `SELECT * FROM pvt_sessions WHERE id = ?`, [ id ] )
}

/**
 * Stores normalized PVT trials.
 * @param {Object} options - Trial options.
 * @returns {Promise<void>}
 */
export async function store_pvt_trials( { env, user_id = null, session_id, trials } ) {

    const session = user_id ? await first_row( env.DB, `
        SELECT id
        FROM pvt_sessions
        WHERE id = ? AND user_id = ?
    `, [ session_id, user_id ] ) : await first_row( env.DB, `
        SELECT id
        FROM pvt_sessions
        WHERE id = ?
    `, [ session_id ] )

    if( !session ) throw new Error( `PVT session not found` )

    const scored_trials = score_pvt_trials( trials ).trials

    await Promise.all( scored_trials.map( trial => run_query( env.DB, `
        INSERT INTO pvt_trials (
            id, session_id, trial_index, planned_stimulus_at_ms, actual_stimulus_at_ms,
            response_at_ms, reaction_time_ms, valid_response, false_start,
            lapse_355_ms, lapse_500_ms
        )
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )
        ON CONFLICT ( session_id, trial_index ) DO UPDATE SET
            planned_stimulus_at_ms = excluded.planned_stimulus_at_ms,
            actual_stimulus_at_ms = excluded.actual_stimulus_at_ms,
            response_at_ms = excluded.response_at_ms,
            reaction_time_ms = excluded.reaction_time_ms,
            valid_response = excluded.valid_response,
            false_start = excluded.false_start,
            lapse_355_ms = excluded.lapse_355_ms,
            lapse_500_ms = excluded.lapse_500_ms
    `, [
        new_id(),
        session_id,
        trial.trial_index,
        trial.planned_stimulus_at_ms,
        trial.actual_stimulus_at_ms,
        trial.response_at_ms,
        trial.reaction_time_ms,
        trial.valid_response ? 1 : 0,
        trial.false_start ? 1 : 0,
        trial.lapse_355_ms ? 1 : 0,
        trial.lapse_500_ms ? 1 : 0,
    ] ) ) )
}

/**
 * Reads raw trial rows for scoring.
 * @param {Object} options - Query options.
 * @returns {Promise<Object[]>} Trial rows.
 */
export async function get_session_trials( { env, session_id } ) {

    return all_rows( env.DB, `
        SELECT *
        FROM pvt_trials
        WHERE session_id = ?
        ORDER BY trial_index ASC
    `, [ session_id ] )
}

/**
 * Completes a PVT session from raw trials.
 * @param {Object} options - Completion options.
 * @returns {Promise<Object>} Completed session and score.
 */
export async function complete_pvt_session( { env, user_id, session_id, trials = null } ) {

    const session = await first_row( env.DB, `
        SELECT *
        FROM pvt_sessions
        WHERE id = ? AND user_id = ?
    `, [ session_id, user_id ] )

    if( !session ) throw new Error( `PVT session not found` )
    if( session.status === `invalidated` ) throw new Error( `PVT session was invalidated` )

    if( trials?.length ) await store_pvt_trials( { env, session_id, trials } )

    const trial_rows = await get_session_trials( { env, session_id } )
    const score = score_pvt_trials( trial_rows )
    const completed_at = now_iso()

    await run_query( env.DB, `
        UPDATE pvt_sessions
        SET completed_at = ?,
            status = ?,
            score = ?,
            mean_rt_ms = ?,
            median_rt_ms = ?,
            rt_stddev_ms = ?,
            lapses_355_ms = ?,
            lapses_500_ms = ?,
            false_starts = ?,
            mean_response_speed = ?
        WHERE id = ? AND user_id = ?
    `, [
        completed_at,
        `completed`,
        score.score,
        score.mean_rt_ms,
        score.median_rt_ms,
        score.rt_stddev_ms,
        score.lapses_355_ms,
        score.lapses_500_ms,
        score.false_starts,
        score.mean_response_speed,
        session_id,
        user_id,
    ] )

    return {
        session: await first_row( env.DB, `SELECT * FROM pvt_sessions WHERE id = ?`, [ session_id ] ),
        score,
    }
}

/**
 * Invalidates a PVT session.
 * @param {Object} options - Invalidation options.
 * @returns {Promise<Object>} Invalidated session.
 */
export async function invalidate_pvt_session( { env, user_id, session_id, reason } ) {

    await run_query( env.DB, `
        UPDATE pvt_sessions
        SET status = ?, invalidated_reason = ?, completed_at = ?
        WHERE id = ? AND user_id = ? AND status != 'completed'
    `, [ `invalidated`, reason || `unknown`, now_iso(), session_id, user_id ] )

    return first_row( env.DB, `SELECT * FROM pvt_sessions WHERE id = ? AND user_id = ?`, [ session_id, user_id ] )
}

/**
 * Reads PVT history for a user.
 * @param {Object} options - History options.
 * @returns {Promise<Object[]>} Session rows.
 */
export async function get_pvt_history( { env, user_id } ) {

    return all_rows( env.DB, `
        SELECT *
        FROM pvt_sessions
        WHERE user_id = ?
        ORDER BY started_at DESC
        LIMIT 120
    `, [ user_id ] )
}
