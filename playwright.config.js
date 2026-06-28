import { defineConfig, devices } from '@playwright/test'

export default defineConfig( {
    testDir: `./tests/e2e`,
    timeout: 30_000,
    fullyParallel: true,
    reporter: `list`,
    use: {
        baseURL: `http://127.0.0.1:8787`,
        launchOptions: {
            executablePath: `/usr/bin/chromium`,
        },
        trace: `on-first-retry`,
    },
    webServer: {
        command: `npm run dev`,
        url: `http://127.0.0.1:8787`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
    projects: [
        {
            name: `chromium`,
            use: {
                ...devices[ `Desktop Chrome` ],
            },
        },
    ],
} )
