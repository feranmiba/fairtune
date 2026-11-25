import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StellarWalletProvider } from './context/StellarWalletContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Onboarding
import { ArtistOnboardingPage } from './pages/onboarding/ArtistOnboardingPage';

// Dashboard & Core
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ContractListPage } from './pages/contracts/ContractListPage';
import { ContractDetailPage } from './pages/contracts/ContractDetailPage';
import { ContractChatPage } from './pages/contracts/ContractChatPage';
import { AgreementListPage } from './pages/agreements/AgreementListPage';
import { AgreementCreatePage } from './pages/agreements/AgreementCreatePage';
import { AgreementDetailPage } from './pages/agreements/AgreementDetailPage';
import { PaymentHistoryPage } from './pages/payments/PaymentHistoryPage';
import { RoyaltyAnalyticsPage } from './pages/intelligence/RoyaltyAnalyticsPage';
import { AnomalyListPage } from './pages/anomalies/AnomalyListPage';
import { WalletSettingsPage } from './pages/wallet/WalletSettingsPage';
import { ArtistProfilePage } from './pages/profile/ArtistProfilePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StellarWalletProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <Routes>
                {/* Marketing & Landing */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                </Route>

                {/* Auth Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                {/* Onboarding */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <ArtistOnboardingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Main Authenticated App */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/contracts" element={<ContractListPage />} />
                  <Route path="/contracts/:id" element={<ContractDetailPage />} />
                  <Route path="/contracts/chat" element={<ContractChatPage />} />
                  <Route path="/agreements" element={<AgreementListPage />} />
                  <Route path="/agreements/create" element={<AgreementCreatePage />} />
                  <Route path="/agreements/:id" element={<AgreementDetailPage />} />
                  <Route path="/payments" element={<PaymentHistoryPage />} />
                  <Route path="/intelligence" element={<RoyaltyAnalyticsPage />} />
                  <Route path="/anomalies" element={<AnomalyListPage />} />
                  <Route path="/wallet" element={<WalletSettingsPage />} />
                  <Route path="/profile" element={<ArtistProfilePage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </NotificationProvider>
        </StellarWalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
