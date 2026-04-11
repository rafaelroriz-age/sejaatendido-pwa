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

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('/login');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { token, user } = await getAuthSession();
      if (token && user) {
        switch (user.tipo) {
          case 'ADMIN': setInitialRoute('/admin'); break;
          case 'MEDICO': setInitialRoute('/doctor'); break;
          case 'PACIENTE': setInitialRoute('/dashboard'); break;
          default: setInitialRoute('/login');
        }
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
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirmar-email" element={<ConfirmEmail />} />
        <Route path="/resetar-senha" element={<ResetPassword />} />

        {/* Authenticated routes */}
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/bank-details" element={<BankDetails />} />
        <Route path="/notifications" element={<NotificationPreferences />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/repasse/:id" element={<RepasseDetail />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={initialRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
