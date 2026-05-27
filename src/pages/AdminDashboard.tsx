import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Download, Calendar, BarChart3, Users, MessageSquare, FileText, AlertTriangle, CheckCircle, Trash2, ExternalLink, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PostItem } from '../components/PostItem';

const CATEGORIES = ['Random', 'Small Business', 'Facility Concerns', 'Faculty Issues'];

export function AdminDashboard() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports' | 'posts'>('analytics');
  
  // Date filtering
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Posts filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthReady && (!user || user.email !== 'qweshesh01@gmail.com')) {
      navigate('/admin/login');
    }
  }, [user, isAuthReady, navigate]);

  useEffect(() => {
    if (!isAuthReady || !user || user.email !== 'qweshesh01@gmail.com') return;

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(fetchedReports);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => {
      unsubscribePosts();
      unsubscribeReports();
    };
  }, [isAuthReady, user]);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (!post.createdAt) return false;
      const postDate = post.createdAt.toDate();
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (postDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (postDate > end) return false;
      }
      
      return true;
    });
  }, [posts, startDate, endDate]);

  const analytics = useMemo(() => {
    const stats = {
      totalPosts: filteredPosts.length,
      anonymousPosts: 0,
      publicPosts: 0,
      totalUpvotes: 0,
      totalDownvotes: 0,
      byCategory: {} as Record<string, number>
    };

    CATEGORIES.forEach(cat => stats.byCategory[cat] = 0);

    filteredPosts.forEach(post => {
      if (post.isAnonymous) stats.anonymousPosts++;
      else stats.publicPosts++;

      stats.totalUpvotes += (post.upvotedBy?.length || 0);
      stats.totalDownvotes += (post.downvotedBy?.length || 0);

      const cat = post.category || 'Random';
      if (stats.byCategory[cat] !== undefined) {
        stats.byCategory[cat]++;
      } else {
        stats.byCategory[cat] = 1;
      }
    });

    return stats;
  }, [filteredPosts]);

  const downloadCSV = () => {
    const headers = ['Post ID', 'Date', 'Category', 'Author', 'Anonymous', 'Content', 'Upvotes', 'Downvotes', 'Score'];
    
    const rows = filteredPosts.map(post => {
      const date = post.createdAt?.toDate ? post.createdAt.toDate().toISOString() : '';
      const content = `"${(post.content || '').replace(/"/g, '""')}"`;
      const author = post.isAnonymous ? 'Anonymous' : `"${(post.authorName || 'Unknown').replace(/"/g, '""')}"`;
      
      return [
        post.id,
        date,
        post.category || 'Random',
        author,
        post.isAnonymous ? 'Yes' : 'No',
        content,
        post.upvotedBy?.length || 0,
        post.downvotedBy?.length || 0,
        post.score || 0
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `freedom_wall_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Freedom Wall Admin Report', 14, 22);
    
    // Date range
    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateText = startDate && endDate 
      ? `Date Range: ${startDate} to ${endDate}`
      : startDate ? `From: ${startDate}`
      : endDate ? `Until: ${endDate}`
      : 'All Time';
    doc.text(dateText, 14, 30);
    
    // Summary Stats
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary Statistics', 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Posts', analytics.totalPosts.toString()],
        ['Anonymous Posts', analytics.anonymousPosts.toString()],
        ['Public Posts', analytics.publicPosts.toString()],
        ['Total Upvotes', analytics.totalUpvotes.toString()],
        ['Total Downvotes', analytics.totalDownvotes.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [250, 204, 21] }, // yellow-400
    });
    
    // Category Breakdown
    doc.text('Posts by Category', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const categoryBody = Object.entries(analytics.byCategory).map(([cat, count]) => [cat, count.toString()]);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Category', 'Post Count']],
      body: categoryBody,
      theme: 'grid',
      headStyles: { fillColor: [250, 204, 21] },
    });
    
    // Top 10 Most Upvoted
    const sortedByUpvotes = [...filteredPosts].sort((a, b) => (b.upvotedBy?.length || 0) - (a.upvotedBy?.length || 0));
    const top10Upvoted = sortedByUpvotes.slice(0, 10);
    
    doc.text('Top 10 Most Upvoted', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const upvotedBody = top10Upvoted.map(post => [
      post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'N/A',
      post.category || 'Random',
      post.isAnonymous ? 'Anonymous' : (post.authorName || 'Unknown'),
      (post.content || '').substring(0, 50) + ((post.content || '').length > 50 ? '...' : ''),
      (post.upvotedBy?.length || 0).toString()
    ]);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Author', 'Content Snippet', 'Upvotes']],
      body: upvotedBody,
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81] }, // gray-700
      styles: { fontSize: 9 },
      columnStyles: { 3: { cellWidth: 80 } }
    });
    
    // Top 10 Controversial
    const sortedByControversial = [...filteredPosts].sort((a, b) => {
      const aUp = a.upvotedBy?.length || 0;
      const aDown = a.downvotedBy?.length || 0;
      const bUp = b.upvotedBy?.length || 0;
      const bDown = b.downvotedBy?.length || 0;
      return Math.min(bUp, bDown) - Math.min(aUp, aDown);
    });
    const top10Controversial = sortedByControversial.slice(0, 10);

    doc.text('Top 10 Controversial', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const controversialBody = top10Controversial.map(post => [
      post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'N/A',
      post.category || 'Random',
      post.isAnonymous ? 'Anonymous' : (post.authorName || 'Unknown'),
      (post.content || '').substring(0, 50) + ((post.content || '').length > 50 ? '...' : ''),
      `${post.upvotedBy?.length || 0} Up / ${post.downvotedBy?.length || 0} Down`
    ]);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Author', 'Content Snippet', 'Votes']],
      body: controversialBody,
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81] }, // gray-700
      styles: { fontSize: 9 },
      columnStyles: { 3: { cellWidth: 80 } }
    });
    
    doc.save(`freedom_wall_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reports/${reportId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingId(postId);
  };

  const confirmDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDeletePost = () => {
    setDeletingId(null);
  };

  if (!isAuthReady || loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (user?.email !== 'qweshesh01@gmail.com') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Analytics and reports for Freedom Wall</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
          <button
            onClick={downloadPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition"
          >
            <FileText className="w-4 h-4 mr-2" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${
              activeTab === 'analytics'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`${
              activeTab === 'reports'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
          >
            Reports
            {reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 py-0.5 px-2 rounded-full text-xs">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`${
              activeTab === 'posts'
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Manage Posts
          </button>
        </nav>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Date Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filter by Date</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-yellow-400 focus:ring-yellow-400 sm:text-sm border p-2 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-yellow-400 focus:ring-yellow-400 sm:text-sm border p-2 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Posts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalPosts}</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
              <MessageSquare className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Anonymous Posts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.anonymousPosts}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Upvotes</p>
              <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">{analytics.totalUpvotes}</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Downvotes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{analytics.totalDownvotes}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <BarChart3 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Posts by Category</h2>
        <div className="space-y-4">
          {Object.entries(analytics.byCategory).map(([category, count]) => {
            const numCount = count as number;
            const percentage = analytics.totalPosts === 0 ? 0 : Math.round((numCount / analytics.totalPosts) * 100);
            return (
              <div key={category}>
                <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span>{category}</span>
                  <span>{numCount} ({percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-yellow-400 dark:bg-yellow-500 h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      ) : activeTab === 'reports' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">User Reports</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Review and manage reported posts.</p>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.length === 0 ? (
              <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No reports found.</li>
            ) : (
              reports.map((report) => (
                <li key={report.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-5 h-5 mr-2 ${report.status === 'pending' ? 'text-red-500' : 'text-green-500'}`} />
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Reason: {report.reason}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>•</span>
                        <Link to={`/post/${report.postId}`} className="flex items-center text-blue-600 dark:text-blue-400 hover:underline">
                          View Post <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {report.status === 'pending' && (
                        <button
                          onClick={() => handleResolveReport(report.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-md transition-colors"
                          title="Mark as Resolved"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Reported on {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'Unknown date'}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filter Posts</h2>
            </div>
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400 sm:text-sm rounded-md transition-colors"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {posts
              .filter(post => selectedCategory === 'All' || post.category === selectedCategory)
              .map(post => (
                <PostItem
                  key={post.id}
                  post={post}
                  user={user}
                  handleDelete={handleDeletePost}
                  confirmDelete={confirmDeletePost}
                  cancelDelete={cancelDeletePost}
                  deletingId={deletingId}
                />
              ))}
            {posts.filter(post => selectedCategory === 'All' || post.category === selectedCategory).length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No posts found in this category.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
