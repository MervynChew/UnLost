import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AllPosts from './pages/AllPosts.tsx';
import PendingPosts from './pages/PendingPosts.tsx';
import ManageUsers from './pages/ManageUsers.tsx';
import Logs from './pages/Logs.tsx';
import Login from './pages/Login.tsx';
import './App.css';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: any) => {
      if (!mounted) return;

      setSession(session);

      if (!session) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || data?.role !== 'admin') {
          await supabase.auth.signOut();
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error(err);
        setIsAdmin(false);
      } finally {
        setLoading(false); // 🔥 ALWAYS CLEARS
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session);
    });

    // Listen for changes
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#faf9f7'
        }}
      >
        <p style={{ color: '#8b6ba8', fontWeight: 'bold' }}>
          Verifying Credentials...
        </p>
      </div>
    );
  }

  const showDashboard = session && isAdmin;

  return (
    <Routes>
      {!showDashboard ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <Route path="/*" element={
          <div className="app-shell">
            <aside className="sidebar"><Sidebar /></aside>
            <main className="content">
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/all-posts" element={<AllPosts />} />
                <Route path="/pending-posts" element={<PendingPosts />} />
                <Route path="/manage-users" element={<ManageUsers />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        } />
      )}
    </Routes>
  );
}