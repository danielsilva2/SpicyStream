import { useQuery } from "@tanstack/react-query";
import { Content } from "@shared/schema";
import Header from "@/components/header";
import ContentGrid from "@/components/content-grid";
import MobileNavigation from "@/components/mobile-navigation";
import { Loader2 } from "lucide-react";

export default function FeedPage() {
  const { data: feedContent, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/feed"],
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-bg">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-dark">Your Feed</h1>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : feedContent && feedContent.length > 0 ? (
            <ContentGrid content={feedContent} />
          ) : (
            <div className="text-center py-20">
              <h3 className="text-xl font-medium text-neutral-dark mb-2">Your feed is empty</h3>
              <p className="text-gray-500 mb-6">Follow creators to see their content here</p>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                Discover Creators
              </button>
            </div>
          )}
          
          {feedContent && feedContent.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-dark bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                Load More
              </button>
            </div>
          )}
        </div>
      </main>
      <MobileNavigation activeTab="feed" />
    </div>
  );
}
