import { Activity, Brain, RefreshCw, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { StringParam, useQueryParam } from 'use-query-params'
import styled from 'styled-components'
import { api_request } from '../../modules/api_client.js'
import { format_datetime, format_number } from '../../modules/format.js'
import { Button } from '../atoms/Button.jsx'
import { Card } from '../atoms/Card.jsx'
import { MetricPanel } from '../molecules/MetricPanel.jsx'
import { PageShell } from '../molecules/PageShell.jsx'

const HeaderGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-m);
    align-items: end;
    margin-bottom: var(--space-l);

    @media (max-width: 760px) {
        grid-template-columns: 1fr;
    }
`

const TitleBlock = styled.div`
    display: grid;
    gap: 0.4rem;
`

const Title = styled.h1`
    font-size: 2.35rem;

    @media (max-width: 620px) {
        font-size: 1.75rem;
    }
`

const StatusBand = styled( Card )`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    margin-bottom: var(--space-l);
    background: var(--line);

    @media (max-width: 860px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 520px) {
        grid-template-columns: 1fr;
    }
`

const StatusCell = styled.div`
    display: grid;
    gap: 0.35rem;
    min-height: 7rem;
    padding: var(--space-m);
    background: var(--surface);
`

const CellLabel = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 900;
    text-transform: uppercase;

    svg {
        width: 1rem;
        height: 1rem;
    }
`

const CellValue = styled.div`
    font-family: "Montserrat", system-ui, sans-serif;
    font-size: 1.55rem;
    font-weight: 700;

    @media (max-width: 620px) {
        font-size: 1.3rem;
    }
`

const Panels = styled.div`
    display: grid;
    gap: var(--space-m);
`

const WindowTabs = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
`

const WindowTab = styled.button`
    min-height: 2.4rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid ${ ( { $active } ) => $active ? `var(--accent-strong)` : `var(--line)` };
    border-radius: var(--radius);
    color: ${ ( { $active } ) => $active ? `#ffffff` : `var(--ink)` };
    background: ${ ( { $active } ) => $active ? `var(--accent-strong)` : `var(--surface)` };
    font-weight: 800;
`

/**
 * Reads cached dashboard data.
 * @returns {Object|null} Cached dashboard.
 */
export function read_cached_dashboard() {

    try {
        return JSON.parse( localStorage.getItem( `halo_dashboard_cache` ) )
    } catch {
        return null
    }
}

/**
 * Main authenticated dashboard.
 * @returns {JSX.Element} Dashboard page.
 */
export function DashboardPage() {

    const [ dashboard, set_dashboard ] = useState( null )
    const [ is_loading, set_is_loading ] = useState( true )
    const [ is_cached, set_is_cached ] = useState( false )
    const [ focus_window = `30`, set_focus_window ] = useQueryParam( `window`, StringParam )
    const navigate = useNavigate()

    const load_dashboard = async () => {
        set_is_loading( true )

        try {
            const data = await api_request( `/api/dashboard` )

            localStorage.setItem( `halo_dashboard_cache`, JSON.stringify( data ) )
            set_dashboard( data )
            set_is_cached( false )
        } catch ( error ) {
            if( error.status === 401 ) {
                navigate( `/login`, { replace: true } )
                return
            }

            const cached_dashboard = read_cached_dashboard()

            if( cached_dashboard ) {
                set_dashboard( cached_dashboard )
                set_is_cached( true )
            }
        } finally {
            set_is_loading( false )
        }
    }

    useEffect( () => {
        load_dashboard()
    }, [] )

    if( is_loading && !dashboard ) return <PageShell>
        <Title>Halo</Title>
        <p>Syncing</p>
    </PageShell>

    const hrv_average = dashboard?.hrv?.average_hrv_ms
    const hrv_max = dashboard?.hrv?.max_sleep_hrv_ms
    const pvt_score = dashboard?.pvt?.score
    const latest_night = dashboard?.hrv?.latest_night
    const today_session = dashboard?.pvt?.today_session

    return <PageShell>
        <HeaderGrid>
            <TitleBlock>
                <Title>Dashboard</Title>
                <p>{ is_cached ? `Offline snapshot` : `Updated ${ format_datetime( dashboard?.generated_at ) }` }</p>
            </TitleBlock>
            <WindowTabs aria-label="Baseline focus">
                { [ `7`, `30`, `90`, `365` ].map( days => <WindowTab
                    key={ days }
                    type="button"
                    aria-pressed={ focus_window === days }
                    $active={ focus_window === days }
                    onClick={ () => set_focus_window( days ) }
                >
                    { days }d
                </WindowTab> ) }
            </WindowTabs>
        </HeaderGrid>

        <StatusBand>
            <StatusCell>
                <CellLabel><RefreshCw aria-hidden="true" />Oura sync</CellLabel>
                <CellValue>{ dashboard?.sync?.status || `idle` }</CellValue>
                <p>{ dashboard?.sync?.needs_reauth ? `Re-auth needed` : `${ dashboard?.sync?.records_written || 0 } nights written` }</p>
            </StatusCell>
            <StatusCell>
                <CellLabel><Activity aria-hidden="true" />Average HRV</CellLabel>
                <CellValue>{ format_number( hrv_average?.current_value, { suffix: ` ms` } ) }</CellValue>
                <p>{ latest_night?.day || `No night yet` }</p>
            </StatusCell>
            <StatusCell>
                <CellLabel><Activity aria-hidden="true" />Max sleep HRV</CellLabel>
                <CellValue>{ format_number( hrv_max?.current_value, { suffix: ` ms` } ) }</CellValue>
                <p>{ latest_night?.max_hrv_filter_quality || `No sample yet` }</p>
            </StatusCell>
            <StatusCell>
                <CellLabel><Brain aria-hidden="true" />PVT</CellLabel>
                <CellValue>{ today_session ? format_number( today_session.score ) : `Open` }</CellValue>
                { dashboard?.pvt?.completed_today
                    ? <p>{ format_datetime( today_session.completed_at ) }</p>
                    : <Button as={ Link } to="/test">
                        <Timer aria-hidden="true" />
                        Start
                    </Button> }
            </StatusCell>
        </StatusBand>

        <Panels>
            <MetricPanel title="Average HRV" metric={ hrv_average } focus_window={ focus_window } unit=" ms" />
            <MetricPanel title="Max sleeping HRV" metric={ hrv_max } focus_window={ focus_window } unit=" ms" />
            <MetricPanel title="PVT score" metric={ pvt_score } focus_window={ focus_window } />
        </Panels>
    </PageShell>
}
