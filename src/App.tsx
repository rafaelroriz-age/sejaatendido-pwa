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
import BankDetails from './pages/BankDetails';
import NotificationPreferences from './pages/NotificationPreferences';
import Earnings from './pages/Earnings';
import RepasseDetail from './pages/RepasseDetail';
import LandingPage from './pages/LandingPage';

type Role = 'PACIENTE' | 'MEDICO' | 'ADMIN';

function roleHome(tipo?: Role) {
  if (tipo === 'ADMIN') return '/admin';
  if (tipo === 'MEDICO') return '/doctor';
  return '/dashboard';
}

function ProtectedRoute({
  token,
  userRole,
  allow,
  children,
}: {
  token: string | null;
  userRole?: Role;
  allow?: Role[];
  children: React.ReactElement;
}) {
  if (!token || !userRole) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(userRole)) return <Navigate to={roleHome(userRole)} replace />;
  return children;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);
  const [initialRoute, setInitialRoute] = useState('/login');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { token, user } = await getAuthSession();
      if (token && user) {
        setToken(token);
        setUserRole(user.tipo);
        switch (user.tipo) {
          case 'ADMIN': setInitialRoute('/admin'); break;
          case 'MEDICO': setInitialRoute('/doctor'); break;
          case 'PACIENTE': setInitialRoute('/dashboard'); break;
          default: setInitialRoute('/login');
        }
      } else {
        setToken(null);
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
    <BrowserRouter basename="/sejaatendido-pwa">
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public routes */}
        <Route path="/login" element={token ? <Navigate to={roleHome(userRole)} replace /> : <LoginScreen />} />
        <Route path="/signup" element={token ? <Navigate to={roleHome(userRole)} replace /> : <Signup />} />
        <Route path="/confirmar-email" element={<ConfirmEmail />} />
        <Route path="/resetar-senha" element={<ResetPassword />} />

        {/* Authenticated routes */}
        <Route path="/home" element={<ProtectedRoute token={token} userRole={userRole}><HomeScreen /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute token={token} userRole={userRole} allow={['PACIENTE']}><Dashboard /></ProtectedRoute>} />
        <Route path="/doctor" element={<ProtectedRoute token={token} userRole={userRole} allow={['MEDICO']}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute token={token} userRole={userRole} allow={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/book" element={<ProtectedRoute token={token} userRole={userRole} allow={['PACIENTE']}><BookAppointment /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute token={token} userRole={userRole} allow={['PACIENTE']}><Payment /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute token={token} userRole={userRole}><Profile /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute token={token} userRole={userRole}><Chat /></ProtectedRoute>} />
        <Route path="/bank-details" element={<ProtectedRoute token={token} userRole={userRole} allow={['MEDICO']}><BankDetails /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute token={token} userRole={userRole}><NotificationPreferences /></ProtectedRoute>} />
        <Route path="/earnings" element={<ProtectedRoute token={token} userRole={userRole} allow={['MEDICO']}><Earnings /></ProtectedRoute>} />
        <Route path="/repasse/:id" element={<ProtectedRoute token={token} userRole={userRole} allow={['MEDICO']}><RepasseDetail /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={initialRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
