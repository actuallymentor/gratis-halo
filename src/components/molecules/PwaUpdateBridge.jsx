import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { use_app_store } from '../../stores/app_store.js'

/**
 * Bridges vite-plugin-pwa update state into the app store.
 * @returns {null} No visible element.
 */
export function PwaUpdateBridge() {

    const set_update_ready = use_app_store( state => state.set_update_ready )
    const {
        needRefresh: [ need_refresh ],
        updateServiceWorker,
    } = useRegisterSW()

    useEffect( () => {
        if( need_refresh ) set_update_ready( updateServiceWorker )
    }, [ need_refresh, set_update_ready, updateServiceWorker ] )

    return null
}

