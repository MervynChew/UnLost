import { useState } from 'react';
import './Logs.css';

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
}

export default function Logs() {
  // --- States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10; // Adjust this number as needed
  const [filters, setFilters] = useState({
    role: 'All',           // All, Admin, User
    dateRange: 'All',      // All, 24h, 7d, 30d
    activityGroup: 'All'   // All, Posts, Claims, Management
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // --- Mock Data ---
  const [logs] = useState<LogEntry[]>([
    { id: '1', timestamp: '12 November 2025, 11:24', action: 'Post Created', performedBy: 'User 22302352' },
    { id: '2', timestamp: '25 June 2025, 12:52', action: 'Item Claimed', performedBy: 'User 22305215' },
    { id: '3', timestamp: '29 September 2025, 20:34', action: 'Post Deleted', performedBy: 'System' },
    { id: '4', timestamp: '21 February 2025, 17:45', action: 'Accepted Pending Post', performedBy: 'Admin 001' },
    // Add more mock items to test pagination...
  ]);

  // --- Search & Pagination Logic ---
  const pagingLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Calculations
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;


  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.performedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filters.role === 'All' || 
      (filters.role === 'Admin' ? log.performedBy.includes('Admin') : !log.performedBy.includes('Admin') && log.performedBy !== 'System');

    const matchesActivity = filters.activityGroup === 'All' || 
      (filters.activityGroup === 'Posts' && (log.action.includes('Post'))) ||
      (filters.activityGroup === 'Claims' && log.action.includes('Item Claimed')) ||
      (filters.activityGroup === 'Management' && (log.action.includes('User') || log.action.includes('Disabled')));

    const matchesDate = () => {
      if (filters.dateRange === 'All') return true;
      
      const logDate = new Date(log.timestamp);
      const now = new Date();
      const diffInDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
      
      if (filters.dateRange === '24h') return diffInDays <= 1;
      if (filters.dateRange === '7d') return diffInDays <= 7;
      return true;
    };

    return matchesSearch && matchesRole && matchesActivity && matchesDate();
  });

  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

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
            {currentLogs.length > 0 ? (
              currentLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.timestamp}</td>
                  <td style={{ fontWeight: '500' }}>{log.action}</td>
                  <td>{log.performedBy}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="no-results-container">
                  <div className="no-results-content">
                    <div className="no-results-icon">🔍</div>
                    <h4>No logs found</h4>
                    <p>We couldn't find any activity matching your current filters.</p>
                    <button 
                      className="reset-inline-btn"
                      onClick={() => setFilters({role:'All', dateRange:'All', activityGroup:'All'})}
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination integrated inside or just below the card */}
        {filteredLogs.length > 0 && (
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