import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { PromoBannerSlide } from '../types/index.ts';

export const cities = pgTable('cities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  neighborhoods: jsonb('neighborhoods').$type<string[]>().notNull().default([]),
  active: boolean('active').notNull().default(true),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  iconName: text('icon_name').notNull(),
  slug: text('slug').notNull(),
  description: text('description').notNull(),
  active: boolean('active').notNull().default(true),
});

export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  siteName: text('site_name').notNull(),
  tagline: text('tagline').notNull(),
  symbol: text('symbol').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactWhatsApp: text('contact_whatsapp').notNull(),
  contactEmail: text('contact_email').notNull(),
  autoApproveListings: boolean('auto_approve_listings').notNull().default(false),
  deliveryMode: text('delivery_mode').notNull().default('both'),
  commissionRate: doublePrecision('commission_rate').notNull().default(2.5),
  minListingPrice: integer('min_listing_price').notNull().default(500),
  maxPhotosPerListing: integer('max_photos_per_listing').notNull().default(5),
  promoBanners: jsonb('promo_banners').$type<PromoBannerSlide[] | null>(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or local user ID
  username: text('username'), // Normalized login identifier (email/phone/pseudo)
  passwordHash: text('password_hash'), // Salted scrypt hash (never exposed to client)
  name: text('name').notNull(),
  businessName: text('business_name'),
  email: text('email').notNull(),
  phone: text('phone').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  role: text('role').notNull().default('buyer'), // 'buyer' | 'seller' | 'admin'
  city: text('city').notNull().default('Divo'),
  neighborhood: text('neighborhood').notNull().default('Plateau'),
  avatarUrl: text('avatar_url').notNull().default(''),
  bio: text('bio'),
  status: text('status').notNull().default('active'), // 'active' | 'suspended' | 'blocked'
  rating: doublePrecision('rating').default(5.0),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
});

export const listings = pgTable('listings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  price: integer('price').notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id')
    .references(() => categories.id)
    .notNull(),
  condition: text('condition').notNull().default('neuf'), // 'neuf' | 'occasion'
  status: text('status').notNull().default('pending'), // 'approved' | 'pending' | 'rejected' | 'suspended'
  rejectionReason: text('rejection_reason'),
  photos: jsonb('photos').$type<string[]>().notNull().default([]),
  sellerId: text('seller_id')
    .references(() => users.id)
    .notNull(),
  sellerName: text('seller_name').notNull(),
  sellerBusinessName: text('seller_business_name'),
  sellerPhone: text('seller_phone').notNull(),
  sellerWhatsApp: text('seller_whatsapp').notNull(),
  sellerAvatar: text('seller_avatar'),
  sellerRating: doublePrecision('seller_rating'),
  sellerVerified: boolean('seller_verified').default(true),
  city: text('city').notNull(),
  neighborhood: text('neighborhood').notNull(),
  addressDetails: text('address_details'),
  viewsCount: integer('views_count').notNull().default(0),
  callClicksCount: integer('call_clicks_count').notNull().default(0),
  whatsappClicksCount: integer('whatsapp_clicks_count').notNull().default(0),
  featured: boolean('featured').default(false),
  popular: boolean('popular').default(false),
  isPriority: boolean('is_priority').default(false),
  durationDays: integer('duration_days'),
  expiresAt: timestamp('expires_at'),
  paymentReceiptUrl: text('payment_receipt_url'),
  paymentReceiptName: text('payment_receipt_name'),
  paymentReceiptSentAt: timestamp('payment_receipt_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  listingId: text('listing_id')
    .references(() => listings.id)
    .notNull(),
  listingTitle: text('listing_title').notNull(),
  listingPhoto: text('listing_photo').notNull().default(''),
  amount: integer('amount').notNull(),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  buyerId: text('buyer_id'),
  buyerName: text('buyer_name').notNull(),
  buyerPhone: text('buyer_phone').notNull(),
  buyerWhatsApp: text('buyer_whatsapp'),
  buyerEmail: text('buyer_email'),
  buyerCity: text('buyer_city').notNull(),
  buyerNeighborhood: text('buyer_neighborhood').notNull(),
  sellerId: text('seller_id').notNull(),
  sellerName: text('seller_name').notNull(),
  sellerPhone: text('seller_phone').notNull(),
  sellerCity: text('seller_city').notNull(),
  method: text('method').notNull(),
  status: text('status').notNull().default('paid'),
  deliveryOption: text('delivery_option').notNull().default('direct'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
});

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  listingId: text('listing_id')
    .references(() => listings.id)
    .notNull(),
  listingTitle: text('listing_title').notNull(),
  sellerName: text('seller_name').notNull(),
  reporterId: text('reporter_id'),
  reason: text('reason').notNull(),
  comment: text('comment').notNull(),
  reporterContact: text('reporter_contact'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  listingId: text('listing_id')
    .references(() => listings.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('system'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminLogs = pgTable('admin_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  performedBy: text('performed_by').notNull(),
  adminId: text('admin_id'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
  favorites: many(favorites),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  seller: one(users, {
    fields: [listings.sellerId],
    references: [users.id],
  }),
  transactions: many(transactions),
  reports: many(reports),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  listing: one(listings, {
    fields: [transactions.listingId],
    references: [listings.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  listing: one(listings, {
    fields: [reports.listingId],
    references: [listings.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [favorites.listingId],
    references: [listings.id],
  }),
}));
