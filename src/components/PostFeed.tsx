import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { ShieldAlert, TrendingUp, Clock, SearchX, Star, Flame } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { PostItem } from './PostItem';
import { useSearchParams } from 'react-router-dom';

interface Post {
  id: string;
  content: string;
  authorUid: string;
  authorName?: string;
  authorPhoto?: string;
  isAnonymous: boolean;
  createdAt: any;
  score?: number;
  upvotedBy?: string[];
  downvotedBy?: string[];
}

export function PostFeed() {
  const { user, isAuthReady } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'trending' | 'new' | 'top' | 'controversial'>('trending');
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  useEffect(() => {
    if (!isAuthReady) return;

    // Use a single orderBy to avoid needing a composite index for prototyping
    const sortField = (sortBy === 'trending' || sortBy === 'top') ? 'score' : 'createdAt';
    const q = query(collection(db, 'posts'), orderBy(sortField, 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      // If sorting by trending or top, secondary sort by date in memory to break ties
      if (sortBy === 'trending' || sortBy === 'top') {
        newPosts.sort((a, b) => {
          if (a.score === b.score) {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          }
          return (b.score || 0) - (a.score || 0);
        });
      } else if (sortBy === 'controversial') {
        newPosts.sort((a, b) => {
          const upA = a.upvotedBy?.length || 0;
          const downA = a.downvotedBy?.length || 0;
          const upB = b.upvotedBy?.length || 0;
          const downB = b.downvotedBy?.length || 0;
          
          // Controversial score: min(upvotes, downvotes) + (total votes / 100)
          const scoreA = Math.min(upA, downA) + ((upA + downA) / 100);
          const scoreB = Math.min(upB, downB) + ((upB + downB) / 100);
          
          if (scoreA === scoreB) {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
          }
          return scoreB - scoreA;
        });
      }
      
      setPosts(newPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthReady, sortBy]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
  };

  const confirmDelete = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
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

  const filteredPosts = posts.filter(post => {
    // Timeframe filter
    if ((sortBy === 'trending' || sortBy === 'top' || sortBy === 'controversial') && timeframe !== 'all') {
      const postDate = post.createdAt?.toDate?.() || new Date(0);
      const now = new Date();
      let cutoff = new Date(0);
      
      if (timeframe === 'today') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeframe === 'week') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'month') {
        cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else if (timeframe === 'year') {
        cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }
      
      if (postDate < cutoff) return false;
    }

    // Search query filter
    if (!searchQuery) return true;
    const contentMatch = post.content?.toLowerCase().includes(searchQuery);
    const authorMatch = !post.isAnonymous && post.authorName?.toLowerCase().includes(searchQuery);
    return contentMatch || authorMatch;
  });

  return (
    <div className="space-y-2">
      {/* Sort Controls — Reddit pill style */}
      <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 px-3 py-1.5 flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setSortBy('trending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            sortBy === 'trending'
              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">Hot</span>
        </button>
        <button
          onClick={() => setSortBy('new')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            sortBy === 'new'
              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">New</span>
        </button>
        <button
          onClick={() => setSortBy('top')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            sortBy === 'top'
              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Star className="w-4 h-4" />
          <span className="hidden sm:inline">Top</span>
        </button>
        <button
          onClick={() => setSortBy('controversial')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            sortBy === 'controversial'
              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span className="hidden sm:inline">Rising</span>
        </button>

        {(sortBy === 'trending' || sortBy === 'top' || sortBy === 'controversial') && (
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="ml-auto bg-transparent border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded-full focus:ring-yellow-400 focus:border-yellow-400 px-2 py-1 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        )}

        {searchQuery && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
          </span>
        )}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          {searchQuery ? (
            <>
              <SearchX className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">No results found</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nothing matching &ldquo;{searchQuery}&rdquo;.</p>
            </>
          ) : (
            <>
              <ShieldAlert className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-bold text-gray-900 dark:text-gray-100">No posts yet</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Be the first to share your thoughts.</p>
            </>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filteredPosts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              user={user}
              handleDelete={handleDelete}
              confirmDelete={confirmDelete}
              cancelDelete={cancelDelete}
              deletingId={deletingId}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
