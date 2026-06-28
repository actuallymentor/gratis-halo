import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import styled from 'styled-components'

const Pill = styled.button`
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 20;
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--accent-strong);
    border-radius: 999px;
    color: #ffffff;
    background: var(--accent-strong);
    font-weight: 800;
    box-shadow: 0 10px 28px rgb(20 49 58 / 0.18);

    svg {
        width: 1rem;
        height: 1rem;
    }
`

/**
 * Shows the install prompt when the browser offers one.
 * @returns {JSX.Element|null} Install pill.
 */
export function InstallAppPill() {

    const [ deferred_prompt, set_deferred_prompt ] = useState( null )
    const is_standalone = window.matchMedia?.( `(display-mode: standalone)` ).matches
        || window.navigator.standalone

    useEffect( () => {
        const save_prompt = event => {
            event.preventDefault()
            set_deferred_prompt( event )
        }

        window.addEventListener( `beforeinstallprompt`, save_prompt )

        return () => window.removeEventListener( `beforeinstallprompt`, save_prompt )
    }, [] )

    const install_app = async () => {
        await deferred_prompt?.prompt()
        set_deferred_prompt( null )
    }

    if( is_standalone || !deferred_prompt ) return null

    return <Pill type="button" onClick={ install_app }>
        <Download aria-hidden="true" />
        Install App
    </Pill>
}

