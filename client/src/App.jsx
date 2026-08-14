import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './lib/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import SetPassword from './pages/SetPassword.jsx';

import AdminLayout from './pages/admin/AdminLayout.jsx';
import Organizations from './pages/admin/Organizations.jsx';
import LearningGroups from './pages/admin/LearningGroups.jsx';
import Modules from './pages/admin/Modules.jsx';
import Progress from './pages/admin/Progress.jsx';

import OrgLayout from './pages/org/OrgLayout.jsx';
import Homework from './pages/org/Homework.jsx';
import Canvas from './pages/org/Canvas.jsx';
import Todos from './pages/org/Todos.jsx';
import Fortschritt from './pages/org/Fortschritt.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="organizations" replace />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="learning-groups" element={<LearningGroups />} />
        <Route path="modules" element={<Modules />} />
        <Route path="progress" element={<Progress />} />
      </Route>

      <Route
        path="/app"
        element={
          <ProtectedRoute role="org_user">
            <OrgLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="homework" replace />} />
        <Route path="homework" element={<Homework />} />
        <Route path="canvas" element={<Canvas />} />
        <Route path="todos" element={<Todos />} />
        <Route path="fortschritt" element={<Fortschritt />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
