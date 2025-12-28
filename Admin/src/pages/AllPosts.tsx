import { useState } from 'react';
import './AllPosts.css';

export default function AllPosts() {

  interface Post {
  id: number;
  postedBy: string;
  tags: string[];
  status: string;
  scheduleStatus: string;
  date: string;
  time: string;
  meetingPoint: string;
  description: string;
  imageUrl: string;
  }

  // Sample data for posts - will be replced with real data later
  const all_mock_posts = Array.from({ length: 14 }, (_, i) => ({
    id: i + 1,
    postedBy: i % 2 === 0 ? 'Abu' : 'Siti',
    tags: i % 3 === 0 ? ['Phone', 'Electronics'] : ['Earbuds', 'Wireless'],
    status: i % 2 === 0 ? 'Unclaimed' : 'Claimed',
    scheduleStatus: i % 4 === 0 ? 'Completed' : 'Pending',
    date: `Wed, ${20 + i}th Aug 2024`,
    time: `${1 + (i % 12)}.00 pm`,
    meetingPoint: i % 2 === 0 ? 'Library Cafe' : 'Student Center',
    description: i % 2 === 0
    ? "A pair of light blue wireless earbuds found near the cafe." 
    : "Black smartphone with a cracked screen found on a bench.",
    imageUrl: `https://picsum.photos/seed/${i + 1}/400/300`
  }));

  // States
  const [selectedTags, setSelectedTags] = useState<string[]>([]);  // State to track tags selected in the search bar
  const [showSuggestions, setShowSuggestions] = useState(false);  // State to toggle suggestion dropdown
  const [searchTerm, setSearchTerm] = useState('');  // State to track the search input text
  const [viewingPost, setViewingPost] = useState<Post | null>(null);  // State for the currently selected post for the pop up modal
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' means show everything, otherwise 'Unclaimed' or 'Claimed'
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');  // Have filter for Newest and Oldest
  const [posts, setPosts] = useState(all_mock_posts);
  const [lastDeletedPost, setLastDeletedPost] = useState<Post | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Available tags for suggestions
  const suggestions = ['Phone', 'Earbuds', 'Electronics', 'Wireless', 'Laptop', 'Charger', 'Keys', 'Wallet'];

  // Filter posts based on selected tags and search term and sort them
  const filteredAndSortedPosts = [...posts]
  .filter(post => {
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
    const matchesSearch = searchTerm === '' || 
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const isNotRemoved = post.status !== 'Removed';
    const matchesStatus = statusFilter === 'All' ? isNotRemoved : post.status === statusFilter;

    return matchesTags && matchesSearch && matchesStatus;
  })
  .sort((a, b) => {
    // In a real DB, you'd use timestamps. For now, we use IDs.
    return sortBy === 'Newest' ? b.id - a.id : a.id - b.id;
  });
  

  // Pagination state (shows 6 posts per page)
  const totalPages = Math.ceil(filteredAndSortedPosts.length / postsPerPage);
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredAndSortedPosts.slice(indexOfFirstPost, indexOfLastPost);

  // This helps to filter out the tags that are already selected
  const removeTag = (tagtoRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagtoRemove));
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  // This helps to add new tags from the suggestion dropdown
  const addTag = (newTag: string) => {
    if (!selectedTags.includes(newTag)) {
      setSelectedTags([...selectedTags, newTag]);
    }
    setShowSuggestions(false);
    setCurrentPage(1); // Reset to page 1 when filter changes
  };

  // This allows the clear all tags function
  const clearAllTags = () => {
  setSearchTerm('');
  setSelectedTags([]);
  setStatusFilter('All');  // Reset status
  setSortBy('Newest');     // Reset sort
  setCurrentPage(1);
  };

  // This allows admins to delete a post entirely
  const deletePost = (id: number) => {
    const postToDelete = posts.find(p => p.id === id);
    if (postToDelete) {
      // Save the post in case we want to undo
      setLastDeletedPost(postToDelete);
      
      // Mark as removed
      setPosts(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'Removed' } : p
      ));
      
      setViewingPost(null);
      setShowUndoToast(true);

      // Auto-hide the toast after 5 seconds
      setTimeout(() => setShowUndoToast(false), 5000);
    }
  };

  // Undo delete action
  const undoDelete = () => {
    if (lastDeletedPost) {
      setPosts(prev => prev.map(p => 
        p.id === lastDeletedPost.id ? { ...p, status: lastDeletedPost.status } : p
      ));
      setShowUndoToast(false);
      setLastDeletedPost(null);
    }
  };

  // Allows admins to archive a post (meaning hide a post)
  const archivePost = (id: number) => {
    // Usually, this would change a status in the DB to 'Archived'
    setPosts(prev => prev.map(post => 
      post.id === id ? { ...post, status: 'Archived' } : post
    ));
    setViewingPost(null);
    alert(`Post #${id} has been moved to archives.`);
  };

  return (
    <div className="all-posts-container">
      {/* --- Search bar --- */} 
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
              onChange={(e) => setSearchTerm(e.target.value)} // Captures typing
              onFocus={() => setShowSuggestions(true)}
            />
          </div>

          {(selectedTags.length > 0 || searchTerm !== '') && (
            <button className="clear-all-btn" onClick={clearAllTags}>
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
                <p className="filter-label">Sort By:</p>
                <button 
                  className={`filter-option ${sortBy === 'Newest' ? 'active' : ''}`}
                  onClick={() => setSortBy('Newest')}
                >
                  Newest First
                </button>
                <button 
                  className={`filter-option ${sortBy === 'Oldest' ? 'active' : ''}`}
                  onClick={() => setSortBy('Oldest')}
                >
                  Oldest First
                </button>
                
                <hr className="dropdown-divider" />
                
                <p className="filter-label">Filter Status:</p>
                <div className="filter-group">
                  <button 
                    className={`filter-option ${statusFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('All')}
                  >
                    All Items
                  </button>
                  <button 
                    className={`filter-option ${statusFilter === 'Unclaimed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Unclaimed')}
                  >
                    <span className="dot unclaimed-dot"></span> Unclaimed
                  </button>
                  <button 
                    className={`filter-option ${statusFilter === 'Claimed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Claimed')}
                  >
                    <span className="dot claimed-dot"></span> Claimed
                  </button>
                  <button 
                    className={`filter-option ${statusFilter === 'Archived' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('Archived')}
                  >
                    <span className="dot archived-dot"></span> Archived
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Suggestion Dropdown --- */}
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
              <h4>Suggestion</h4>
              <div className="suggestion-chips">
                {suggestions.map(tag => (
                  <button 
                    key={tag} 
                    className="suggest-chip"
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Card Grid (ONLY ONE GRID) --- */}
      <div className="posts-grid">
        {currentPosts.length > 0 ? (
          currentPosts.map((post) => (
            <div key={post.id} className="post-card" onClick={() => setViewingPost(post)}>
              <div className="card-image-wrapper">
                <img src={post.imageUrl} alt="Post" className="card-image" />
                <span className={`item-badge ${post.status.toLowerCase()}`}>{post.status}</span>
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
            <p>Try adjusting your filters or search terms to find what you're looking for.</p>
            <button className="reset-search-btn" onClick={clearAllTags}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* --- Pagination Controls --- */}
      <div className="pagination-container">
        <button 
          className="page-arrow" 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        >
          &lt;
        </button>

        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index + 1}
            className={`page-number ${currentPage === index + 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}

        <button 
          className="page-arrow" 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        >
          &gt;
        </button>
      </div>

      {/* --- The Modal Overlay (Placed outside the grid) --- */}
      {viewingPost && (
        <div className="modal-overlay" onClick={() => setViewingPost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setViewingPost(null)}>×</button>

            <h2 className="modal-title">Post Details</h2>

            <div className="modal-scroll-area">
              <div className="detail-image-box">
                <img src={viewingPost.imageUrl} alt="Large view" className="modal-large-img" />
              </div>

              <section className="detail-section">
                <h3>Posted By</h3>
                <div className="user-info">
                  <div className="user-avatar"></div>
                  <span>{viewingPost.postedBy}</span>
                </div>
              </section>

              <section className="detail-section">
                <h3>Tags</h3>
                <div className="tag-cloud-modal">
                  {viewingPost.tags.map((tag: string) => (
                    <span key={tag} className="modal-tag-pill">{tag}</span>
                  ))}
                </div>
              </section>

              <section className="detail-section">
                <h3>Description</h3>
                <div className="description-box">
                  {viewingPost.description || "No description provided."}
                </div>
              </section>

              <section className="detail-section">
              <h3>Schedule</h3>
              <div className="schedule-info-box">
                <div className="schedule-status-badge">{viewingPost.scheduleStatus}</div>
                
                {/* Date Row */}
                <div className="schedule-row">
                  <span className="icon-circle">📅</span> 
                  <div>
                    <p className="label">Date</p>
                    <strong>{viewingPost.date}</strong>
                  </div>
                </div>

                {/* Time Row */}
                <div className="schedule-row">
                  <span className="icon-circle">🕒</span>
                  <div>
                    <p className="label">Time</p>
                    <strong>{viewingPost.time}</strong>
                  </div>
                </div>

                {/* Meeting Point Row */}
                <div className="schedule-row">
                  <span className="icon-circle">📍</span>
                  <div>
                    <p className="label">Meeting Point</p>
                    <strong>{viewingPost.meetingPoint}</strong>
                  </div>
                </div>
              </div>
              </section>
            </div>

            <div className="modal-actions">
              <button className="archive-btn" onClick={() => archivePost(viewingPost.id)}>
                Archive Post
              </button>
              <button className="delete-btn" onClick={() => deletePost(viewingPost.id)}>
                Delete Post
              </button>
            </div>

            <button className="confirm-btn" onClick={() => setViewingPost(null)}>Done</button>
          </div>
        </div>
      )}
      {/* --- Undo Notification Toast --- */}
      {showUndoToast && (
        <div className="undo-toast">
          <span>Post removed successfully</span>
          <button onClick={undoDelete}>UNDO</button>
        </div>
      )}
    </div>
  );
}