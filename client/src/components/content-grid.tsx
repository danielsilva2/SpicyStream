import { Content } from "@shared/schema";
import { useState, useEffect } from 'react';
import { Link } from "wouter";

interface ContentGridProps {
  content: Content[] | { items: Content[] };
}

export default function ContentGrid({ content: initialContent }: ContentGridProps) {
  const contentArray = Array.isArray(initialContent) ? initialContent : initialContent?.items || [];
  const [displayedContent, setDisplayedContent] = useState<Content[]>(contentArray);
  const [visibleItems, setVisibleItems] = useState(12);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDisplayedContent(Array.isArray(initialContent) ? initialContent : initialContent?.items || []);
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
                {item.thumbnailUrl ? (
                  <img 
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://placehold.co/400x225?text=No+Preview';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">No preview available</span>
                  </div>
                )}
                {item.fileType === 'video' && item.duration && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                    {item.duration}
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