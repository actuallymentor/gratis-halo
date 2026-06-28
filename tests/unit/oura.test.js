import { describe, expect, it } from 'vitest'
import { build_oura_authorize_url, create_oura_oauth_start, get_redirect_uri } from '../../src/worker/oura.js'

describe( `Oura OAuth`, () => {
    it( `builds exact localhost callback and daily email scope`, () => {
        const request = new Request( `http://localhost:8787/auth/oura/start` )
        const env = {
            OURA_CLIENT_ID: `client-id`,
        }
        const url = new URL( build_oura_authorize_url( {
            env,
            request,
            state: `state-value`,
        } ) )

        expect( get_redirect_uri( request ) ).toBe( `http://localhost:8787/auth/oura/callback` )
        expect( url.origin + url.pathname ).toBe( `https://cloud.ouraring.com/oauth/authorize` )
        expect( url.searchParams.get( `response_type` ) ).toBe( `code` )
        expect( url.searchParams.get( `client_id` ) ).toBe( `client-id` )
        expect( url.searchParams.get( `scope` ) ).toBe( `daily email` )
        expect( url.searchParams.get( `state` ) ).toBe( `state-value` )
    } )

    it( `creates an external authorize URL for browser-safe OAuth start`, async () => {
        const request = new Request( `https://halo.gratis.sh/api/invite/verify` )
        const env = {
            OURA_CLIENT_ID: `client-id`,
            SESSION_SECRET: `test-session-secret`,
        }
        const { start_url, state_cookie } = await create_oura_oauth_start( {
            env,
            request,
        } )
        const url = new URL( start_url )

        expect( url.origin + url.pathname ).toBe( `https://cloud.ouraring.com/oauth/authorize` )
        expect( url.searchParams.get( `redirect_uri` ) ).toBe( `https://halo.gratis.sh/auth/oura/callback` )
        expect( state_cookie ).toContain( `halo_oura_state=` )
        expect( state_cookie ).toContain( `Secure` )
    } )
} )
