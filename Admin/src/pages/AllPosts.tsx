import { useEffect, useState, useCallback } from 'react';
import './AllPosts.css';
import { supabase } from '../supabaseClient';

export default function AllPosts() {

  interface Post {
    post_id: number; 
    status: string;
    user_id: string;
    profiles?: {
      full_name: string;
    };
    tags: string[];
    previous_status?: string | null; 
    created_at: string;
    meeting_point: string;
    description: string;
    post_image: string; 
    schedule_requests?: {
      status: string;
      meet_date: string;
      meet_time: string;
      location?: string;
      created_at: string;
    }[];
  }

  // --- States (Kept exactly as your original) ---
  const [selectedTags, setSelectedTags] = useState<string[]>([]);  
  const [showSuggestions, setShowSuggestions] = useState(false);  
  const [searchTerm, setSearchTerm] = useState('');  
  const [viewingPost, setViewingPost] = useState<Post | null>(null);  
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDeletedPost, setLastDeletedPost] = useState<Post | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);

  const suggestions = ['Phone', 'Earbuds', 'Electronics', 'Wireless', 'Laptop', 'Charger', 'Keys', 'Wallet'];

  // --- Fetch Posts from Supabase ---
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles (
          full_name
          ),
          schedule_requests (
            status,
            meet_date,
            meet_time,
            location,
            created_at
          )
        `)
        .in('status', ['lost', 'claimed', 'archived'])
        .order('created_at', { foreignTable: 'schedule_requests', ascending: false });

      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter.toLowerCase());
      } else {
        query = query.not('status', 'in', '("removed", "archived")');
      }

      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags);
      }

      const isDescending = sortBy === 'Newest';
      query = query.order('created_at', { ascending: !isDescending });

      const { data, error } = await query;
      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedTags, sortBy]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // --- Logic: Filter for search bar (Kept your logic) ---
  const filteredAndSortedPosts = posts.filter(post => {
    return searchTerm === '' || 
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // --- Dynamic Suggestions based on existing tags in DB ---
  const fetchSuggestions = useCallback(async (input: string) => {
    try {
      // 1. Fetch tags from the database
      const { data, error } = await supabase
        .from('posts')
        .select('tags');

      if (error) throw error;

      // 2. Flatten and count occurrences
      const allTags = data?.flatMap(post => post.tags) || [];
      const counts: Record<string, number> = {};
      allTags.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });

      // 3. Filter based on user input
      let processedTags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

      if (input) {
        processedTags = processedTags.filter(tag => 
          tag.toLowerCase().includes(input.toLowerCase())
        );
      }

      // 4. Take Top 10
      setDynamicSuggestions(processedTags.slice(0, 10));
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  }, []);

  // Trigger fetch on mount and when search term changes
  useEffect(() => {
    fetchSuggestions(searchTerm);
  }, [searchTerm, fetchSuggestions]);

  // --- Pagination (Kept your logic) ---
  const totalPages = Math.ceil(filteredAndSortedPosts.length / postsPerPage);
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredAndSortedPosts.slice(indexOfFirstPost, indexOfLastPost);

  // --- Actions (Updated to use Supabase) ---
  const removeTag = (tagtoRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagtoRemove));
    setCurrentPage(1);
  };

  const addTag = (newTag: string) => {
    // 1. Add the tag to the selected list if not already present
    if (!selectedTags.includes(newTag)) {
      setSelectedTags([...selectedTags, newTag]);
    }

    // 2. Clear the typed text in the search bar everytime a tag is added
    setSearchTerm('');
    
    // Keep suggestions hidden after adding a tag but allow reopening
    setShowSuggestions(false);
    setCurrentPage(1);
  };

  const clearAllTags = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setStatusFilter('All');
    setSortBy('Newest');
    setCurrentPage(1);
  };

  const deletePost = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
    if (!confirmed) return;

    try{
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('post_id', id);

      if (error) throw error;

      await fetchPosts();
      setViewingPost(null);
      alert('Post deleted successfully.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
    }
  };

  const archivePost = async (id: number, currentStatus: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ 
          status: 'archived', 
          previous_status: currentStatus 
        })
        .eq('post_id', id)
        .select();

      if (error) {
        // THIS WILL TELL YOU EXACTLY WHY: e.g., "Policy violation" or "Column not found"
        console.error('Supabase Error Details:', error.message, error.details, error.hint);
        alert(`Error: ${error.message}`); 
        return;
      }

      console.log("Success! Updated data:", data);
      await fetchPosts();
      setViewingPost(null);

    } catch (error) {
      console.error('Error archiving post:', error);
      alert('Failed to archive post. Please try again.');
    }
  };

  const unarchivePost = async (id: number, prevStatus: string | null) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: prevStatus || 'lost', 
          previous_status: null 
        })
        .eq('post_id', id);

      if (error) throw error;

      // CRITICAL: You must fetch the posts again to see the change in the UI
      await fetchPosts();
      setViewingPost(null);

      alert('Post unarchived successfully.');
    } catch (error) {
      console.error('Error unarchiving post:', error);
      alert('Failed to unarchive post. Please try again.');
    }
  };

  const undoDelete = () => { /* Logic remains same as your original */ };

  // Helper function to get the latest schedule request
  const getLatestScheduleRequest = (scheduleRequests?: Post['schedule_requests']) => {
    if (!scheduleRequests || scheduleRequests.length === 0) return null;
    
    // Since we're ordering by created_at DESC in the query, 
    // the first item should be the latest, but let's ensure this
    return scheduleRequests.reduce((latest, current) => {
      const latestDate = new Date(latest.created_at);
      const currentDate = new Date(current.created_at);
      return currentDate > latestDate ? current : latest;
    }, scheduleRequests[0]);
  };

  return (
    <div className="all-posts-container">
      {/* --- Search bar (Kept your SVG and Layout) --- */} 
      <div className="search-area">
        <div className="search-bar-wrap">
          <div className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div className="tag-input-container">
            {selectedTags.map(tag => (
              <span key={tag} className="search-tag">
                {tag} 
                <button className="remove-tag-btn" onClick={() => removeTag(tag)}>x</button>
              </span>
            ))}
            <input 
              type="text" 
              placeholder="Enter your text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
            />
          </div>

          {(selectedTags.length > 0 || searchTerm !== '') && (
            <button className="clear-all-btn" onClick={clearAllTags}>Clear All</button>
          )}

          <div className="filter-settings-container">
            <button className="filter-settings-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </button>
            {showFilterMenu && (
              <div className="filter-dropdown">
                <p className="filter-label">Sort By:</p>
                <button className={`filter-option ${sortBy === 'Newest' ? 'active' : ''}`} onClick={() => setSortBy('Newest')}>Newest First</button>
                <button className={`filter-option ${sortBy === 'Oldest' ? 'active' : ''}`} onClick={() => setSortBy('Oldest')}>Oldest First</button>
                <hr className="dropdown-divider" />
                <p className="filter-label">Filter Status:</p>
                <button className={`filter-option ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => { setStatusFilter('All'); setShowFilterMenu(false); }}> All Items</button>
                <button className={`filter-option ${statusFilter === 'Lost' ? 'active' : ''}`} onClick={() => { setStatusFilter('Lost'); setShowFilterMenu(false); }}><span className="dot lost-dot"></span> Lost</button>
                <button className={`filter-option ${statusFilter === 'Claimed' ? 'active' : ''}`} onClick={() => { setStatusFilter('Claimed'); setShowFilterMenu(false); }}><span className="dot claimed-dot"></span> Claimed</button>
                <button className={`filter-option ${statusFilter === 'Archived' ? 'active' : ''}`} onClick={() => { setStatusFilter('Archived'); setShowFilterMenu(false); }}><span className="dot archived-dot"></span> Archived</button>
              </div>
            )}
          </div>

          {showSuggestions && (
            <div className="suggestions-dropdown">
              <div className="suggestion-section">
                <h4>Selected</h4>
                <div className="suggestion-chips">
                  {selectedTags.map(tag => (
                    <span key={tag} className="search-tag active-tag">
                      {tag} <span className="close-x" onClick={() => removeTag(tag)}>x</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="suggestion-section">
                <h4>{searchTerm ? "Search Results" : "Top Suggestions"}</h4>
                <div className="suggestion-chips">
                  {dynamicSuggestions.map(tag => (
                    <button key={tag} className="suggest-chip" onClick={() => addTag(tag)}>{tag}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Card Grid (Kept your Layout) --- */}
      <div className="posts-grid">
        {currentPosts.length > 0 ? (
          currentPosts.map((post) => (
            <div key={post.post_id} className="post-card" onClick={() => setViewingPost(post)}>

              <div className={`item-badge ${post.status.toLowerCase()}`}>
                {post.status}
              </div>

              <div className="card-image-wrapper">
                <img src={post.post_image} alt="Item" className="card-image" />
              </div>
              
              <div className="card-tag-scroll">
                {post.tags.map(tag => <span key={tag} className="footer-tag">{tag}</span>)}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-container">
            <div className="empty-icon">📂</div>
            <h3>No posts found</h3>
            <button className="reset-search-btn" onClick={clearAllTags}>Clear All Filters</button>
          </div>
        )}
      </div>

      {/* --- Pagination (Kept your Layout) --- */}
      <div className="pagination-container">
        <button className="page-arrow" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>&lt;</button>
        {[...Array(totalPages)].map((_, index) => (
          <button key={index + 1} className={`page-number ${currentPage === index + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(index + 1)}>{index + 1}</button>
        ))}
        <button className="page-arrow" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>&gt;</button>
      </div>

      {/* --- Modal Overlay (Kept your exact Layout) --- */}
      {viewingPost && (() => {
        const latestSchedule = getLatestScheduleRequest(viewingPost.schedule_requests);
        
        return (
          <div className="modal-overlay" onClick={() => setViewingPost(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setViewingPost(null)}>×</button>
              <h2 className="modal-title">Post Details</h2>
              <div className="modal-scroll-area">
                <div className="detail-image-box">
                  <img src={viewingPost.post_image} alt="Large view" className="modal-large-img" />
                </div>
                <section className="detail-section">
                  <h3>Posted By</h3>
                  <div className="user-info">
                    <div className="user-avatar"></div>
                    <span>{viewingPost.profiles?.full_name || "Unknown"}</span>
                  </div>
                </section>
                <section className="detail-section">
                  <h3>Tags</h3>
                  <div className="tag-cloud-modal">
                    {viewingPost.tags.map(tag => <span key={tag} className="modal-tag-pill">{tag}</span>)}
                  </div>
                </section>
                <section className="detail-section">
                  <h3>Description</h3>
                  <div className="description-box">{viewingPost.description || "No description provided."}</div>
                </section>
                <section className="detail-section">
                  <h3>Schedule</h3>
                  <div className="schedule-info-box">
                    {latestSchedule ? (
                      <>
                        <div className={`schedule-status-badge ${latestSchedule.status}`}>
                          {latestSchedule.status.toUpperCase()}
                        </div>
                        
                        <div className="schedule-row">
                          <span className="icon-circle">📅</span> 
                          <div>
                            <p className="label">Date</p>
                            <strong>{latestSchedule.meet_date}</strong>
                          </div>
                        </div>
                        
                        <div className="schedule-row">
                          <span className="icon-circle">🕒</span>
                          <div>
                            <p className="label">Time</p>
                            <strong>{latestSchedule.meet_time}</strong>
                          </div>
                        </div>

                        <div className="schedule-row">
                          <span className="icon-circle">📍</span>
                          <div>
                            <p className="label">Meeting Point</p>
                            <strong>{latestSchedule.location || viewingPost.meeting_point || 'Not specified'}</strong>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="schedule-row">
                        <span className="icon-circle">⚠️</span>
                        <div>
                          <p className="label">Schedule Status</p>
                          <strong>No active schedule requests</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="modal-actions">
                {viewingPost.status.toLowerCase() === 'archived' ? (
                  <button className="unarchive-btn" onClick={() => unarchivePost(viewingPost.post_id, viewingPost.previous_status || null)}>Unarchive Post</button>
                ) : (
                  <button className="archive-btn" onClick={() => archivePost(viewingPost.post_id, viewingPost.status)}>Archive Post</button>
                )}
                <button className="delete-btn" onClick={() => deletePost(viewingPost.post_id)}>Delete Post</button>
              </div>
              <button className="confirm-btn" onClick={() => setViewingPost(null)}>Done</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Rmb to check if the archive function works properly for the user side
// The scheduling part too, for the details like meeting point, date and time