import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import TopBar from './components/common/TopBar';
import BottomNav from './components/common/BottomNav';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import TransactionsPage from './pages/TransactionsPage';
import InsightsPage from './pages/InsightsPage';
import ProfilePage from './pages/ProfilePage';
import BudgetsPage from './pages/BudgetsPage';
import SavingsPage from './pages/SavingsPage';
import QuestionsPage from './pages/QuestionsPage';
import AdvisorPage from './pages/AdvisorPage';
import SplitsPage from './pages/SplitsPage';
import HubPage from './pages/HubPage';
import AddExpensePage from './pages/AddExpensePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-4 space-y-3">
        <div className="w-12 h-12 bg-primary rounded-2xl border-2 border-border shadow-sticker animate-bounce flex items-center justify-center text-2xl text-white">
          💸
        </div>
        <p className="text-xs font-heading font-black text-text">Loading your wallet...</p>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/register" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar />
      <main className="min-h-[calc(100vh-64px)] pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      
      {/* 5 Core Navigation & Feature Pages */}
      <Route path="/" element={<ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><AppLayout><TransactionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/add" element={<ProtectedRoute><AppLayout><AddExpensePage /></AppLayout></ProtectedRoute>} />
      <Route path="/splits" element={<ProtectedRoute><AppLayout><SplitsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/hub" element={<ProtectedRoute><AppLayout><HubPage /></AppLayout></ProtectedRoute>} />

      {/* Feature & Settings Routes */}
      <Route path="/insights" element={<ProtectedRoute><AppLayout><InsightsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/budgets" element={<ProtectedRoute><AppLayout><BudgetsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute><AppLayout><SavingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/questions" element={<ProtectedRoute><AppLayout><QuestionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/advisor" element={<ProtectedRoute><AppLayout><AdvisorPage /></AppLayout></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
