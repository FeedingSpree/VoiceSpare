import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, User as UserIcon, Send, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { containsProfanity, cleanProfanity } from '../utils/profanityFilter';

interface Comment {
  id: string;
  postId: string;
  content: string;
  authorUid: string;
  authorName?: string;
  authorPhoto?: string;
  isAnonymous: boolean;
  anonTag?: string;
  createdAt: any;
}

export function CommentSection({ postId }: { postId: string }) {
  const { user, userProfile, isAuthReady } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(newComments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`);
    });

    return () => unsubscribe();
  }, [postId, isAuthReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const cleanedComment = cleanProfanity(newComment.trim());

    setIsSubmitting(true);
    try {
      const commentData: any = {
        postId,
        content: cleanedComment,
        authorUid: user.uid,
        isAnonymous,
        createdAt: serverTimestamp(),
      };

      if (!isAnonymous) {
        commentData.authorName = user.displayName || 'Unknown User';
        const displayPhotoURL = userProfile?.photoURL || user.photoURL;
        if (displayPhotoURL) {
          commentData.authorPhoto = displayPhotoURL;
        }
      } else {
        commentData.anonTag = `Anon ${Math.floor(1000 + Math.random() * 9000)}`;
      }

      await addDoc(collection(db, 'posts', postId, 'comments'), commentData);
      setNewComment('');
      setIsAnonymous(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Comments ({comments.length})</h4>
      
      <div className="space-y-4 mb-4">
        <AnimatePresence>
          {comments.map((comment) => {
            const isOwner = user?.uid === comment.authorUid;
            
            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    {comment.isAnonymous ? (
                      <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                        <Ghost className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    ) : comment.authorPhoto ? (
                      <img src={comment.authorPhoto} alt={comment.authorName} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {comment.isAnonymous ? comment.anonTag : comment.authorName}
                      {isOwner && comment.isAnonymous && (
                        <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">(You)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate()) : 'Just now'}
                    </span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-gray-800 dark:text-gray-200 ml-8 whitespace-pre-wrap break-words">{comment.content}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-2">
          <div className="flex items-start space-x-3">
            <div className="min-w-0 flex-1">
              <textarea
                rows={2}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-yellow-400 focus:ring-yellow-400 sm:text-sm resize-none p-2 border transition-colors placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={2000}
                required
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-yellow-500 dark:bg-gray-700 shadow-sm focus:border-yellow-400 focus:ring focus:ring-yellow-200 focus:ring-opacity-50 mr-2"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  Comment anonymously
                </label>
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Posting...' : <><Send className="w-3 h-3 mr-1" /> Reply</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">Sign in to comment.</p>
      )}
    </div>
  );
}
