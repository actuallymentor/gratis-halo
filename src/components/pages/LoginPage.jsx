import { CircleAlert, LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import toast from 'react-hot-toast'
import styled from 'styled-components'
import { api_request } from '../../modules/api_client.js'
import { release_service_workers_for_oauth } from '../../modules/service_workers.js'
import { Button } from '../atoms/Button.jsx'
import { Card } from '../atoms/Card.jsx'
import { PageShell } from '../molecules/PageShell.jsx'

const LoginWrap = styled.div`
    display: grid;
    min-height: calc(100dvh - 8rem);
    place-items: center;
`

const LoginCard = styled( Card )`
    display: grid;
    width: min(28rem, 100%);
    gap: var(--space-m);
    padding: var(--space-l);
`

const TitleBlock = styled.div`
    display: grid;
    gap: 0.35rem;
`

const Title = styled.h1`
    font-size: 2.35rem;

    @media (max-width: 620px) {
        font-size: 1.9rem;
    }
`

const Field = styled.label`
    display: grid;
    gap: 0.4rem;
    color: var(--muted);
    font-weight: 800;
`

const Input = styled.input`
    min-height: 3rem;
    width: 100%;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--ink);
    background: var(--surface);

    &:focus {
        border-color: var(--accent-strong);
        outline: 3px solid #b9e5ee;
    }
`

const LegalLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    color: var(--muted);
    font-size: 0.9rem;
`

const FormSpacer = styled.div`
    height: 1rem;
`

const ErrorBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid #e2a7a0;
    border-radius: var(--radius);
    color: #691d16;
    background: #fff1ef;
    font-weight: 800;
    line-height: 1.5;

    svg {
        flex: 0 0 auto;
        margin-top: 0.15rem;
    }
`

const LOGIN_ERROR_MESSAGES = {
    access_denied: `Oura sign-in was cancelled.`,
    invalid_invite: `That invite code is not valid.`,
    invalid_oauth_state: `Your Oura sign-in expired. Start again from the invite code.`,
    invite_required: `Enter the invite code again before connecting Oura.`,
    oura_login_failed: `Oura could not finish sign-in. Start again from the invite code.`,
    rate_limited: `Too many invite attempts. Try again later.`,
    server_error: `Halo could not check that invite code. Try again in a moment.`,
}

const get_login_error_message = error => {

    const error_key = typeof error === `string` ? error : error?.code

    if( LOGIN_ERROR_MESSAGES[ error_key ] ) return LOGIN_ERROR_MESSAGES[ error_key ]
    if( error?.status >= 500 ) return LOGIN_ERROR_MESSAGES.server_error

    const fallback_message = typeof error === `string` ? error : error?.message

    return fallback_message?.replaceAll( `_`, ` ` ) || `Halo could not continue sign-in.`
}

/**
 * Invite gate and Oura login entry.
 * @returns {JSX.Element} Login page.
 */
export function LoginPage() {

    const [ code, set_code ] = useState( `` )
    const [ form_error, set_form_error ] = useState( `` )
    const [ is_submitting, set_is_submitting ] = useState( false )
    const [ search_params ] = useSearchParams()
    const navigate = useNavigate()

    useEffect( () => {
        if( window.location.hostname !== `127.0.0.1` ) return

        const canonical_url = new URL( window.location.href )

        canonical_url.hostname = `localhost`
        window.location.replace( canonical_url.toString() )
    }, [] )

    useEffect( () => {
        api_request( `/api/me` )
            .then( ( { authenticated } ) => {
                if( authenticated ) navigate( `/`, { replace: true } )
            } )
            .catch( () => null )
    }, [ navigate ] )

    useEffect( () => {
        const error = search_params.get( `error` )

        if( !error ) return

        const message = get_login_error_message( error )

        set_form_error( message )
        toast.error( message, { id: `login-error` } )
    }, [ search_params ] )

    const change_code = event => {
        set_code( event.target.value )
        if( form_error ) set_form_error( `` )
    }

    const verify_invite = async event => {
        event.preventDefault()
        set_form_error( `` )
        set_is_submitting( true )

        try {
            const { start_url } = await api_request( `/api/invite/verify`, {
                method: `POST`,
                body: { code },
            } )

            await release_service_workers_for_oauth()
            window.location.assign( start_url )
        } catch ( error ) {
            const message = get_login_error_message( error )

            set_form_error( message )
            toast.error( message, { id: `invite-error` } )
        } finally {
            set_is_submitting( false )
        }
    }

    return <PageShell show_nav={ false }>
        <LoginWrap>
            <LoginCard>
                <TitleBlock>
                    <Title>Halo</Title>
                    <p>Private beta</p>
                </TitleBlock>
                <form onSubmit={ verify_invite }>
                    { form_error && <ErrorBanner id="invite-error" role="alert" aria-live="assertive">
                        <CircleAlert aria-hidden="true" size={ 20 } />
                        <span>{ form_error }</span>
                    </ErrorBanner> }
                    { form_error && <FormSpacer /> }
                    <Field>
                        Invite code
                        <Input
                            autoComplete="one-time-code"
                            value={ code }
                            aria-describedby={ form_error ? `invite-error` : undefined }
                            onChange={ change_code }
                            required
                        />
                    </Field>
                    <FormSpacer />
                    <Button type="submit" $full disabled={ is_submitting }>
                        <LogIn aria-hidden="true" />
                        Continue with Oura
                    </Button>
                </form>
                <LegalLinks>
                    <a href="/privacy">Privacy</a>
                    <a href="/tos">Terms</a>
                </LegalLinks>
            </LoginCard>
        </LoginWrap>
    </PageShell>
}
