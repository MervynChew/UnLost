import { NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import icon from '../assets/icon.png';
import './Sidebar.css';

/*rmb to use the same colour scheme with Mervyn*/


export default function Sidebar() {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/all-posts', label: 'All Posts' },
    { to: '/pending-posts', label: 'Pending Posts' },
    { to: '/manage-users', label: 'Manage Users' },
    { to: '/logs', label: 'Logs' },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
  };

  return (
    <div className="sidebar-wrap">
      <div className="brand">
        <img className="logoIcon" src={icon} alt = "icon"/>
          <span className="brand-text">UNLOST Admin</span>
      </div>
      <nav className="nav">
        {navItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      <button className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
