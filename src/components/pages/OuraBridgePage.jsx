import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import styled, { keyframes } from 'styled-components'
import { api_request } from '../../modules/api_client.js'
import { release_service_workers_for_oauth } from '../../modules/service_workers.js'
import { Card } from '../atoms/Card.jsx'
import { PageShell } from '../molecules/PageShell.jsx'

const BridgeWrap = styled.div`
    display: grid;
    min-height: calc(100dvh - 8rem);
    place-items: center;
`

const BridgeCard = styled( Card )`
    display: grid;
    width: min(28rem, 100%);
    gap: var(--space-m);
    padding: var(--space-l);
`

const spin = keyframes`
    to {
        transform: rotate(360deg);
    }
`

const Spinner = styled( LoaderCircle )`
    animation: ${ spin } 900ms linear infinite;
`

const get_login_error_url = error => {

    const code = error?.code || `oura_login_failed`

    return `/login?error=${ encodeURIComponent( code ) }`
}

/**
 * Recovers OAuth start/callback navigations if a stale service worker serves the SPA shell.
 * @param {Object} props - Page props.
 * @param {'start'|'callback'} props.kind - OAuth bridge kind.
 * @returns {JSX.Element} OAuth bridge page.
 */
export function OuraBridgePage( { kind } ) {

    const [ message, set_message ] = useState( kind === `start`
        ? `Opening Oura sign-in...`
        : `Finishing Oura sign-in...` )

    useEffect( () => {
        const continue_oura_start = async () => {
            try {
                const { start_url } = await api_request( `/api/oura/start`, {
                    method: `POST`,
                } )

                await release_service_workers_for_oauth()
                window.location.assign( start_url )
            } catch ( error ) {
                toast.error( error.message, { id: `oura-start-error` } )
                window.location.replace( get_login_error_url( error ) )
            }
        }

        const continue_oura_callback = async () => {
            try {
                const response = await fetch( `${ window.location.pathname }${ window.location.search }`, {
                    credentials: `same-origin`,
                } )

                if( !response.ok ) throw new Error( `Oura callback failed` )

                const next_url = new URL( response.url )

                window.location.replace( `${ next_url.pathname }${ next_url.search }` )
            } catch ( error ) {
                set_message( `Oura sign-in could not finish.` )
                toast.error( error.message, { id: `oura-callback-error` } )
                window.location.replace( `/login?error=oura_login_failed` )
            }
        }

        if( kind === `start` ) continue_oura_start()
        else continue_oura_callback()
    }, [ kind ] )

    return <PageShell show_nav={ false }>
        <BridgeWrap>
            <BridgeCard>
                <Spinner aria-hidden="true" />
                <h1>{ message }</h1>
                <p>Keep this tab open.</p>
            </BridgeCard>
        </BridgeWrap>
    </PageShell>
}
