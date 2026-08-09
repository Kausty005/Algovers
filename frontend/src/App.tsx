import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExercisePage } from './pages/ExercisePage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ChatPage } from './pages/ChatPage';
import { ReportPage } from './pages/ReportPage';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';
import { Loader } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader className="animate-spin" size={40} color="var(--accent)" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/exercise" element={<ProtectedRoute><ExercisePage /></ProtectedRoute>} />
        <Route path="/workout/:exercise" element={<ProtectedRoute><WorkoutPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/report/:sessionId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
