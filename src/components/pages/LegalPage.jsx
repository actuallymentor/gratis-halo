import styled from 'styled-components'
import { Card } from '../atoms/Card.jsx'
import { PageShell } from '../molecules/PageShell.jsx'

const LegalCard = styled( Card )`
    display: grid;
    max-width: 65ch;
    gap: var(--space-m);
    padding: var(--space-l);
`

const Items = styled.ul`
    display: grid;
    gap: 0.65rem;
    margin: 0;
    padding-left: 1.2rem;
`

const COPY = {
    privacy: {
        title: `Privacy`,
        items: [
            `Halo stores Oura sleep and HRV data needed for the dashboard.`,
            `Halo stores PVT results and trial timing data.`,
            `Halo uses the data only to show your dashboard.`,
            `Halo does not sell data.`,
            `Halo does not make medical claims.`,
            `Contact: mentor@palokaj.co.`,
            `Entity: MMOH.`,
        ],
    },
    tos: {
        title: `Terms`,
        items: [
            `Halo is a private beta.`,
            `Use Halo at your own discretion.`,
            `Halo is not medical advice.`,
            `Halo does not guarantee uptime or correctness.`,
            `You can stop using Halo at any time.`,
            `Contact: mentor@palokaj.co.`,
            `Entity: MMOH.`,
        ],
    },
}

/**
 * Renders Halo privacy and terms pages.
 * @param {Object} props - Component props.
 * @returns {JSX.Element} Legal page.
 */
export function LegalPage( { kind } ) {

    const copy = COPY[ kind ] || COPY.privacy

    return <PageShell>
        <LegalCard>
            <h1>{ copy.title }</h1>
            <Items>
                { copy.items.map( item => <li key={ item }>{ item }</li> ) }
            </Items>
        </LegalCard>
    </PageShell>
}

