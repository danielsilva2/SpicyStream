import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { promisify } from "util";
import sharp from "sharp";

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype === 'video/mp4') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and MP4 files are allowed.'));
    }
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    if (req.path) {
      const filePath = path.join(uploadsDir, path.basename(req.path));
      res.sendFile(filePath, (err) => {
        if (err) {
          next();
        }
      });
    } else {
      next();
    }
  });

  // Content routes
  app.get("/api/content", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = req.query.sortBy as string || 'recent';
      
      const content = await storage.getAllContent(limit, offset, sortBy);
      res.json(content);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/feed", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const feedContent = await storage.getFeedContent(userId, limit, offset);
      res.json(feedContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get("/api/saved", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const savedContent = await storage.getSavedContent(userId, limit, offset);
      res.json(savedContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch saved content" });
    }
  });

  // User routes
  app.get("/api/users/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the current user is following this user
      if (req.isAuthenticated() && req.user?.id !== user.id) {
        const isFollowing = await storage.isFollowing(req.user.id, user.id);
        user.isFollowing = isFollowing;
      }
      
      // Don't send password
      const { password, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:username/content", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get user content
      const userContent = await storage.getUserGalleries(user.id);
      
      // Filter private content if not the owner
      const filteredContent = req.user?.id === user.id 
        ? userContent 
        : userContent.filter(item => {
            const gallery = storage.getGalleryById(item.id);
            return gallery && gallery.visibility === 'public';
          });
      
      // Apply pagination
      const paginatedContent = filteredContent.slice(offset, offset + limit);
      
      res.json(paginatedContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch user content" });
    }
  });

  // Follow routes
  app.post("/api/users/:username/follow", isAuthenticated, async (req, res) => {
    try {
      const { username } = req.params;
      const targetUser = await storage.getUserByUsername(username);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const followerId = req.user.id;
      const followingId = targetUser.id;
      
      // Can't follow yourself
      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }
      
      await storage.followUser(followerId, followingId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:username/follow", isAuthenticated, async (req, res) => {
    try {
      const { username } = req.params;
      const targetUser = await storage.getUserByUsername(username);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const followerId = req.user.id;
      const followingId = targetUser.id;
      
      await storage.unfollowUser(followerId, followingId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Gallery routes
  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const gallery = await storage.getGalleryById(galleryId);
      
      if (!gallery) {
        return res.status(404).json({ message: "Gallery not found" });
      }
      
      // If private, only owner can view
      if (gallery.visibility === 'private' && gallery.userId !== req.user?.id) {
        return res.status(403).json({ message: "You don't have permission to view this gallery" });
      }
      
      // Add additional information for the logged-in user
      if (req.isAuthenticated()) {
        // Check if this is the user's own gallery
        gallery.isOwnGallery = req.user.id === gallery.userId;
        
        // Check if the user is following the gallery creator
        if (!gallery.isOwnGallery) {
          gallery.isFollowing = await storage.isFollowing(req.user.id, gallery.userId);
        }
        
        // Check if the user has liked and saved the gallery
        gallery.isLiked = await storage.isGalleryLiked(req.user.id, galleryId);
        gallery.isSaved = await storage.isGallerySaved(req.user.id, galleryId);
      }
      
      // Update view count
      await storage.incrementViewCount(galleryId);
      
      res.json(gallery);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch gallery" });
    }
  });

  // Gallery interactions
  app.post("/api/gallery/:id/like", isAuthenticated, async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.likeGallery(userId, galleryId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to like gallery" });
    }
  });

  app.delete("/api/gallery/:id/like", isAuthenticated, async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.unlikeGallery(userId, galleryId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to unlike gallery" });
    }
  });

  app.post("/api/gallery/:id/save", isAuthenticated, async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.saveGallery(userId, galleryId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to save gallery" });
    }
  });

  app.delete("/api/gallery/:id/save", isAuthenticated, async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const userId = req.user.id;
      
      await storage.unsaveGallery(userId, galleryId);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to unsave gallery" });
    }
  });

  // Comments
  app.get("/api/gallery/:id/comments", async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const comments = await storage.getComments(galleryId);
      
      res.json(comments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/gallery/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const userId = req.user.id;
      const { text } = req.body;
      
      if (!text || text.trim() === '') {
        return res.status(400).json({ message: "Comment text is required" });
      }
      
      const comment = await storage.createComment(galleryId, userId, text);
      res.status(201).json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.post("/api/gallery/:id/comments/:commentId/replies", isAuthenticated, async (req, res) => {
    try {
      const galleryId = parseInt(req.params.id);
      const commentId = parseInt(req.params.commentId);
      const userId = req.user.id;
      const { text } = req.body;
      
      if (!text || text.trim() === '') {
        return res.status(400).json({ message: "Reply text is required" });
      }
      
      const reply = await storage.createComment(galleryId, userId, text, commentId);
      res.status(201).json(reply);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Upload route
  app.post("/api/upload", isAuthenticated, upload.array('files', 10), async (req, res) => {
    try {
      const { title, description, tags, visibility } = req.body;
      const userId = req.user.id;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "At least one file is required" });
      }
      
      // Process tags
      const processedTags = tags ? tags.split(',').map((tag: string) => tag.trim()) : [];
      
      // Create gallery
      const gallery = {
        title,
        description,
        userId,
        tags: processedTags,
        visibility: visibility || 'public',
        items: [] as any[]
      };
      
      // Process each file
      for (const file of files) {
        const fileId = uuidv4();
        const fileExtension = file.mimetype.split('/')[1];
        const fileName = `${fileId}.${fileExtension}`;
        const isVideo = file.mimetype === 'video/mp4';
        
        // Save the file
        const fileUrl = await storage.saveFile(file.buffer, file.mimetype, fileName);
        
        // Generate thumbnail for images
        let thumbnailUrl = fileUrl;
        if (!isVideo) {
          // For images, create a thumbnail
          const thumbnailName = `${fileId}_thumb.jpg`;
          const thumbnailBuffer = await sharp(file.buffer)
            .resize(400, 225, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();
          
          thumbnailUrl = await storage.saveFile(thumbnailBuffer, 'image/jpeg', thumbnailName);
        } else {
          // For videos, extract the first frame as thumbnail using ffmpeg
          const thumbnailName = `${fileId}_thumb.jpg`;
          const thumbnailPath = path.join(uploadsDir, thumbnailName);
          
          // Save video file temporarily to extract thumbnail
          const tempVideoPath = path.join(uploadsDir, fileName);
          await promisify(fs.writeFile)(tempVideoPath, file.buffer);
          
          // Extract thumbnail using ffmpeg
          await new Promise((resolve, reject) => {
            ffmpeg(tempVideoPath)
              .screenshots({
                timestamps: ['1'],
                filename: thumbnailName,
                folder: uploadsDir,
                size: '400x225'
              })
              .on('end', resolve)
              .on('error', reject);
          });
          
          // Read the generated thumbnail
          const thumbnailBuffer = await promisify(fs.readFile)(thumbnailPath);
          
          // Clean up temporary files
          await promisify(fs.unlink)(tempVideoPath);
          await promisify(fs.unlink)(thumbnailPath);
          
          thumbnailUrl = await storage.saveFile(thumbnailBuffer, 'image/jpeg', thumbnailName);
        }
        
        // Add to gallery items
        gallery.items.push({
          fileUrl,
          thumbnailUrl,
          fileType: isVideo ? 'video' : 'image',
          duration: isVideo ? '0:00' : undefined // In a real implementation, this would be calculated
        });
      }
      
      // Save gallery to storage
      const savedGallery = await storage.createGallery(gallery);
      
      res.status(201).json(savedGallery);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to upload content" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
