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

export default function App() {
  const { user, restoring } = useAuth()

  // A stored token is checked against /api/auth/me on load; until that answers
  // we know neither that the user is signed in nor that they are not.
  if (restoring) return <SplashScreen />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/sales" replace />} />
        <Route path="/sales" element={<SalesDashboard />} />
        <Route path="/transactions" element={<TransactionDashboard />} />
        <Route path="/stamps" element={<StampDashboard />} />
        <Route path="/vehicles" element={<VehicleDashboard />} />
        <Route path="/opportunity" element={<OpportunityDashboard />} />
        <Route path="/gates" element={<GateControl />} />
        <Route path="/tax-invoices" element={<TaxInvoicePage />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/member-approval" element={<Navigate to="/member-approval/building" replace />} />
        <Route path="/member-approval/building" element={<MemberApproval stage="building" />} />
        <Route path="/member-approval/authority" element={<MemberApproval stage="authority" />} />

        <Route path="/reports/sales-tax" element={<SalesTaxReport />} />
        <Route path="/reports/sales-tax-daily" element={<SalesTaxDailyReport />} />
        <Route path="/reports/vehicle-transaction" element={<VehicleTransactionReport />} />
        <Route path="/reports/stamp" element={<StampReport />} />
        <Route path="/reports/license-plate" element={<LicensePlateReport />} />
        <Route path="/reports/opportunity-loss" element={<OpportunityLossReport />} />
        <Route path="/reports/vehicle-volume" element={<VehicleVolumeReport />} />
        <Route path="/reports/member-visitor" element={<MemberVisitorReport />} />
        <Route path="/reports/emergency-barrier" element={<EmergencyBarrierReport />} />
        <Route path="/reports/discount" element={<DiscountReport />} />
        <Route path="/reports/package-member" element={<PackageMemberReport />} />
        <Route path="/reports/cash-online" element={<CashOnlineReport />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
