import { Content } from "@shared/schema";
import ContentCard from "./content-card";
import { useState, useEffect } from 'react';

interface ContentGridProps {
  content: Content[];
}

export default function ContentGrid({ content: initialContent }: ContentGridProps) {
  const [displayedContent, setDisplayedContent] = useState<Content[]>(initialContent);
  const [visibleItems, setVisibleItems] = useState(8);

  useEffect(() => {
    setDisplayedContent(initialContent);
  }, [initialContent]);

  const loadMore = () => {
    setVisibleItems(prev => prev + 8);
  };

  const visibleContent = displayedContent.slice(0, visibleItems);
  const hasMore = visibleItems < displayedContent.length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleContent.map((item) => (
          <ContentCard key={item.id} content={item} />
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