import { useState, useEffect } from 'react';
import './ManageUsers.css';
import mailIcon from '../assets/mail-icon.png';
import { supabase } from '../supabaseClient';

interface PostFromDB {
  post_id: number;
  user_id: string;
  post_image: string | null;
  missing_location: string | null;
  found_date: string | null;
  status: string;
  description: string | null;
  tags: string[] | null;
  created_at: string;
}

interface ClaimFromDB {
  request_id: number;
  meet_date: string;
  meet_time: string;
  location: string;
  status: string;
  post: {
    post_id: number;
    post_image: string | null;
    description: string | null;
    tags: string[] | null;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  postsCount: number;
  lastActive: string;
  profilePicture: string | null;
  created_at: string;
  history: {
    posts: PostFromDB[];
    claims: ClaimFromDB[];
  };
}

export default function ManageUsers() {
  // --- States ---
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'Newest' | 'Oldest'>('Newest');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 4;

  // Modals and detailed post view
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<PostFromDB | ClaimFromDB | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);


  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Banned'>('All');
  
  // Fetch Users from Supabase
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,full_name,email,role,profile_picture,created_at
        `)
        .in('role', ['user', 'banned']);

      if (error) throw error;

      if (data) {
        const usersWithCounts = await Promise.all(
          data.map(async (u) => {
            const { count } = await supabase
              .from('posts')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', u.id);
          
            return {
              id: u.id,
              name: u.full_name || 'Anonymous',
              email: u.email,
              profilePicture: u.profile_picture || null,
              matricNumber: 'N/A',
              role: u.role || 'user',
              postsCount: count || 0,
              lastActive: 'Click View',
              created_at: u.created_at,
              history: { posts: [], claims: [] }
            };
          })
        );    

        setUsers(usersWithCounts);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- Functions ---
  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setIsLoadingPost(true);
    
    try {
      // 1. Fetch "My Posts" (Items this user found)
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // 2. Fetch "My Claims" (Items this user lost and successfully retrieved)
      // Join with the 'posts' table to get the image and description of what was claimed
      const { data: claimsDataRaw } = await supabase
        .from('schedule_requests')
        .select(`
          request_id,
          meet_date,
          meet_time,
          location,
          status,
          post:posts (
            post_id,
            post_image,
            description,
            tags
          )
        `)
        .eq('owner_id', user.id)
        .eq('status', 'completed');

      console.log("Claims data fetched :", claimsDataRaw);

      // Map the claims data to convert post array to single object
      const claimsData = claimsDataRaw?.map(claim => ({
        request_id: claim.request_id,
        meet_date: claim.meet_date,
        meet_time: claim.meet_time,
        location: claim.location,
        status: claim.status,
        post: Array.isArray(claim.post) ? claim.post[0] : claim.post
      })) || [];

      // Update the selectedUser state with the history
      setSelectedUser({
        ...user,
        history: {
          posts: postsData || [],
          claims: claimsData
        }
      });
      setViewMode('detail');
    } catch (err) {
      console.error("Error fetching user history:", err);
    } finally {
      setIsLoadingPost(false);
    }
  };

  const logAdminActivity = async (action: string, targetId: string) => {
    const { data: { user: adminAuth } } = await supabase.auth.getUser();
    if (!adminAuth) return;

    // Get current admin details from your existing users state or fetch it
    const { error } =await supabase.from('audit_logs').insert({
      actor_id: adminAuth.id,
      actor_name: users.find(u => u.id === adminAuth.id)?.name || 'Admin',
      actor_type: 'admin',
      action_type: action,
      entity_type: 'profiles',
      target_id: targetId
    });

    if (error) console.error('Manual Log Error:', error);
  };

  const toggleDisable = async (userId: string, currentRole: string) => {
    // Determine the new role based on the current one
    const newRole = currentRole === 'banned' ? 'user' : 'banned';

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      await logAdminActivity(newRole === 'banned' ? 'User Banned' : 'User Unbanned', userId);

      // Update the local state so the UI reflects the change immediately
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );

      // If you are currently viewing this user in detail mode, update that too
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }

    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user status.');
    }
  };

  // Delete Logic
  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        action_type: 'USER_DELETED',
        entity_type: 'profiles',
        target_id: userToDelete.id,
      });

      if (error) throw error;

      await logAdminActivity('User Account Deleted', userToDelete.id);

      // Remove from the local list
      setUsers(users.filter(u => u.id !== userToDelete.id));
      
      // Close modals and return to list view if the deleted user was being viewed
      setShowDeleteModal(false);
      setViewMode('list'); 
      setSelectedUser(null);
      
      alert("User account and profile deleted successfully.");
    } catch (err) {
      console.error("Delete failed", err);
      alert("Action failed.");
    }
  };

  // Clear all search and filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSortOrder('Newest');
    setCurrentPage(1);
  };

  const filteredUsers = users
  .filter(u => {
    // 1. Search filter
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Status filter
    const matchesStatus = statusFilter === 'All' || 
                         (statusFilter === 'Active' && u.role !== 'banned') || 
                         (statusFilter === 'Banned' && u.role === 'banned');

    return matchesSearch && matchesStatus;
  })
  .sort((a, b) => {
    // 3. Sorting logic
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    
    if (sortOrder === 'Newest') return timeB - timeA; // Requires 'created_at' from DB to be accurate
    if (sortOrder === 'Oldest') return timeA - timeB;
    if (sortOrder === 'Most Active') return b.postsCount - a.postsCount;
    if (sortOrder === 'Least Active') return a.postsCount - b.postsCount;
    return 0;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const isClaimItem = (item: PostFromDB | ClaimFromDB): item is ClaimFromDB => {
    return 'meet_date' in item;
  };

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
            <div className="avatar-large">
              {selectedUser.profilePicture ? (
                <img 
                  src={selectedUser.profilePicture} 
                  alt={selectedUser.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                />
              ) : (
                "👤"
              )}
            </div>
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
            </div>

            <div className="info-group">
              <div className="stats-group">
                <h4 className="info-heading">ACCOUNT STATS</h4>
                <div className="info-row">
                  <div className="text-container">
                    <span className="info-label">Total Items Found:</span>
                    <span className="info-value">{selectedUser.history.posts.length} Posts</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="text-container">
                    <span className="info-label">Total Items Claimed:</span>
                    <span className="info-value">{selectedUser.history.claims.length} Claims</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-group">
              <div className="status-group">
                <h4 className="info-heading">ACCOUNT CONTROL</h4>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className={`status-badge ${selectedUser.role === 'banned' ? 'banned' : 'active'}`}>
                    {selectedUser.role === 'banned' ? '❌ Banned' : '✅ Active'}
                  </span>
                </div>
                <div className="profile-actions">
                  <button className="btn-disable-detail" onClick={() => toggleDisable(selectedUser.id, selectedUser.role)}>
                    {selectedUser.role === 'banned' ? 'Unban Account' : 'Ban Account'}
                  </button>
                  <button className="btn-delete-detail" onClick={() => confirmDelete(selectedUser)}> Delete User </button>
                </div>
              </div>
            </div>

            {/* <div className="info-group">
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
            </div> */}
          </div>

          {/* RIGHT COLUMN: History */}
          <div className="history-section">
            <h3 className="section-main-title">User History</h3>

            <div className="history-block">
              <h4 className="history-sub-title">My Posts</h4>
              <div className="history-list scrollable-history">
                {selectedUser.history.posts.length > 0 ? (
                  selectedUser.history.posts.map(post => (
                    <div key={post.post_id} className="history-card post-card" onClick={() => setViewingHistoryItem(post)}>
                      <img className="placeholder-box" src={post.post_image || ''} alt="Post" />
                      <div className="history-grid-info">
                        <div className="grid-item">
                          <span className="grid-label">Date of Post</span>
                          <span className="grid-value">{post.found_date}</span>
                        </div>
                        <div className="grid-item">
                          <span className="grid-label">Status</span>
                          <span className="grid-value">{post.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Empty State for Posts */
                  <div className="empty-history-state">
                    <div className="empty-icon">📦</div>
                    <p>No items found by this user yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="history-block">
              <h4 className="history-sub-title">My Claims </h4>
              <div className="history-list scrollable-history">
                {selectedUser.history.claims.length > 0 ? (
                  selectedUser.history.claims.map(claim => (
                    <div key={claim.request_id} className="history-card claim-card" onClick={() => setViewingHistoryItem(claim)}>
                      <img className="placeholder-box" src={claim.post?.post_image || ''} alt="Claim" />
                      <div className="history-grid-info">
                        <div className="grid-item">
                          <span className="grid-label">Date of Claim</span>
                          <span className="grid-value">{claim.meet_date}</span>
                        </div>
                        <div className="grid-item">
                          <span className="grid-label">Status</span>
                          <span className="grid-value">{claim.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Empty State for Claims */
                  <div className="empty-history-state">
                    <div className="empty-icon">🤝</div>
                    <p>No successful claims recorded for this user.</p>
                  </div>
                )}
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

              <h2 className="modal-title">
                {('post_id' in viewingHistoryItem) ? 'Post Details' : 'Claim Details'}
              </h2>

              <div className="modal-scroll-area">
                <div className="detail-image-box">
                  <img src={('post_id' in viewingHistoryItem) ? viewingHistoryItem.post_image || "https://via.placeholder.com/400" : viewingHistoryItem.post?.post_image || "https://via.placeholder.com/400"} alt="Item" className="modal-large-img" />
                </div>

                <section className="detail-section">
                  <h3>{isClaimItem(viewingHistoryItem) ? 'Claimed By' : 'Posted By'}</h3>
                  
                  <div className="user-info">
                    <div className="user-avatar">
                      {selectedUser?.profilePicture ? (
                          <img 
                              src={selectedUser.profilePicture} 
                              alt={selectedUser?.name || "User"} 
                              className="avatar-img"
                          />
                      ) : (
                          /* Fallback initial or icon if no picture exists */
                          <div className="avatar-placeholder">
                              {selectedUser?.name?.charAt(0) || "?"}
                          </div>
                      )}
                    </div>
                    <span>{selectedUser?.name || 'Unknown'}</span>
                  </div>
                </section>

                <section className="detail-section">
                  <h3>Tags</h3>
                  <div className="tag-cloud-modal">
                    {(('post_id' in viewingHistoryItem) ? viewingHistoryItem.tags : viewingHistoryItem.post?.tags)?.map((tag: string, index: number) => (
                      <span key={`${tag}-${index}`} className="modal-tag-pill">{tag}</span>
                    ))}
                  </div>
                </section>

                <section className="detail-section">
                  <h3>Description</h3>
                  <div className="description-box">
                    {('post_id' in viewingHistoryItem) ? viewingHistoryItem.description || "No description provided." : viewingHistoryItem.post?.description || "No description provided."}
                  </div>
                </section>

                <section className="detail-section">
                  <h3>Schedule</h3>
                  <div className="schedule-info-box">
                    <div className={`schedule-status-badge ${viewingHistoryItem.status.toLowerCase()}`}>
                      {viewingHistoryItem.status.toUpperCase()}
                    </div>
                    
                    {isClaimItem(viewingHistoryItem) ? (
                      <>
                        {/* Date Row */}
                        <div className="schedule-row">
                          <span className="icon-circle">📅</span> 
                          <div>
                            <p className="label">Date</p>
                            <strong>{viewingHistoryItem.meet_date}</strong>
                          </div>
                        </div>

                        {/* Time Row */}
                        <div className="schedule-row">
                          <span className="icon-circle">🕒</span>
                          <div>
                            <p className="label">Time</p>
                            <strong>{viewingHistoryItem.meet_time}</strong>
                          </div>
                        </div>

                        {/* Meeting Point Row */}
                        <div className="schedule-row">
                          <span className="icon-circle">📍</span>
                          <div>
                            <p className="label">Meeting Point</p>
                            <strong>{viewingHistoryItem.location}</strong>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="schedule-row">
                        <span className="icon-circle">⚠️</span>
                        <div>
                          <p className="label">Schedule Status</p>
                          <strong>No schedule information available for posts</strong>
                        </div>
                      </div>
                    )}
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
              placeholder="Enter name or email to search users..." 
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
                {['Newest', 'Oldest', 'Most Active', 'Least Active'].map((order) => (
                  <button 
                    key={order}
                    className={`filter-option ${sortOrder === order ? 'active' : ''}`}
                    onClick={() => { setSortOrder(order as any); setShowFilterMenu(false); }}
                  >
                    {order}
                  </button>
                ))}

                <div className="filter-divider" style={{ margin: '8px 0', borderTop: '1px solid #eee' }} />

                <p className="filter-label">Account Status:</p>
                {['All', 'Active', 'Banned'].map((status) => (
                  <button 
                    key={status}
                    className={`filter-option ${statusFilter === status ? 'active' : ''}`}
                    onClick={() => { setStatusFilter(status as any); setShowFilterMenu(false); }}
                  >
                    {status}
                  </button>
                ))}
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length > 0 ? (
              currentUsers.map(user => (
                <tr key={user.id} className={user.role === 'banned' ? 'row-disabled' : ''}>
                  <td>{user.name}</td>
                  <td className="email-cell">{user.email}</td>
                  <td>{user.postsCount}</td>
                  <td className="user-actions">
                    <button className="btn-view-sm" onClick={() => handleViewUser(user)}>View</button>
                    <button 
                    className="btn-disable-sm" 
                    onClick={() => toggleDisable(user.id, user.role)}
                    >
                      {user.role === 'banned' ? 'Unban' : 'Ban'}
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

        {filteredUsers.length > usersPerPage && (
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

          <h2 className="modal-title">
            {('post_id' in viewingHistoryItem) ? 'Post Details' : 'Claim Details'}
          </h2>

          <div className="modal-scroll-area">
            <div className="detail-image-box">
              <img 
                src={('post_id' in viewingHistoryItem) ? viewingHistoryItem.post_image || "https://via.placeholder.com/400" : viewingHistoryItem.post?.post_image || "https://via.placeholder.com/400"} 
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
                <div className="schedule-status-badge">{viewingHistoryItem.status}</div>

                <div className="schedule-row">
                  <span className="icon-circle">📅</span> 
                  <div>
                    <p className="label">Date of Action</p>
                    <strong>
                      {('found_date' in viewingHistoryItem) 
                      ? viewingHistoryItem.found_date 
                      : viewingHistoryItem.meet_date}
                    </strong>
                  </div>
                </div>

                <div className="schedule-row">
                  <span className="icon-circle">🆔</span> 
                  <div>
                    <p className="label">Reference ID</p>
                    <strong>
                      {('post_id' in viewingHistoryItem) 
                      ? viewingHistoryItem.post_id 
                      : viewingHistoryItem.request_id}
                    </strong>
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