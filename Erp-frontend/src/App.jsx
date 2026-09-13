import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/custom.css';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import AttendancePage from './pages/AttendancePage';
import BulletinsPage from './pages/BulletinsPage';
import ClassesPage from './pages/ClassesPage';
import Dashboard from './pages/Dashboard';
import EvaluationsPage from './pages/EvaluationsPage';
import FinancePage from './pages/FinancePage';
import FinancialManagersPage from './pages/FinancialManagersPage';
import Login from './pages/Login';
import Profile from './pages/Profile';
import SchedulePage from './pages/SchedulePage';
import StudentsPage from './pages/StudentsPage';
import SubjectsPage from './pages/SubjectsPage';
import TeachersPage from './pages/TeachersPage';
import Unauthorized from './pages/Unauthorized';
import UsersPage from './pages/UsersPage';

const AppLayout = () => {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="content-panel">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'ROLE_DIRECTEUR',
                    'ROLE_RESPONSABLE_FINANCIER',
                    'ROLE_SURVEILLANT',
                    'ROLE_PROFESSEUR',
                    'ROLE_ETUDIANT',
                  ]}
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'ROLE_DIRECTEUR',
                    'ROLE_RESPONSABLE_FINANCIER',
                    'ROLE_SURVEILLANT',
                    'ROLE_PROFESSEUR',
                    'ROLE_ETUDIANT',
                  ]}
                >
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR']}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_RESPONSABLE_FINANCIER']}>
                  <FinancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financial-managers"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR']}>
                  <FinancialManagersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR']}>
                  <ClassesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT']}>
                  <SubjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT']}>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluations"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT']}>
                  <EvaluationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bulletins"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_ETUDIANT']}>
                  <BulletinsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR']}>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT']}>
                  <TeachersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['ROLE_DIRECTEUR']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'ROLE_DIRECTEUR',
                    'ROLE_RESPONSABLE_FINANCIER',
                    'ROLE_SURVEILLANT',
                    'ROLE_PROFESSEUR',
                    'ROLE_ETUDIANT',
                  ]}
                >
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
