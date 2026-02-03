import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { ExamList } from '@/pages/exams/ExamList';
import { ExamForm } from '@/pages/exams/ExamForm';
import { Questions } from '@/pages/Questions';
import { Participants } from '@/pages/Participants';
import { Reports } from '@/pages/Reports';
import { Leaderboard } from '@/pages/Leaderboard';
import { authService } from '@/services/auth';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            authService.isAuthenticated() ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams"
          element={
            <ProtectedRoute>
              <Layout>
                <ExamList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/new"
          element={
            <ProtectedRoute>
              <Layout>
                <ExamForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <ExamForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/questions"
          element={
            <ProtectedRoute>
              <Layout>
                <Questions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/participants"
          element={
            <ProtectedRoute>
              <Layout>
                <Participants />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Leaderboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
