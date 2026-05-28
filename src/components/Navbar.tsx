import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, User as UserIcon, ShieldAlert, Sun, Moon, Search, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function Navbar() {
  const { user, userProfile, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  const displayPhotoURL = userProfile?.photoURL || user?.photoURL;

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center h-12 gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-base font-bold text-yellow-500 dark:text-yellow-400 hidden sm:block">TIP Voice</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search TIP Voice"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm transition-colors"
              />
            </div>
          </form>

          {/* Right section */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {user?.email === 'qweshesh01@gmail.com' && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Admin
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-full hover:border-yellow-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {displayPhotoURL ? (
                    <img src={displayPhotoURL} alt="Profile" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <UserIcon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  )}
                  <span className="hidden sm:block text-xs font-bold text-gray-800 dark:text-gray-200 max-w-20 truncate">
                    {user.displayName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
                </Link>
                <button
                  onClick={logout}
                  className="hidden sm:flex items-center px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={login}
                  className="px-4 py-1.5 border-2 border-yellow-400 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={login}
                  className="hidden sm:flex items-center px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-bold rounded-full transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
