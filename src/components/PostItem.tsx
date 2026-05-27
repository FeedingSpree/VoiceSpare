import React, { useState, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Ghost, User as UserIcon, MessageSquare, ArrowBigUp, ArrowBigDown, CreditCard as Edit2, X, Check, Image as ImageIcon, Share2, Flag } from 'lucide-react';
import { motion } from 'motion/react';
import { CommentSection } from './CommentSection';
import { Link, useNavigate } from 'react-router-dom';
import { containsProfanity } from '../utils/profanityFilter';

const CATEGORIES = ['Random', 'Small Business', 'Facility Concerns', 'Faculty Issues'];

interface PostItemProps {
  key?: string;
  post: any;
  user: any;
  handleDelete: (id: string) => void;
  confirmDelete: (id: string) => void;
  cancelDelete: () => void;
  deletingId: string | null;
  isThreadView?: boolean;
}

export function PostItem({ post, user, handleDelete, confirmDelete, cancelDelete, deletingId, isThreadView = false }: PostItemProps) {
  const [showComments, setShowComments] = useState(isThreadView);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editCategory, setEditCategory] = useState(post.category || 'Random');
  const [editImage, setEditImage] = useState<string | null>(post.imageUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const isOwner = user?.uid === post.authorUid;
  const isAnonymous = post.isAnonymous;
  
  const upvotedBy = post.upvotedBy || [];
  const downvotedBy = post.downvotedBy || [];
  const score = post.score || 0;
  
  const isUpvoted = user ? upvotedBy.includes(user.uid) : false;
  const isDownvoted = user ? downvotedBy.includes(user.uid) : false;

  const handleVote = async (e: React.MouseEvent, type: 'up' | 'down') => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to vote.');
      return;
    }
    
    let scoreChange = 0;
    const updates: any = {};

    if (type === 'up') {
      if (isUpvoted) {
        updates.upvotedBy = arrayRemove(user.uid);
        scoreChange = -1;
      } else {
        updates.upvotedBy = arrayUnion(user.uid);
        scoreChange = 1;
        if (isDownvoted) {
          updates.downvotedBy = arrayRemove(user.uid);
          scoreChange = 2;
        }
      }
    } else {
      if (isDownvoted) {
        updates.downvotedBy = arrayRemove(user.uid);
        scoreChange = 1;
      } else {
        updates.downvotedBy = arrayUnion(user.uid);
        scoreChange = -1;
        if (isUpvoted) {
          updates.upvotedBy = arrayRemove(user.uid);
          scoreChange = -2;
        }
      }
    }

    updates.score = increment(scoreChange);

    try {
      await updateDoc(doc(db, 'posts', post.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        if (dataUrl.length > 800000) {
          alert('Image is still too large after compression. Please try a smaller image.');
          return;
        }
        setEditImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    if (containsProfanity(editContent)) {
      alert('Your edit contains inappropriate language. Please revise it before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: any = {
        content: editContent.trim(),
        category: editCategory,
        imageUrl: editImage,
        editedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'posts', post.id), updates);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  };

  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      // We should ideally use a custom alert here too, but for now let's focus on the prompt
      alert('Please sign in to report a post.');
      return;
    }
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return;

    setIsSubmitting(true);
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'reports'), {
        postId: post.id,
        reporterUid: user.uid,
        reason: reportReason.trim(),
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setShowReportModal(false);
      setReportReason('');
      // Ideally a custom toast/alert here
      alert('Post reported successfully. Thank you for keeping the community safe.');
    } catch (error) {
      console.error('Error reporting post:', error);
      alert('Failed to report post. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements or if already in thread view
    if (isThreadView) return;
    
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('input') || 
      target.closest('textarea') ||
      target.closest('.interactive-area')
    ) {
      return;
    }
    
    navigate(`/post/${post.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={handleCardClick}
      className={`bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden flex transition-colors ${!isThreadView ? 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500' : ''}`}
    >
      {/* Voting Sidebar — Reddit style: narrow, gray bg */}
      <div className="bg-gray-50 dark:bg-gray-900/60 w-10 flex flex-col items-center pt-2 pb-2 border-r border-gray-100 dark:border-gray-700/60 shrink-0 interactive-area gap-0.5">
        <button
          onClick={(e) => handleVote(e, 'up')}
          className={`p-0.5 rounded transition-colors ${isUpvoted ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400'}`}
        >
          <ArrowBigUp className={`w-5 h-5 ${isUpvoted ? 'fill-current' : ''}`} />
        </button>
        <span className={`text-xs font-bold leading-none ${isUpvoted ? 'text-yellow-500' : isDownvoted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {score}
        </span>
        <button
          onClick={(e) => handleVote(e, 'down')}
          className={`p-0.5 rounded transition-colors ${isDownvoted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
        >
          <ArrowBigDown className={`w-5 h-5 ${isDownvoted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Post Content */}
      <div className="p-2 flex-1 min-w-0">
        {/* Meta line */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {isAnonymous ? (
            <div className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center shrink-0">
              <Ghost className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
            </div>
          ) : post.authorPhoto ? (
            <img src={post.authorPhoto} alt={post.authorName} className="w-5 h-5 rounded-full shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <UserIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
            {isAnonymous ? 'Anonymous' : post.authorName}
          </span>
          {isOwner && isAnonymous && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300">
              You
            </span>
          )}
          {post.category && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50">
              {post.category}
            </span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
          </span>
          {post.editedAt && <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>}

          {/* Owner actions — top right */}
          {isOwner && !isEditing && (
            <div className="ml-auto interactive-area flex items-center gap-1">
              {deletingId === post.id ? (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-900/50">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete?</span>
                  <button onClick={(e) => { e.stopPropagation(); confirmDelete(post.id); }} className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded hover:bg-red-700 transition">Yes</button>
                  <button onClick={(e) => { e.stopPropagation(); cancelDelete(); }} className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-300 transition">No</button>
                </div>
              ) : (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 rounded text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors" title="Edit post">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete post">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Edit form or post body */}
        {isEditing ? (
          <div className="interactive-area mb-2">
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="block w-44 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-yellow-400 focus:ring-yellow-400 text-xs border p-1 mb-2 transition-colors"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <textarea
              rows={4}
              className="block w-full rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-yellow-400 focus:ring-yellow-400 text-sm resize-none p-2 border mb-2 transition-colors placeholder-gray-500 dark:placeholder-gray-400"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={5000}
            />
            {editImage && (
              <div className="mb-2 relative inline-block">
                <img src={editImage} alt="Upload preview" className="max-h-48 rounded border border-gray-200 dark:border-gray-700" />
                <button type="button" onClick={() => setEditImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/50" title="Change Image">
                <ImageIcon className="w-4 h-4" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              <div className="flex gap-2">
                <button onClick={() => { setIsEditing(false); setEditContent(post.content); setEditCategory(post.category || 'Random'); setEditImage(post.imageUrl || null); }} className="inline-flex items-center px-2.5 py-1 border border-gray-300 dark:border-gray-600 text-xs font-bold rounded-full text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <X className="w-3 h-3 mr-1" /> Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={!editContent.trim() || isSubmitting} className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full text-gray-900 bg-yellow-400 hover:bg-yellow-500 transition disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : <><Check className="w-3 h-3 mr-1" /> Save</>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words mb-2 leading-relaxed">{post.content}</p>
            {post.imageUrl && (
              <div className="mb-2">
                <img src={post.imageUrl} alt="Post attachment" className="max-h-96 rounded border border-gray-200 dark:border-gray-700 object-contain" />
              </div>
            )}
          </>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400 interactive-area flex-wrap">
          <button
            onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
          {!isOwner && (
            <button
              onClick={handleReport}
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          )}
        </div>

        {showComments && (
          <div className="interactive-area">
            <CommentSection postId={post.id} />
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Report Post</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Please provide a reason for reporting this post. This will be reviewed by an administrator.
              </p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Why are you reporting this?"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                rows={4}
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
