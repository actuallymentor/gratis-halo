import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const is_vitest = Boolean( process.env.VITEST )

export default defineConfig( {
    plugins: [
        react(),
        !is_vitest && cloudflare( {
            persistState: {
                path: `.wrangler/state`,
            },
        } ),
        !is_vitest && VitePWA( {
            registerType: `prompt`,
            includeAssets: [ `favicon.svg`, `robots.txt` ],
            manifest: {
                name: `Halo`,
                short_name: `Halo`,
                description: `Private Oura HRV and PVT trend dashboard.`,
                theme_color: `#7ec0d0`,
                background_color: `#fafbfc`,
                display: `standalone`,
                start_url: `/`,
                scope: `/`,
                icons: [
                    {
                        src: `/favicon.svg`,
                        sizes: `64x64`,
                        type: `image/svg+xml`,
                        purpose: `any maskable`,
                    },
                ],
            },
            workbox: {
                navigateFallback: `/index.html`,
                globPatterns: [ `**/*.{js,css,html,svg,png,ico,json}` ],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: `CacheFirst`,
                        options: {
                            cacheName: `google-fonts-stylesheets`,
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: `CacheFirst`,
                        options: {
                            cacheName: `google-fonts-webfonts`,
                            expiration: {
                                maxAgeSeconds: 60 * 60 * 24 * 365,
                                maxEntries: 20,
                            },
                        },
                    },
                    {
                        urlPattern: /\/api\/dashboard$/i,
                        handler: `NetworkFirst`,
                        options: {
                            cacheName: `halo-dashboard`,
                            networkTimeoutSeconds: 4,
                        },
                    },
                ],
            },
        } ),
    ].filter( Boolean ),
    test: {
        environment: `jsdom`,
        globals: true,
        include: [ `tests/**/*.test.js` ],
        coverage: {
            provider: `v8`,
            reporter: [ `text`, `lcov` ],
        },
    },
} )
