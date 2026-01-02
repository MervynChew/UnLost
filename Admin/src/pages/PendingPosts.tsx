import { useState, useRef, useEffect } from 'react';
import './PendingPosts.css';
import { supabase } from '../supabaseClient';

// Define the Post structure
interface Post {
  post_id: number;
  user_id: string;
  profiles?: {
    full_name: string;
  };
  tags: string[];
  missing_location: string;
  found_date: string;
  status: string;
  description: string;
  post_image: string;
}

export default function PendingPosts() {

  // States 
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);    // Controls the reject modal visibility
  const [rejectCategory, setRejectCategory] = useState('');    // For the reject reason select
  const [additionalDetails, setAdditionalDetails] = useState('');    // For the reject additional details
  const [isProcessing, setIsProcessing] = useState<number | null>(null);    // Stores ID of post being approved
  const [showUndoToast, setShowUndoToast] = useState(false);     // Controls visibility of undo toast
  const lastAction = useRef<{ post: Post; timer: ReturnType<typeof setTimeout> } | null>(null);    // Stores last action for undo
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);

  // Fetch Pending Posts from Supabase
  const fetchPending = async() => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(full_name)')
      .eq('status', 'pending') // Only fetch unverified posts
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setPendingPosts(data || []);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // Approve Post: Updates status in Supabase and UI
  const handleApprove = async (post: Post) => {
    setIsProcessing(post.post_id);
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'lost' }) // Change from pending to lost
        .eq('post_id', post.post_id);

      if (error) throw error;

      // UI Updates
      setPendingPosts(prev => prev.filter(p => p.post_id !== post.post_id));
      setViewingPost(null);
      setShowUndoToast(true);
      
      // Set up the Undo timer (Optional)
      lastAction.current = { 
        post: post, 
        timer: setTimeout(() => setShowUndoToast(false), 5000) 
      };
    } catch (err) {
      const error = err as Error;
      console.error("Approval error:", error.message);
      alert("Failed to approve post.");
    } finally {
      setIsProcessing(null);
    }
  };

  // Handles both approve and reject actions from the table buttons
  const handleAction = (post: Post, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      handleApprove(post); 
    } else {
      // This allows the reject modal to work from both inside and outside the View modal
      setViewingPost(post); 
      setShowRejectModal(true);
    }
  };

  const undoAction = async () => {
    if (!lastAction.current || !lastAction.current.post) return;

    const postToRestore = lastAction.current.post;
    clearTimeout(lastAction.current.timer);

    try {
      // 1. Revert the status in the Database
      const { error } = await supabase
        .from('posts')
        .update({ status: 'pending' })
        .eq('post_id', postToRestore.post_id);

      if (error) throw error;

      // 2. Update local UI
      setPendingPosts(prev => {
        if (prev.some(p => p.post_id === postToRestore.post_id)) return prev;
        return [postToRestore, ...prev];
      });

      setShowUndoToast(false);
      lastAction.current = null;
    } catch (err) {
      console.error("Undo failed on server:", err);
      alert("Could not undo. The post has already been published.");
    }
  };

  // Reset the rejection state variables
  const resetRejectionState = () => {
    setRejectCategory('');
    setAdditionalDetails('');
    setShowRejectModal(false);
    setViewingPost(null);
  };

  // Reject function removes post from Pending (in real app, would update DB)
  const handleRejectConfirm = async () => {
    if (!viewingPost || !rejectCategory) return;

    try {
      // Option A: Delete the post entirely
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('post_id', viewingPost.post_id);

      // Option B (Recommended): Update status to 'rejected' 
      // and store the rejection reason in a new column

      if (error) throw error;

      setPendingPosts(prev => prev.filter(p => p.post_id !== viewingPost.post_id));
      resetRejectionState();
      alert("Post rejected.");
    } catch (err) {
      const error = err as Error;
      console.error("Approval error:", error.message);
      alert("Failed to approve post.");
    }
  };

  return (
    <div className="pending-container">
      <header className="dash-header">
        <h2 className="title">Pending Approvals</h2>
      </header>

      {/* Show Table if data exists, otherwise show Empty State */}
      {pendingPosts.length > 0 ? (
        <div className="table-card">
          <table className="pending-table">
            <thead>
              <tr>
                <th>Post ID</th>
                <th>Finder</th>
                <th>Item Tags</th>
                <th>Found Location</th>
                <th>Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPosts.map((post) => (
                <tr key={post.post_id}>
                  <td>#{post.post_id}</td>
                  <td>{post.profiles?.full_name || "Unknown"}</td>
                  <td>
                    <div className="tag-pill-container">
                      {post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="table-tag">#{tag}</span>
                      ))}
                      {post.tags.length > 2 && <span className="tag-more">+{post.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td>{post.missing_location}</td>
                  <td>
                    <div className="datetime-cell">
                      <span>{post.found_date}</span>
                    </div>
                  </td>
                  <td className="action-cells">
                    <button className="view-link" onClick={() => setViewingPost(post)}>View</button>
                    <button 
                      className="btn-approve" 
                      onClick={() => handleAction(post, 'approve')}
                      disabled={isProcessing !== null}
                    >
                      {isProcessing === post.post_id ? "..." : "Approve"}
                    </button>
                    <button 
                      className="btn-reject" 
                      onClick={() => handleAction(post, 'reject')}
                      disabled={isProcessing !== null}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="check-icon">✓</div>
          <h3>All caught up!</h3>
          <p>There are no new posts requiring verification at the moment.</p>
        </div>
      )}

      {/* Detail Modal */}
      {viewingPost && !showRejectModal && (
        <div className="modal-overlay" onClick={() => setViewingPost(null)}>
          <div className="modal-content-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-grid-container">

              {/* Left Column: Image & Location */}
              <div className="modal-left-col">
                <div className="main-image-wrapper">
                  <img src={viewingPost.post_image} alt="Item" className="modal-hero-img" />
                  <div className="image-badge">Pending Verification</div>
                </div>
                <div className="location-context-card">
                  <h4>📍 Automated Location Capture</h4>
                  <p><strong>Area:</strong> {viewingPost.missing_location}</p>

                  <div className="map-container">
                    <iframe
                      title="Location Map"
                      className="google-map-iframe"
                      loading="lazy"
                      /* Notice the URL doesn't use the 'Embed API' endpoint, 
                        but the standard Google Maps search embed endpoint */
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(viewingPost.missing_location)}&t=&z=13&ie=UTF8&iwloc=near&output=embed`}
                    ></iframe>
                  </div>
                </div>
              </div>

              {/* Right Column: Details & Actions */}
              <div className="modal-right-col">
                <div className="modal-header">
                  <span className="post-id-label">POST REFERENCE</span>
                  <span className="post-id-number">#{viewingPost.post_id}</span>
                  <h2 className="modal-title">Item Analysis</h2>
                </div>

                <section className="info-block">
                  <label className="block-label">AI Detected Tags</label>
                  <div className="tag-cloud">
                    {viewingPost.tags.map((tag) => (
                      <span key={tag} className="verify-tag">#{tag}</span>
                    ))}
                  </div>
                </section>

                <section className="info-block">
                  <label className="block-label">Description</label>
                  <div className="description-scroll-box">{viewingPost.description}</div>
                </section>

                <div className="modal-footer-actions">
                  <button className="reject-action-btn" onClick={() => setShowRejectModal(true)}>Reject</button>
                  <button className="approve-action-btn" onClick={() => handleApprove(viewingPost)}>Approve & Publish</button>
                </div>
              </div>
            </div>
            <button className="close-x-btn" onClick={resetRejectionState}>✕</button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && viewingPost && (
        <div className="modal-overlay">
          <div className="rejection-card">
            <h3>Reject Post #{viewingPost.post_id}</h3>
            <label className="block-label">Select Reason</label>
            <select className="rejection-select" value={rejectCategory} onChange={(e) => setRejectCategory(e.target.value)}>
              <option value="">-- Select a reason --</option>
              <option value="Blurry Image">Image is too blurry</option>
              <option value="Inappropriate Content">Inappropriate content</option>
              <option value="Other">Other</option>
            </select>
            <textarea className="rejection-textarea" placeholder="Additional details..." onChange={(e) => setAdditionalDetails(e.target.value)} />
            <div className="rejection-footer">
              <button className="btn-cancel" onClick={resetRejectionState}>Cancel</button>
              <button className="btn-send-reject" onClick={handleRejectConfirm}>Send Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Undo Notification Toast --- */}
      {showUndoToast && (
        <div className="undo-toast">
          <span>Post Approved Successfully</span>
          <button onClick={undoAction}>UNDO</button>
        </div>
      )}
    </div>
  );
}