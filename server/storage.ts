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

      // Create 5 demo users
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

      // Create some follow relationships
      await this.followUser(user1.id, user2.id);
      await this.followUser(user1.id, user3.id);
      await this.followUser(user2.id, user4.id);
      await this.followUser(user3.id, user5.id);
      await this.followUser(user4.id, user1.id);

      // Nature videos for user1
      await this.createGallery({
        title: "Beautiful Waterfalls",
        description: "Stunning waterfall scenes",
        userId: user1.id,
        tags: ["nature", "water", "relaxing"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/328890111/waterfall-23881.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/774667835-6769e9ffd8f8d5cf44f97bd8f63050127e35f191d4dfb2d060870170806e6c0e-d",
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
          fileUrl: "https://cdn.pixabay.com/vimeo/178058381/ocean-4006.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/585731720-8c45d35d11dde0feb999b5c6505b7342326b7681991f449285df5bf38e27b8f4-d",
          fileType: "video",
          duration: "0:42"
        }]
      });

      // Urban videos for user2
      await this.createGallery({
        title: "City Lights",
        description: "Night city timelapse",
        userId: user2.id,
        tags: ["urban", "night", "timelapse"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/414670315/city-40862.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/887059150-89145b318d43959e56b83f8f7829c5c58fb5eec6d37faa6a3b51a23adde25a0e-d",
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
          fileUrl: "https://cdn.pixabay.com/vimeo/443401203/traffic-46340.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/927956336-016e932a7437e5978593dd1ff9a5250662408a297d43e57c3c73ee2dd8506cfc-d",
          fileType: "video",
          duration: "0:15"
        }]
      });

      // Wildlife videos for user3
      await this.createGallery({
        title: "Wild Dolphins",
        description: "Dolphins in their natural habitat",
        userId: user3.id,
        tags: ["wildlife", "ocean", "dolphins"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/457670133/dolphins-47947.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/947994582-e9264c472e46c0bb470b67751879a12fb2ea95f8614e94553cadded4cf80b2c5-d",
          fileType: "video",
          duration: "0:23"
        }]
      });

      await this.createGallery({
        title: "Birds in Flight",
        description: "Beautiful birds soaring",
        userId: user3.id,
        tags: ["wildlife", "birds", "nature"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/467929736/bird-49607.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/961871267-6921dce86e3f76082d76c012c905b4405527e669b0d1f3366e26566bacd0f75e-d",
          fileType: "video",
          duration: "0:18"
        }]
      });

      // Timelapse videos for user4
      await this.createGallery({
        title: "Cloud Movement",
        description: "Beautiful cloud timelapse",
        userId: user4.id,
        tags: ["timelapse", "clouds", "nature"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/385919399/clouds-35516.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/845295531-cb5c691c1ceb5f67f291c5f0bc3f69c73e4bf5b37307a646847ea797ae352d9a-d",
          fileType: "video",
          duration: "0:27"
        }]
      });

      await this.createGallery({
        title: "Sunset Colors",
        description: "Beautiful sunset timelapse",
        userId: user4.id,
        tags: ["timelapse", "sunset", "nature"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/490271048/sunset-52915.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/1013408755-7812c01b1da6e1df7e9e0b05e49b0f8c0a05c9e34c62405fb81e50b4d24d7f6f-d",
          fileType: "video",
          duration: "0:21"
        }]
      });

      // City videos for user5
      await this.createGallery({
        title: "Downtown Rush",
        description: "City traffic and movement",
        userId: user5.id,
        tags: ["city", "traffic", "urban"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/529720096/traffic-58024.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/1095994650-66b48ef37967a111665c1ceb4995d004106c8fe26d1f3c5fd70fea4206922f92-d",
          fileType: "video",
          duration: "0:24"
        }]
      });

      await this.createGallery({
        title: "Night Life",
        description: "City at night",
        userId: user5.id,
        tags: ["city", "night", "urban"],
        visibility: "public",
        items: [{
          fileUrl: "https://cdn.pixabay.com/vimeo/474243499/city-50450.mp4",
          thumbnailUrl: "https://i.vimeocdn.com/video/970483541-64946eb5e91e58a5882bb710cb874cdda16612ef0bece68cc1d2b37ec4ef5b05-d",
          fileType: "video",
          duration: "0:19"
        }]
      });

      console.log("Dados de demonstração inicializados com sucesso!");
    } catch (error) {
      console.error("Erro ao inicializar dados de demonstração:", error);
    }
  }
      await this.createGallery({
        title: "Nature Collection",
        description: "Beautiful nature scenes from around the world",
        userId: demoUser2.id,
        tags: ["nature", "landscape", "photography"],
        visibility: "public",
        items: [
          {
            fileUrl: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e",
            thumbnailUrl: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
            thumbnailUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://images.unsplash.com/photo-1682686580391-615b1f28e5ee",
            thumbnailUrl: "https://images.unsplash.com/photo-1682686580391-615b1f28e5ee?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://pixabay.com/get/g80aa2c5a8690b8d4cf96da8b3bbbc03c5bbfacbe6e5a7ff7fcca22b8b45093f8d6b13abfda42195c4fc6b56f0ae5f714.mp4",
            thumbnailUrl: "https://i.vimeocdn.com/video/583083388-46d0ce9d987de915110ba48c69c96f2bc6a93d4fc8640dc37968df54539b91bc-d",
            fileType: "video",
            duration: "0:30"
          }
        ]
      });

      // Additional Nature Gallery
      await this.createGallery({
        title: "Wildlife Moments",
        description: "Amazing wildlife captures",
        userId: demoUser2.id,
        tags: ["wildlife", "nature", "animals"],
        visibility: "public",
        items: [
          {
            fileUrl: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7",
            thumbnailUrl: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://pixabay.com/get/g5c95cf11a5c4fa9c5b6c67da40d16c9fcd96c7a31b8fc0ad08ff66c8b37b1bdfc3d2e06da31dbf6d48eb9bf38f5a7f7c.mp4",
            thumbnailUrl: "https://i.vimeocdn.com/video/746506397-a1cc6c80d99f7815c7a9e2ff0e6f17f7f5c0144e38d1d738ca7bf51bd6463e75-d",
            fileType: "video",
            duration: "0:20"
          }
        ]
      });

      // Urban Photography
      await this.createGallery({
        title: "Urban Life",
        description: "City scenes and street photography",
        userId: demoUser1.id,
        tags: ["urban", "city", "street"],
        visibility: "public",
        items: [
          {
            fileUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000",
            thumbnailUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://pixabay.com/get/g5d2f06e3dc2c8cac8a897d6d990d1a6895c2e6dd9a3bbd91c8d52ce9aa3f37d9f6dfb5a47b76cb7f688a16c2b3b95d9d.mp4",
            thumbnailUrl: "https://i.vimeocdn.com/video/723023542-d0fc3488e4b1761b907d76c06ffd769885d63dffee2676c78a76a9764c32edad-d",
            fileType: "video",
            duration: "0:15"
          }
        ]
      });

      // Artistic Collection
      await this.createGallery({
        title: "Abstract Art",
        description: "Contemporary abstract photography",
        userId: demoUser2.id,
        tags: ["art", "abstract", "contemporary"],
        visibility: "public",
        items: [
          {
            fileUrl: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8",
            thumbnailUrl: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://pixabay.com/get/g72e9c21f7aa4f60e3ef57ce5aebc4bd0b2e05f65ed0d7c4b874ecd2b38bc5b5c1c9edce4be7b2c93ba4a0b3d1ce8c649.mp4",
            thumbnailUrl: "https://i.vimeocdn.com/video/734556028-5a05fdb043e9aa21baa4c53f8bcc1cc5e8f46f973ad0c1e3ffa49e33f531e744-d",
            fileType: "video",
            duration: "0:20"
          }
        ]
      });

      await this.createGallery({
        title: "City Life",
        description: "Urban photography and scenes",
        userId: demoUser1.id,
        tags: ["city", "urban", "architecture"],
        visibility: "public",
        items: [
          {
            fileUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000",
            thumbnailUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400",
            fileType: "image"
          },
          {
            fileUrl: "https://cdn.pixabay.com/vimeo/852750973/sunrise-203678.mp4?width=1280&hash=0c8aa1f4bd9c661c27d5b6c1c078d2ca72f7b6fc",
            thumbnailUrl: "https://i.vimeocdn.com/video/852750973-d21c671ae0e4b93b1d65dd8b10c98562f466cc22d3cad7e40ef41390da45f1ff-d",
            fileType: "video",
            duration: "0:25"
          },
          {
            fileUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000",
            thumbnailUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400",
            fileType: "image"
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
            fileUrl: "https://images.unsplash.com/photo-1682686580391-615b1f28e5ee",
            thumbnailUrl: "https://images.unsplash.com/photo-1682686580391-615b1f28e5ee?w=400",
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

      // Galeria 4 - Imagens enviadas pelo usuário
      const gallery4 = await this.createGallery({
        title: "Imagens do Erome",
        description: "Imagens que foram enviadas pelo usuário",
        userId: demoUser1.id,
        tags: ["erome", "uploads", "exemplos"],
        visibility: "public",
        items: [
          {
            fileUrl: "/uploads/images/image1.png",
            thumbnailUrl: "/uploads/images/image1.png",
            fileType: "image"
          },
          {
            fileUrl: "/uploads/images/image2.jpg",
            thumbnailUrl: "/uploads/images/image2.jpg",
            fileType: "image"
          }
        ]
      });

      // Adicionar likes e comentários
      await this.likeGallery(demoUser1.id, gallery2.id);
      await this.saveGallery(demoUser1.id, gallery2.id);

      // Likes para a galeria de imagens do Erome
      await this.likeGallery(demoUser2.id, gallery4.id);
      await this.saveGallery(demoUser2.id, gallery4.id);

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