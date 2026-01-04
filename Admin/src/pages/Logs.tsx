import { useState, useEffect } from 'react';
import './Logs.css';
import { supabase } from '../supabaseClient';

interface LogEntry {
  audit_id: string;      // Matches Primary Key
  time_stamp: string;    // Matches your DB column
  action_type: string;   // Matches action_type
  actor_name: string;    // Matches actor_name
  actor_type: string;    // Matches 'admin', 'user', or 'system'
}

export default function Logs() {
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const [filters, setFilters] = useState({
    role: 'All',           // All, Admin, User
    dateRange: 'All',      // All, 24h, 7d, 30d
    activityGroup: 'All'   // All, Posts, Claims, Management
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch Logs ---
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('time_stamp', { ascending: false });

        // 1. Role Filter
        if (filters.role !== 'All') {
          query = query.eq('actor_type', filters.role.toLowerCase());
        }

        // 2. Timeframe Filter
        if (filters.dateRange !== 'All') {
          const now = new Date();
          const startDate = new Date();
          if (filters.dateRange === '24h') startDate.setHours(now.getHours() - 24);
          if (filters.dateRange === '7d') startDate.setDate(now.getDate() - 7);
          query = query.gte('time_stamp', startDate.toISOString());
        }

        // 3. Activity Group Filter
        if (filters.activityGroup === 'Posts') {
          query = query.ilike('action_type', '%Post%');
        } else if (filters.activityGroup === 'Management') {
          query = query.ilike('action_type', '%User%');
        } else if (filters.activityGroup === 'Claims') {
          query = query.ilike('action_type', '%Claim%');
        }

        // 4. Search Filter
        if (searchTerm) {
          query = query.or(`action_type.ilike.%${searchTerm}%,actor_name.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters, searchTerm]);

  // --- Search & Pagination Logic ---
  const pagingLogs = logs.filter(log => 
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.actor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Calculations
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = pagingLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(pagingLogs.length / logsPerPage);


  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="manage-container"> {/* Using same container class for layout consistency */}
      <header className="manage-header">
        <h2 className="title">Admin Logs</h2>
      </header>

      {/* Updated Search Bar to match your 2nd picture */}
      <div className="search-area">
        <div className="search-bar-wrap">
          <div className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          
          <div className="tag-input-container">
            <input 
              type="text" 
              placeholder="Search by action or user..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className="filter-settings-container">
            <button className="filter-settings-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>

            {showFilterMenu && (
              <div className="filter-dropdown-wide">
                <div className="filter-section">
                  <h6>Actor Role</h6>
                  <button onClick={() => setFilters({...filters, role: 'All'})} className={filters.role === 'All' ? 'active' : ''}>All Roles</button>
                  <button onClick={() => setFilters({...filters, role: 'Admin'})} className={filters.role === 'Admin' ? 'active' : ''}>Admin Only</button>
                  <button onClick={() => setFilters({...filters, role: 'User'})} className={filters.role === 'User' ? 'active' : ''}>User Only</button>
                  <button onClick ={() => setFilters({...filters, role: 'System'})} className={filters.role === 'System' ? 'active' : ''}>System Only</button>
                </div>

                <div className="filter-section">
                  <h6>Activity Group</h6>
                  <button onClick={() => setFilters({...filters, activityGroup: 'All'})} className={filters.activityGroup === 'All' ? 'active' : ''}>All Activity</button>
                  <button onClick={() => setFilters({...filters, activityGroup: 'Posts'})} className={filters.activityGroup === 'Posts' ? 'active' : ''}>Post Activity</button>
                  <button onClick={() => setFilters({...filters, activityGroup: 'Claims'})} className={filters.activityGroup === 'Claims' ? 'active' : ''}>Claim Activity</button>
                  <button onClick={() => setFilters({...filters, activityGroup: 'Management'})} className={filters.activityGroup === 'Management' ? 'active' : ''}>User Management</button>
                </div>

                <div className="filter-section">
                  <h6>Timeframe</h6>
                  <button onClick={() => setFilters({...filters, dateRange: 'All'})} className={filters.dateRange === 'All' ? 'active' : ''}>All Time</button>
                  <button onClick={() => setFilters({...filters, dateRange: '24h'})} className={filters.dateRange === '24h' ? 'active' : ''}>Last 24 Hours</button>
                  <button onClick={() => setFilters({...filters, dateRange: '7d'})} className={filters.dateRange === '7d' ? 'active' : ''}>Past 7 Days</button>
                </div>
                
                <div className="filter-actions-vertical">
                  <button className="clear-filter-btn" onClick={() => setFilters({role:'All', dateRange:'All', activityGroup:'All'})}>Reset All</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* The White Card Wrapper */}
      <div className="table-card">
        <table className="user-table"> {/* Using user-table class for consistent spacing */}
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Performed By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '40px' }}>Loading logs...</td></tr>
            ) : currentLogs.length > 0 ? (
              currentLogs.map((log) => (
                <tr key={log.audit_id}>
                  {/* Date Formatting */}
                  <td>{new Date(log.time_stamp).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                  
                  <td style={{ fontWeight: '500' }}>{log.action_type}</td>
                  
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {log.actor_name}
                      {/* Added a small badge so you can see if it was an Admin or System */}
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '10px',
                        backgroundColor: log.actor_type === 'admin' ? '#f3f0ff' : '#f3f4f6',
                        color: log.actor_type === 'admin' ? '#6c5ce7' : '#666'
                      }}>
                        {log.actor_type.toUpperCase()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              /* Keep your existing "No results" code here */
              <tr>
                <td colSpan={3} className="no-results-container">
                  {/* ... your existing empty state JSX ... */}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination integrated inside or just below the card */}
        {pagingLogs.length > 0 && (
          <div className="pagination">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}> &lt; </button>
            
            {[...Array(totalPages)].map((_, index) => (
              <button 
                key={index + 1} 
                onClick={() => paginate(index + 1)}
                className={currentPage === index + 1 ? 'active' : ''}
              >
                {index + 1}
              </button>
            ))}

            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}> &gt; </button>
          </div>
        )}
      </div>
    </div>
  );
}