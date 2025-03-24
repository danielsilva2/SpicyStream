import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Comment } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation } from "wouter";

interface CommentSectionProps {
  galleryId: number;
}

export default function CommentSection({ galleryId }: CommentSectionProps) {
  // Tratamento seguro para o caso de o AuthProvider não estar disponível
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    console.log("Auth context not available in CommentSection");
  }
  
  const [, setLocation] = useLocation();
  const [commentText, setCommentText] = useState("");
  
  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/gallery/${galleryId}/comments`],
  });
  
  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) {
        setLocation("/auth");
        throw new Error("Login required");
      }
      const res = await apiRequest("POST", `/api/gallery/${galleryId}/comments`, { text });
      return await res.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/${galleryId}/comments`] });
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (commentText.trim()) {
      commentMutation.mutate(commentText);
    }
  };
  
  return (
    <div className="p-4 sm:p-6 border-t border-gray-200">
      <h2 className="text-lg font-medium text-neutral-dark mb-4">
        Comments {comments && `(${comments.length})`}
      </h2>
      
      {/* Comment Form */}
      {user && (
        <form className="mb-6" onSubmit={handleSubmit}>
          <div className="flex">
            <div className="mr-3 flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-primary">
                <span className="font-medium">{user?.username.substring(0, 2).toUpperCase()}</span>
              </div>
            </div>
            <div className="flex-1">
              <Textarea
                rows={2}
                className="block w-full resize-none"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={commentMutation.isPending || !commentText.trim()}
                >
                  {commentMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
      
      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <span className="text-gray-500">Loading comments...</span>
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} galleryId={galleryId} />
          ))
        ) : (
          <div className="text-center py-4">
            <span className="text-gray-500">No comments yet. {user ? 'Be the first to comment!' : 'Login to comment.'}</span>
          </div>
        )}
      </div>
      
      {/* Load More Comments */}
      {comments && comments.length > 5 && (
        <div className="mt-6 text-center">
          <Button variant="link" className="text-primary hover:text-primary-dark">
            Show More Comments
          </Button>
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  galleryId: number;
}

function CommentItem({ comment, galleryId }: CommentItemProps) {
  const [, setLocation] = useLocation();
  // Tratamento seguro para o caso de o AuthProvider não estar disponível
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    console.log("Auth context not available in CommentItem");
  }
  
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  
  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) {
        setLocation("/auth");
        throw new Error("Login required");
      }
      const res = await apiRequest("POST", `/api/gallery/${galleryId}/comments/${comment.id}/replies`, { text });
      return await res.json();
    },
    onSuccess: () => {
      setReplyText("");
      setIsReplying(false);
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/${galleryId}/comments`] });
    },
  });
  
  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (replyText.trim()) {
      replyMutation.mutate(replyText);
    }
  };
  
  const handleReplyClick = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setIsReplying(!isReplying);
  };
  
  return (
    <div className="flex">
      <div className="mr-3 flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          <span className="font-medium">{comment.username.substring(0, 2).toUpperCase()}</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg px-4 py-2 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href={`/profile/${comment.username}`} className="text-sm font-medium text-neutral-dark hover:text-primary">
              @{comment.username}
            </Link>
            <p className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</p>
          </div>
          <div className="mt-1 text-sm text-gray-700">
            <p>{comment.text}</p>
          </div>
        </div>
        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto p-0 text-xs" 
            onClick={handleReplyClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </Button>
        </div>
        
        {/* Reply Form */}
        {isReplying && user && (
          <form className="mt-3 pl-4" onSubmit={handleReplySubmit}>
            <div className="flex">
              <div className="mr-2 flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  <span className="font-medium text-xs">{user?.username.substring(0, 2).toUpperCase()}</span>
                </div>
              </div>
              <div className="flex-1">
                <Textarea
                  rows={1}
                  className="block w-full resize-none text-sm p-2"
                  placeholder={`Reply to @${comment.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mr-2"
                    onClick={() => setIsReplying(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={replyMutation.isPending || !replyText.trim()}
                  >
                    {replyMutation.isPending ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
        
        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2 pl-6">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex">
                <div className="mr-2 flex-shrink-0">
                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <span className="font-medium text-xs">{reply.username.substring(0, 2).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg px-3 py-1.5 sm:px-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/profile/${reply.username}`} className="text-xs font-medium text-neutral-dark hover:text-primary">
                        @{reply.username}
                      </Link>
                      <p className="text-xs text-gray-500">{formatTimeAgo(reply.createdAt)}</p>
                    </div>
                    <div className="text-xs text-gray-700">
                      <p>{reply.text}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}
