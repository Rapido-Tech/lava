import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/auth"
import { LocationProvider } from "./context/location"
import { ToastProvider } from "./context/toast"
import { ErrorBoundary } from "./components/ErrorBoundary"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Onboarding from "./pages/Onboarding"
import Dashboard from "./pages/Dashboard"
import Queue from "./pages/Queue"
import Services from "./pages/Services"
import Staff from "./pages/Staff"
import Customers from "./pages/Customers"
import Reports from "./pages/Reports"
import Memberships from "./pages/Memberships"
import Locations from "./pages/Locations"
import Shifts from "./pages/Shifts"
import Inventory from "./pages/Inventory"
import Loyalty from "./pages/Loyalty"

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/queue"       element={<ProtectedRoute><Queue /></ProtectedRoute>} />
              <Route path="/services"    element={<ProtectedRoute><Services /></ProtectedRoute>} />
              <Route path="/staff"       element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="/customers"   element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/reports"     element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/memberships" element={<ProtectedRoute><Memberships /></ProtectedRoute>} />
              <Route path="/locations"   element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              <Route path="/shifts"      element={<ProtectedRoute><Shifts /></ProtectedRoute>} />
              <Route path="/inventory"   element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/loyalty"     element={<ProtectedRoute><Loyalty /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </ErrorBoundary>
        </ToastProvider>
      </LocationProvider>
    </AuthProvider>
  )
}
