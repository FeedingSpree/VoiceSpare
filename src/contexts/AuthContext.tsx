import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

export interface UserProfileData {
  photoURL?: string;
  displayName?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  isAuthReady: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfileData);
          } else {
            setUserProfile(null);
          }
          setIsAuthReady(true);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setIsAuthReady(true);
        });
      } else {
        setUserProfile(null);
        setIsAuthReady(true);
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed it, ignore
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('Sign-in failed: This domain is not authorized. If running locally, make sure to use http://localhost (not 127.0.0.1). If deployed, add this domain to Firebase Auth Authorized Domains.');
      } else {
        alert(`Sign-in failed: ${error.message || 'Unknown error'}. Please ensure third-party cookies are not blocked by your browser.`);
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error signing in with Email", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, isAuthReady, login, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
