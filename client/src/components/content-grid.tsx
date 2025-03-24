import { Content } from "@shared/schema";
import ContentCard from "./content-card";
import { useState, useEffect } from 'react';

interface ContentGridProps {
  content: Content[];
  limit: number;
  offset: number;
  fetchMoreContent: (offset: number, limit: number) => Promise<Content[]>;
}

export default function ContentGrid({ content, limit, offset, fetchMoreContent }: ContentGridProps) {
  const [displayedContent, setDisplayedContent] = useState<Content[]>(content);

  useEffect(() => {
    setDisplayedContent(content);
  }, [content]);


  const loadMore = async () => {
    if (displayedContent && displayedContent.length >= limit) {
      const newContent = await fetchMoreContent(offset, limit);
      setDisplayedContent(prevContent => [...prevContent, ...newContent]);
    }
  };

  if (!displayedContent || displayedContent.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No content available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {displayedContent.map((item) => (
        <ContentCard key={item.id} content={item} />
      ))}
      {displayedContent.length >= limit && (
        <button onClick={loadMore} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Load More
        </button>
      )}
    </div>
  );
}