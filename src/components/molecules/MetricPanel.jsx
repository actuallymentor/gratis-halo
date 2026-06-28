import styled from 'styled-components'
import { format_number } from '../../modules/format.js'
import { Card } from '../atoms/Card.jsx'
import { BaselineGrid } from './BaselineGrid.jsx'

const Panel = styled( Card )`
    display: grid;
    gap: var(--space-m);
    padding: var(--space-m);
`

const Header = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-m);
`

const Title = styled.h2`
    font-size: 1.15rem;
`

const Value = styled.div`
    font-family: "Montserrat", system-ui, sans-serif;
    font-size: 2rem;
    font-weight: 700;

    @media (max-width: 620px) {
        font-size: 1.65rem;
    }
`

/**
 * Displays a current metric with rolling baseline comparisons.
 * @param {Object} props - Component props.
 * @returns {JSX.Element} Metric panel.
 */
export function MetricPanel( { title, metric, focus_window = `30`, unit = ``, decimals = 0 } ) {

    if( !metric ) return <Panel>
        <Header>
            <Title>{ title }</Title>
            <Value>--</Value>
        </Header>
        <p>Building baseline</p>
    </Panel>

    return <Panel>
        <Header>
            <Title>{ title }</Title>
            <Value>{ format_number( metric.current_value, { decimals, suffix: unit } ) }</Value>
        </Header>
        <BaselineGrid comparisons={ metric.comparisons } focus_window={ focus_window } unit={ unit } />
    </Panel>
}
