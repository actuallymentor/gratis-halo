import styled, { css } from 'styled-components'

export const Button = styled.button`
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.6rem 0.9rem;
    border: 1px solid ${ ( { $variant } ) => $variant === `ghost` ? `var(--line)` : `var(--accent-strong)` };
    border-radius: var(--radius);
    color: ${ ( { $variant } ) => $variant === `ghost` ? `var(--ink)` : `#ffffff` };
    background: ${ ( { $variant } ) => $variant === `ghost` ? `var(--surface)` : `var(--accent-strong)` };
    font-weight: 700;
    text-decoration: none;
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;

    ${ ( { $full } ) => $full && css`
        width: 100%;
    ` }

    &:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: #1d6575;
        background: ${ ( { $variant } ) => $variant === `ghost` ? `var(--surface-soft)` : `#1d6575` };
    }

    &:focus-visible {
        outline: 3px solid #b9e5ee;
        outline-offset: 2px;
    }

    &:disabled {
        opacity: 0.55;
    }

    svg {
        width: 1.05rem;
        height: 1.05rem;
        flex: 0 0 auto;
    }
`

