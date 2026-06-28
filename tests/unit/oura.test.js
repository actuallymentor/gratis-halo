import { describe, expect, it } from 'vitest'
import { build_oura_authorize_url, get_redirect_uri } from '../../src/worker/oura.js'

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
} )

