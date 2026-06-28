import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import styled from 'styled-components'
import { format_delta, format_number } from '../../modules/format.js'
import { StatusPill } from '../atoms/StatusPill.jsx'

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;

    @media (max-width: 900px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
    }
`

const WindowCard = styled.div`
    display: grid;
    min-height: 10rem;
    align-content: start;
    gap: 0.6rem;
    padding: 0.85rem;
    border: 1px solid ${ ( { $active } ) => $active ? `var(--accent-strong)` : `var(--line)` };
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: ${ ( { $active } ) => $active ? `0 0 0 3px #d8eef3` : `none` };
`

const WindowHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
`

const WindowTitle = styled.h3`
    font-size: 0.92rem;
`

const StatRow = styled.dl`
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.2rem 0.6rem;
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;

    dt,
    dd {
        margin: 0;
    }

    dd {
        color: var(--ink);
        font-weight: 800;
    }
`

const Delta = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: ${ ( { $status } ) => $status === `far_outside` ? `var(--red)` : $status === `outside` ? `var(--orange)` : `var(--ink)` };
    font-size: 1rem;
    font-weight: 900;

    svg {
        width: 1rem;
        height: 1rem;
    }
`

/**
 * Selects an icon for a delta direction.
 * @param {number|null} delta - Numeric delta.
 * @returns {Function} Icon component.
 */
export function delta_icon( delta ) {

    if( delta > 0 ) return ArrowUp
    if( delta < 0 ) return ArrowDown

    return Minus
}

/**
 * Shows baseline comparisons across Halo's rolling windows.
 * @param {Object} props - Component props.
 * @returns {JSX.Element} Baseline grid.
 */
export function BaselineGrid( { comparisons = [], focus_window = `30`, unit = `` } ) {

    return <Grid>
        { comparisons.map( comparison => {
            const Icon = delta_icon( comparison.delta )

            return <WindowCard key={ comparison.days } $active={ `${ comparison.days }` === `${ focus_window }` }>
                <WindowHeader>
                    <WindowTitle>{ comparison.days }d</WindowTitle>
                    <StatusPill status={ comparison.status } />
                </WindowHeader>
                <Delta $status={ comparison.status }>
                    <Icon aria-hidden="true" />
                    { format_delta( comparison.delta, { decimals: 1, suffix: unit } ) }
                </Delta>
                <StatRow>
                    <dt>Mean</dt>
                    <dd>{ format_number( comparison.mean, { decimals: 1, suffix: unit } ) }</dd>
                    <dt>SD</dt>
                    <dd>{ format_number( comparison.standard_deviation, { decimals: 1, suffix: unit } ) }</dd>
                    <dt>z</dt>
                    <dd>{ format_number( comparison.z_score, { decimals: 2 } ) }</dd>
                    <dt>n</dt>
                    <dd>{ comparison.sample_count }/{ comparison.minimum_samples }</dd>
                </StatRow>
            </WindowCard>
        } ) }
    </Grid>
}
