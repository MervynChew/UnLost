import { useState, useRef } from 'react';
import './PendingPosts.css';

// Define the Post structure
interface Post {
  id: number;
  user: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  imageUrl: string;
  tags: string[];
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

  // Mock Data
  const [pendingPosts, setPendingPosts] = useState<Post[]>([
    {
      id: 1,
      user: 'Abu',
      title: 'Found Blue Wallet',
      date: '21/08/2024',
      time: '2:00 pm',
      location: 'Library Cafe',
      description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry...',
      imageUrl: 'https://picsum.photos/400/300?random=1',
      tags: ['Wallet', 'Personal Item', 'Blue', 'Leather']
    },
    {
      id: 2,
      user: 'Siti',
      title: 'Lost Sony Headphones',
      date: '22/08/2024',
      time: '4:30 pm',
      location: 'Student Center',
      description: 'Left my black Sony headphones on a table in the study hall.',
      imageUrl: 'https://picsum.photos/400/300?random=2',
      tags: ['Headphones', 'Electronics']
    },
  ]);

  // Approve function moves post to All Posts (in real app, would update DB)
  const handleApprove = async (post: Post) => {
    setIsProcessing(post.id);
    
    setTimeout(() => {
      // Clear existing undo timer if a second post is approved quickly
      if (lastAction.current?.timer) clearTimeout(lastAction.current.timer);

      // Save the full object for undo
      lastAction.current = { 
        post: post, 
        timer: setTimeout(() => setShowUndoToast(false), 5000) 
      };

      setPendingPosts(prev => prev.filter(p => p.id !== post.id));
      setViewingPost(null);
      setIsProcessing(null);
      setShowUndoToast(true);
    }, 800); 
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

  const undoAction = () => {
    // 1. Safety Check: If lastAction or post is missing, do nothing (don't crash!)
    if (!lastAction.current || !lastAction.current.post) {
      console.warn("Undo failed: No post found in lastAction history.");
      setShowUndoToast(false);
      return;
    }

    // 2. Stop the timer that hides the toast
    clearTimeout(lastAction.current.timer);

    // 3. Extract the post into a local variable so it can't change mid-update
    const postToRestore = lastAction.current.post;

    // 4. Update state safely
    setPendingPosts(prev => {
      // Check if the post is already back in the list to prevent duplicates
      const isAlreadyThere = prev.some(p => p.id === postToRestore.id);
      if (isAlreadyThere) return prev;
      
      return [postToRestore, ...prev];
    });

    // 5. Clean up
    setShowUndoToast(false);
    lastAction.current = null;
  };

  // Reset the rejection state variables
  const resetRejectionState = () => {
    setRejectCategory('');
    setAdditionalDetails('');
    setShowRejectModal(false);
    setViewingPost(null);
  };

  // Reject function removes post from Pending (in real app, would update DB)
  const handleRejectConfirm = () => {
    if (!viewingPost || !rejectCategory) return alert("Please provide a reason for rejection.");

    // Send the combined reason and details for the email content
    const fullMessage = `Reason: ${rejectCategory}. \n\nDetails: ${additionalDetails || 'N/A'}`;

    // 1. In a real app: Trigger an API call to send Email to user
    console.log(`Sending email for Post #${viewingPost.id}: ${fullMessage}`);

    // 2. Remove post from pending list
    setPendingPosts(prev => prev.filter(p => p.id !== viewingPost.id));
    
    // 3. Reset rejection state and close modal
    resetRejectionState();
    alert("Post rejected and email notification sent.");
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
                <tr key={post.id}>
                  <td>#{post.id}</td>
                  <td>{post.user}</td>
                  <td>
                    <div className="tag-pill-container">
                      {post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="table-tag">#{tag}</span>
                      ))}
                      {post.tags.length > 2 && <span className="tag-more">+{post.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td>{post.location}</td>
                  <td>
                    <div className="datetime-cell">
                      <span>{post.date}</span>
                      <small>{post.time}</small>
                    </div>
                  </td>
                  <td className="action-cells">
                    <button className="view-link" onClick={() => setViewingPost(post)}>View</button>
                    <button 
                      className="btn-approve" 
                      onClick={() => handleAction(post, 'approve')}
                      disabled={isProcessing !== null}
                    >
                      {isProcessing === post.id ? "..." : "Approve"}
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
                  <img src={viewingPost.imageUrl} alt="Item" className="modal-hero-img" />
                  <div className="image-badge">Pending Verification</div>
                </div>
                <div className="location-context-card">
                  <h4>📍 Automated Location Capture</h4>
                  <p><strong>Area:</strong> {viewingPost.location}</p>
                  <div className="mock-map-view"><span>Map View Enabled</span></div>
                </div>
              </div>

              {/* Right Column: Details & Actions */}
              <div className="modal-right-col">
                <div className="modal-header">
                  <span className="post-id-label">POST REFERENCE</span>
                  <span className="post-id-number">#{viewingPost.id}</span>
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
            <h3>Reject Post #{viewingPost.id}</h3>
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