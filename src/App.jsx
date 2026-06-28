import { QueryParamProvider } from 'use-query-params'
import { WindowHistoryAdapter } from 'use-query-params/adapters/window'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'react-hot-toast'
import { GlobalStyle } from './styles/GlobalStyle.js'
import { AppRoutes } from './routes/Routes.jsx'
import { InstallAppPill } from './components/molecules/InstallAppPill.jsx'
import { PwaUpdateBridge } from './components/molecules/PwaUpdateBridge.jsx'

/**
 * Root React application shell.
 * @returns {JSX.Element} App element.
 */
export function App() {

    return <BrowserRouter>
        <QueryParamProvider adapter={ WindowHistoryAdapter }>
            <GlobalStyle />
            <PwaUpdateBridge />
            <AppRoutes />
            <InstallAppPill />
            <Toaster
                position="bottom-right"
                toastOptions={ {
                    duration: 3500,
                    style: {
                        borderRadius: `8px`,
                        border: `1px solid #d7e3e7`,
                        color: `#14313a`,
                        fontFamily: `"Nunito", system-ui, sans-serif`,
                    },
                } }
            />
        </QueryParamProvider>
    </BrowserRouter>
}
