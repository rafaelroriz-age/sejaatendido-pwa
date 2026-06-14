import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthSession } from './storage/localStorage';
import Colors from './theme/colors';

import LoginScreen from './pages/LoginScreen';
import Signup from './pages/Signup';
import HomeScreen from './pages/HomeScreen';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookAppointment from './pages/BookAppointment';
import Payment from './pages/Payment';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import ConfirmEmail from './pages/ConfirmEmail';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import BankDetails from './pages/BankDetails';
import NotificationPreferences from './pages/NotificationPreferences';
import Earnings from './pages/Earnings';
import RepasseDetail from './pages/RepasseDetail';
import LandingPage from './pages/LandingPage';
import CrmValidation from './pages/CrmValidation';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentPending from './pages/PaymentPending';
import PaymentFailure from './pages/PaymentFailure';
import DoctorSchedule from './pages/DoctorSchedule';
import TermsConditions from './pages/TermsConditions';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Lgpd from './pages/Lgpd';
import NotFound from './pages/NotFound';

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
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);
  const [initialRoute, setInitialRoute] = useState('/login');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { token, user } = await getAuthSession();
      if (token && user) {
        setUserRole(user.tipo);
        switch (user.tipo) {
          case 'ADMIN': setInitialRoute('/admin'); break;
          case 'MEDICO': setInitialRoute('/doctor'); break;
          case 'PACIENTE': setInitialRoute('/dashboard'); break;
          default: setInitialRoute('/login');
        }
      } else {
        setUserRole(undefined);
        setInitialRoute('/login');
      }
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
        <Route path="/bank-details" element={<ProtectedRoute allow={['MEDICO']}><BankDetails /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
        <Route path="/earnings" element={<ProtectedRoute allow={['MEDICO']}><Earnings /></ProtectedRoute>} />
        <Route path="/repasse/:id" element={<ProtectedRoute allow={['MEDICO']}><RepasseDetail /></ProtectedRoute>} />
        <Route path="/crm-validation" element={<ProtectedRoute allow={['MEDICO']}><CrmValidation /></ProtectedRoute>} />
        <Route path="/doctor/schedule" element={<ProtectedRoute allow={['MEDICO']}><DoctorSchedule /></ProtectedRoute>} />

        {/* 404 fallback with telemetry */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
