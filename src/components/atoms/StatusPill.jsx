import { AlertTriangle, CheckCircle2, Info, MinusCircle } from 'lucide-react'
import styled from 'styled-components'

const STATUS_META = {
    usual: {
        label: `Usual range`,
        Icon: CheckCircle2,
    },
    notable: {
        label: `Notable shift`,
        Icon: Info,
    },
    outside: {
        label: `Outside usual`,
        Icon: AlertTriangle,
    },
    far_outside: {
        label: `Far outside usual`,
        Icon: AlertTriangle,
    },
    building: {
        label: `Building baseline`,
        Icon: MinusCircle,
    },
}

const Pill = styled.span`
    display: inline-flex;
    min-height: 1.85rem;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.55rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    color: ${ ( { $status } ) => {
        if( $status === `usual` ) return `var(--green)`
        if( $status === `notable` ) return `var(--amber)`
        if( $status === `outside` ) return `var(--orange)`
        if( $status === `far_outside` ) return `var(--red)`
        return `var(--muted)`
    } };
    background: ${ ( { $status } ) => {
        if( $status === `usual` ) return `var(--green-bg)`
        if( $status === `notable` ) return `var(--amber-bg)`
        if( $status === `outside` ) return `var(--orange-bg)`
        if( $status === `far_outside` ) return `var(--red-bg)`
        return `var(--surface-soft)`
    } };
    font-size: 0.83rem;
    font-weight: 800;

    svg {
        width: 0.95rem;
        height: 0.95rem;
    }
`

/**
 * Shows a z-score status with icon and label.
 * @param {Object} props - Component props.
 * @returns {JSX.Element} Pill element.
 */
export function StatusPill( { status = `building` } ) {

    const { label, Icon } = STATUS_META[ status ] || STATUS_META.building

    return <Pill $status={ status }>
        <Icon aria-hidden="true" />
        { label }
    </Pill>
}

