import { and, desc, eq, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adminLogs,
  categories,
  cities,
  favorites,
  listings,
  notifications,
  reports,
  settings,
  transactions,
  users,
} from './schema.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_CITIES,
  INITIAL_LISTINGS,
  INITIAL_PROMO_BANNERS,
  INITIAL_REPORTS,
  INITIAL_SETTINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from '../data/initialData.ts';
import type {
  AdminLog,
  AppNotification,
  Category,
  City,
  Listing,
  PlatformSettings,
  Report,
  Transaction,
  UserProfile,
  UserRole,
} from '../types/index.ts';
import {
  addNeighborhoodRecordSupabase,
  clearNotificationsRecordSupabase,
  createAdminLogRecordSupabase,
  createListingRecordSupabase,
  createNotificationRecordSupabase,
  createReportRecordSupabase,
  createTransactionRecordSupabase,
  deleteListingRecordSupabase,
  ensureUserRecordSupabase,
  getBootstrapDataSupabase,
  getListingByIdSupabase,
  getUserByUidSupabase,
  incrementListingMetricSupabase,
  isSupabaseConfigured,
  markNotificationReadRecordSupabase,
  seedInitialDatabaseSupabase,
  toggleFavoriteRecordSupabase,
  updateListingRecordSupabase,
  updateReportStatusRecordSupabase,
  updateSettingsRecordSupabase,
  updateTransactionStatusRecordSupabase,
  updateUserProfileRecordSupabase,
  updateUserStatusRecordSupabase,
  upsertCityRecordSupabase,
  upsertRegisteredUserSupabase,
} from './supabase-repository.ts';

const dbWrap = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error(`Database query failed (${label}):`, error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
};

const toIso = (d: Date | string | null | undefined): string => {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  return String(d);
};

const mapCityRow = (row: typeof cities.$inferSelect): City => ({
  id: row.id,
  name: row.name,
  region: row.region,
  neighborhoods: Array.isArray(row.neighborhoods) ? row.neighborhoods : [],
  active: row.active,
});

const mapCategoryRow = (row: typeof categories.$inferSelect): Category => ({
  id: row.id,
  name: row.name,
  iconName: row.iconName,
  slug: row.slug,
  description: row.description,
  active: row.active,
});

const mapSettingsRow = (
  row: typeof settings.$inferSelect,
  cityList: City[]
): PlatformSettings => ({
  siteName: row.siteName,
  tagline: row.tagline,
  symbol: row.symbol,
  contactPhone: row.contactPhone,
  contactWhatsApp: row.contactWhatsApp,
  contactEmail: row.contactEmail,
  cities: cityList,
  autoApproveListings: row.autoApproveListings,
  deliveryMode: (row.deliveryMode as PlatformSettings['deliveryMode']) || 'both',
  commissionRate: row.commissionRate,
  minListingPrice: row.minListingPrice,
  maxPhotosPerListing: row.maxPhotosPerListing,
  promoBanners: Array.isArray(row.promoBanners)
    ? row.promoBanners
    : INITIAL_PROMO_BANNERS,
  updatedAt: toIso(row.updatedAt),
});

const mapUserRow = (row: typeof users.$inferSelect, includePii: boolean): UserProfile => ({
  id: row.id,
  name: row.name,
  businessName: row.businessName || undefined,
  email: includePii ? row.email : '',
  phone: includePii ? row.phone : '',
  whatsapp: includePii ? row.whatsapp : '',
  role: (row.role as UserRole) || 'buyer',
  city: row.city,
  neighborhood: row.neighborhood,
  avatarUrl: row.avatarUrl,
  bio: row.bio || undefined,
  registeredAt: toIso(row.registeredAt),
  status: (row.status as UserProfile['status']) || 'active',
  rating: row.rating ?? 5.0,
});

const mapListingRow = (row: typeof listings.$inferSelect): Listing => ({
  id: row.id,
  title: row.title,
  price: row.price,
  description: row.description,
  categoryId: row.categoryId,
  condition: (row.condition as Listing['condition']) || 'neuf',
  status: (row.status as Listing['status']) || 'pending',
  rejectionReason: row.rejectionReason || undefined,
  photos: Array.isArray(row.photos) ? row.photos : [],
  sellerId: row.sellerId,
  sellerName: row.sellerName,
  sellerBusinessName: row.sellerBusinessName || undefined,
  sellerPhone: row.sellerPhone,
  sellerWhatsApp: row.sellerWhatsApp,
  sellerAvatar: row.sellerAvatar || undefined,
  sellerRating: row.sellerRating ?? undefined,
  sellerVerified: row.sellerVerified ?? undefined,
  city: row.city,
  neighborhood: row.neighborhood,
  addressDetails: row.addressDetails || undefined,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
  viewsCount: row.viewsCount,
  callClicksCount: row.callClicksCount,
  whatsappClicksCount: row.whatsappClicksCount,
  featured: row.featured ?? undefined,
  popular: row.popular ?? undefined,
});

const mapTransactionRow = (row: typeof transactions.$inferSelect): Transaction => ({
  id: row.id,
  reference: row.reference,
  listingId: row.listingId,
  listingTitle: row.listingTitle,
  listingPhoto: row.listingPhoto,
  amount: row.amount,
  deliveryFee: row.deliveryFee,
  totalAmount: row.totalAmount,
  buyerId: row.buyerId || undefined,
  buyerName: row.buyerName,
  buyerPhone: row.buyerPhone,
  buyerWhatsApp: row.buyerWhatsApp || undefined,
  buyerEmail: row.buyerEmail || undefined,
  buyerCity: row.buyerCity,
  buyerNeighborhood: row.buyerNeighborhood,
  sellerId: row.sellerId,
  sellerName: row.sellerName,
  sellerPhone: row.sellerPhone,
  sellerCity: row.sellerCity,
  method: (row.method as Transaction['method']) || 'wave',
  status: (row.status as Transaction['status']) || 'paid',
  deliveryOption: (row.deliveryOption as Transaction['deliveryOption']) || 'direct',
  createdAt: toIso(row.createdAt),
  paidAt: row.paidAt ? toIso(row.paidAt) : undefined,
});

const mapReportRow = (row: typeof reports.$inferSelect): Report => ({
  id: row.id,
  listingId: row.listingId,
  listingTitle: row.listingTitle,
  sellerName: row.sellerName,
  reporterId: row.reporterId || undefined,
  reason: (row.reason as Report['reason']) || 'arnaque',
  comment: row.comment,
  reporterContact: row.reporterContact || undefined,
  status: (row.status as Report['status']) || 'pending',
  createdAt: toIso(row.createdAt),
  resolvedAt: row.resolvedAt ? toIso(row.resolvedAt) : undefined,
});

const mapNotificationRow = (row: typeof notifications.$inferSelect): AppNotification => ({
  id: row.id,
  userId: row.userId || undefined,
  title: row.title,
  message: row.message,
  type: (row.type as AppNotification['type']) || 'system',
  read: row.read,
  createdAt: toIso(row.createdAt),
});

const mapAdminLogRow = (row: typeof adminLogs.$inferSelect): AdminLog => ({
  id: row.id,
  action: row.action,
  targetType: (row.targetType as AdminLog['targetType']) || 'setting',
  targetId: row.targetId,
  performedBy: row.performedBy,
  adminId: row.adminId || undefined,
  timestamp: toIso(row.timestamp),
  details: row.details || undefined,
});

export async function seedInitialDatabase(force = false, adminUid?: string): Promise<void> {
  if (isSupabaseConfigured()) {
    return seedInitialDatabaseSupabase(force, adminUid);
  }
  return dbWrap('seedInitialDatabase', async () => {
    const existingSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 'general'));

    if (!force && existingSettings.length > 0) {
      // Ensure any newly added default cities (e.g. Guitry) exist in Cloud SQL
      for (const city of INITIAL_CITIES) {
        await db
          .insert(cities)
          .values({
            id: city.id,
            name: city.name,
            region: city.region,
            neighborhoods: city.neighborhoods,
            active: city.active,
          })
          .onConflictDoNothing();
      }
      return;
    }

    for (const city of INITIAL_CITIES) {
      const values = {
        id: city.id,
        name: city.name,
        region: city.region,
        neighborhoods: city.neighborhoods,
        active: city.active,
      };
      if (force) {
        await db
          .insert(cities)
          .values(values)
          .onConflictDoUpdate({
            target: cities.id,
            set: values,
          });
      } else {
        await db.insert(cities).values(values).onConflictDoNothing();
      }
    }

    for (const cat of INITIAL_CATEGORIES) {
      const values = {
        id: cat.id,
        name: cat.name,
        iconName: cat.iconName,
        slug: cat.slug,
        description: cat.description,
        active: true,
      };
      if (force) {
        await db
          .insert(categories)
          .values(values)
          .onConflictDoUpdate({
            target: categories.id,
            set: values,
          });
      } else {
        await db.insert(categories).values(values).onConflictDoNothing();
      }
    }

    const settingsValues = {
      id: 'general',
      siteName: INITIAL_SETTINGS.siteName,
      tagline: INITIAL_SETTINGS.tagline,
      symbol: INITIAL_SETTINGS.symbol,
      contactPhone: INITIAL_SETTINGS.contactPhone,
      contactWhatsApp: INITIAL_SETTINGS.contactWhatsApp,
      contactEmail: INITIAL_SETTINGS.contactEmail,
      autoApproveListings: INITIAL_SETTINGS.autoApproveListings,
      deliveryMode: INITIAL_SETTINGS.deliveryMode,
      commissionRate: INITIAL_SETTINGS.commissionRate,
      minListingPrice: INITIAL_SETTINGS.minListingPrice,
      maxPhotosPerListing: INITIAL_SETTINGS.maxPhotosPerListing,
      promoBanners: INITIAL_PROMO_BANNERS,
      updatedAt: new Date(),
    };
    if (force) {
      await db
        .insert(settings)
        .values(settingsValues)
        .onConflictDoUpdate({
          target: settings.id,
          set: settingsValues,
        });
    } else {
      await db.insert(settings).values(settingsValues).onConflictDoNothing();
    }

    for (const usr of INITIAL_USERS) {
      const userValues = {
        id: usr.id,
        uid: usr.id,
        name: usr.name,
        businessName: usr.businessName || null,
        email: usr.email,
        phone: usr.phone,
        whatsapp: usr.whatsapp,
        role: usr.role === 'visitor' ? 'buyer' : usr.role,
        city: usr.city,
        neighborhood: usr.neighborhood,
        avatarUrl: usr.avatarUrl,
        bio: usr.bio || null,
        status: usr.status,
        rating: usr.rating ?? 5.0,
      };
      await db.insert(users).values(userValues).onConflictDoNothing();
    }

    for (const lst of INITIAL_LISTINGS) {
      const listingValues = {
        id: lst.id,
        title: lst.title,
        price: lst.price,
        description: lst.description,
        categoryId: lst.categoryId,
        condition: lst.condition,
        status: lst.status,
        photos: lst.photos,
        sellerId: lst.sellerId,
        sellerName: lst.sellerName,
        sellerBusinessName: lst.sellerBusinessName || null,
        sellerPhone: lst.sellerPhone,
        sellerWhatsApp: lst.sellerWhatsApp,
        sellerAvatar: lst.sellerAvatar || null,
        sellerRating: lst.sellerRating ?? 5.0,
        sellerVerified: lst.sellerVerified ?? true,
        city: lst.city,
        neighborhood: lst.neighborhood,
        addressDetails: lst.addressDetails || null,
        viewsCount: lst.viewsCount,
        callClicksCount: lst.callClicksCount,
        whatsappClicksCount: lst.whatsappClicksCount,
        featured: lst.featured ?? false,
        popular: lst.popular ?? false,
      };
      await db.insert(listings).values(listingValues).onConflictDoNothing();
    }

    for (const trx of INITIAL_TRANSACTIONS) {
      await db
        .insert(transactions)
        .values({
          id: trx.id,
          reference: trx.reference,
          listingId: trx.listingId,
          listingTitle: trx.listingTitle,
          listingPhoto: trx.listingPhoto,
          amount: trx.amount,
          deliveryFee: trx.deliveryFee,
          totalAmount: trx.totalAmount,
          buyerId: 'usr_buyer_demo',
          buyerName: trx.buyerName,
          buyerPhone: trx.buyerPhone,
          buyerWhatsApp: trx.buyerPhone,
          buyerEmail: 'amani.c@gmail.com',
          buyerCity: trx.buyerCity,
          buyerNeighborhood: trx.buyerNeighborhood,
          sellerId: trx.sellerId,
          sellerName: trx.sellerName,
          sellerPhone: trx.sellerPhone,
          sellerCity: trx.sellerCity,
          method: trx.method,
          status: trx.status,
          deliveryOption: trx.deliveryOption,
          paidAt: trx.paidAt ? new Date(trx.paidAt) : new Date(),
        })
        .onConflictDoNothing();
    }

    for (const rep of INITIAL_REPORTS) {
      await db
        .insert(reports)
        .values({
          id: rep.id,
          listingId: rep.listingId,
          listingTitle: rep.listingTitle,
          sellerName: rep.sellerName,
          reporterId: 'usr_buyer_demo',
          reason: rep.reason,
          comment: rep.comment,
          reporterContact: rep.reporterContact || null,
          status: rep.status,
        })
        .onConflictDoNothing();
    }

    await db
      .insert(adminLogs)
      .values({
        id: `log_init_${Date.now()}`,
        action: 'Initialisation PostgreSQL Cloud SQL de DJIBOUA MARKET',
        targetType: 'setting',
        targetId: 'general',
        performedBy: 'Adminlokoda',
        adminId: adminUid || null,
        details: 'Synchronisation initiale des zones Divo, Lakota, Gagnoa, Guitry et du catalogue',
      })
      .onConflictDoNothing();
  });
}

export async function getBootstrapData(uid?: string, isAdmin = false) {
  if (isSupabaseConfigured()) {
    return getBootstrapDataSupabase(uid, isAdmin);
  }
  return dbWrap('getBootstrapData', async () => {
    await seedInitialDatabase(false);

    const [cityRows, categoryRows, settingRows, publicListingRows, sellerRows] =
      await Promise.all([
        db.select().from(cities).where(eq(cities.active, true)),
        db.select().from(categories).where(eq(categories.active, true)),
        db.select().from(settings).where(eq(settings.id, 'general')),
        db
          .select()
          .from(listings)
          .where(eq(listings.status, 'approved'))
          .orderBy(desc(listings.createdAt)),
        db.select().from(users).where(eq(users.role, 'seller')),
      ]);

    const mappedCities = cityRows.map(mapCityRow);
    const mappedCategories = categoryRows.map(mapCategoryRow);
    const mappedSettings =
      settingRows[0] !== undefined
        ? mapSettingsRow(settingRows[0], mappedCities)
        : { ...INITIAL_SETTINGS, cities: mappedCities };

    let currentUser: UserProfile | null = null;
    let myListings: Listing[] = [];
    let myFavorites: string[] = [];
    let myNotifications: AppNotification[] = [];
    let myTransactions: Transaction[] = [];
    let myReports: Report[] = [];

    if (uid) {
      const [
        userRows,
        userListingRows,
        favRows,
        notifRows,
        trxRows,
        reportRows,
      ] = await Promise.all([
        db.select().from(users).where(eq(users.uid, uid)),
        db
          .select()
          .from(listings)
          .where(eq(listings.sellerId, uid))
          .orderBy(desc(listings.createdAt)),
        db.select().from(favorites).where(eq(favorites.userId, uid)),
        db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, uid))
          .orderBy(desc(notifications.createdAt)),
        db
          .select()
          .from(transactions)
          .where(or(eq(transactions.buyerId, uid), eq(transactions.sellerId, uid)))
          .orderBy(desc(transactions.createdAt)),
        db
          .select()
          .from(reports)
          .where(eq(reports.reporterId, uid))
          .orderBy(desc(reports.createdAt)),
      ]);

      currentUser = userRows[0] ? mapUserRow(userRows[0], true) : null;
      myListings = userListingRows.map(mapListingRow);
      myFavorites = favRows.map((f) => f.listingId);
      myNotifications = notifRows.map(mapNotificationRow);
      myTransactions = trxRows.map(mapTransactionRow);
      myReports = reportRows.map(mapReportRow);
    }

    let adminData: {
      allListings: Listing[];
      allUsers: UserProfile[];
      allTransactions: Transaction[];
      allReports: Report[];
      allNotifications: AppNotification[];
      adminLogs: AdminLog[];
    } | null = null;

    if (isAdmin) {
      const [
        allListingRows,
        allUserRows,
        allTrxRows,
        allReportRows,
        allNotifRows,
        logRows,
      ] = await Promise.all([
        db.select().from(listings).orderBy(desc(listings.createdAt)),
        db.select().from(users).orderBy(desc(users.registeredAt)),
        db.select().from(transactions).orderBy(desc(transactions.createdAt)),
        db.select().from(reports).orderBy(desc(reports.createdAt)),
        db.select().from(notifications).orderBy(desc(notifications.createdAt)),
        db.select().from(adminLogs).orderBy(desc(adminLogs.timestamp)),
      ]);

      adminData = {
        allListings: allListingRows.map(mapListingRow),
        allUsers: allUserRows.map((u) => mapUserRow(u, true)),
        allTransactions: allTrxRows.map(mapTransactionRow),
        allReports: allReportRows.map(mapReportRow),
        allNotifications: allNotifRows.map(mapNotificationRow),
        adminLogs: logRows.map(mapAdminLogRow),
      };
    }

    return {
      isDbSeeded: settingRows.length > 0,
      cities: mappedCities,
      categories: mappedCategories,
      settings: mappedSettings,
      publicListings: publicListingRows.map(mapListingRow),
      publicSellers: sellerRows.map((u) => mapUserRow(u, false)),
      currentUser,
      myListings,
      myFavorites,
      myNotifications,
      myTransactions,
      myReports,
      adminData,
    };
  });
}

export async function getUserByUid(uid: string): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    return getUserByUidSupabase(uid);
  }
  return dbWrap('getUserByUid', async () => {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] ? mapUserRow(rows[0], true) : null;
  });
}

export async function ensureUserRecord(
  uid: string,
  email: string,
  fallbackName = 'Membre DJIBOUA MARKET'
): Promise<void> {
  if (isSupabaseConfigured()) {
    return ensureUserRecordSupabase(uid, email, fallbackName);
  }
  return dbWrap('ensureUserRecord', async () => {
    await db
      .insert(users)
      .values({
        id: uid,
        uid,
        name: fallbackName,
        email,
        phone: '',
        whatsapp: '',
        role: 'buyer',
        city: 'Divo',
        neighborhood: 'Plateau',
        avatarUrl: '',
        status: 'active',
        rating: 5.0,
      })
      .onConflictDoNothing();
  });
}

export async function upsertRegisteredUser(input: {
  uid: string;
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  whatsapp: string;
  role: 'buyer' | 'seller';
  city: string;
  neighborhood: string;
  avatarUrl: string;
}): Promise<UserProfile> {
  if (isSupabaseConfigured()) {
    return upsertRegisteredUserSupabase(input);
  }
  return dbWrap('upsertRegisteredUser', async () => {
    const result = await db
      .insert(users)
      .values({
        id: input.uid,
        uid: input.uid,
        name: input.name,
        businessName: input.businessName || null,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp,
        role: input.role,
        city: input.city,
        neighborhood: input.neighborhood,
        avatarUrl: input.avatarUrl,
        status: 'active',
        rating: 5.0,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          name: input.name,
          businessName: input.businessName || null,
          email: input.email,
          phone: input.phone,
          whatsapp: input.whatsapp,
          role: input.role,
          city: input.city,
          neighborhood: input.neighborhood,
          avatarUrl: input.avatarUrl,
        },
      })
      .returning();

    return mapUserRow(result[0], true);
  });
}

export async function updateUserProfileRecord(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    return updateUserProfileRecordSupabase(userId, updates);
  }
  return dbWrap('updateUserProfileRecord', async () => {
    const setValues: Record<string, unknown> = {};
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.businessName !== undefined) setValues.businessName = updates.businessName || null;
    if (updates.city !== undefined) setValues.city = updates.city;
    if (updates.neighborhood !== undefined) setValues.neighborhood = updates.neighborhood;
    if (updates.avatarUrl !== undefined) setValues.avatarUrl = updates.avatarUrl;
    if (updates.bio !== undefined) setValues.bio = updates.bio || null;
    if (updates.phone !== undefined) setValues.phone = updates.phone;
    if (updates.whatsapp !== undefined) setValues.whatsapp = updates.whatsapp;
    if (updates.email !== undefined) setValues.email = updates.email;

    if (Object.keys(setValues).length === 0) {
      return getUserByUid(userId);
    }

    const updated = await db
      .update(users)
      .set(setValues)
      .where(eq(users.id, userId))
      .returning();

    if (updates.avatarUrl !== undefined) {
      await db
        .update(listings)
        .set({ sellerAvatar: updates.avatarUrl, updatedAt: new Date() })
        .where(eq(listings.sellerId, userId));
    }

    return updated[0] ? mapUserRow(updated[0], true) : null;
  });
}

export async function updateUserStatusRecord(
  userId: string,
  status: UserProfile['status']
): Promise<void> {
  if (isSupabaseConfigured()) {
    return updateUserStatusRecordSupabase(userId, status);
  }
  return dbWrap('updateUserStatusRecord', async () => {
    await db.update(users).set({ status }).where(eq(users.id, userId));
  });
}

export async function getListingById(id: string): Promise<Listing | null> {
  if (isSupabaseConfigured()) {
    return getListingByIdSupabase(id);
  }
  return dbWrap('getListingById', async () => {
    const rows = await db.select().from(listings).where(eq(listings.id, id));
    return rows[0] ? mapListingRow(rows[0]) : null;
  });
}

export async function createListingRecord(
  input: typeof listings.$inferInsert
): Promise<Listing> {
  if (isSupabaseConfigured()) {
    return createListingRecordSupabase(input);
  }
  return dbWrap('createListingRecord', async () => {
    const inserted = await db.insert(listings).values(input).returning();
    return mapListingRow(inserted[0]);
  });
}

export async function updateListingRecord(
  id: string,
  updates: Partial<typeof listings.$inferInsert>
): Promise<Listing | null> {
  if (isSupabaseConfigured()) {
    return updateListingRecordSupabase(id, updates);
  }
  return dbWrap('updateListingRecord', async () => {
    const updated = await db
      .update(listings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    return updated[0] ? mapListingRow(updated[0]) : null;
  });
}

export async function deleteListingRecord(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    return deleteListingRecordSupabase(id);
  }
  return dbWrap('deleteListingRecord', async () => {
    await db.delete(favorites).where(eq(favorites.listingId, id));
    await db.delete(reports).where(eq(reports.listingId, id));
    await db.delete(transactions).where(eq(transactions.listingId, id));
    await db.delete(listings).where(eq(listings.id, id));
  });
}

export async function incrementListingMetric(
  id: string,
  metric: 'view' | 'call' | 'whatsapp'
): Promise<void> {
  if (isSupabaseConfigured()) {
    return incrementListingMetricSupabase(id, metric);
  }
  return dbWrap('incrementListingMetric', async () => {
    const rows = await db.select().from(listings).where(eq(listings.id, id));
    const current = rows[0];
    if (!current || current.status !== 'approved') return;
    if (metric === 'view') {
      await db
        .update(listings)
        .set({ viewsCount: current.viewsCount + 1 })
        .where(eq(listings.id, id));
    } else if (metric === 'call') {
      await db
        .update(listings)
        .set({ callClicksCount: current.callClicksCount + 1 })
        .where(eq(listings.id, id));
    } else {
      await db
        .update(listings)
        .set({ whatsappClicksCount: current.whatsappClicksCount + 1 })
        .where(eq(listings.id, id));
    }
  });
}

export async function toggleFavoriteRecord(
  userId: string,
  listingId: string
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    return toggleFavoriteRecordSupabase(userId, listingId);
  }
  return dbWrap('toggleFavoriteRecord', async () => {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));

    if (existing.length > 0) {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.listingId, listingId)));
      return false;
    }

    await db
      .insert(favorites)
      .values({
        id: `${userId}_${listingId}`,
        userId,
        listingId,
      })
      .onConflictDoNothing();
    return true;
  });
}

export async function createTransactionRecord(
  input: typeof transactions.$inferInsert
): Promise<Transaction> {
  if (isSupabaseConfigured()) {
    return createTransactionRecordSupabase(input);
  }
  return dbWrap('createTransactionRecord', async () => {
    const inserted = await db.insert(transactions).values(input).returning();
    return mapTransactionRow(inserted[0]);
  });
}

export async function updateTransactionStatusRecord(
  id: string,
  status: Transaction['status']
): Promise<void> {
  if (isSupabaseConfigured()) {
    return updateTransactionStatusRecordSupabase(id, status);
  }
  return dbWrap('updateTransactionStatusRecord', async () => {
    await db
      .update(transactions)
      .set(status === 'paid' ? { status, paidAt: new Date() } : { status })
      .where(eq(transactions.id, id));
  });
}

export async function createReportRecord(
  input: typeof reports.$inferInsert
): Promise<Report> {
  if (isSupabaseConfigured()) {
    return createReportRecordSupabase(input);
  }
  return dbWrap('createReportRecord', async () => {
    const inserted = await db.insert(reports).values(input).returning();
    return mapReportRow(inserted[0]);
  });
}

export async function updateReportStatusRecord(
  id: string,
  status: Report['status']
): Promise<void> {
  if (isSupabaseConfigured()) {
    return updateReportStatusRecordSupabase(id, status);
  }
  return dbWrap('updateReportStatusRecord', async () => {
    await db
      .update(reports)
      .set({ status, resolvedAt: new Date() })
      .where(eq(reports.id, id));
  });
}

export async function createNotificationRecord(
  input: typeof notifications.$inferInsert
): Promise<AppNotification> {
  if (isSupabaseConfigured()) {
    return createNotificationRecordSupabase(input);
  }
  return dbWrap('createNotificationRecord', async () => {
    const inserted = await db.insert(notifications).values(input).returning();
    return mapNotificationRow(inserted[0]);
  });
}

export async function markNotificationReadRecord(
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  if (isSupabaseConfigured()) {
    return markNotificationReadRecordSupabase(id, userId, isAdmin);
  }
  return dbWrap('markNotificationReadRecord', async () => {
    if (isAdmin) {
      await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
    } else {
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    }
  });
}

export async function clearNotificationsRecord(userId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    return clearNotificationsRecordSupabase(userId);
  }
  return dbWrap('clearNotificationsRecord', async () => {
    await db.delete(notifications).where(eq(notifications.userId, userId));
  });
}

export async function updateSettingsRecord(
  newSettings: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  if (isSupabaseConfigured()) {
    return updateSettingsRecordSupabase(newSettings);
  }
  return dbWrap('updateSettingsRecord', async () => {
    const currentRows = await db.select().from(settings).where(eq(settings.id, 'general'));
    const cityRows = await db.select().from(cities).where(eq(cities.active, true));
    const current = currentRows[0];

    const payload = {
      id: 'general',
      siteName: newSettings.siteName ?? current?.siteName ?? INITIAL_SETTINGS.siteName,
      tagline: newSettings.tagline ?? current?.tagline ?? INITIAL_SETTINGS.tagline,
      symbol: newSettings.symbol ?? current?.symbol ?? INITIAL_SETTINGS.symbol,
      contactPhone:
        newSettings.contactPhone ?? current?.contactPhone ?? INITIAL_SETTINGS.contactPhone,
      contactWhatsApp:
        newSettings.contactWhatsApp ??
        current?.contactWhatsApp ??
        INITIAL_SETTINGS.contactWhatsApp,
      contactEmail:
        newSettings.contactEmail ?? current?.contactEmail ?? INITIAL_SETTINGS.contactEmail,
      autoApproveListings:
        newSettings.autoApproveListings ??
        current?.autoApproveListings ??
        INITIAL_SETTINGS.autoApproveListings,
      deliveryMode:
        newSettings.deliveryMode ?? current?.deliveryMode ?? INITIAL_SETTINGS.deliveryMode,
      commissionRate:
        newSettings.commissionRate ?? current?.commissionRate ?? INITIAL_SETTINGS.commissionRate,
      minListingPrice:
        newSettings.minListingPrice ??
        current?.minListingPrice ??
        INITIAL_SETTINGS.minListingPrice,
      maxPhotosPerListing:
        newSettings.maxPhotosPerListing ??
        current?.maxPhotosPerListing ??
        INITIAL_SETTINGS.maxPhotosPerListing,
      promoBanners:
        newSettings.promoBanners !== undefined
          ? newSettings.promoBanners
          : (current?.promoBanners ?? INITIAL_PROMO_BANNERS),
      updatedAt: new Date(),
    };

    const saved = await db
      .insert(settings)
      .values(payload)
      .onConflictDoUpdate({
        target: settings.id,
        set: payload,
      })
      .returning();

    return mapSettingsRow(saved[0], cityRows.map(mapCityRow));
  });
}

export async function upsertCityRecord(city: City): Promise<City> {
  if (isSupabaseConfigured()) {
    return upsertCityRecordSupabase(city);
  }
  return dbWrap('upsertCityRecord', async () => {
    const payload = {
      id: city.id,
      name: city.name,
      region: city.region,
      neighborhoods: city.neighborhoods,
      active: city.active,
    };
    const saved = await db
      .insert(cities)
      .values(payload)
      .onConflictDoUpdate({
        target: cities.id,
        set: payload,
      })
      .returning();
    return mapCityRow(saved[0]);
  });
}

export async function addNeighborhoodRecord(
  cityIdOrName: string,
  neighborhood: string
): Promise<City | null> {
  if (isSupabaseConfigured()) {
    return addNeighborhoodRecordSupabase(cityIdOrName, neighborhood);
  }
  return dbWrap('addNeighborhoodRecord', async () => {
    const all = await db.select().from(cities);
    const target = all.find(
      (c) => c.id === cityIdOrName || c.name.toLowerCase() === cityIdOrName.toLowerCase()
    );
    if (!target) return null;
    const currentList = Array.isArray(target.neighborhoods) ? target.neighborhoods : [];
    if (currentList.includes(neighborhood)) return mapCityRow(target);

    const updatedList = [...currentList, neighborhood].slice(0, 100);
    const updated = await db
      .update(cities)
      .set({ neighborhoods: updatedList })
      .where(eq(cities.id, target.id))
      .returning();
    return updated[0] ? mapCityRow(updated[0]) : null;
  });
}

export async function createAdminLogRecord(input: {
  action: string;
  targetType: AdminLog['targetType'];
  targetId: string;
  adminId?: string;
  details?: string;
}): Promise<AdminLog> {
  if (isSupabaseConfigured()) {
    return createAdminLogRecordSupabase(input);
  }
  return dbWrap('createAdminLogRecord', async () => {
    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const inserted = await db
      .insert(adminLogs)
      .values({
        id: logId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        performedBy: 'Adminlokoda',
        adminId: input.adminId || null,
        details: input.details || null,
      })
      .returning();
    return mapAdminLogRow(inserted[0]);
  });
}
