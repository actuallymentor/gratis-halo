/**
 * Releases registered service workers before leaving for Oura OAuth.
 * @returns {Promise<void>} Completion promise.
 */
export async function release_service_workers_for_oauth() {

    if( !( `serviceWorker` in navigator ) ) return
    if( !navigator.serviceWorker.getRegistrations ) return

    try {
        const registrations = await navigator.serviceWorker.getRegistrations()

        await Promise.all( registrations.map( registration => registration.unregister() ) )
    } catch {
        // OAuth should keep moving even if service-worker cleanup is unavailable.
    }
}
