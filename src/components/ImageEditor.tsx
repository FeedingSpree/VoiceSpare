import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, RotateCw, Square, Monitor, Image as ImageIcon } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageEditor({ imageSrc, onSave, onCancel }: ImageEditorProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect || 1));
  }

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (newAspect) {
        setCrop(centerAspectCrop(width, height, newAspect));
      }
    }
  };

  const handleSave = () => {
    if (!imgRef.current) return;
    
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelRatio = window.devicePixelRatio;

    // Set canvas size to match the bounding box
    if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
      canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);
    } else {
      canvas.width = Math.floor(image.naturalWidth * pixelRatio);
      canvas.height = Math.floor(image.naturalHeight * pixelRatio);
    }

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop ? completedCrop.x * scaleX : 0;
    const cropY = completedCrop ? completedCrop.y * scaleY : 0;
    const cropWidth = completedCrop && completedCrop.width > 0 ? completedCrop.width * scaleX : image.naturalWidth;
    const cropHeight = completedCrop && completedCrop.height > 0 ? completedCrop.height * scaleY : image.naturalHeight;

    const centerX = image.naturalWidth / 2;
    const centerY = image.naturalHeight / 2;

    ctx.save();

    // Move to the center of the crop area
    ctx.translate(-cropX, -cropY);
    
    // Move to the center of the original image
    ctx.translate(centerX, centerY);
    
    // Rotate around the center of the original image
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Move back to the top-left corner of the original image
    ctx.translate(-centerX, -centerY);

    // Draw the image
    ctx.drawImage(
      image,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight,
      0,
      0,
      image.naturalWidth,
      image.naturalHeight
    );

    ctx.restore();

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    onSave(base64Image);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Image</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              alt="Crop me"
              src={imageSrc}
              style={{ transform: `rotate(${rotation}deg)`, maxHeight: '60vh', objectFit: 'contain' }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center bg-gray-50 dark:bg-gray-800 gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setRotation((r) => r + 90)}
              className="flex items-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 shrink-0"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1 shrink-0"></div>
            <button
              onClick={() => handleAspectChange(undefined)}
              className={`flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium shrink-0 ${!aspect ? 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              <ImageIcon className="w-4 h-4 mr-1.5" /> Free
            </button>
            <button
              onClick={() => handleAspectChange(1)}
              className={`flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium shrink-0 ${aspect === 1 ? 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              <Square className="w-4 h-4 mr-1.5" /> 1:1
            </button>
            <button
              onClick={() => handleAspectChange(4/3)}
              className={`flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium shrink-0 ${aspect === 4/3 ? 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              <Monitor className="w-4 h-4 mr-1.5" /> 4:3
            </button>
            <button
              onClick={() => handleAspectChange(16/9)}
              className={`flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium shrink-0 ${aspect === 16/9 ? 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
            >
              <Monitor className="w-4 h-4 mr-1.5" /> 16:9
            </button>
          </div>
          
          <div className="flex space-x-3 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
