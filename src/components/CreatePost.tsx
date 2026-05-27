import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send, Ghost, User as UserIcon, Image as ImageIcon, X, Edit2 } from 'lucide-react';
import { containsProfanity, cleanProfanity } from '../utils/profanityFilter';
import { ImageEditor } from './ImageEditor';

const CATEGORIES = ['Random', 'Small Business', 'Facility Concerns', 'Faculty Issues'];

export function CreatePost() {
  const { user, userProfile, isAuthReady } = useAuth();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Random');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAuthReady || !user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center transition-colors">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Join the conversation</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Sign in to share your thoughts on the TIP Voice.</p>
      </div>
    );
  }

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
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Higher quality for editing
        
        setTempImage(dataUrl);
        setShowImageEditor(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedImage = (editedImage: string) => {
    // Check size (Firestore limit is 1MB, we set 800KB in rules)
    if (editedImage.length > 800000) {
      alert('Image is still too large after compression. Please try a smaller image.');
      return;
    }
    setImage(editedImage);
    setShowImageEditor(false);
    setTempImage(null);
  };

  const handleCancelEdit = () => {
    setShowImageEditor(false);
    setTempImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const cleanedContent = cleanProfanity(content.trim());

    setIsSubmitting(true);
    try {
      const postData: any = {
        content: cleanedContent,
        category,
        authorUid: user.uid,
        isAnonymous,
        createdAt: serverTimestamp(),
        score: 0,
        upvotedBy: [],
        downvotedBy: []
      };

      if (image) {
        postData.imageUrl = image;
      }

      if (!isAnonymous) {
        postData.authorName = user.displayName || 'Unknown User';
        const displayPhotoURL = userProfile?.photoURL || user.photoURL;
        if (displayPhotoURL) {
          postData.authorPhoto = displayPhotoURL;
        }
      }

      await addDoc(collection(db, 'posts'), postData);
      setContent('');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsAnonymous(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
      {showImageEditor && tempImage && (
        <ImageEditor
          imageSrc={tempImage}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelEdit}
        />
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-48 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-yellow-400 focus:ring-yellow-400 sm:text-sm border p-1.5 transition-colors"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <label htmlFor="content" className="sr-only">Your message</label>
          <textarea
            id="content"
            rows={3}
            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-yellow-400 focus:ring-yellow-400 sm:text-sm resize-none p-3 border transition-colors placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="What's on your mind? Share it freely..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            required
          />
        </div>

        {image && (
          <div className="mb-4 relative inline-block group">
            <img src={image} alt="Upload preview" className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700" />
            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => {
                  setTempImage(image);
                  setShowImageEditor(true);
                }}
                className="p-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Edit image"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={removeImage}
                className="p-1.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  isAnonymous ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={isAnonymous}
              >
                <span className="sr-only">Post anonymously</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="ml-3 text-sm font-medium flex items-center">
                {isAnonymous ? (
                  <span className="flex items-center text-yellow-600 dark:text-yellow-400">
                    <Ghost className="w-4 h-4 mr-1.5" />
                    Posting Anonymously
                  </span>
                ) : (
                  <span className="flex items-center text-gray-600 dark:text-gray-300">
                    <UserIcon className="w-4 h-4 mr-1.5" />
                    Posting as {user.displayName}
                  </span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition p-2 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/50"
              title="Add Image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition w-full sm:w-auto"
          >
            {isSubmitting ? (
              <span className="inline-block animate-pulse">Posting...</span>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Post
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
