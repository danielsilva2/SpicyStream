import { useQuery, useMutation } from "@tanstack/react-query";
import { Gallery, Comment } from "@shared/schema";
import { useParams, Link, useLocation } from "wouter";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Loader2, Heart, Bookmark, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import GalleryViewer from "@/components/gallery-viewer";
import CommentSection from "@/components/comment-section";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function GalleryPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const galleryId = parseInt(id);
  
  // Tratamento seguro para o caso de o AuthProvider não estar disponível
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    // Se o useAuth falhar, manteremos user como null
    console.log("Auth context not available");
  }
  
  const { data: gallery, isLoading } = useQuery<Gallery>({
    queryKey: [`/api/gallery/${galleryId}`],
  });
  
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  
  // Inicializar estados quando a galeria é carregada
  useState(() => {
    if (gallery) {
      setIsLiked(!!gallery.isLiked);
      setIsSaved(!!gallery.isSaved);
    }
  });
  
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        setLocation("/auth");
        throw new Error("Login required");
      }
      const res = await apiRequest(isLiked ? "DELETE" : "POST", `/api/gallery/${galleryId}/like`, {});
      return await res.json();
    },
    onSuccess: () => {
      setIsLiked(!isLiked);
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/${galleryId}`] });
    },
  });
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        setLocation("/auth");
        throw new Error("Login required");
      }
      const res = await apiRequest(isSaved ? "DELETE" : "POST", `/api/gallery/${galleryId}/save`, {});
      return await res.json();
    },
    onSuccess: () => {
      setIsSaved(!isSaved);
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
    },
  });
  
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!gallery || !user) {
        if (!user) setLocation("/auth");
        throw new Error("Login required");
      }
      const res = await apiRequest("POST", `/api/users/${gallery.username}/follow`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/gallery/${galleryId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });
  
  const handleInteraction = (action: string) => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    
    if (action === 'like') {
      likeMutation.mutate();
    } else if (action === 'save') {
      saveMutation.mutate();
    } else if (action === 'follow' && gallery) {
      followMutation.mutate();
    }
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: gallery?.title || 'Conteúdo compartilhado',
        text: gallery?.description || 'Confira este conteúdo no RedShare',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado",
        description: "O link foi copiado para sua área de transferência.",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-bg">
        <Header />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MobileNavigation activeTab="home" />
      </div>
    );
  }
  
  if (!gallery) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-bg">
        <Header />
        <div className="flex justify-center items-center flex-1">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-2">Gallery not found</h2>
            <p className="text-gray-600">The gallery you're looking for doesn't exist or has been removed.</p>
            <Link href="/">
              <Button className="mt-4">Back to Home</Button>
            </Link>
          </div>
        </div>
        <MobileNavigation activeTab="home" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-bg">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-sm text-primary hover:text-primary-dark">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-dark">{gallery.title}</h1>
                  <div className="flex items-center mt-2">
                    <Link href={`/profile/${gallery.username}`} className="flex items-center group">
                      <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-primary mr-2">
                        <span className="font-medium">{gallery.username.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="text-neutral-dark group-hover:text-primary font-medium">@{gallery.username}</span>
                    </Link>
                    {user && !gallery.isOwnGallery && (
                      <Button
                        variant="default"
                        size="sm"
                        className="ml-4 rounded-full"
                        onClick={() => handleInteraction('follow')}
                        disabled={followMutation.isPending}
                      >
                        {gallery.isFollowing ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-4 sm:mt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInteraction('like')}
                    disabled={likeMutation.isPending}
                    className="flex items-center"
                  >
                    <Heart 
                      className={`h-5 w-5 mr-1.5 ${isLiked ? "fill-primary text-primary" : ""}`}
                    />
                    Like
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInteraction('save')}
                    disabled={saveMutation.isPending}
                    className="flex items-center"
                  >
                    <Bookmark
                      className={`h-5 w-5 mr-1.5 ${isSaved ? "fill-primary text-primary" : ""}`}
                    />
                    Save
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                    onClick={handleShare}
                  >
                    <Share className="h-5 w-5 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>
              
              {gallery.description && (
                <div className="mt-6">
                  <p className="text-gray-600">{gallery.description}</p>
                </div>
              )}
              
              {gallery.tags && gallery.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {gallery.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <GalleryViewer gallery={gallery} />
            
            {/* Mostrar comentários apenas se estiver logado, caso contrário mostrar CTA para login */}
            {user ? (
              <CommentSection galleryId={galleryId} />
            ) : (
              <div className="p-6 border-t border-gray-200 text-center">
                <h3 className="text-lg font-medium text-neutral-dark mb-2">Quer participar da conversa?</h3>
                <p className="text-gray-600 mb-4">Faça login para curtir, salvar e comentar neste conteúdo.</p>
                <Link href="/auth">
                  <Button>Entrar / Registrar</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNavigation activeTab="home" />
    </div>
  );
}
