/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
import { CreatePost } from './components/CreatePost';
import { PostFeed } from './components/PostFeed';
import { Chatbot } from './components/Chatbot';
import { PostThread } from './pages/PostThread';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserProfile } from './pages/UserProfile';

function Home() {
  return (
    <>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">
          Speak Your Mind
        </h2>
        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
          A safe space to share your thoughts, publicly or anonymously.
        </p>
      </div>
      
      <CreatePost />
      
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 dark:bg-gray-900 px-3 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Recent Posts
          </span>
        </div>
      </div>
      
      <PostFeed />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
            <Navbar />
            
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/post/:postId" element={<PostThread />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Routes>
            </main>
            
            <Chatbot />
            
            
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
