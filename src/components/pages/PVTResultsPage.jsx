import { ArrowLeft, Brain } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import styled from 'styled-components'
import { api_request } from '../../modules/api_client.js'
import { format_datetime, format_number } from '../../modules/format.js'
import { Button } from '../atoms/Button.jsx'
import { Card } from '../atoms/Card.jsx'
import { PageShell } from '../molecules/PageShell.jsx'

const ResultCard = styled( Card )`
    display: grid;
    max-width: 46rem;
    gap: var(--space-m);
    padding: var(--space-l);
`

const Score = styled.div`
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
    font-family: "Montserrat", system-ui, sans-serif;
    font-size: 3rem;
    font-weight: 700;

    @media (max-width: 620px) {
        font-size: 2.2rem;
    }

    svg {
        width: 2rem;
        height: 2rem;
        color: var(--accent-strong);
    }
`

const Stats = styled.dl`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    margin: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--line);

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
    }

    div {
        display: grid;
        gap: 0.3rem;
        padding: var(--space-m);
        background: var(--surface);
    }

    dt,
    dd {
        margin: 0;
    }

    dt {
        color: var(--muted);
        font-size: 0.86rem;
        font-weight: 900;
        text-transform: uppercase;
    }

    dd {
        font-size: 1.25rem;
        font-weight: 900;
    }
`

/**
 * PVT result summary page.
 * @returns {JSX.Element} Results page.
 */
export function PVTResultsPage() {

    const { session_id } = useParams()
    const [ session, set_session ] = useState( null )

    useEffect( () => {
        api_request( `/api/pvt/history` )
            .then( ( { sessions } ) => set_session( sessions.find( item => item.id === session_id ) || null ) )
            .catch( () => null )
    }, [ session_id ] )

    return <PageShell>
        <ResultCard>
            <h1>PVT result</h1>
            <Score>
                <Brain aria-hidden="true" />
                { format_number( session?.score ) }
            </Score>
            <p>{ format_datetime( session?.completed_at ) }</p>
            <Stats>
                <div>
                    <dt>Median RT</dt>
                    <dd>{ format_number( session?.median_rt_ms, { suffix: ` ms` } ) }</dd>
                </div>
                <div>
                    <dt>Mean RT</dt>
                    <dd>{ format_number( session?.mean_rt_ms, { suffix: ` ms` } ) }</dd>
                </div>
                <div>
                    <dt>Lapses</dt>
                    <dd>{ format_number( session?.lapses_355_ms ) }</dd>
                </div>
                <div>
                    <dt>False starts</dt>
                    <dd>{ format_number( session?.false_starts ) }</dd>
                </div>
            </Stats>
            <Button as={ Link } to="/" $variant="ghost">
                <ArrowLeft aria-hidden="true" />
                Dashboard
            </Button>
        </ResultCard>
    </PageShell>
}
