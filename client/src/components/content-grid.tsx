import { Content } from "@shared/schema";
import ContentCard from "./content-card";
import { useState, useEffect } from 'react';

interface ContentGridProps {
  content: Content[];
}

export default function ContentGrid({ content: initialContent }: ContentGridProps) {
  const [content, setContent] = useState(initialContent);
  const [offset, setOffset] = useState(initialContent.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/content?offset=${offset}&limit=20`);
      const newContent = await response.json();

      if (newContent.length === 0) {
        setHasMore(false);
      } else {
        setContent([...content, ...newContent]);
        setOffset(offset + newContent.length);
      }
    } catch (error) {
      console.error('Failed to load more content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.map((item) => (
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