import { Content } from "@shared/schema";
import ContentCard from "./content-card";
import { useState, useEffect } from 'react';
import { Link } from "wouter";

interface ContentGridProps {
  content: Content[];
}

export default function ContentGrid({ content: initialContent }: ContentGridProps) {
  const [displayedContent, setDisplayedContent] = useState<Content[]>(initialContent);
  const [visibleItems, setVisibleItems] = useState(12);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDisplayedContent(initialContent);
  }, [initialContent]);

  const loadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setVisibleItems(prev => prev + 12);
      setLoading(false);
    }, 500);
  };

  const visibleContent = displayedContent.slice(0, visibleItems);
  const hasMore = visibleItems < displayedContent.length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleContent.map((item) => (
          <Link key={item.id} href={`/gallery/${item.id}`}>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative pb-[56.25%]">
                <img 
                  src={item.thumbnailUrl || '/placeholder.jpg'} 
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.jpg';
                  }}
                />
                {item.fileType === 'video' && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 px-2 py-1 rounded text-xs text-white">
                    {item.duration || '0:00'}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-neutral-dark truncate">{item.title}</h3>
                <p className="text-sm text-neutral mt-1">@{item.username}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button 
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-dark bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}