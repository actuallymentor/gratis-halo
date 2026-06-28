import { Activity, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import styled from 'styled-components'
import { logout } from '../../modules/api_client.js'
import { use_app_store } from '../../stores/app_store.js'
import { Button } from '../atoms/Button.jsx'

const Shell = styled.div`
    min-height: 100dvh;
`

const Header = styled.header`
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--line);
    background: rgb(250 251 252 / 0.92);
    backdrop-filter: blur(10px);
`

const HeaderInner = styled.div`
    display: flex;
    width: min(1180px, 100%);
    min-height: 4rem;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
    margin: 0 auto;
    padding: 0 var(--space-m);
`

const Brand = styled( Link )`
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--ink);
    font-family: "Montserrat", system-ui, sans-serif;
    font-weight: 700;
    text-decoration: none;

    svg {
        width: 1.45rem;
        height: 1.45rem;
        color: var(--accent-strong);
    }
`

const Nav = styled.nav`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`

const Main = styled.main`
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: var(--space-xl) var(--space-m) var(--space-2xl);
`

const IconLink = styled( Link )`
    display: inline-flex;
    min-width: 2.75rem;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--ink);
    background: var(--surface);

    &:focus-visible {
        outline: 3px solid #b9e5ee;
        outline-offset: 2px;
    }

    svg {
        width: 1.15rem;
        height: 1.15rem;
    }
`

/**
 * Clears service workers and reloads the app.
 * @returns {Promise<void>} Completion promise.
 */
export async function force_update_app() {

    const registrations = await navigator.serviceWorker?.getRegistrations?.() || []

    await Promise.all( registrations.map( registration => registration.unregister() ) )
    window.location.reload()
}

/**
 * Shared authenticated page shell.
 * @param {Object} props - Component props.
 * @returns {JSX.Element} Shell element.
 */
export function PageShell( { children, show_nav = true } ) {

    const { update_ready, update_service_worker } = use_app_store()

    const update_app = async () => {
        if( update_service_worker ) await update_service_worker( true )
        else await force_update_app()
    }

    return <Shell>
        <Header>
            <HeaderInner>
                <Brand to="/">
                    <Activity aria-hidden="true" />
                    Halo
                </Brand>
                { show_nav && <Nav aria-label="Main">
                    <IconLink to="/privacy" title="Privacy">
                        <ShieldCheck aria-hidden="true" />
                    </IconLink>
                    { update_ready && <Button type="button" $variant="ghost" onClick={ update_app } title="Update app">
                        <RefreshCw aria-hidden="true" />
                        Update
                    </Button> }
                    <Button type="button" $variant="ghost" onClick={ logout } title="Log out">
                        <LogOut aria-hidden="true" />
                    </Button>
                </Nav> }
            </HeaderInner>
        </Header>
        <Main>{ children }</Main>
    </Shell>
}

