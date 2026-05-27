import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { PostItem } from '../components/PostItem';
import { User as UserIcon, Settings, Calendar, Camera } from 'lucide-react';
import { ImageEditor } from '../components/ImageEditor';

export function UserProfile() {
  const { user, userProfile, isAuthReady } = useAuth();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Profile picture upload state
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
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
        
        // Compress to JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        setTempImage(dataUrl);
        setShowImageEditor(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedImage = async (editedImage: string) => {
    if (!user) return;
    
    if (editedImage.length > 800000) { 
      alert('Image is still too large after compression. Please try a smaller image or crop it more.');
      return;
    }
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        photoURL: editedImage,
        updatedAt: serverTimestamp()
      }, { merge: true });
      // Force a re-render or reload to show new image
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile picture:", error);
      alert("Failed to update profile picture. The image might be too large.");
    } finally {
      setShowImageEditor(false);
      setTempImage(null);
    }
  };

  const handleCancelEdit = () => {
    setShowImageEditor(false);
    setTempImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'posts'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserPosts(posts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  if (!isAuthReady || loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Please sign in to view your profile</h2>
      </div>
    );
  }

  const displayPhotoURL = userProfile?.photoURL || user.photoURL;

  return (
    <div className="space-y-8">
      {showImageEditor && tempImage && (
        <ImageEditor
          imageSrc={tempImage}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelEdit}
        />
      )}
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 transition-colors">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="shrink-0 relative group">
            {displayPhotoURL ? (
              <img src={displayPhotoURL} alt={user.displayName || 'User'} className="w-24 h-24 rounded-full border-4 border-yellow-100 dark:border-yellow-900/30 object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center border-4 border-white dark:border-gray-800">
                <UserIcon className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Change Profile Picture"
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.displayName || 'Anonymous User'}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
            
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white mr-1.5">{userPosts.length}</span>
                Posts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Posts</h2>
        {userPosts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">You haven't made any posts yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map(post => (
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
          </div>
        )}
      </div>
    </div>
  );
}
