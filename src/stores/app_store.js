import { create } from 'zustand'

/**
 * Shared app state for PWA update controls.
 */
export const use_app_store = create( set => ( {
    update_ready: false,
    update_service_worker: null,
    set_update_ready: update_service_worker => set( {
        update_ready: true,
        update_service_worker,
    } ),
    clear_update_ready: () => set( {
        update_ready: false,
        update_service_worker: null,
    } ),
} ) )

