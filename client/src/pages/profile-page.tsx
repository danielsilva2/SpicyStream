import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Content } from "@shared/schema";
import { useParams } from "wouter";
import Header from "@/components/header";
import ContentGrid from "@/components/content-grid";
import MobileNavigation from "@/components/mobile-navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ProfilePage() {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const targetUsername = username;
  
  const { data: profileUser, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${targetUsername}`],
    enabled: !!targetUsername,
  });
  
  const { data: userContent, isLoading: isLoadingContent } = useQuery<Content[]>({
    queryKey: [`/api/users/${targetUsername}/content`],
    enabled: !!targetUsername,
    refetchOnMount: true,
    staleTime: 0
  });
  
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profileUser) return;
      const res = await apiRequest("POST", `/api/users/${profileUser.username}/follow`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${targetUsername}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });
  
  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!profileUser) return;
      const res = await apiRequest("DELETE", `/api/users/${profileUser.username}/follow`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${targetUsername}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });
  
  const isOwnProfile = currentUser?.username === profileUser?.username;
  const isFollowing = profileUser?.isFollowing;
  
  function handleFollowToggle() {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  }
  
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-bg">
        <Header />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MobileNavigation activeTab="profile" />
      </div>
    );
  }
  
  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-bg">
        <Header />
        <div className="flex justify-center items-center flex-1">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-2">User not found</h2>
            <p className="text-gray-600">The user you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
        <MobileNavigation activeTab="profile" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-bg">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                  {profileUser.profileImage ? (
                    <img 
                      src={profileUser.profileImage} 
                      alt={`${profileUser.username}'s profile`}
                      className="h-16 w-16 rounded-full object-cover mr-4"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary-light flex items-center justify-center text-primary text-xl font-bold mr-4">
                      {profileUser.username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-dark">@{profileUser.username}</h1>
                    <div className="flex items-center mt-1">
                      <span className="text-gray-500 text-sm">
                        <strong>{profileUser.followersCount || 0}</strong> followers
                      </span>
                      <span className="mx-2">•</span>
                      <span className="text-gray-500 text-sm">
                        <strong>{profileUser.contentCount || 0}</strong> uploads
                      </span>
                    </div>
                  </div>
                </div>
                
                {!isOwnProfile && (
                  <Button
                    onClick={handleFollowToggle}
                    variant={isFollowing ? "outline" : "default"}
                    className="mt-4 sm:mt-0"
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
                
                {isOwnProfile && (
                  <Button variant="outline" className="mt-4 sm:mt-0">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-neutral-dark mb-6">Uploads</h2>
          
          {isLoadingContent ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userContent && userContent.length > 0 ? (
            <ContentGrid content={userContent} />
          ) : (
            <div className="text-center py-20 bg-white rounded-lg shadow-md">
              <h3 className="text-xl font-medium text-neutral-dark mb-2">No content yet</h3>
              {isOwnProfile ? (
                <>
                  <p className="text-gray-500 mb-6">Upload your first content to get started</p>
                  <Button>Upload Content</Button>
                </>
              ) : (
                <p className="text-gray-500">This user hasn't uploaded any content yet</p>
              )}
            </div>
          )}
          
          {userContent && userContent.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-neutral-dark bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                Load More
              </button>
            </div>
          )}
        </div>
      </main>
      <MobileNavigation activeTab="profile" />
    </div>
  );
}
