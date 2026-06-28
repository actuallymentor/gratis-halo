import { Navigate, Route, Routes } from 'react-router'
import { DashboardPage } from '../components/pages/DashboardPage.jsx'
import { LegalPage } from '../components/pages/LegalPage.jsx'
import { LoginPage } from '../components/pages/LoginPage.jsx'
import { PVTPage } from '../components/pages/PVTPage.jsx'
import { PVTResultsPage } from '../components/pages/PVTResultsPage.jsx'

/**
 * Defines Halo's browser routes.
 * @returns {JSX.Element} Route tree.
 */
export function AppRoutes() {

    return <Routes>
        <Route path="/" element={ <DashboardPage /> } />
        <Route path="/login" element={ <LoginPage /> } />
        <Route path="/test" element={ <PVTPage /> } />
        <Route path="/test/results/:session_id" element={ <PVTResultsPage /> } />
        <Route path="/privacy" element={ <LegalPage kind="privacy" /> } />
        <Route path="/tos" element={ <LegalPage kind="tos" /> } />
        <Route path="*" element={ <Navigate to="/" replace /> } />
    </Routes>
}

