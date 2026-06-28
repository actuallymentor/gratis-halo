import { Maximize2, Play, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import styled from 'styled-components'
import { api_request } from '../../modules/api_client.js'
import { capture_device_context } from '../../modules/device.js'
import { PVT_CONSTANTS } from '../../modules/pvt_scoring.js'
import { Button } from '../atoms/Button.jsx'
import { Card } from '../atoms/Card.jsx'
import { PageShell } from '../molecules/PageShell.jsx'

const Preflight = styled( Card )`
    display: grid;
    max-width: 34rem;
    gap: var(--space-m);
    margin: 8dvh auto 0;
    padding: var(--space-l);
`

const ActionRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
`

const TestSurface = styled.main`
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 100dvh;
    color: #f7fbfc;
    background: #10272f;
    user-select: none;
    touch-action: manipulation;
    overscroll-behavior: none;
`

const TestTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
    padding: var(--space-m);
    color: #d8eef3;
`

const Progress = styled.div`
    width: min(24rem, 45vw);
    height: 0.55rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.16);
`

const ProgressFill = styled.div`
    width: ${ ( { $progress } ) => `${ Math.max( 0, Math.min( 100, $progress ) ) }%` };
    height: 100%;
    background: var(--accent);
    transition: width 160ms linear;
`

const TargetArea = styled.button`
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    border: 0;
    color: inherit;
    background: transparent;
    touch-action: manipulation;
`

const Target = styled.div`
    width: clamp(7rem, 24vmin, 13rem);
    aspect-ratio: 1;
    border: 0.45rem solid #ffffff;
    border-radius: 50%;
    background: ${ ( { $visible } ) => $visible ? `#7ec0d0` : `transparent` };
    opacity: ${ ( { $visible } ) => $visible ? 1 : 0.12 };
    transition: opacity 80ms linear, background 80ms linear;
`

const TestBottom = styled.div`
    display: flex;
    min-height: 4rem;
    align-items: center;
    justify-content: center;
    padding: var(--space-m);
    color: #d8eef3;
    font-weight: 800;
`

const InvalidatedCard = styled( Card )`
    display: grid;
    max-width: 34rem;
    gap: var(--space-m);
    margin: 8dvh auto 0;
    padding: var(--space-l);
`

/**
 * Returns a random stimulus delay.
 * @returns {number} Delay in ms.
 */
export function random_stimulus_delay() {

    const span = PVT_CONSTANTS.stimulus_max_delay_ms - PVT_CONSTANTS.stimulus_min_delay_ms

    return PVT_CONSTANTS.stimulus_min_delay_ms + Math.round( Math.random() * span )
}

/**
 * Daily PVT runner page.
 * @returns {JSX.Element} PVT page.
 */
export function PVTPage() {

    const navigate = useNavigate()
    const [ phase, set_phase ] = useState( `preflight` )
    const [ session, set_session ] = useState( null )
    const [ target_visible, set_target_visible ] = useState( false )
    const [ message, set_message ] = useState( `Ready` )
    const [ progress, set_progress ] = useState( 0 )
    const [ invalidated_reason, set_invalidated_reason ] = useState( null )
    const trials_ref = useRef( [] )
    const trial_index_ref = useRef( 0 )
    const current_trial_ref = useRef( null )
    const stimulus_timer_ref = useRef( null )
    const response_timeout_ref = useRef( null )
    const progress_timer_ref = useRef( null )
    const stall_timer_ref = useRef( null )
    const wake_lock_ref = useRef( null )
    const started_at_ref = useRef( null )
    const initial_viewport_ref = useRef( null )
    const phase_ref = useRef( phase )
    const session_ref = useRef( session )

    useEffect( () => {
        phase_ref.current = phase
    }, [ phase ] )

    useEffect( () => {
        session_ref.current = session
    }, [ session ] )

    const clear_timers = useCallback( () => {
        clearTimeout( stimulus_timer_ref.current )
        clearTimeout( response_timeout_ref.current )
        clearInterval( progress_timer_ref.current )
        clearInterval( stall_timer_ref.current )
    }, [] )

    const release_wake_lock = useCallback( async () => {
        await wake_lock_ref.current?.release?.().catch( () => null )
        wake_lock_ref.current = null
    }, [] )

    const invalidate = useCallback( async reason => {
        if( phase_ref.current !== `running` ) return

        phase_ref.current = `invalidated`
        set_phase( `invalidated` )
        set_invalidated_reason( reason )
        clear_timers()
        await release_wake_lock()

        if( session_ref.current?.id ) {
            await api_request( `/api/pvt/sessions/${ session_ref.current.id }/invalidate`, {
                method: `POST`,
                body: { reason },
            } ).catch( () => null )
        }
    }, [ clear_timers, release_wake_lock ] )

    const append_trial = useCallback( trial => {
        trials_ref.current = [
            ...trials_ref.current,
            {
                trial_index: trial_index_ref.current,
                ...trial,
            },
        ]
        trial_index_ref.current += 1
    }, [] )

    const finish = useCallback( async () => {
        if( phase_ref.current !== `running` ) return

        phase_ref.current = `finishing`
        set_phase( `finishing` )
        set_target_visible( false )
        clear_timers()
        await release_wake_lock()

        try {
            const result = await api_request( `/api/pvt/sessions/${ session_ref.current.id }/complete`, {
                method: `POST`,
                body: {
                    trials: trials_ref.current,
                },
            } )

            navigate( `/test/results/${ result.session.id }`, {
                replace: true,
            } )
        } catch ( error ) {
            toast.error( error.message )
            set_phase( `preflight` )
            phase_ref.current = `preflight`
        }
    }, [ clear_timers, navigate, release_wake_lock ] )

    const schedule_trial = useCallback( () => {
        if( phase_ref.current !== `running` ) return

        const elapsed_ms = performance.now() - started_at_ref.current
        const duration_ms = ( session_ref.current?.duration_seconds || PVT_CONSTANTS.duration_seconds ) * 1000

        if( elapsed_ms >= duration_ms ) {
            finish()
            return
        }

        const delay = random_stimulus_delay()
        const planned_stimulus_at_ms = performance.now() + delay

        current_trial_ref.current = {
            planned_stimulus_at_ms,
            actual_stimulus_at_ms: null,
            response_at_ms: null,
        }
        stimulus_timer_ref.current = setTimeout( () => {
            requestAnimationFrame( timestamp => {
                if( phase_ref.current !== `running` ) return

                current_trial_ref.current = {
                    ...current_trial_ref.current,
                    actual_stimulus_at_ms: timestamp,
                }
                set_target_visible( true )
                set_message( `Now` )
                response_timeout_ref.current = setTimeout( () => {
                    append_trial( {
                        ...current_trial_ref.current,
                        response_at_ms: null,
                    } )
                    set_target_visible( false )
                    set_message( `Miss` )
                    schedule_trial()
                }, PVT_CONSTANTS.no_response_timeout_ms )
            } )
        }, delay )
    }, [ append_trial, finish ] )

    const respond = useCallback( event => {
        if( phase_ref.current !== `running` ) return

        event.preventDefault()
        const response_at_ms = event.timeStamp && event.timeStamp > 0 ? event.timeStamp : performance.now()
        const current_trial = current_trial_ref.current || {
            planned_stimulus_at_ms: null,
            actual_stimulus_at_ms: null,
        }

        clearTimeout( stimulus_timer_ref.current )
        clearTimeout( response_timeout_ref.current )

        append_trial( {
            ...current_trial,
            response_at_ms,
        } )
        current_trial_ref.current = null
        set_target_visible( false )
        set_message( current_trial.actual_stimulus_at_ms ? `Logged` : `Early` )
        schedule_trial()
    }, [ append_trial, schedule_trial ] )

    const start = async () => {
        trials_ref.current = []
        trial_index_ref.current = 0
        current_trial_ref.current = null
        initial_viewport_ref.current = {
            width: window.innerWidth,
            height: window.innerHeight,
        }

        try {
            await document.documentElement.requestFullscreen?.()
        } catch {
            toast.error( `Fullscreen unavailable` )
        }

        const device_context = capture_device_context()
        let wake_lock_active = false

        if( device_context.wake_lock_supported ) {
            try {
                wake_lock_ref.current = await navigator.wakeLock.request( `screen` )
                wake_lock_active = true
                wake_lock_ref.current.addEventListener( `release`, () => invalidate( `wake_lock_released` ), { once: true } )
            } catch {
                await invalidate( `wake_lock_failed` )
                return
            }
        }

        const { session: created_session } = await api_request( `/api/pvt/sessions`, {
            method: `POST`,
            body: {
                ...device_context,
                wake_lock_active,
                input_type: `unknown`,
            },
        } )

        set_session( created_session )
        session_ref.current = created_session
        started_at_ref.current = performance.now()
        phase_ref.current = `running`
        set_phase( `running` )
        set_message( `Wait` )
        schedule_trial()

        progress_timer_ref.current = setInterval( () => {
            const elapsed_ms = performance.now() - started_at_ref.current
            const duration_ms = created_session.duration_seconds * 1000

            set_progress(  elapsed_ms / duration_ms  * 100 )
            if( elapsed_ms >= duration_ms ) finish()
        }, 250 )

        let last_tick = performance.now()

        stall_timer_ref.current = setInterval( () => {
            const now = performance.now()

            if( now - last_tick > 1500 ) invalidate( `main_thread_stall` )
            last_tick = now
        }, 1000 )
    }

    useEffect( () => {
        if( phase !== `running` ) return undefined

        const hide = () => {
            if( document.visibilityState !== `visible` ) invalidate( `visibility_lost` )
        }
        const blur = () => invalidate( `focus_lost` )
        const fullscreen = () => {
            if( !document.fullscreenElement ) invalidate( `fullscreen_exited` )
        }
        const orientation = () => invalidate( `orientation_changed` )
        const resize = () => {
            const initial = initial_viewport_ref.current
            const width_delta = Math.abs( window.innerWidth - initial.width )
            const height_delta = Math.abs( window.innerHeight - initial.height )

            if( width_delta > 80 || height_delta > 80 ) invalidate( `viewport_resized` )
        }
        const before_unload = () => invalidate( `route_left` )
        const keydown = event => {
            if( event.repeat ) return
            respond( event )
        }

        document.addEventListener( `visibilitychange`, hide )
        window.addEventListener( `blur`, blur )
        document.addEventListener( `fullscreenchange`, fullscreen )
        window.addEventListener( `orientationchange`, orientation )
        window.addEventListener( `resize`, resize )
        window.addEventListener( `beforeunload`, before_unload )
        window.addEventListener( `keydown`, keydown )

        return () => {
            document.removeEventListener( `visibilitychange`, hide )
            window.removeEventListener( `blur`, blur )
            document.removeEventListener( `fullscreenchange`, fullscreen )
            window.removeEventListener( `orientationchange`, orientation )
            window.removeEventListener( `resize`, resize )
            window.removeEventListener( `beforeunload`, before_unload )
            window.removeEventListener( `keydown`, keydown )
        }
    }, [ invalidate, phase, respond ] )

    useEffect( () => () => {
        clear_timers()
        release_wake_lock()
    }, [ clear_timers, release_wake_lock ] )

    if( phase === `running` || phase === `finishing` ) return <TestSurface>
        <TestTop>
            <strong>{ phase === `finishing` ? `Saving` : message }</strong>
            <Progress aria-label="Progress">
                <ProgressFill $progress={ progress } />
            </Progress>
        </TestTop>
        <TargetArea type="button" onPointerDown={ respond } aria-label="PVT response target">
            <Target $visible={ target_visible } />
        </TargetArea>
        <TestBottom>{ trials_ref.current.length } trials</TestBottom>
    </TestSurface>

    if( phase === `invalidated` ) return <PageShell>
        <InvalidatedCard>
            <h1>Invalidated</h1>
            <p>{ invalidated_reason?.replaceAll( `_`, ` ` ) || `Session stopped` }</p>
            <Button type="button" onClick={ () => window.location.reload() }>
                <XCircle aria-hidden="true" />
                Reset
            </Button>
        </InvalidatedCard>
    </PageShell>

    return <PageShell>
        <Preflight>
            <h1>Daily PVT</h1>
            <p>60-90 minutes after waking</p>
            <ActionRow>
                <Button type="button" onClick={ start }>
                    <Play aria-hidden="true" />
                    Start scored
                </Button>
                <Button type="button" $variant="ghost" onClick={ () => document.documentElement.requestFullscreen?.() }>
                    <Maximize2 aria-hidden="true" />
                    Fullscreen
                </Button>
            </ActionRow>
        </Preflight>
    </PageShell>
}
