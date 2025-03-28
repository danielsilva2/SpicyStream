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
    this.usersData = new Map();
    this.followsData = new Map();
    this.galleriesData = new Map();
    this.contentItemsData = new Map();
    this.likesData = new Map();
    this.savesData = new Map();
    this.commentsData = new Map();

    this.currentUserId = 1;
    this.currentGalleryId = 1;
    this.currentContentItemId = 1;
    this.currentFollowId = 1;
    this.currentLikeId = 1;
    this.currentSaveId = 1;
    this.currentCommentId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });

    this.uploadDirectory = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDirectory)) {
      fs.mkdirSync(this.uploadDirectory, { recursive: true });
    }

    this.seedDemoData();
  }

  async getUser(id: number): Promise<User | undefined> {
    const user = this.usersData.get(id);
    if (!user) return undefined;

    const followersCount = await this.getFollowersCount(id);
    const contentCount = await this.getUserContentCount(id);

    return { ...user, followersCount, contentCount };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = Array.from(this.usersData.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) return undefined;

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

  async followUser(followerId: number, followingId: number): Promise<void> {
    const isAlreadyFollowing = await this.isFollowing(followerId, followingId);
    if (isAlreadyFollowing) return;

    const id = this.currentFollowId++;
    this.followsData.set(id, { followerId, followingId });
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
    const uniqueFollowers = new Set(
      Array.from(this.followsData.values())
        .filter(f => f.followingId === userId)
        .map(f => f.followerId)
    );
    return uniqueFollowers.size;
  }

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
      username: '',
      items: []
    };

    const user = await this.getUser(galleryData.userId);
    if (user) {
      gallery.username = user.username;
    }

    this.galleriesData.set(id, gallery);

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

    const items = Array.from(this.contentItemsData.values()).filter(
      (item) => item.galleryId === id
    );

    gallery.items = items;

    return gallery;
  }

  async getUserGalleries(userId: number): Promise<Content[]> {
    const userGalleries = Array.from(this.galleriesData.values())
      .filter((gallery) => {
        if (gallery.userId === userId) {
          return gallery.visibility === 'public';
        }
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return userGalleries.map(gallery => {
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'video',
        duration: '0:00'
      };

      const user = this.usersData.get(gallery.userId);
      return {
        id: gallery.id,
        title: gallery.title,
        username: user ? user.username : 'unknown',
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

    if (sortBy === 'popular') {
      galleries = galleries.sort((a, b) => {
        const likesA = Array.from(this.likesData.values()).filter(like => like.galleryId === a.id).length;
        const likesB = Array.from(this.likesData.values()).filter(like => like.galleryId === b.id).length;
        return likesB - likesA;
      });
    } else if (sortBy === 'views') {
      galleries = galleries.sort((a, b) => b.viewCount - a.viewCount);
    } else {
      galleries = galleries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    galleries = galleries.slice(offset, offset + limit);

    return galleries.map(gallery => {
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };

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
    const followingIds = Array.from(this.followsData.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);

    let feedGalleries = Array.from(this.galleriesData.values())
      .filter(gallery => followingIds.includes(gallery.userId) && gallery.visibility === 'public')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    feedGalleries = feedGalleries.slice(offset, offset + limit);

    return feedGalleries.map(gallery => {
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };

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
    const savedGalleryIds = Array.from(this.savesData.values())
      .filter(save => save.userId === userId)
      .map(save => save.galleryId);

    let savedGalleries = Array.from(this.galleriesData.values())
      .filter(gallery => savedGalleryIds.includes(gallery.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    savedGalleries = savedGalleries.slice(offset, offset + limit);

    return savedGalleries.map(gallery => {
      const firstItem = Array.from(this.contentItemsData.values()).find(
        (item) => item.galleryId === gallery.id
      ) || {
        thumbnailUrl: '',
        fileType: 'image'
      };

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
      (gallery) => gallery.userId === userId && gallery.visibility === 'public'
    ).length;
  }

  async likeGallery(userId: number, galleryId: number): Promise<void> {
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

  async getComments(galleryId: number): Promise<Comment[]> {
    const rootComments = Array.from(this.commentsData.values())
      .filter(comment => comment.galleryId === galleryId && !comment.parentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const replies = Array.from(this.commentsData.values())
      .filter(comment => comment.galleryId === galleryId && !!comment.parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const rootComment of rootComments) {
      rootComment.replies = replies.filter(reply => reply.parentId === rootComment.id);
    }

    return rootComments;
  }

  async createComment(galleryId: number, userId: number, text: string, parentId?: number): Promise<Comment> {
    const id = this.currentCommentId++;
    const now = new Date();

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

  async saveFile(file: Buffer, fileType: string, fileName: string): Promise<string> {
    const filePath = path.join(this.uploadDirectory, fileName);
    await promisify(fs.writeFile)(filePath, file);
    return `/uploads/${fileName}`;
  }

  getFilePath(fileName: string): string {
    return path.join(this.uploadDirectory, fileName);
  }

  async seedDemoData() {
    try {
      console.log("Inicializando dados de demonstração...");

      const user1 = await this.createUser({
        username: "naturelover",
        password: "password",
        email: "nature@example.com",
        profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400"
      });

      const user2 = await this.createUser({
        username: "urbanexplorer",
        password: "password",
        email: "urban@example.com",
        profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
      });

      const user3 = await this.createUser({
        username: "wildlifepro",
        password: "password",
        email: "wildlife@example.com",
        profileImage: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400"
      });

      const user4 = await this.createUser({
        username: "timelapse",
        password: "password",
        email: "time@example.com",
        profileImage: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400"
      });

      const user5 = await this.createUser({
        username: "cityscaper",
        password: "password",
        email: "city@example.com",
        profileImage: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400"
      });

      // Set up naturelover (user1) to have followers and uploads
      await this.followUser(user2.id, user1.id); // urbanexplorer follows naturelover

      // Create two video uploads for naturelover
      await this.createGallery({
        title: "Sunrise at the Beach",
        description: "Beautiful morning timelapse",
        userId: user1.id,
        tags: ["nature", "beach", "sunrise"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
          fileType: "video",
          duration: "0:15"
        }]
      });

      await this.createGallery({
        title: "Mountain Stream",
        description: "Peaceful water flowing",
        userId: user1.id,
        tags: ["nature", "water", "mountains"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
          fileType: "video",
          duration: "0:20"
        }]
      });

      // Other demo galleries
      await this.createGallery({
        title: "Beautiful Waterfalls",
        description: "Stunning waterfall scenes",
        userId: user1.id,
        tags: ["nature", "water", "relaxing"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
          fileType: "video",
          duration: "0:31"
        }]
      });

      await this.createGallery({
        title: "Ocean Waves",
        description: "Relaxing ocean scenes",
        userId: user1.id,
        tags: ["nature", "ocean", "waves"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
          fileType: "video",
          duration: "0:42"
        }]
      });

      await this.createGallery({
        title: "City Lights",
        description: "Night city timelapse",
        userId: user2.id,
        tags: ["urban", "night", "timelapse"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
          fileType: "video",
          duration: "0:20"
        }]
      });

      await this.createGallery({
        title: "Urban Motion",
        description: "City life in motion",
        userId: user2.id,
        tags: ["urban", "people", "life"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
          fileType: "video",
          duration: "0:15"
        }]
      });

      await this.createGallery({
        title: "Wild Dolphins",
        description: "Dolphins in their natural habitat",
        userId: user3.id,
        tags: ["wildlife", "ocean", "dolphins"],
        visibility: "public",
        items: [{
          fileUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
          thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
          fileType: "video",
          duration: "0:23"
        }]
      });

      console.log("Demo data initialized successfully!");
    } catch (error) {
      console.error("Error initializing demo data:", error);
    }
  }
}

export const storage = new MemStorage();