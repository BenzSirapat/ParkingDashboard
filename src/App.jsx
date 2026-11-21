import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import RequireEmail from './pages/RequireEmail.jsx'

import SalesDashboard from './pages/SalesDashboard.jsx'
import TransactionDashboard from './pages/TransactionDashboard.jsx'
import StampDashboard from './pages/StampDashboard.jsx'
import VehicleDashboard from './pages/VehicleDashboard.jsx'
import OpportunityDashboard from './pages/OpportunityDashboard.jsx'
import GateControl from './pages/GateControl.jsx'
import TaxInvoicePage from './pages/TaxInvoicePage.jsx'
import UserManagement from './pages/UserManagement.jsx'
import MemberApproval from './pages/MemberApproval.jsx'
import MemberImport from './pages/MemberImport.jsx'
import Permissions from './pages/Permissions.jsx'
import { ALL_NAV } from './nav.js'
import { useLang } from './lib/i18n.jsx'

import SalesTaxReport from './pages/reports/SalesTaxReport.jsx'
import SalesTaxDailyReport from './pages/reports/SalesTaxDailyReport.jsx'
import VehicleTransactionReport from './pages/reports/VehicleTransactionReport.jsx'
import StampReport from './pages/reports/StampReport.jsx'
import LicensePlateReport from './pages/reports/LicensePlateReport.jsx'
import OpportunityLossReport from './pages/reports/OpportunityLossReport.jsx'
import VehicleVolumeReport from './pages/reports/VehicleVolumeReport.jsx'
import MemberVisitorReport from './pages/reports/MemberVisitorReport.jsx'
import EmergencyBarrierReport from './pages/reports/EmergencyBarrierReport.jsx'
import DiscountReport from './pages/reports/DiscountReport.jsx'
import PackageMemberReport from './pages/reports/PackageMemberReport.jsx'
import CashOnlineReport from './pages/reports/CashOnlineReport.jsx'

function RequireAuth({ children }) {
  const { user, needsEmail } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (needsEmail) return <RequireEmail />
  return children
}

/** The first menu this account may open — where "/" and a switched-off page lead. */
function useHome() {
  const { menus } = useAuth()
  return ALL_NAV.find((n) => menus.has(n.to))?.to ?? null
}

function NoMenu() {
  const { t } = useLang()
  return (
    <div className="empty" style={{ padding: 48 }}>
      {t('No menu is switched on for your account. Ask an administrator to give you a permission group.')}
    </div>
  )
}

/** A page whose menu is switched off for this account goes to the first allowed one. */
function MenuGate({ to, children }) {
  const { menus } = useAuth()
  const home = useHome()
  if (menus.has(to)) return children
  return home ? <Navigate to={home} replace /> : <NoMenu />
}

function Home() {
  const home = useHome()
  return home ? <Navigate to={home} replace /> : <NoMenu />
}

export default function App() {
  const { user, restoring } = useAuth()

  // A stored token is checked against /api/auth/me on load; until that answers
  // we know neither that the user is signed in nor that they are not.
  if (restoring) return <SplashScreen />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="/sales" element={<MenuGate to="/sales"><SalesDashboard /></MenuGate>} />
        <Route path="/transactions" element={<MenuGate to="/transactions"><TransactionDashboard /></MenuGate>} />
        <Route path="/stamps" element={<MenuGate to="/stamps"><StampDashboard /></MenuGate>} />
        <Route path="/vehicles" element={<MenuGate to="/vehicles"><VehicleDashboard /></MenuGate>} />
        <Route path="/opportunity" element={<MenuGate to="/opportunity"><OpportunityDashboard /></MenuGate>} />
        <Route path="/gates" element={<MenuGate to="/gates"><GateControl /></MenuGate>} />
        <Route path="/tax-invoices" element={<MenuGate to="/tax-invoices"><TaxInvoicePage /></MenuGate>} />
        <Route path="/users" element={<MenuGate to="/users"><UserManagement /></MenuGate>} />
        <Route path="/member-approval" element={<Navigate to="/member-approval/building" replace />} />
        <Route path="/member-import" element={<MenuGate to="/member-import"><MemberImport /></MenuGate>} />
        <Route path="/permissions" element={<MenuGate to="/permissions"><Permissions /></MenuGate>} />
        <Route path="/member-approval/building" element={<MenuGate to="/member-approval/building"><MemberApproval stage="building" /></MenuGate>} />
        <Route path="/member-approval/authority" element={<MenuGate to="/member-approval/authority"><MemberApproval stage="authority" /></MenuGate>} />

        <Route path="/reports/sales-tax" element={<MenuGate to="/reports/sales-tax"><SalesTaxReport /></MenuGate>} />
        <Route path="/reports/sales-tax-daily" element={<MenuGate to="/reports/sales-tax-daily"><SalesTaxDailyReport /></MenuGate>} />
        <Route path="/reports/vehicle-transaction" element={<MenuGate to="/reports/vehicle-transaction"><VehicleTransactionReport /></MenuGate>} />
        <Route path="/reports/stamp" element={<MenuGate to="/reports/stamp"><StampReport /></MenuGate>} />
        <Route path="/reports/license-plate" element={<MenuGate to="/reports/license-plate"><LicensePlateReport /></MenuGate>} />
        <Route path="/reports/opportunity-loss" element={<MenuGate to="/reports/opportunity-loss"><OpportunityLossReport /></MenuGate>} />
        <Route path="/reports/vehicle-volume" element={<MenuGate to="/reports/vehicle-volume"><VehicleVolumeReport /></MenuGate>} />
        <Route path="/reports/member-visitor" element={<MenuGate to="/reports/member-visitor"><MemberVisitorReport /></MenuGate>} />
        <Route path="/reports/emergency-barrier" element={<MenuGate to="/reports/emergency-barrier"><EmergencyBarrierReport /></MenuGate>} />
        <Route path="/reports/discount" element={<DiscountReport />} />
        <Route path="/reports/package-member" element={<PackageMemberReport />} />
        <Route path="/reports/cash-online" element={<CashOnlineReport />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
