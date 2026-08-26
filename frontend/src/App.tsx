import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Bags } from './pages/Bags';
import { BagDetail } from './pages/BagDetail';
import { Labels } from './pages/Labels';
import { Triage } from './pages/Triage';
import { Scanner } from './pages/Scanner';
import { Pending } from './pages/Pending';
import { History } from './pages/History';
import { Audit } from './pages/Audit';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes wrapped in Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="bags" element={<Bags />} />
          <Route path="bags/:id" element={<BagDetail />} />
          <Route path="labels" element={<Labels />} />
          <Route path="triage" element={<Triage />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="pending" element={<Pending />} />
          <Route path="history" element={<History />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
