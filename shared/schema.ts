import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Content tables
export const galleries = pgTable("galleries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull().references(() => users.id),
  tags: text("tags").array(),
  visibility: text("visibility").notNull().default("public"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id),
  userId: integer("user_id").notNull().references(() => users.id),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  fileType: text("file_type").notNull(), // "image" or "video"
  duration: text("duration"), // For videos only
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Social interactions
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const saves = pgTable("saves", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull().references(() => galleries.id),
  userId: integer("user_id").notNull().references(() => users.id),
  parentId: integer("parent_id").references(() => comments.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertGallerySchema = createInsertSchema(galleries).pick({
  title: true,
  description: true,
  userId: true,
  tags: true,
  visibility: true,
});

export const insertContentItemSchema = createInsertSchema(contentItems).pick({
  galleryId: true,
  userId: true,
  fileUrl: true,
  thumbnailUrl: true,
  fileType: true,
  duration: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  galleryId: true,
  userId: true,
  parentId: true,
  text: true,
});

// Select types
export type User = typeof users.$inferSelect & {
  followersCount?: number;
  contentCount?: number;
  isFollowing?: boolean;
};

export type Gallery = typeof galleries.$inferSelect & {
  username: string;
  items: GalleryItem[];
  isOwnGallery?: boolean;
  isFollowing?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
  likesCount?: number;
  commentsCount?: number;
};

export type GalleryItem = typeof contentItems.$inferSelect;

export type Content = {
  id: number;
  title: string;
  username: string;
  thumbnailUrl: string;
  fileType: string;
  duration?: string;
  viewCount: number;
  createdAt: string;
};

export type Comment = {
  id: number;
  galleryId: number;
  username: string;
  userId: number;
  text: string;
  createdAt: string;
  replies?: Comment[];
};

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
