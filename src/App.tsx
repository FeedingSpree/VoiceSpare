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
    <div className="space-y-2">
      <CreatePost />
      <PostFeed />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 py-4">
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
