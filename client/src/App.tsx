import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LobbyPage } from './pages/LobbyPage';
//import { AvatarEditor } from './pages/AvatarEditor';
import { useStore } from './store';
import './styles/global.css';
import { AdminPanel } from '@/components/AdminPanel';
import { AvatarCustomizer } from './pages/AvatarCustomizer';

// Dans <Routes>:
<Route path="/avatar" element={<AvatarCustomizer />} />

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        {/*<Route
          path="/avatar"
          element={
            <ProtectedRoute>
              <AvatarEditor />
            </ProtectedRoute>
          }
        />*/}
        ```typescript
        <Route
         path="/admin"
         element={
         <ProtectedRoute>
         <AdminPanel />
         </ProtectedRoute>
        }
/>
        <Route path="/" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
