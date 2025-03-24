import { Content } from "@shared/schema";
import ContentCard from "./content-card";

interface ContentGridProps {
  content: Content[];
}

export default function ContentGrid({ content }: ContentGridProps) {
  if (!content || content.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No content available</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {content.map((item) => (
        <ContentCard key={item.id} content={item} />
      ))}
    </div>
  );
}
