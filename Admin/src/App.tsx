import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AllPosts from './pages/AllPosts.tsx';
import PendingPosts from './pages/PendingPosts.tsx';
import ManageUsers from './pages/ManageUsers.tsx';
import Logs from './pages/Logs.tsx';
import './App.css';

export default function App() {
  return (
      <div className="app-shell">
        <aside className="sidebar">
          <Sidebar />
        </aside>
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/all-posts" element={<AllPosts />} />
            <Route path="/pending-posts" element={<PendingPosts />} />
            <Route path="/manage-users" element={<ManageUsers />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
  );
}