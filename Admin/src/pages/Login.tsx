import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Sign in with Supabase
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
        setError(authError.message);
        setLoading(false);
    } else {
        setLoading(false); // prevent stuck "Verifying..."
    }
    
    if (user) {
      // 2. Check for Admin Role immediately to show specific error
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role !== 'admin') {
        // This is where we catch the non-admins!
        setError("Access Denied: This account does not have Admin privileges.");
        await supabase.auth.signOut(); // Clean up the session
        setLoading(false);
      } else {
        // Success! App.tsx will notice the session and move us.
        // We don't call setLoading(false) here to avoid a flicker 
        // before the Dashboard slides in.
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-placeholder">UL</div>
          <h1>UnLost Admin</h1>
          <p>Welcome to the Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="USM Email (@student.usm.my)" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required 
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required 
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Verifying...' : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}