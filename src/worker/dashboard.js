import { compute_baseline_comparisons, round_comparisons, round_metric } from '../modules/baselines.js'
import { day_from_timestamp, to_yyyy_mm_dd } from '../modules/dates.js'
import { all_rows, first_row } from './db.js'
import { sync_oura_sleep } from './oura.js'

/**
 * Maps sleep rows into baseline-ready values.
 * @param {Array<Object>} rows - D1 sleep rows.
 * @returns {Array<Object>} Measurements.
 */
export function map_hrv_measurements( rows ) {

    return rows.map( row => ( {
        day: row.day,
        average_hrv_ms: row.average_hrv_ms === null ? null : Number( row.average_hrv_ms ),
        max_sleep_hrv_ms: row.max_sleep_hrv_ms === null ? null : Number( row.max_sleep_hrv_ms ),
    } ) )
}

/**
 * Maps PVT session rows into baseline-ready values.
 * @param {Array<Object>} rows - D1 PVT rows.
 * @returns {Array<Object>} Measurements.
 */
export function map_pvt_measurements( rows ) {

    return rows.map( row => ( {
        day: day_from_timestamp( row.completed_at ),
        score: row.score === null ? null : Number( row.score ),
        mean_rt_ms: row.mean_rt_ms === null ? null : Number( row.mean_rt_ms ),
        median_rt_ms: row.median_rt_ms === null ? null : Number( row.median_rt_ms ),
        lapses_355_ms: row.lapses_355_ms === null ? null : Number( row.lapses_355_ms ),
    } ) ).filter( ( { day } ) => day )
}

/**
 * Builds one HRV metric payload.
 * @param {Object} options - Metric options.
 * @returns {Object|null} HRV metric payload.
 */
export function build_hrv_metric( { latest_night, measurements, value_key } ) {

    if( !latest_night || !Number.isFinite( latest_night[ value_key ] ) ) return null

    const current_value = Number( latest_night[ value_key ] )
    const comparisons = compute_baseline_comparisons( {
        measurements,
        current_day: latest_night.day,
        current_value,
        value_key,
    } )

    return {
        current_value: round_metric( current_value ),
        current_day: latest_night.day,
        comparisons: round_comparisons( comparisons ),
    }
}

/**
 * Builds one PVT metric payload.
 * @param {Object} options - Metric options.
 * @returns {Object|null} PVT metric payload.
 */
export function build_pvt_metric( { latest_session, measurements, value_key } ) {

    if( !latest_session || !Number.isFinite( latest_session[ value_key ] ) ) return null

    const current_day = day_from_timestamp( latest_session.completed_at )
    const current_value = Number( latest_session[ value_key ] )
    const comparisons = compute_baseline_comparisons( {
        measurements,
        current_day,
        current_value,
        value_key,
    } )

    return {
        current_value: round_metric( current_value ),
        current_day,
        comparisons: round_comparisons( comparisons ),
    }
}

/**
 * Reads the latest sync event for a user.
 * @param {Object} options - Query options.
 * @returns {Promise<Object|null>} Sync event.
 */
export async function get_latest_sync_event( { env, user_id } ) {

    return first_row( env.DB, `
        SELECT *
        FROM sync_events
        WHERE user_id = ?
        ORDER BY started_at DESC
        LIMIT 1
    `, [ user_id ] )
}

/**
 * Builds the dashboard payload and opportunistically syncs Oura.
 * @param {Object} options - Dashboard options.
 * @returns {Promise<Object>} Dashboard payload.
 */
export async function build_dashboard( { env, user } ) {

    const sync = await sync_oura_sleep( { env, user_id: user.id } )
    const sleep_rows = await all_rows( env.DB, `
        SELECT *
        FROM oura_sleep_nights
        WHERE user_id = ?
        ORDER BY day ASC
    `, [ user.id ] )
    const latest_night = await first_row( env.DB, `
        SELECT *
        FROM oura_sleep_nights
        WHERE user_id = ?
        ORDER BY day DESC, bedtime_end DESC
        LIMIT 1
    `, [ user.id ] )
    const pvt_rows = await all_rows( env.DB, `
        SELECT *
        FROM pvt_sessions
        WHERE user_id = ? AND status = 'completed'
        ORDER BY completed_at ASC
    `, [ user.id ] )
    const latest_pvt = await first_row( env.DB, `
        SELECT *
        FROM pvt_sessions
        WHERE user_id = ? AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
    `, [ user.id ] )
    const today = to_yyyy_mm_dd()
    const today_pvt = await first_row( env.DB, `
        SELECT *
        FROM pvt_sessions
        WHERE user_id = ? AND status = 'completed' AND substr( completed_at, 1, 10 ) = ?
        ORDER BY completed_at DESC
        LIMIT 1
    `, [ user.id, today ] )
    const hrv_measurements = map_hrv_measurements( sleep_rows )
    const pvt_measurements = map_pvt_measurements( pvt_rows )
    const latest_sync_event = await get_latest_sync_event( { env, user_id: user.id } )
    const connection = await first_row( env.DB, `
        SELECT needs_reauth, updated_at
        FROM oura_connections
        WHERE user_id = ?
    `, [ user.id ] )

    return {
        generated_at: new Date().toISOString(),
        user: {
            id: user.id,
            email: user.email,
        },
        sync: {
            ...sync,
            latest_event: latest_sync_event,
            needs_reauth: Boolean( connection?.needs_reauth ),
        },
        hrv: {
            latest_night,
            average_hrv_ms: build_hrv_metric( {
                latest_night,
                measurements: hrv_measurements,
                value_key: `average_hrv_ms`,
            } ),
            max_sleep_hrv_ms: build_hrv_metric( {
                latest_night,
                measurements: hrv_measurements,
                value_key: `max_sleep_hrv_ms`,
            } ),
        },
        pvt: {
            today,
            completed_today: Boolean( today_pvt ),
            today_session: today_pvt,
            latest_session: latest_pvt,
            score: build_pvt_metric( {
                latest_session: latest_pvt,
                measurements: pvt_measurements,
                value_key: `score`,
            } ),
        },
    }
}

