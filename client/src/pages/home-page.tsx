import { useQuery } from "@tanstack/react-query";
import { Content } from "@shared/schema";
import Header from "@/components/header";
import ContentGrid from "@/components/content-grid";
import MobileNavigation from "@/components/mobile-navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HomePage() {
  const [sortOption, setSortOption] = useState<string>("recent");
  
  const { data: content, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content", sortOption],
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-bg">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-dark">Trending Content</h1>
            <div className="flex space-x-2">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ContentGrid content={content || []} />
          )}
          
          {content && content.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-dark bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                Load More
              </button>
            </div>
          )}
        </div>
      </main>
      <MobileNavigation activeTab="home" />
    </div>
  );
}
