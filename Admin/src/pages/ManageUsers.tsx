import { useState } from 'react';
import './ManageUsers.css';
import mailIcon from '../assets/mail-icon.png';
import matricIcon from '../assets/matric-no-icon.png';

interface UserHistory {
  id: string;
  date: string;
  status: string;
  imageUrl?: string;
  postedBy?: string;
  tags?: string[];
  description?: string;
  time?: string;
  meetingPoint?: string;
  scheduleStatus?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  personalEmail: string;
  matricNumber: string;
  postsCount: number;
  lastActive: string;
  history: {
    posts: UserHistory[];
    claims: UserHistory[];
  };
}

interface DetailedPost extends UserHistory {
  imageUrl: string;
  postedBy: string;
  tags: string[];
  description: string;
  time: string;
  meetingPoint: string;
  scheduleStatus: string;
}

export default function ManageUsers() {
  // --- States ---
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortOrder, setSortOrder] = useState<'Newest' | 'Oldest'>('Newest');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<DetailedPost | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [disabledUsers, setDisabledUsers] = useState<string[]>([]);
  // --- Pagination Logic ---
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 4; // You can change this number

  // --- Mock Data ---
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Jane Doe',
      email: 'User0123@student.usm.my',
      personalEmail: 'User0123@gmail.com',
      matricNumber: '22301231',
      postsCount: 3,
      lastActive: '25/06/2025',
      history: {
        posts: [
          { id: 'P1', date: '21/04/2025', status: 'Resolved' },
          { id: 'P2', date: '21/04/2025', status: 'Resolved' }
        ],
        claims: [
          { id: 'C1', date: '21/04/2025', status: 'Resolved' },
          { id: 'C2', date: '21/04/2025', status: 'Resolved' }
        ]
      }
    },
    {
        id: '2',
        name: 'Abu Bakar',
        email: 'abu2024@student.usm.my',
        personalEmail: 'abu.bakar@gmail.com',
        matricNumber: '22309999',
        postsCount: 1,
        lastActive: '10/01/2024',
        history: {
          posts: [{ id: 'P3', date: '05/01/2024', status: 'Pending' }],
          claims: []
        }
    },
    {
      id: '3',
      name: 'Siti Aminah',
      email: 'siti@student.usm.my',
      personalEmail: 'siti.aminah@gmail.com',
      matricNumber: '22304567',
      postsCount: 0,
      lastActive: '15/03/2025',
      history: {
        posts: [],
        claims: [{ id: 'C3', date: '12/03/2025', status: 'Resolved' }]
      }
    },
    {
      id: '4',
      name: 'John Smith',
      email: 'john@student.usm.my',
      personalEmail: 'john.smith@gmail.com',
      matricNumber: '22307890',
      postsCount: 2,
      lastActive: '30/05/2025',
      history: {
        posts: [{ id: 'P4', date: '28/05/2025', status: 'Resolved' }],
        claims: [{ id: 'C4', date: '15/04/2025', status: 'Pending' }]
      }
    },
    {
      id: '5',
      name: 'Lee Wei',
      email: 'lee@student.usm.my',
      personalEmail: 'lee.wei@gmail.com',
      matricNumber: '22303456',
      postsCount: 4,
      lastActive: '05/06/2025',
      history: {
        posts: [
          { id: 'P5', date: '01/06/2025', status: 'Resolved' },
          { id: 'P6', date: '03/06/2025', status: 'Pending' },
          { id: 'P7', date: '04/06/2025', status: 'Resolved' }
        ],
        claims: [
          { id: 'C5', date: '20/05/2025', status: 'Resolved' },
          { id: 'C6', date: '22/05/2025', status: 'Resolved' },
          { id: 'C7', date: '25/05/2025', status: 'Pending' }
        ]
      }
    }
  ]);

  // --- Functions ---
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewMode('detail');
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSortOrder('Newest');
    setCurrentPage(1);
  };

  const toggleDisable = (id: string) => {
    setDisabledUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handlePostClick = async (historyItem: UserHistory, type: 'post' | 'claim') => {
    setIsLoadingPost(true);
    try {
      // Replace this with your actual API endpoint
      // const response = await fetch(`/api/posts/${postId}`);
      // const data = await response.json();
      
      // MOCK DELAY & FETCH (Simulating Database)
      setTimeout(() => {
        const mockFetchedData: DetailedPost = {
          id: historyItem.id,
          date: '21/04/2025',
          status: 'Resolved',
          imageUrl: `https://picsum.photos/seed/${historyItem.id}/400/300`,
          postedBy: selectedUser?.name || 'Unknown',
          tags: type === 'post' ? ['Lost', 'Electronics'] : ['Claimed', 'Verified'],
          description: type === 'post' 
          ? "I found this item near the library. Please contact me for details." 
          : "I have provided proof of ownership for this item.",
          time: '14:30',
          meetingPoint: 'Library Entrance',
          scheduleStatus: 'Completed'
        };
        setViewingHistoryItem(mockFetchedData);
        setIsLoadingPost(false);
      }, 500); // 500ms fake loading
    } catch (error) {
      console.error("Failed to fetch post:", error);
      setIsLoadingPost(false);
    }
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const executeDelete = () => {
    // Here you would normally call your API
    console.log("Deleting user:", userToDelete?.id);
    
    // For now, we close the modal
    setShowDeleteModal(false);
    setUserToDelete(null);
    alert("User has been successfully deleted.");
  };

  // 1. First, Search and Sort the data
  const filteredAndSortedUsers = users
    .filter((user) => {
      const search = searchTerm.toLowerCase();
      return (
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.matricNumber.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.lastActive.split('/').reverse().join('-')).getTime();
      const dateB = new Date(b.lastActive.split('/').reverse().join('-')).getTime();
      return sortOrder === 'Newest' ? dateB - dateA : dateA - dateB;
    });

  // 2. Second, Calculate Slice for the current page
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredAndSortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredAndSortedUsers.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // --- Detail View Rendering ---
  if (viewMode === 'detail' && selectedUser) {
    return (
      <div className="manage-container">
        <header className="manage-header">
          <button className="back-link" onClick={() => setViewMode('list')}>
            ← Back to Users
          </button>
           <h2 className="title">User Profile</h2>
        </header>

        <div className="user-profile-grid">
          {/* LEFT COLUMN: Profile Info */}
          <div className="profile-card">
            <div className="avatar-large">👤</div>
            <h2 className="profile-name">{selectedUser.name}</h2>
            <p className="profile-role">Student</p>
            
            <div className="info-group">
              <div className="email-group">
                <h4 className="info-heading">EMAIL ADDRESS</h4>
                <div className="info-row">
                  <img className="mail-icon" src={mailIcon} alt="Mail Icon" />
                  <div className="text-container">
                    <span className="info-label">Official: </span>
                    <span className="info-value">{selectedUser.email}</span>
                  </div>
                </div>
              </div>
              <div className="personal-email-group">
                <div className="info-row">
                  <img className="mail-icon" src={mailIcon} alt="Mail Icon" />
                  <div className="text-container">
                    <span className="info-label">Personal: </span>
                    <span className="info-value">{selectedUser.personalEmail}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-group">
              <div className="matric-group">
                <h4 className="info-heading">IDENTIFICATION</h4>
                <div className="info-row">
                  <img className="matric-icon" src={matricIcon} alt="Matric Icon" />
                  <div className="text-container">
                    <span className="info-label">Matric No:</span>
                    <span className="info-value">{selectedUser.matricNumber}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: History */}
          <div className="history-section">
            <h3 className="section-main-title">User History</h3>
            <div className="history-block">
              <h4 className="history-sub-title">My Posts</h4>
              <div className="history-list scrollable-history">
                {selectedUser.history.posts.map(post => (
                  <div key={post.id} className="history-card post-card" onClick={() => handlePostClick(post, 'post')}>
                    <img className="placeholder-box" src={`https://picsum.photos/seed/${post.id}/400/300`} alt="Post Placeholder" />
                    <div className="history-details">
                      <div className="grid-item">
                        <span className="grid-label">Date of Post</span>
                        <span className="grid-value">{post.date}</span>
                      </div>
                      <div className="grid-item">
                        <span className="grid-label">Status</span>
                        <span className="grid-value">{post.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="history-block">
              <h4 className="history-sub-title">My Claims </h4>
              <div className="history-list scrollable-history">
                {selectedUser.history.claims.map(claim => (
                  <div key={claim.id} className="history-card claim-card" onClick={() => handlePostClick(claim, 'claim')}>
                    <img className="placeholder-box" src={`https://picsum.photos/seed/${claim.id}/400/300`} alt="Post Placeholder" />
                    <div className="history-grid-info">
                      <div className="grid-item">
                        <span className="grid-label">Date of Claim</span>
                        <span className="grid-value">{claim.date}</span>
                      </div>
                      <div className="grid-item">
                        <span className="grid-label">Status</span>
                        <span className="grid-value">{claim.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isLoadingPost && (
          <div className="modal-overlay">
            <div className="loader">Loading post details...</div>
          </div>
        )}

        {viewingHistoryItem && !isLoadingPost && (
          <div className="modal-overlay" onClick={() => setViewingHistoryItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setViewingHistoryItem(null)}>×</button>

              <h2 className="modal-title">
                {viewingHistoryItem.id.startsWith('P') ? 'Post Details' : 'Claim Details'}
              </h2>

              <div className="modal-scroll-area">
                <div className="detail-image-box">
                  <img src={viewingHistoryItem.imageUrl} alt="Item" className="modal-large-img" />
                </div>

                <section className="detail-section">
                  <h3>Posted By</h3>
                  <div className="user-info">
                    <div className="user-avatar"></div>
                    <span>{viewingHistoryItem.postedBy}</span>
                  </div>
                </section>

                <section className="detail-section">
                  <h3>Tags</h3>
                  <div className="tag-cloud-modal">
                    {viewingHistoryItem.tags?.map((tag: string) => (
                      <span key={tag} className="modal-tag-pill">{tag}</span>
                    ))}
                  </div>
                </section>

                <section className="detail-section">
                  <h3>Description</h3>
                  <div className="description-box">
                    {viewingHistoryItem.description || "No description provided."}
                  </div>
                </section>

                <section className="detail-section">
                  <h3>Schedule</h3>
                  <div className="schedule-info-box">
                    <div className="schedule-status-badge">{viewingHistoryItem.scheduleStatus}</div>
                    
                    {/* Date Row */}
                    <div className="schedule-row">
                      <span className="icon-circle">📅</span> 
                      <div>
                        <p className="label">Date</p>
                        <strong>{viewingHistoryItem.date || 'TBD'}</strong>
                      </div>
                    </div>

                    {/* Time Row */}
                    <div className="schedule-row">
                      <span className="icon-circle">🕒</span>
                      <div>
                        <p className="label">Time</p>
                        <strong>{viewingHistoryItem.time || 'TBD'}</strong>
                      </div>
                    </div>

                    {/* Meeting Point Row */}
                    <div className="schedule-row">
                      <span className="icon-circle">📍</span>
                      <div>
                        <p className="label">Meeting Point</p>
                        <strong>{viewingHistoryItem.meetingPoint || 'TBD'}</strong>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <button className="confirm-btn" onClick={() => setViewingHistoryItem(null)}>Done</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- List View Rendering ---
  return (
    <div className="manage-container">
      <header className="manage-header">
        <h2 className="title">Admin Manage Users</h2>
      </header>

      {/* --- Search Area --- */}
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
              placeholder="Enter name, email or matric number..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {searchTerm !== '' && (
            <button className="clear-all-btn" onClick={clearAllFilters}>
              Clear All
            </button>
          )}

          <div className="filter-settings-container">
            <button 
              className="filter-settings-btn" 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>

            {showFilterMenu && (
              <div className="filter-dropdown">
                <p className="filter-label">Sort Activity:</p>
                <button 
                  className={`filter-option ${sortOrder === 'Newest' ? 'active' : ''}`}
                  onClick={() => { 
                    setSortOrder('Newest'); 
                    setCurrentPage(1);
                    setShowFilterMenu(false); 
                  }}
                >
                  Newest First
                </button>
                <button 
                  className={`filter-option ${sortOrder === 'Oldest' ? 'active' : ''}`}
                  onClick={() => { 
                    setSortOrder('Oldest'); 
                    setCurrentPage(1);
                    setShowFilterMenu(false); 
                  }}
                >
                  Oldest First
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Users Table --- */}
      <div className="table-card">
        <table className="user-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Posts</th>
              <th>Last Active</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length > 0 ? (
              currentUsers.map(user => (
                <tr key={user.id} className={disabledUsers.includes(user.id) ? 'row-disabled' : ''}>
                  <td>{user.name}</td>
                  <td className="email-cell">{user.email}</td>
                  <td>{user.postsCount}</td>
                  <td>{user.lastActive}</td>
                  <td className="user-actions">
                    <button className="btn-view-sm" onClick={() => handleViewUser(user)}>View</button>
                    <button className="btn-disable-sm" onClick={() => toggleDisable(user.id)}>
                      {disabledUsers.includes(user.id) ? 'Enable' : 'Disable'}
                    </button>
                    <button className="btn-delete-sm" onClick={() => confirmDelete(user)}> Delete </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="no-results">No users found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredAndSortedUsers.length > usersPerPage && (
          <div className="pagination">
            <button 
              onClick={() => paginate(currentPage - 1)} 
              disabled={currentPage === 1}
              className="pager-btn"
            > 
              &lt; 
            </button>
            
            {[...Array(totalPages)].map((_, index) => (
              <button 
                key={index + 1} 
                onClick={() => paginate(index + 1)}
                className={`page-num ${currentPage === index + 1 ? 'active' : ''}`}
              >
                {index + 1}
              </button>
            ))}

            <button 
              onClick={() => paginate(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className="pager-btn"
            > 
              &gt; 
            </button>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-confirmation" onClick={(e) => e.stopPropagation()}>
            <div className="warning-icon">⚠️</div>
            <h2 className="modal-title">Delete User?</h2>
            <p className="modal-description">
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? 
              This action cannot be undone and all user data will be lost.
            </p>
            
            <div className="modal-actions horizontal">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="confirm-delete-btn" onClick={executeDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingHistoryItem && (
      <div className="modal-overlay" onClick={() => setViewingHistoryItem(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-modal" onClick={() => setViewingHistoryItem(null)}>×</button>

          <h2 className="modal-title">Post Details</h2>

          <div className="modal-scroll-area">
            <div className="detail-image-box">
              <img 
                src={`https://picsum.photos/seed/${viewingHistoryItem.id}/400/300`} 
                alt="Large view" 
                className="modal-large-img" 
              />
            </div>

            <section className="detail-section">
              <h3>Status</h3>
              <div className={`schedule-status-badge ${viewingHistoryItem.status.toLowerCase()}`}>
                {viewingHistoryItem.status}
              </div>
            </section>

            <section className="detail-section">
              <h3>History Information</h3>
              <div className="schedule-info-box">
                <div className="schedule-row">
                  <span className="icon-circle">📅</span> 
                  <div>
                    <p className="label">Date of Action</p>
                    <strong>{viewingHistoryItem.date}</strong>
                  </div>
                </div>
                <div className="schedule-row">
                  <span className="icon-circle">🆔</span> 
                  <div>
                    <p className="label">Reference ID</p>
                    <strong>{viewingHistoryItem.id}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-section">
              <h3>Admin Note</h3>
              <div className="description-box">
                This post was generated by {selectedUser?.name || 'Unknown'}. 
                Current status is marked as {viewingHistoryItem.status}.
              </div>
            </section>
          </div>

          <button className="confirm-btn" onClick={() => setViewingHistoryItem(null)}>Done</button>
        </div>
      </div>
    )}
    </div>
  );
}