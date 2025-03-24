import { users, follows, galleries, contentItems, likes, saves, comments, type User, type InsertUser, type Gallery, type Content, type Comment } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
export interface IStorage {
  // Session
  sessionStore: session.SessionStore;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Follow operations
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowersCount(userId: number): Promise<number>;
  
  // Content & Gallery operations
  createGallery(gallery: any): Promise<Gallery>;
  getGalleryById(id: number): Promise<Gallery | undefined>;
  getUserGalleries(userId: number): Promise<Content[]>;
  getAllContent(limit?: number, offset?: number, sortBy?: string): Promise<Content[]>;
  getFeedContent(userId: number, limit?: number, offset?: number): Promise<Content[]>;
  getSavedContent(userId: number, limit?: number, offset?: number): Promise<Content[]>;
  incrementViewCount(galleryId: number): Promise<void>;
  getUserContentCount(userId: number): Promise<number>;
  
  // Interactions
  likeGallery(userId: number, galleryId: number): Promise<void>;
  unlikeGallery(userId: number, galleryId: number): Promise<void>;
  isGalleryLiked(userId: number, galleryId: number): Promise<boolean>;
  saveGallery(userId: number, galleryId: number): Promise<void>;
  unsaveGallery(userId: number, galleryId: number): Promise<void>;
  isGallerySaved(userId: number, galleryId: number): Promise<boolean>;
  
  // Comments
  getComments(galleryId: number): Promise<Comment[]>;
  createComment(galleryId: number, userId: number, text: string, parentId?: number): Promise<Comment>;
  
  // File storage
  saveFile(file: Buffer, fileType: string, fileName: string): Promise<string>;
  getFilePath(fileName: string): string;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private followsData: Map<number, { followerId: number; followingId: number }>;
  private galleriesData: Map<number, Gallery>;
  private contentItemsData: Map<number, any>;
  private likesData: Map<number, { userId: number; galleryId: number }>;
  private savesData: Map<number, { userId: number; galleryId: number }>;
  private commentsData: Map<number, Comment>;
  
  sessionStore: session.SessionStore;
  currentUserId: number;
  currentGalleryId: number;
  currentContentItemId: number;
  currentFollowId: number;
  currentLikeId: number;
  currentSaveId: number;
  currentCommentId: number;
  
  uploadDirectory: string;

  constructor() {
    // Initialize maps for in-memory storage
    this.usersData = new Map();
    this.followsData = new Map();
    this.galleriesData = new Map();
    this.contentItemsData = new Map();
    this.likesData = new Map();
    this.savesData = new Map();
    this.commentsData = new Map();
    
    // Initialize auto-increment IDs
    this.currentUserId = 1;
    this.currentGalleryId = 1;
    this.currentContentItemId = 1;
    this.currentFollowId = 1;
    this.currentLikeId = 1;
    this.currentSaveId = 1;
    this.currentCommentId = 1;
    
    // Set up session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Set up upload directory
    this.uploadDirectory = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDirectory)) {
      fs.mkdirSync(this.uploadDirectory, { recursive: true });
    }
    
    // Add demo content
    this.seedDemoData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const user = this.usersData.get(id);
    if (!user) return undefined;
    
    // Add additional calculated fields
    const followersCount = await this.getFollowersCount(id);
    const contentCount = await this.getUserContentCount(id);
    
    return { ...user, followersCount, contentCount };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = Array.from(this.usersData.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
    
    if (!user) return undefined;
    
    // Add additional calculated fields
    const followersCount = await this.getFollowersCount(user.id);
    const contentCount = await this.getUserContentCount(user.id);
    
    return { ...user, followersCount, contentCount };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    this.usersData.set(id, user);
    return user;
  }

  // Follow operations
  async followUser(followerId: number, followingId: number): Promise<void> {
    // Check if already following
    const isAlreadyFollowing = await this.isFollowing(followerId, followingId);
    if (isAlreadyFollowing) return;
    
    const id = this.currentFollowId++;
    this.followsData.set(id, { 
      followerId, 
      followingId
    });
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    const follow = Array.from(this.followsData.entries()).find(
      ([_, f]) => f.followerId === followerId && f.followingId === followingId
    );
    
    if (follow) {
      this.followsData.delete(follow[0]);
    }
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.followsData.values()).some(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
  }

  async getFollowersCount(userId: number): Promise<number> {
    return Array.from(this.followsData.values()).filter(
      (f) => f.followingId === userId
    ).length;
  }

  // Content & Gallery operations
  async createGallery(galleryData: any): Promise<Gallery> {
    const id = this.currentGalleryId++;
    const now = new Date();
    
    const gallery: Gallery = {
      id,
      title: galleryData.title,
      description: galleryData.description || null,
      userId: galleryData.userId,
      tags: galleryData.tags || [],
      visibility: galleryData.visibility || 'public',
      viewCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      // Additional fields needed for frontend
      username: '', // Will be filled in
      items: []     // Will be populated with content items
    };
    
    // Get username and add it to gallery
    const user = await this.getUser(galleryData.userId);
    if (user) {
      gallery.username = user.username;
    }
    
    this.galleriesData.set(id, gallery);
    
    // Add content items if provided
    if (galleryData.items && Array.isArray(galleryData.items)) {
      for (const item of galleryData.items) {
        const contentId = this.currentContentItemId++;
        const contentItem = {
          id: contentId,
          galleryId: id,
          userId: galleryData.userId,
          fileUrl: item.fileUrl,
          thumbnailUrl: item.thumbnailUrl,
          fileType: item.fileType,
          duration: item.duration || null,
          createdAt: now.toISOString()
        };
        
        this.contentItemsData.set(contentId, contentItem);
        gallery.items.push(contentItem);
      }
    }
    
    return gallery;
  }

  async getGalleryById(id: number): Promise<Gallery | undefined> {
    const gallery = this.galleriesData.get(id);
    if (!gallery) return undefined;
    
    // Get items for this gallery
    const items = Array.from(this.contentItemsData.values()).filter(
      (item) => item.galleryId === id
    );
    
    // Add items to gallery
    gallery.items = items;
    
    return gallery;
  }

  async getUserGalleries(userId: number): Promise<Content[]> {
    const userGalleries = Array.from(this.galleriesData.values())
      .filter((gallery) => gallery.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Convert galleries to content format
    return userGalleries.map(gallery => {
      // Get the first item for the thumbnail
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };
      
      return {
        id: gallery.id,
        title: gallery.title,
        username: gallery.username,
        thumbnailUrl: firstItem.thumbnailUrl,
        fileType: firstItem.fileType,
        duration: firstItem.duration,
        viewCount: gallery.viewCount,
        createdAt: gallery.createdAt
      };
    });
  }

  async getAllContent(limit = 20, offset = 0, sortBy = 'recent'): Promise<Content[]> {
    let galleries = Array.from(this.galleriesData.values())
      .filter(gallery => gallery.visibility === 'public');
    
    // Apply sorting
    if (sortBy === 'popular') {
      galleries = galleries.sort((a, b) => {
        const likesA = Array.from(this.likesData.values()).filter(like => like.galleryId === a.id).length;
        const likesB = Array.from(this.likesData.values()).filter(like => like.galleryId === b.id).length;
        return likesB - likesA;
      });
    } else if (sortBy === 'views') {
      galleries = galleries.sort((a, b) => b.viewCount - a.viewCount);
    } else {
      // Default to recent
      galleries = galleries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Apply pagination
    galleries = galleries.slice(offset, offset + limit);
    
    // Convert galleries to content format
    return galleries.map(gallery => {
      // Get the first item for the thumbnail
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };
      
      // Get the username
      const user = this.usersData.get(gallery.userId);
      const username = user ? user.username : 'unknown';
      
      return {
        id: gallery.id,
        title: gallery.title,
        username: username,
        thumbnailUrl: firstItem.thumbnailUrl,
        fileType: firstItem.fileType,
        duration: firstItem.duration,
        viewCount: gallery.viewCount,
        createdAt: gallery.createdAt
      };
    });
  }

  async getFeedContent(userId: number, limit = 20, offset = 0): Promise<Content[]> {
    // Get list of users that this user follows
    const followingIds = Array.from(this.followsData.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);
    
    // Get galleries from those users
    let feedGalleries = Array.from(this.galleriesData.values())
      .filter(gallery => followingIds.includes(gallery.userId) && gallery.visibility === 'public')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination
    feedGalleries = feedGalleries.slice(offset, offset + limit);
    
    // Convert galleries to content format
    return feedGalleries.map(gallery => {
      // Get the first item for the thumbnail
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };
      
      // Get the username
      const user = this.usersData.get(gallery.userId);
      const username = user ? user.username : 'unknown';
      
      return {
        id: gallery.id,
        title: gallery.title,
        username: username,
        thumbnailUrl: firstItem.thumbnailUrl,
        fileType: firstItem.fileType,
        duration: firstItem.duration,
        viewCount: gallery.viewCount,
        createdAt: gallery.createdAt
      };
    });
  }

  async getSavedContent(userId: number, limit = 20, offset = 0): Promise<Content[]> {
    // Get list of gallery IDs that this user has saved
    const savedGalleryIds = Array.from(this.savesData.values())
      .filter(save => save.userId === userId)
      .map(save => save.galleryId);
    
    // Get galleries that the user has saved
    let savedGalleries = Array.from(this.galleriesData.values())
      .filter(gallery => savedGalleryIds.includes(gallery.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination
    savedGalleries = savedGalleries.slice(offset, offset + limit);
    
    // Convert galleries to content format
    return savedGalleries.map(gallery => {
      // Get the first item for the thumbnail
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };
      
      // Get the username
      const user = this.usersData.get(gallery.userId);
      const username = user ? user.username : 'unknown';
      
      return {
        id: gallery.id,
        title: gallery.title,
        username: username,
        thumbnailUrl: firstItem.thumbnailUrl,
        fileType: firstItem.fileType,
        duration: firstItem.duration,
        viewCount: gallery.viewCount,
        createdAt: gallery.createdAt
      };
    });
  }

  async incrementViewCount(galleryId: number): Promise<void> {
    const gallery = this.galleriesData.get(galleryId);
    if (gallery) {
      gallery.viewCount = (gallery.viewCount || 0) + 1;
      this.galleriesData.set(galleryId, gallery);
    }
  }

  async getUserContentCount(userId: number): Promise<number> {
    return Array.from(this.galleriesData.values()).filter(
      (gallery) => gallery.userId === userId
    ).length;
  }

  // Interactions
  async likeGallery(userId: number, galleryId: number): Promise<void> {
    // Check if already liked
    const isAlreadyLiked = await this.isGalleryLiked(userId, galleryId);
    if (isAlreadyLiked) return;
    
    const id = this.currentLikeId++;
    this.likesData.set(id, { userId, galleryId });
  }

  async unlikeGallery(userId: number, galleryId: number): Promise<void> {
    const like = Array.from(this.likesData.entries()).find(
      ([_, l]) => l.userId === userId && l.galleryId === galleryId
    );
    
    if (like) {
      this.likesData.delete(like[0]);
    }
  }

  async isGalleryLiked(userId: number, galleryId: number): Promise<boolean> {
    return Array.from(this.likesData.values()).some(
      (l) => l.userId === userId && l.galleryId === galleryId
    );
  }

  async saveGallery(userId: number, galleryId: number): Promise<void> {
    // Check if already saved
    const isAlreadySaved = await this.isGallerySaved(userId, galleryId);
    if (isAlreadySaved) return;
    
    const id = this.currentSaveId++;
    this.savesData.set(id, { userId, galleryId });
  }

  async unsaveGallery(userId: number, galleryId: number): Promise<void> {
    const save = Array.from(this.savesData.entries()).find(
      ([_, s]) => s.userId === userId && s.galleryId === galleryId
    );
    
    if (save) {
      this.savesData.delete(save[0]);
    }
  }

  async isGallerySaved(userId: number, galleryId: number): Promise<boolean> {
    return Array.from(this.savesData.values()).some(
      (s) => s.userId === userId && s.galleryId === galleryId
    );
  }

  // Comments
  async getComments(galleryId: number): Promise<Comment[]> {
    // Get all root comments
    const rootComments = Array.from(this.commentsData.values())
      .filter(comment => comment.galleryId === galleryId && !comment.parentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Get all replies
    const replies = Array.from(this.commentsData.values())
      .filter(comment => comment.galleryId === galleryId && !!comment.parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Organize replies by parent
    for (const rootComment of rootComments) {
      rootComment.replies = replies.filter(reply => reply.parentId === rootComment.id);
    }
    
    return rootComments;
  }

  async createComment(galleryId: number, userId: number, text: string, parentId?: number): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date();
    
    // Get username
    const user = await this.getUser(userId);
    const username = user ? user.username : 'unknown';
    
    const comment: Comment = {
      id,
      galleryId,
      userId,
      username,
      text,
      createdAt: now.toISOString(),
      parentId
    };
    
    this.commentsData.set(id, comment);
    return comment;
  }

  // File storage
  async saveFile(file: Buffer, fileType: string, fileName: string): Promise<string> {
    const filePath = path.join(this.uploadDirectory, fileName);
    await promisify(fs.writeFile)(filePath, file);
    
    // Return path that can be used to access the file
    return `/uploads/${fileName}`;
  }

  getFilePath(fileName: string): string {
    return path.join(this.uploadDirectory, fileName);
  }
  
  // Método para adicionar dados de demonstração
  async seedDemoData() {
    try {
      console.log("Inicializando dados de demonstração...");
      
      // Criar usuários de teste
      const demoUser1 = await this.createUser({
        username: "demo",
        password: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25.d048efa12c", // "password"
        email: "demo@example.com"
      });
      
      const demoUser2 = await this.createUser({
        username: "creator",
        password: "5b722b307fce6c944905d132691d5e4a2214b7fe92b738920eb3fce3a90420a19511c3010a0e7712b054daef5b57bad59ecbd93b3280f210578f547f4aed4d25.d048efa12c", // "password"
        email: "creator@example.com"
      });

      // Criar relações de seguir
      await this.followUser(demoUser1.id, demoUser2.id);
      
      // Criar galerias com itens
      // Galeria 1 - Com vídeo
      await this.createGallery({
        title: "Vídeo de Demonstração",
        description: "Este é um vídeo de exemplo para testar a plataforma",
        userId: demoUser2.id,
        tags: ["demo", "vídeo", "exemplo"],
        visibility: "public",
        items: [
          {
            fileUrl: "/uploads/demo-video.mp4",
            thumbnailUrl: "/uploads/demo-video-thumb.jpg",
            fileType: "video",
            duration: "0:30"
          }
        ]
      });
      
      // Galeria 2 - Com imagens
      const gallery2 = await this.createGallery({
        title: "Galeria de Imagens",
        description: "Uma coleção de imagens de exemplo",
        userId: demoUser2.id,
        tags: ["imagens", "fotos", "exemplo"],
        visibility: "public",
        items: [
          {
            fileUrl: "/uploads/demo-image-1.jpg",
            thumbnailUrl: "/uploads/demo-image-1-thumb.jpg",
            fileType: "image"
          },
          {
            fileUrl: "/uploads/demo-image-2.jpg",
            thumbnailUrl: "/uploads/demo-image-2-thumb.jpg",
            fileType: "image"
          }
        ]
      });
      
      // Galeria 3
      await this.createGallery({
        title: "Conteúdo do Usuário Demo",
        description: "Galeria criada pelo usuário demo",
        userId: demoUser1.id,
        tags: ["usuário", "demo"],
        visibility: "public",
        items: [
          {
            fileUrl: "/uploads/demo-image-3.jpg",
            thumbnailUrl: "/uploads/demo-image-3-thumb.jpg",
            fileType: "image"
          }
        ]
      });
      
      // Adicionar likes e comentários
      await this.likeGallery(demoUser1.id, gallery2.id);
      await this.saveGallery(demoUser1.id, gallery2.id);
      
      // Comentários
      const comment1 = await this.createComment(gallery2.id, demoUser1.id, "Excelente galeria, gostei muito do conteúdo!");
      await this.createComment(gallery2.id, demoUser2.id, "Obrigado pelo comentário!", comment1.id);
      
      console.log("Dados de demonstração inicializados com sucesso!");
    } catch (error) {
      console.error("Erro ao inicializar dados de demonstração:", error);
    }
  }
}

export const storage = new MemStorage();
