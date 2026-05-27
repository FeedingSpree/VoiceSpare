import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { PostItem } from '../components/PostItem';
import { ArrowLeft } from 'lucide-react';

export function PostThread() {
  const { postId } = useParams<{ postId: string }>();
  const { user, isAuthReady } = useAuth();
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthReady || !postId) return;

    const unsubscribe = onSnapshot(doc(db, 'posts', postId), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `posts/${postId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthReady, postId]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'posts', id));
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Post not found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">The post may have been deleted.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 inline-flex items-center text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/')}
        className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to feed
      </button>

      <PostItem
        post={post}
        user={user}
        handleDelete={handleDelete}
        confirmDelete={confirmDelete}
        cancelDelete={cancelDelete}
        deletingId={deletingId}
        isThreadView={true}
      />
    </div>
  );
}
