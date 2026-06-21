import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthSession } from './storage/localStorage';
import Colors from './theme/colors';

// Critical path — load eagerly
import LoginScreen from './pages/LoginScreen';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

// Secondary pages — lazy loaded to reduce initial bundle
const Signup = lazy(() => import('./pages/Signup'));
const HomeScreen = lazy(() => import('./pages/HomeScreen'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BookAppointment = lazy(() => import('./pages/BookAppointment'));
const Payment = lazy(() => import('./pages/Payment'));
const Profile = lazy(() => import('./pages/Profile'));
const Chat = lazy(() => import('./pages/Chat'));
const ConfirmEmail = lazy(() => import('./pages/ConfirmEmail'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const BankDetails = lazy(() => import('./pages/BankDetails'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const Earnings = lazy(() => import('./pages/Earnings'));
const RepasseDetail = lazy(() => import('./pages/RepasseDetail'));
const CrmValidation = lazy(() => import('./pages/CrmValidation'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentPending = lazy(() => import('./pages/PaymentPending'));
const PaymentFailure = lazy(() => import('./pages/PaymentFailure'));
const DoctorSchedule = lazy(() => import('./pages/DoctorSchedule'));
const TermsConditions = lazy(() => import('./pages/TermsConditions'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Lgpd = lazy(() => import('./pages/Lgpd'));

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
      <div className="spinner" />
    </div>
  );
}

type Role = 'PACIENTE' | 'MEDICO' | 'ADMIN';

function roleHome(tipo?: Role) {
  if (tipo === 'ADMIN') return '/admin';
  if (tipo === 'MEDICO') return '/doctor';
  return '/dashboard';
}

function ProtectedRoute({
  allow,
  children,
}: {
  allow?: Role[];
  children: React.ReactElement;
}) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;
    getAuthSession()
      .then(({ token, user }) => {
        if (!active) return;
        if (!token || !user) setRole(null);
        else setRole(user.tipo);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!role) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(role)) return <Navigate to={roleHome(role)} replace />;
  return children;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      await getAuthSession();
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirmar-email" element={<ConfirmEmail />} />
        <Route path="/termos-e-condicoes" element={<TermsConditions />} />
        <Route path="/termos-de-uso" element={<TermsOfUse />} />
        <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
        <Route path="/lgpd" element={<Lgpd />} />
        <Route path="/resetar-senha" element={<ResetPassword />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />

        {/* Authenticated routes */}
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute allow={['PACIENTE']}><Dashboard /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute allow={['MEDICO']}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allow={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/book" element={<ProtectedRoute allow={['PACIENTE']}><BookAppointment /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute allow={['PACIENTE']}><Payment /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/bank-details" element={<ProtectedRoute allow={['MEDICO', 'PACIENTE']}><BankDetails /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
        <Route path="/earnings" element={<ProtectedRoute allow={['MEDICO']}><Earnings /></ProtectedRoute>} />
        <Route path="/repasse/:id" element={<ProtectedRoute allow={['MEDICO']}><RepasseDetail /></ProtectedRoute>} />
        <Route path="/crm-validation" element={<ProtectedRoute allow={['MEDICO']}><CrmValidation /></ProtectedRoute>} />
        <Route path="/doctor/schedule" element={<ProtectedRoute allow={['MEDICO']}><DoctorSchedule /></ProtectedRoute>} />

        {/* 404 fallback with telemetry */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
