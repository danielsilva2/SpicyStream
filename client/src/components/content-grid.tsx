
import { Content } from "@shared/schema";
import ContentCard from "./content-card";
import { useState } from 'react';

interface ContentGridProps {
  content: Content[];
}

export default function ContentGrid({ content }: ContentGridProps) {
  const [visibleItems, setVisibleItems] = useState(8);
  
  const loadMore = () => {
    setVisibleItems(prev => prev + 8);
  };

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No content available</p>
      </div>
    );
  }

  const displayedContent = content.slice(0, visibleItems);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedContent.map((item) => (
          <ContentCard key={item.id} content={item} />
        ))}
      </div>
      
      {visibleItems < content.length && (
        <div className="mt-8 flex justify-center">
          <button 
            onClick={loadMore}
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-dark bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
