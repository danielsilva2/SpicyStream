import { Gallery, GalleryItem } from "@shared/schema";
import { useState } from "react";
import VideoPlayer from "./video-player";

interface GalleryViewerProps {
  gallery: Gallery;
}

export default function GalleryViewer({ gallery }: GalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = gallery.items[currentIndex];
  
  const isVideo = currentItem.fileType === "video";
  
  return (
    <>
      {/* Main Content Display */}
      <div className="relative bg-black">
        {isVideo ? (
          <VideoPlayer 
            src={currentItem.fileUrl} 
            poster={currentItem.thumbnailUrl}
          />
        ) : (
          <img 
            src={currentItem.fileUrl} 
            alt={gallery.title} 
            className="w-full h-auto max-h-[80vh] mx-auto"
          />
        )}
      </div>
      
      {/* Thumbnails for multiple items */}
      {gallery.items.length > 1 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 overflow-x-auto">
          <div className="flex space-x-2">
            {gallery.items.map((item, index) => (
              <button 
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden ${
                  index === currentIndex ? "ring-2 ring-primary" : ""
                }`}
              >
                <img 
                  src={item.thumbnailUrl} 
                  alt={`Thumbnail ${index + 1}`} 
                  className="w-full h-full object-cover" 
                />
                {item.fileType === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-black/50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
