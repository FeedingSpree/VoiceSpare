import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send, Ghost, User as UserIcon, Image as ImageIcon, X, CreditCard as Edit2 } from 'lucide-react';
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
      <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 border border-dashed border-gray-300 dark:border-gray-600">
          <UserIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-sm text-gray-400 cursor-default">
          Create a post
        </div>
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
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
      {showImageEditor && tempImage && (
        <ImageEditor
          imageSrc={tempImage}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Compose area */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600 mt-0.5">
            {isAnonymous ? (
              <Ghost className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
            ) : (
              <UserIcon className="w-4 h-4 text-gray-400" />
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-w-0">
            {/* Category + textarea */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs font-bold rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {isAnonymous ? 'Posting anonymously' : `Posting as ${user.displayName}`}
              </span>
            </div>

            <textarea
              rows={3}
              className="block w-full rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm resize-none p-2.5 transition-colors placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              required
            />

            {image && (
              <div className="mt-2 relative inline-block group">
                <img src={image} alt="Upload preview" className="max-h-40 rounded border border-gray-200 dark:border-gray-700" />
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => { setTempImage(image); setShowImageEditor(true); }} className="p-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={removeImage} className="p-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-full shadow hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-2 mt-2">
              {/* Anonymous toggle */}
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 ${isAnonymous ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-600'}`}
                role="switch"
                aria-checked={isAnonymous}
                title="Toggle anonymous"
              >
                <span className="sr-only">Post anonymously</span>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${isAnonymous ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Anon</span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-1 p-1.5 rounded text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors"
                title="Add image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="ml-auto inline-flex items-center px-4 py-1.5 text-xs font-bold rounded-full text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Posting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Post
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
