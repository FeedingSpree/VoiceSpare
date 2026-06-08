import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogIn, LogOut, User as UserIcon, ShieldAlert, Sun, Moon, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function Navbar() {
  const { user, userProfile, isAdmin, login, logout } = useAuth();
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
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="Freedom Wall Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
              <h1 className="text-xl sm:text-2xl font-bold text-yellow-500 dark:text-yellow-400 tracking-tight hidden sm:block">Freedom Wall</h1>
              <h1 className="text-xl sm:text-2xl font-bold text-yellow-500 dark:text-yellow-400 tracking-tight sm:hidden">FW</h1>
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center px-2 sm:px-6 max-w-md mx-auto">
            <form onSubmit={handleSearch} className="w-full relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-sm transition-colors"
              />
            </form>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/50 hover:bg-yellow-200 dark:hover:bg-yellow-900 transition"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
            )}
            
            {user ? (
              <>
                <Link to="/profile" className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                  {displayPhotoURL ? (
                    <img src={displayPhotoURL} alt="Profile" className="w-8 h-8 rounded-full border border-transparent hover:border-yellow-400 transition-colors" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-transparent hover:border-yellow-400 transition-colors">
                      <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                  <span className="hidden sm:inline-block font-medium">{user.displayName}</span>
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none transition"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
