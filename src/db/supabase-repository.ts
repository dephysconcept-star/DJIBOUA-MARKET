import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashPassword, verifyPassword } from '../lib/session-token.ts';
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
import type { listings, notifications, reports, transactions } from './schema.ts';
import type {
  AdminLog,
  AppNotification,
  Category,
  City,
  Listing,
  PlatformSettings,
  PromoBannerSlide,
  Report,
  Transaction,
  UserProfile,
  UserRole,
} from '../types/index.ts';

let _supabaseAdmin: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  return Boolean(
    url &&
      url.startsWith('https://') &&
      !url.includes('YOUR_PROJECT_REF') &&
      key &&
      !key.includes('YOUR_SUPABASE')
  );
};

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = (
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    )?.trim();
    if (!url || !key) {
      throw new Error('Supabase configuration missing on server.');
    }
    _supabaseAdmin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _supabaseAdmin;
}

const sbWrap = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('existe déjà') ||
        error.message.includes('Identifiant ou mot de passe') ||
        error.message.includes('suspendu'))
    ) {
      throw error;
    }
    console.error(`Supabase query failed (${label}):`, error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
};

const toIso = (d: unknown): string => {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  return String(d);
};

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

const mapCityRow = (row: Record<string, unknown>): City => ({
  id: String(row.id),
  name: String(row.name),
  region: String(row.region),
  neighborhoods: Array.isArray(row.neighborhoods) ? row.neighborhoods.map(String) : [],
  active: Boolean(row.active),
});

const mapCategoryRow = (row: Record<string, unknown>): Category => ({
  id: String(row.id),
  name: String(row.name),
  iconName: String(row.icon_name),
  slug: String(row.slug),
  description: String(row.description),
  active: Boolean(row.active),
});

const mapSettingsRow = (
  row: Record<string, unknown>,
  cityList: City[]
): PlatformSettings => ({
  siteName: String(row.site_name),
  tagline: String(row.tagline),
  symbol: String(row.symbol),
  contactPhone: String(row.contact_phone),
  contactWhatsApp: String(row.contact_whatsapp),
  contactEmail: String(row.contact_email),
  cities: cityList,
  autoApproveListings: Boolean(row.auto_approve_listings),
  deliveryMode: (row.delivery_mode as PlatformSettings['deliveryMode']) || 'both',
  commissionRate: Number(row.commission_rate ?? 2.5),
  minListingPrice: Number(row.min_listing_price ?? 500),
  maxPhotosPerListing: Number(row.max_photos_per_listing ?? 5),
  promoBanners: Array.isArray(row.promo_banners)
    ? (row.promo_banners as PromoBannerSlide[])
    : INITIAL_PROMO_BANNERS,
  updatedAt: toIso(row.updated_at),
});

const mapUserRow = (row: Record<string, unknown>, includePii: boolean): UserProfile => ({
  id: String(row.id),
  name: String(row.name),
  businessName: row.business_name ? String(row.business_name) : undefined,
  email: includePii ? String(row.email || '') : '',
  phone: includePii ? String(row.phone || '') : '',
  whatsapp: includePii ? String(row.whatsapp || '') : '',
  role: (row.role as UserRole) || 'buyer',
  city: String(row.city || 'Divo'),
  neighborhood: String(row.neighborhood || 'Plateau'),
  avatarUrl: String(row.avatar_url || ''),
  bio: row.bio ? String(row.bio) : undefined,
  registeredAt: toIso(row.registered_at),
  status: (row.status as UserProfile['status']) || 'active',
  rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : 5.0,
});

type ListingMetaEntry = {
  isPriority?: boolean;
  durationDays?: number | null;
  expiresAt?: string | null;
  paymentReceiptUrl?: string | null;
  paymentReceiptName?: string | null;
  paymentReceiptSentAt?: string | null;
};

type ListingMetaVault = Record<string, ListingMetaEntry>;

const LISTING_META_VAULT_ID = 'listing_meta_vault';

const isMissingListingMetaColumnError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; details?: string };
  const text = `${e.code || ''} ${e.message || ''} ${e.details || ''}`.toLowerCase();
  return (
    text.includes('is_priority') ||
    text.includes('duration_days') ||
    text.includes('expires_at') ||
    text.includes('payment_receipt') ||
    text.includes('pgrst204') ||
    text.includes('42703')
  );
};

async function readListingMetaVaultSupabase(sb: SupabaseClient): Promise<ListingMetaVault> {
  const { data } = await sb
    .from('settings')
    .select('tagline')
    .eq('id', LISTING_META_VAULT_ID)
    .maybeSingle();
  if (!data?.tagline) return {};
  try {
    const parsed = JSON.parse(String(data.tagline));
    return parsed && typeof parsed === 'object' ? (parsed as ListingMetaVault) : {};
  } catch {
    return {};
  }
}

async function writeListingMetaVaultSupabase(
  sb: SupabaseClient,
  vault: ListingMetaVault
): Promise<void> {
  const { error } = await sb.from('settings').upsert(
    {
      id: LISTING_META_VAULT_ID,
      site_name: 'LISTING_META_VAULT',
      tagline: JSON.stringify(vault),
      symbol: 'FCFA',
      contact_phone: '+225',
      contact_whatsapp: '+225',
      contact_email: 'meta@djibouamarket.ci',
      auto_approve_listings: false,
      delivery_mode: 'both',
      commission_rate: 2.5,
      min_listing_price: 500,
      max_photos_per_listing: 5,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  assertNoError(error, 'writeListingMetaVault');
}

const mapListingRow = (row: Record<string, unknown>, meta?: ListingMetaEntry): Listing => ({
  id: String(row.id),
  title: String(row.title),
  price: Number(row.price || 0),
  description: String(row.description || ''),
  categoryId: String(row.category_id),
  condition: (row.condition as Listing['condition']) || 'neuf',
  status: (row.status as Listing['status']) || 'pending',
  rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
  photos: Array.isArray(row.photos) ? row.photos.map(String) : [],
  sellerId: String(row.seller_id),
  sellerName: String(row.seller_name),
  sellerBusinessName: row.seller_business_name ? String(row.seller_business_name) : undefined,
  sellerPhone: String(row.seller_phone || ''),
  sellerWhatsApp: String(row.seller_whatsapp || ''),
  sellerAvatar: row.seller_avatar ? String(row.seller_avatar) : undefined,
  sellerRating:
    row.seller_rating !== null && row.seller_rating !== undefined
      ? Number(row.seller_rating)
      : undefined,
  sellerVerified:
    row.seller_verified !== null && row.seller_verified !== undefined
      ? Boolean(row.seller_verified)
      : undefined,
  city: String(row.city),
  neighborhood: String(row.neighborhood),
  addressDetails: row.address_details ? String(row.address_details) : undefined,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
  viewsCount: Number(row.views_count || 0),
  callClicksCount: Number(row.call_clicks_count || 0),
  whatsappClicksCount: Number(row.whatsapp_clicks_count || 0),
  featured: row.featured !== null && row.featured !== undefined ? Boolean(row.featured) : undefined,
  popular: row.popular !== null && row.popular !== undefined ? Boolean(row.popular) : undefined,
  isPriority:
    meta?.isPriority !== undefined
      ? Boolean(meta.isPriority)
      : row.is_priority !== null && row.is_priority !== undefined
        ? Boolean(row.is_priority)
        : false,
  durationDays:
    meta?.durationDays !== undefined
      ? meta.durationDays
      : row.duration_days !== null && row.duration_days !== undefined
        ? Number(row.duration_days)
        : null,
  expiresAt:
    meta?.expiresAt !== undefined
      ? meta.expiresAt
      : row.expires_at
        ? toIso(row.expires_at)
        : null,
  paymentReceiptUrl:
    meta?.paymentReceiptUrl !== undefined
      ? meta.paymentReceiptUrl
      : row.payment_receipt_url
        ? String(row.payment_receipt_url)
        : null,
  paymentReceiptName:
    meta?.paymentReceiptName !== undefined
      ? meta.paymentReceiptName
      : row.payment_receipt_name
        ? String(row.payment_receipt_name)
        : null,
  paymentReceiptSentAt:
    meta?.paymentReceiptSentAt !== undefined
      ? meta.paymentReceiptSentAt
      : row.payment_receipt_sent_at
        ? toIso(row.payment_receipt_sent_at)
        : null,
});

const mapTransactionRow = (row: Record<string, unknown>): Transaction => ({
  id: String(row.id),
  reference: String(row.reference),
  listingId: String(row.listing_id),
  listingTitle: String(row.listing_title),
  listingPhoto: String(row.listing_photo || ''),
  amount: Number(row.amount || 0),
  deliveryFee: Number(row.delivery_fee || 0),
  totalAmount: Number(row.total_amount || 0),
  buyerId: row.buyer_id ? String(row.buyer_id) : undefined,
  buyerName: String(row.buyer_name),
  buyerPhone: String(row.buyer_phone),
  buyerWhatsApp: row.buyer_whatsapp ? String(row.buyer_whatsapp) : undefined,
  buyerEmail: row.buyer_email ? String(row.buyer_email) : undefined,
  buyerCity: String(row.buyer_city),
  buyerNeighborhood: String(row.buyer_neighborhood),
  sellerId: String(row.seller_id),
  sellerName: String(row.seller_name),
  sellerPhone: String(row.seller_phone),
  sellerCity: String(row.seller_city),
  method: (row.method as Transaction['method']) || 'wave',
  status: (row.status as Transaction['status']) || 'paid',
  deliveryOption: (row.delivery_option as Transaction['deliveryOption']) || 'direct',
  createdAt: toIso(row.created_at),
  paidAt: row.paid_at ? toIso(row.paid_at) : undefined,
});

const mapReportRow = (row: Record<string, unknown>): Report => ({
  id: String(row.id),
  listingId: String(row.listing_id),
  listingTitle: String(row.listing_title),
  sellerName: String(row.seller_name),
  reporterId: row.reporter_id ? String(row.reporter_id) : undefined,
  reason: (row.reason as Report['reason']) || 'arnaque',
  comment: String(row.comment),
  reporterContact: row.reporter_contact ? String(row.reporter_contact) : undefined,
  status: (row.status as Report['status']) || 'pending',
  createdAt: toIso(row.created_at),
  resolvedAt: row.resolved_at ? toIso(row.resolved_at) : undefined,
});

const mapNotificationRow = (row: Record<string, unknown>): AppNotification => ({
  id: String(row.id),
  userId: row.user_id ? String(row.user_id) : undefined,
  title: String(row.title),
  message: String(row.message),
  type: (row.type as AppNotification['type']) || 'system',
  read: Boolean(row.read),
  createdAt: toIso(row.created_at),
});

const mapAdminLogRow = (row: Record<string, unknown>): AdminLog => ({
  id: String(row.id),
  action: String(row.action),
  targetType: (row.target_type as AdminLog['targetType']) || 'setting',
  targetId: String(row.target_id),
  performedBy: String(row.performed_by),
  adminId: row.admin_id ? String(row.admin_id) : undefined,
  timestamp: toIso(row.timestamp),
  details: row.details ? String(row.details) : undefined,
});

export async function seedInitialDatabaseSupabase(
  force = false,
  adminUid?: string
): Promise<void> {
  return sbWrap('seedInitialDatabaseSupabase', async () => {
    const sb = getSupabaseAdmin();

    const { data: existingSettings, error: settingsErr } = await sb
      .from('settings')
      .select('id')
      .eq('id', 'general');
    assertNoError(settingsErr, 'settings check');

    const { data: existingListings, error: listingsCheckErr } = await sb
      .from('listings')
      .select('id')
      .limit(1);
    assertNoError(listingsCheckErr, 'listings check');

    if (!force && existingSettings && existingSettings.length > 0 && existingListings && existingListings.length > 0) {
      const cityRows = INITIAL_CITIES.map((c) => ({
        id: c.id,
        name: c.name,
        region: c.region,
        neighborhoods: c.neighborhoods,
        active: c.active,
      }));
      const { error } = await sb
        .from('cities')
        .upsert(cityRows, { onConflict: 'id', ignoreDuplicates: true });
      assertNoError(error, 'cities ensure');
      return;
    }

    const cityRows = INITIAL_CITIES.map((c) => ({
      id: c.id,
      name: c.name,
      region: c.region,
      neighborhoods: c.neighborhoods,
      active: c.active,
    }));
    const { error: cityUpErr } = await sb
      .from('cities')
      .upsert(cityRows, { onConflict: 'id', ignoreDuplicates: !force });
    assertNoError(cityUpErr, 'cities seed');

    const catRows = INITIAL_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      icon_name: c.iconName,
      slug: c.slug,
      description: c.description,
      active: true,
    }));
    const { error: catUpErr } = await sb
      .from('categories')
      .upsert(catRows, { onConflict: 'id', ignoreDuplicates: !force });
    assertNoError(catUpErr, 'categories seed');

    const { error: setUpErr } = await sb.from('settings').upsert(
      {
        id: 'general',
        site_name: INITIAL_SETTINGS.siteName,
        tagline: INITIAL_SETTINGS.tagline,
        symbol: INITIAL_SETTINGS.symbol,
        contact_phone: INITIAL_SETTINGS.contactPhone,
        contact_whatsapp: INITIAL_SETTINGS.contactWhatsApp,
        contact_email: INITIAL_SETTINGS.contactEmail,
        auto_approve_listings: INITIAL_SETTINGS.autoApproveListings,
        delivery_mode: INITIAL_SETTINGS.deliveryMode,
        commission_rate: INITIAL_SETTINGS.commissionRate,
        min_listing_price: INITIAL_SETTINGS.minListingPrice,
        max_photos_per_listing: INITIAL_SETTINGS.maxPhotosPerListing,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: !force }
    );
    assertNoError(setUpErr, 'settings seed');

    const userRows = INITIAL_USERS.map((u) => ({
      id: u.id,
      uid: u.id,
      name: u.name,
      business_name: u.businessName || null,
      email: u.email,
      phone: u.phone,
      whatsapp: u.whatsapp,
      role: u.role === 'visitor' ? 'buyer' : u.role,
      city: u.city,
      neighborhood: u.neighborhood,
      avatar_url: u.avatarUrl,
      bio: u.bio || null,
      status: u.status,
      rating: u.rating ?? 5.0,
    }));
    const { error: usrErr } = await sb
      .from('users')
      .upsert(userRows, { onConflict: 'id', ignoreDuplicates: true });
    assertNoError(usrErr, 'users seed');

    const listingRows = INITIAL_LISTINGS.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      description: l.description,
      category_id: l.categoryId,
      condition: l.condition,
      status: l.status,
      photos: l.photos,
      seller_id: l.sellerId,
      seller_name: l.sellerName,
      seller_business_name: l.sellerBusinessName || null,
      seller_phone: l.sellerPhone,
      seller_whatsapp: l.sellerWhatsApp,
      seller_avatar: l.sellerAvatar || null,
      seller_rating: l.sellerRating ?? 5.0,
      seller_verified: l.sellerVerified ?? true,
      city: l.city,
      neighborhood: l.neighborhood,
      address_details: l.addressDetails || null,
      views_count: l.viewsCount,
      call_clicks_count: l.callClicksCount,
      whatsapp_clicks_count: l.whatsappClicksCount,
      featured: l.featured ?? false,
      popular: l.popular ?? false,
    }));
    const { error: lstErr } = await sb
      .from('listings')
      .upsert(listingRows, { onConflict: 'id', ignoreDuplicates: true });
    assertNoError(lstErr, 'listings seed');

    const trxRows = INITIAL_TRANSACTIONS.map((t) => ({
      id: t.id,
      reference: t.reference,
      listing_id: t.listingId,
      listing_title: t.listingTitle,
      listing_photo: t.listingPhoto,
      amount: t.amount,
      delivery_fee: t.deliveryFee,
      total_amount: t.totalAmount,
      buyer_id: 'usr_buyer_demo',
      buyer_name: t.buyerName,
      buyer_phone: t.buyerPhone,
      buyer_whatsapp: t.buyerPhone,
      buyer_email: 'amani.c@gmail.com',
      buyer_city: t.buyerCity,
      buyer_neighborhood: t.buyerNeighborhood,
      seller_id: t.sellerId,
      seller_name: t.sellerName,
      seller_phone: t.sellerPhone,
      seller_city: t.sellerCity,
      method: t.method,
      status: t.status,
      delivery_option: t.deliveryOption,
      paid_at: t.paidAt ? new Date(t.paidAt).toISOString() : new Date().toISOString(),
    }));
    const { error: trxErr } = await sb
      .from('transactions')
      .upsert(trxRows, { onConflict: 'id', ignoreDuplicates: true });
    assertNoError(trxErr, 'transactions seed');

    const repRows = INITIAL_REPORTS.map((r) => ({
      id: r.id,
      listing_id: r.listingId,
      listing_title: r.listingTitle,
      seller_name: r.sellerName,
      reporter_id: 'usr_buyer_demo',
      reason: r.reason,
      comment: r.comment,
      reporter_contact: r.reporterContact || null,
      status: r.status,
    }));
    const { error: repErr } = await sb
      .from('reports')
      .upsert(repRows, { onConflict: 'id', ignoreDuplicates: true });
    assertNoError(repErr, 'reports seed');

    await sb.from('admin_logs').insert({
      id: `log_init_${Date.now()}`,
      action: 'Initialisation Supabase de DJIBOUA MARKET',
      target_type: 'setting',
      target_id: 'general',
      performed_by: 'Adminlokoda',
      admin_id: adminUid || null,
      details: 'Synchronisation initiale des zones Divo, Lakota, Gagnoa, Guitry et du catalogue',
    });
  });
}

export async function getBootstrapDataSupabase(uid?: string, isAdmin = false) {
  return sbWrap('getBootstrapDataSupabase', async () => {
    await seedInitialDatabaseSupabase(false);
    const sb = getSupabaseAdmin();

    const [cityRes, catRes, setRes, pubListRes, sellerRes, metaVault] = await Promise.all([
      sb.from('cities').select('*').eq('active', true),
      sb.from('categories').select('*').eq('active', true),
      sb.from('settings').select('*').eq('id', 'general'),
      sb
        .from('listings')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
      sb.from('users').select('*').eq('role', 'seller'),
      readListingMetaVaultSupabase(sb),
    ]);

    assertNoError(cityRes.error, 'cities fetch');
    assertNoError(catRes.error, 'categories fetch');
    assertNoError(setRes.error, 'settings fetch');
    assertNoError(pubListRes.error, 'public listings fetch');
    assertNoError(sellerRes.error, 'sellers fetch');

    const mappedCities = (cityRes.data || []).map(mapCityRow);
    const mappedCategories = (catRes.data || []).map(mapCategoryRow);
    const mappedSettings =
      setRes.data && setRes.data[0]
        ? mapSettingsRow(setRes.data[0], mappedCities)
        : { ...INITIAL_SETTINGS, cities: mappedCities };

    let currentUser: UserProfile | null = null;
    let myListings: Listing[] = [];
    let myFavorites: string[] = [];
    let myNotifications: AppNotification[] = [];
    let myTransactions: Transaction[] = [];
    let myReports: Report[] = [];

    if (uid) {
      const [usrRes, myLstRes, favRes, notifRes, trxRes, repRes] = await Promise.all([
        sb.from('users').select('*').eq('uid', uid),
        sb
          .from('listings')
          .select('*')
          .eq('seller_id', uid)
          .order('created_at', { ascending: false }),
        sb.from('favorites').select('listing_id').eq('user_id', uid),
        sb
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        sb
          .from('transactions')
          .select('*')
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          .order('created_at', { ascending: false }),
        sb
          .from('reports')
          .select('*')
          .eq('reporter_id', uid)
          .order('created_at', { ascending: false }),
      ]);

      currentUser = usrRes.data?.[0] ? mapUserRow(usrRes.data[0], true) : null;
      myListings = (myLstRes.data || []).map((row) => mapListingRow(row, metaVault[String(row.id)]));
      myFavorites = (favRes.data || []).map((f) => String(f.listing_id));
      myNotifications = (notifRes.data || []).map(mapNotificationRow);
      myTransactions = (trxRes.data || []).map(mapTransactionRow);
      myReports = (repRes.data || []).map(mapReportRow);
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
      const [allLstRes, allUsrRes, allTrxRes, allRepRes, allNotifRes, logsRes] =
        await Promise.all([
          sb.from('listings').select('*').order('created_at', { ascending: false }),
          sb.from('users').select('*').order('registered_at', { ascending: false }),
          sb.from('transactions').select('*').order('created_at', { ascending: false }),
          sb.from('reports').select('*').order('created_at', { ascending: false }),
          sb.from('notifications').select('*').order('created_at', { ascending: false }),
          sb.from('admin_logs').select('*').order('timestamp', { ascending: false }),
        ]);

      adminData = {
        allListings: (allLstRes.data || []).map((row) => mapListingRow(row, metaVault[String(row.id)])),
        allUsers: (allUsrRes.data || []).map((u) => mapUserRow(u, true)),
        allTransactions: (allTrxRes.data || []).map(mapTransactionRow),
        allReports: (allRepRes.data || []).map(mapReportRow),
        allNotifications: (allNotifRes.data || []).map(mapNotificationRow),
        adminLogs: (logsRes.data || []).map(mapAdminLogRow),
      };
    }

    const nowMs = Date.now();
    const activePublicListings = (pubListRes.data || [])
      .map((row) => mapListingRow(row, metaVault[String(row.id)]))
      .filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > nowMs)
      .sort((a, b) => {
        const pDiff = Number(Boolean(b.isPriority)) - Number(Boolean(a.isPriority));
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return {
      isDbSeeded: Boolean(setRes.data && setRes.data.length > 0),
      cities: mappedCities,
      categories: mappedCategories,
      settings: mappedSettings,
      publicListings: activePublicListings,
      publicSellers: (sellerRes.data || []).map((u) => mapUserRow(u, false)),
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

export async function getUserByUidSupabase(uid: string): Promise<UserProfile | null> {
  return sbWrap('getUserByUidSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.from('users').select('*').eq('uid', uid).limit(1);
    assertNoError(error, 'getUserByUid');
    return data?.[0] ? mapUserRow(data[0], true) : null;
  });
}

export async function ensureUserRecordSupabase(
  uid: string,
  email: string,
  fallbackName = 'Membre DJIBOUA MARKET'
): Promise<void> {
  return sbWrap('ensureUserRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from('users').upsert(
      {
        id: uid,
        uid,
        name: fallbackName,
        email,
        phone: '',
        whatsapp: '',
        role: 'buyer',
        city: 'Divo',
        neighborhood: 'Plateau',
        avatar_url: '',
        status: 'active',
        rating: 5.0,
      },
      { onConflict: 'uid', ignoreDuplicates: true }
    );
    assertNoError(error, 'ensureUserRecord');
  });
}

export async function upsertRegisteredUserSupabase(input: {
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
  return sbWrap('upsertRegisteredUserSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('users')
      .upsert(
        {
          id: input.uid,
          uid: input.uid,
          name: input.name,
          business_name: input.businessName || null,
          email: input.email,
          phone: input.phone,
          whatsapp: input.whatsapp,
          role: input.role,
          city: input.city,
          neighborhood: input.neighborhood,
          avatar_url: input.avatarUrl,
          status: 'active',
          rating: 5.0,
        },
        { onConflict: 'uid' }
      )
      .select()
      .single();
    assertNoError(error, 'upsertRegisteredUser');
    return mapUserRow(data, true);
  });
}

const configuredAdminPassword = process.env.ADMIN_PORTAL_PASSWORD;

const normalizeDigits = (val: string): string => val.replace(/\D/g, '');

const phonesMatch = (a: string, b: string): boolean => {
  const da = normalizeDigits(a);
  const dbDigits = normalizeDigits(b);
  if (da.length < 8 || dbDigits.length < 8) return false;
  return da === dbDigits || da.endsWith(dbDigits) || dbDigits.endsWith(da);
};

type CredentialVaultEntry = {
  username?: string;
  passwordHash: string;
};

type CredentialVault = Record<string, CredentialVaultEntry>;

const CREDENTIAL_VAULT_SETTINGS_ID = 'auth_credentials';

const isMissingCredentialColumnError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; details?: string };
  const text = `${e.code || ''} ${e.message || ''} ${e.details || ''}`.toLowerCase();
  return (
    text.includes('username') ||
    text.includes('password_hash') ||
    text.includes('pgrst204') ||
    text.includes('42703')
  );
};

async function readCredentialVaultSupabase(sb: SupabaseClient): Promise<CredentialVault> {
  const { data } = await sb
    .from('settings')
    .select('tagline')
    .eq('id', CREDENTIAL_VAULT_SETTINGS_ID)
    .maybeSingle();
  if (!data?.tagline) return {};
  try {
    const parsed = JSON.parse(String(data.tagline));
    return parsed && typeof parsed === 'object' ? (parsed as CredentialVault) : {};
  } catch {
    return {};
  }
}

async function writeCredentialVaultSupabase(
  sb: SupabaseClient,
  vault: CredentialVault
): Promise<void> {
  const { error } = await sb.from('settings').upsert(
    {
      id: CREDENTIAL_VAULT_SETTINGS_ID,
      site_name: 'AUTH_CREDENTIALS',
      tagline: JSON.stringify(vault),
      symbol: 'FCFA',
      contact_phone: '+225',
      contact_whatsapp: '+225',
      contact_email: 'auth@djibouamarket.ci',
      auto_approve_listings: false,
      delivery_mode: 'both',
      commission_rate: 2.5,
      min_listing_price: 500,
      max_photos_per_listing: 5,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  assertNoError(error, 'writeCredentialVault');
}

export async function registerWithCredentialsRecordSupabase(input: {
  identifier: string;
  password: string;
  name: string;
  businessName?: string;
  email?: string;
  phone: string;
  whatsapp: string;
  role: 'buyer' | 'seller';
  city: string;
  neighborhood: string;
  avatarUrl: string;
}): Promise<UserProfile> {
  return sbWrap('registerWithCredentialsRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const cleanIdent = input.identifier.trim().toLowerCase();
    const cleanEmail = (
      input.email ||
      (cleanIdent.includes('@')
        ? cleanIdent
        : `${cleanIdent.replace(/[^a-z0-9._-]/g, '_')}@djibouamarket.ci`)
    )
      .trim()
      .toLowerCase();

    const [{ data: existingRows, error: listErr }, vault] = await Promise.all([
      sb.from('users').select('*'),
      readCredentialVaultSupabase(sb),
    ]);
    assertNoError(listErr, 'checkExistingUsers');

    const conflict = (existingRows || []).find((u) => {
      const uidKey = String(u.id);
      const vaultEntry = vault[uidKey];
      const uname = u.username ? String(u.username) : vaultEntry?.username;
      const pHash = u.password_hash ? String(u.password_hash) : vaultEntry?.passwordHash;
      if (!pHash) return false;
      if (uname && uname.toLowerCase() === cleanIdent) return true;
      if (cleanIdent.includes('@') && String(u.email || '').toLowerCase() === cleanIdent)
        return true;
      if (
        phonesMatch(String(u.phone || ''), input.identifier) ||
        phonesMatch(String(u.phone || ''), input.phone)
      )
        return true;
      return false;
    });

    if (conflict) {
      throw new Error('Un compte existe déjà avec cet identifiant ou ce numéro de téléphone.');
    }

    const uid = `usr_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = hashPassword(input.password);

    const baseRow = {
      id: uid,
      uid,
      name: input.name,
      business_name: input.businessName || null,
      email: cleanEmail,
      phone: input.phone,
      whatsapp: input.whatsapp,
      role: input.role,
      city: input.city,
      neighborhood: input.neighborhood,
      avatar_url: input.avatarUrl,
      status: 'active',
      rating: 5.0,
    };

    const { data, error } = await sb
      .from('users')
      .insert({
        ...baseRow,
        username: cleanIdent,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (!error && data) {
      return mapUserRow(data, true);
    }

    if (!isMissingCredentialColumnError(error)) {
      assertNoError(error, 'registerWithCredentials');
    }

    // Fallback when Supabase users table doesn't have username/password_hash columns yet
    const { data: insertedBase, error: baseErr } = await sb
      .from('users')
      .insert(baseRow)
      .select()
      .single();
    assertNoError(baseErr, 'registerWithCredentialsBase');

    vault[uid] = { username: cleanIdent, passwordHash };
    await writeCredentialVaultSupabase(sb, vault);

    return mapUserRow(insertedBase, true);
  });
}

export async function loginWithCredentialsRecordSupabase(
  identifier: string,
  password: string
): Promise<UserProfile> {
  return sbWrap('loginWithCredentialsRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const cleanIdent = identifier.trim().toLowerCase();
    const [{ data: allUsers, error }, vault] = await Promise.all([
      sb.from('users').select('*'),
      readCredentialVaultSupabase(sb),
    ]);
    assertNoError(error, 'fetchUsersForLogin');

    const matched = (allUsers || []).find((u) => {
      const uidKey = String(u.id);
      const vaultEntry = vault[uidKey];
      const uname = u.username ? String(u.username) : vaultEntry?.username;
      const pHash = u.password_hash ? String(u.password_hash) : vaultEntry?.passwordHash;
      if (!pHash) return false;
      if (uname && uname.toLowerCase() === cleanIdent) return true;
      if (u.email && String(u.email).toLowerCase() === cleanIdent) return true;
      if (
        phonesMatch(String(u.phone || ''), cleanIdent) ||
        phonesMatch(String(u.whatsapp || ''), cleanIdent)
      )
        return true;
      return false;
    });

    if (!matched) {
      throw new Error('Identifiant ou mot de passe incorrect.');
    }

    const matchedHash = matched.password_hash
      ? String(matched.password_hash)
      : vault[String(matched.id)]?.passwordHash;

    if (!matchedHash || !verifyPassword(password, matchedHash)) {
      throw new Error('Identifiant ou mot de passe incorrect.');
    }
    if (matched.status !== 'active') {
      throw new Error("Ce compte est actuellement suspendu par l'administration.");
    }
    return mapUserRow(matched, true);
  });
}

export async function verifyAdminCredentialsRecordSupabase(
  login: string,
  password: string
): Promise<boolean> {
  return sbWrap('verifyAdminCredentialsRecordSupabase', async () => {
    const cleanLogin = login.trim().toLowerCase();
    if (cleanLogin !== 'adminlokoda' && cleanLogin !== 'federationopareko@gmail.com') {
      return false;
    }
    const sb = getSupabaseAdmin();
    const [{ data: adminRow, error }, vault] = await Promise.all([
      sb.from('users').select('*').eq('id', 'admin_lokoda').maybeSingle(),
      readCredentialVaultSupabase(sb),
    ]);
    if (!error && adminRow?.password_hash) {
      return verifyPassword(password, String(adminRow.password_hash));
    }
    if (vault.admin_lokoda?.passwordHash) {
      return verifyPassword(password, vault.admin_lokoda.passwordHash);
    }
    return Boolean(configuredAdminPassword && password === configuredAdminPassword);
  });
}

export async function updateAdminPasswordRecordSupabase(
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  return sbWrap('updateAdminPasswordRecordSupabase', async () => {
    const valid = await verifyAdminCredentialsRecordSupabase('adminlokoda', oldPassword);
    if (!valid) return false;
    const sb = getSupabaseAdmin();
    const newHash = hashPassword(newPassword);
    const baseAdmin = {
      id: 'admin_lokoda',
      uid: 'admin_lokoda',
      name: 'Administrateur DJIBOUA MARKET',
      email: 'federationopareko@gmail.com',
      phone: '+225 2724529562',
      whatsapp: '0777733284',
      role: 'admin',
      city: 'Divo',
      neighborhood: 'Plateau',
      avatar_url: '',
      status: 'active',
      rating: 5.0,
    };

    const { error } = await sb.from('users').upsert(
      {
        ...baseAdmin,
        username: 'adminlokoda',
        password_hash: newHash,
      },
      { onConflict: 'id' }
    );
    if (!error) {
      return true;
    }
    if (!isMissingCredentialColumnError(error)) {
      assertNoError(error, 'updateAdminPassword');
    }

    const { error: baseErr } = await sb.from('users').upsert(baseAdmin, { onConflict: 'id' });
    assertNoError(baseErr, 'updateAdminProfile');
    const vault = await readCredentialVaultSupabase(sb);
    vault.admin_lokoda = { username: 'adminlokoda', passwordHash: newHash };
    await writeCredentialVaultSupabase(sb, vault);
    return true;
  });
}

export async function updateUserProfileRecordSupabase(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  return sbWrap('updateUserProfileRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const setValues: Record<string, unknown> = {};
    if (updates.name !== undefined) setValues.name = updates.name;
    if (updates.businessName !== undefined) setValues.business_name = updates.businessName || null;
    if (updates.city !== undefined) setValues.city = updates.city;
    if (updates.neighborhood !== undefined) setValues.neighborhood = updates.neighborhood;
    if (updates.avatarUrl !== undefined) setValues.avatar_url = updates.avatarUrl;
    if (updates.bio !== undefined) setValues.bio = updates.bio || null;
    if (updates.phone !== undefined) setValues.phone = updates.phone;
    if (updates.whatsapp !== undefined) setValues.whatsapp = updates.whatsapp;
    if (updates.email !== undefined) setValues.email = updates.email;

    if (Object.keys(setValues).length === 0) {
      return getUserByUidSupabase(userId);
    }

    const { data, error } = await sb
      .from('users')
      .update(setValues)
      .eq('id', userId)
      .select()
      .maybeSingle();
    assertNoError(error, 'updateUserProfile');

    if (updates.avatarUrl !== undefined) {
      await sb
        .from('listings')
        .update({ seller_avatar: updates.avatarUrl, updated_at: new Date().toISOString() })
        .eq('seller_id', userId);
    }

    return data ? mapUserRow(data, true) : null;
  });
}

export async function updateUserStatusRecordSupabase(
  userId: string,
  status: UserProfile['status']
): Promise<void> {
  return sbWrap('updateUserStatusRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from('users').update({ status }).eq('id', userId);
    assertNoError(error, 'updateUserStatus');
  });
}

export async function getListingByIdSupabase(id: string): Promise<Listing | null> {
  return sbWrap('getListingByIdSupabase', async () => {
    const sb = getSupabaseAdmin();
    const [{ data, error }, vault] = await Promise.all([
      sb.from('listings').select('*').eq('id', id).maybeSingle(),
      readListingMetaVaultSupabase(sb),
    ]);
    assertNoError(error, 'getListingById');
    return data ? mapListingRow(data, vault[id]) : null;
  });
}

export async function createListingRecordSupabase(
  input: typeof listings.$inferInsert
): Promise<Listing> {
  return sbWrap('createListingRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('listings')
      .insert({
        id: input.id,
        title: input.title,
        price: input.price,
        description: input.description,
        category_id: input.categoryId,
        condition: input.condition,
        status: input.status,
        photos: input.photos,
        seller_id: input.sellerId,
        seller_name: input.sellerName,
        seller_business_name: input.sellerBusinessName || null,
        seller_phone: input.sellerPhone,
        seller_whatsapp: input.sellerWhatsApp,
        seller_avatar: input.sellerAvatar || null,
        seller_rating: input.sellerRating ?? 5.0,
        seller_verified: input.sellerVerified ?? true,
        city: input.city,
        neighborhood: input.neighborhood,
        address_details: input.addressDetails || null,
        views_count: input.viewsCount ?? 0,
        call_clicks_count: input.callClicksCount ?? 0,
        whatsapp_clicks_count: input.whatsappClicksCount ?? 0,
      })
      .select()
      .single();
    assertNoError(error, 'createListing');
    return mapListingRow(data);
  });
}

export async function updateListingRecordSupabase(
  id: string,
  updates: Partial<typeof listings.$inferInsert>
): Promise<Listing | null> {
  return sbWrap('updateListingRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const baseValues: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) baseValues.title = updates.title;
    if (updates.price !== undefined) baseValues.price = updates.price;
    if (updates.description !== undefined) baseValues.description = updates.description;
    if (updates.categoryId !== undefined) baseValues.category_id = updates.categoryId;
    if (updates.condition !== undefined) baseValues.condition = updates.condition;
    if (updates.status !== undefined) baseValues.status = updates.status;
    if (updates.rejectionReason !== undefined)
      baseValues.rejection_reason = updates.rejectionReason;
    if (updates.photos !== undefined) baseValues.photos = updates.photos;
    if (updates.city !== undefined) baseValues.city = updates.city;
    if (updates.neighborhood !== undefined) baseValues.neighborhood = updates.neighborhood;
    if (updates.addressDetails !== undefined) baseValues.address_details = updates.addressDetails;
    if (updates.sellerName !== undefined) baseValues.seller_name = updates.sellerName;
    if (updates.sellerBusinessName !== undefined)
      baseValues.seller_business_name = updates.sellerBusinessName;
    if (updates.sellerPhone !== undefined) baseValues.seller_phone = updates.sellerPhone;
    if (updates.sellerWhatsApp !== undefined) baseValues.seller_whatsapp = updates.sellerWhatsApp;

    const metaColumnValues: Record<string, unknown> = {};
    const metaPatch: ListingMetaEntry = {};
    let hasMetaUpdate = false;

    if (updates.isPriority !== undefined) {
      metaColumnValues.is_priority = Boolean(updates.isPriority);
      metaPatch.isPriority = Boolean(updates.isPriority);
      hasMetaUpdate = true;
    }
    if (updates.durationDays !== undefined) {
      metaColumnValues.duration_days = updates.durationDays;
      metaPatch.durationDays = updates.durationDays;
      hasMetaUpdate = true;
    }
    if (updates.expiresAt !== undefined) {
      metaColumnValues.expires_at = updates.expiresAt ? toIso(updates.expiresAt) : null;
      metaPatch.expiresAt = updates.expiresAt ? toIso(updates.expiresAt) : null;
      hasMetaUpdate = true;
    }
    if (updates.paymentReceiptUrl !== undefined) {
      metaColumnValues.payment_receipt_url = updates.paymentReceiptUrl;
      metaPatch.paymentReceiptUrl = updates.paymentReceiptUrl;
      hasMetaUpdate = true;
    }
    if (updates.paymentReceiptName !== undefined) {
      metaColumnValues.payment_receipt_name = updates.paymentReceiptName;
      metaPatch.paymentReceiptName = updates.paymentReceiptName;
      hasMetaUpdate = true;
    }
    if (updates.paymentReceiptSentAt !== undefined) {
      metaColumnValues.payment_receipt_sent_at = updates.paymentReceiptSentAt
        ? toIso(updates.paymentReceiptSentAt)
        : null;
      metaPatch.paymentReceiptSentAt = updates.paymentReceiptSentAt
        ? toIso(updates.paymentReceiptSentAt)
        : null;
      hasMetaUpdate = true;
    }

    const { data, error } = await sb
      .from('listings')
      .update({ ...baseValues, ...metaColumnValues })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error) {
      const vault = await readListingMetaVaultSupabase(sb);
      if (hasMetaUpdate && vault[id]) {
        vault[id] = { ...vault[id], ...metaPatch };
        await writeListingMetaVaultSupabase(sb, vault);
      }
      return data ? mapListingRow(data, vault[id]) : null;
    }

    if (!isMissingListingMetaColumnError(error)) {
      assertNoError(error, 'updateListing');
    }

    // Fallback: Supabase listings table does not yet have priority/duration/receipt columns
    const { data: baseData, error: baseErr } = await sb
      .from('listings')
      .update(baseValues)
      .eq('id', id)
      .select()
      .maybeSingle();
    assertNoError(baseErr, 'updateListingBase');

    if (!baseData) return null;

    const vault = await readListingMetaVaultSupabase(sb);
    if (hasMetaUpdate) {
      vault[id] = { ...(vault[id] || {}), ...metaPatch };
      await writeListingMetaVaultSupabase(sb, vault);
    }

    return mapListingRow(baseData, vault[id]);
  });
}

export async function deleteListingRecordSupabase(id: string): Promise<void> {
  return sbWrap('deleteListingRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    await sb.from('favorites').delete().eq('listing_id', id);
    await sb.from('reports').delete().eq('listing_id', id);
    await sb.from('transactions').delete().eq('listing_id', id);
    const { error } = await sb.from('listings').delete().eq('id', id);
    assertNoError(error, 'deleteListing');
    const vault = await readListingMetaVaultSupabase(sb);
    if (vault[id]) {
      delete vault[id];
      await writeListingMetaVaultSupabase(sb, vault);
    }
  });
}

export async function incrementListingMetricSupabase(
  id: string,
  metric: 'view' | 'call' | 'whatsapp'
): Promise<void> {
  return sbWrap('incrementListingMetricSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from('listings')
      .select('status, views_count, call_clicks_count, whatsapp_clicks_count')
      .eq('id', id)
      .maybeSingle();
    if (!data || data.status !== 'approved') return;
    if (metric === 'view') {
      await sb
        .from('listings')
        .update({ views_count: Number(data.views_count || 0) + 1 })
        .eq('id', id);
    } else if (metric === 'call') {
      await sb
        .from('listings')
        .update({ call_clicks_count: Number(data.call_clicks_count || 0) + 1 })
        .eq('id', id);
    } else {
      await sb
        .from('listings')
        .update({ whatsapp_clicks_count: Number(data.whatsapp_clicks_count || 0) + 1 })
        .eq('id', id);
    }
  });
}

export async function toggleFavoriteRecordSupabase(
  userId: string,
  listingId: string
): Promise<boolean> {
  return sbWrap('toggleFavoriteRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data: existing, error } = await sb
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId);
    assertNoError(error, 'favorites check');

    if (existing && existing.length > 0) {
      const { error: delErr } = await sb
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId);
      assertNoError(delErr, 'favorite delete');
      return false;
    }

    const { error: insErr } = await sb.from('favorites').upsert(
      {
        id: `${userId}_${listingId}`,
        user_id: userId,
        listing_id: listingId,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    assertNoError(insErr, 'favorite insert');
    return true;
  });
}

export async function createTransactionRecordSupabase(
  input: typeof transactions.$inferInsert
): Promise<Transaction> {
  return sbWrap('createTransactionRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('transactions')
      .insert({
        id: input.id,
        reference: input.reference,
        listing_id: input.listingId,
        listing_title: input.listingTitle,
        listing_photo: input.listingPhoto || '',
        amount: input.amount,
        delivery_fee: input.deliveryFee ?? 0,
        total_amount: input.totalAmount,
        buyer_id: input.buyerId || null,
        buyer_name: input.buyerName,
        buyer_phone: input.buyerPhone,
        buyer_whatsapp: input.buyerWhatsApp || null,
        buyer_email: input.buyerEmail || null,
        buyer_city: input.buyerCity,
        buyer_neighborhood: input.buyerNeighborhood,
        seller_id: input.sellerId,
        seller_name: input.sellerName,
        seller_phone: input.sellerPhone,
        seller_city: input.sellerCity,
        method: input.method,
        status: input.status || 'paid',
        delivery_option: input.deliveryOption || 'direct',
        paid_at: input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();
    assertNoError(error, 'createTransaction');
    return mapTransactionRow(data);
  });
}

export async function updateTransactionStatusRecordSupabase(
  id: string,
  status: Transaction['status']
): Promise<void> {
  return sbWrap('updateTransactionStatusRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const payload =
      status === 'paid' ? { status, paid_at: new Date().toISOString() } : { status };
    const { error } = await sb.from('transactions').update(payload).eq('id', id);
    assertNoError(error, 'updateTransactionStatus');
  });
}

export async function createReportRecordSupabase(
  input: typeof reports.$inferInsert
): Promise<Report> {
  return sbWrap('createReportRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('reports')
      .insert({
        id: input.id,
        listing_id: input.listingId,
        listing_title: input.listingTitle,
        seller_name: input.sellerName,
        reporter_id: input.reporterId || null,
        reason: input.reason,
        comment: input.comment,
        reporter_contact: input.reporterContact || null,
        status: input.status || 'pending',
      })
      .select()
      .single();
    assertNoError(error, 'createReport');
    return mapReportRow(data);
  });
}

export async function updateReportStatusRecordSupabase(
  id: string,
  status: Report['status']
): Promise<void> {
  return sbWrap('updateReportStatusRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from('reports')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);
    assertNoError(error, 'updateReportStatus');
  });
}

export async function createNotificationRecordSupabase(
  input: typeof notifications.$inferInsert
): Promise<AppNotification> {
  return sbWrap('createNotificationRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('notifications')
      .insert({
        id: input.id,
        user_id: input.userId,
        title: input.title,
        message: input.message,
        type: input.type || 'system',
        read: input.read ?? false,
      })
      .select()
      .single();
    assertNoError(error, 'createNotification');
    return mapNotificationRow(data);
  });
}

export async function markNotificationReadRecordSupabase(
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  return sbWrap('markNotificationReadRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const query = sb.from('notifications').update({ read: true }).eq('id', id);
    const { error } = isAdmin ? await query : await query.eq('user_id', userId);
    assertNoError(error, 'markNotificationRead');
  });
}

export async function clearNotificationsRecordSupabase(userId: string): Promise<void> {
  return sbWrap('clearNotificationsRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from('notifications').delete().eq('user_id', userId);
    assertNoError(error, 'clearNotifications');
  });
}

export async function updateSettingsRecordSupabase(
  newSettings: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  return sbWrap('updateSettingsRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const [curRes, cityRes] = await Promise.all([
      sb.from('settings').select('*').eq('id', 'general').maybeSingle(),
      sb.from('cities').select('*').eq('active', true),
    ]);
    const current = curRes.data;
    const payload = {
      id: 'general',
      site_name: newSettings.siteName ?? current?.site_name ?? INITIAL_SETTINGS.siteName,
      tagline: newSettings.tagline ?? current?.tagline ?? INITIAL_SETTINGS.tagline,
      symbol: newSettings.symbol ?? current?.symbol ?? INITIAL_SETTINGS.symbol,
      contact_phone:
        newSettings.contactPhone ?? current?.contact_phone ?? INITIAL_SETTINGS.contactPhone,
      contact_whatsapp:
        newSettings.contactWhatsApp ??
        current?.contact_whatsapp ??
        INITIAL_SETTINGS.contactWhatsApp,
      contact_email:
        newSettings.contactEmail ?? current?.contact_email ?? INITIAL_SETTINGS.contactEmail,
      auto_approve_listings:
        newSettings.autoApproveListings ??
        current?.auto_approve_listings ??
        INITIAL_SETTINGS.autoApproveListings,
      delivery_mode:
        newSettings.deliveryMode ?? current?.delivery_mode ?? INITIAL_SETTINGS.deliveryMode,
      commission_rate:
        newSettings.commissionRate ??
        current?.commission_rate ??
        INITIAL_SETTINGS.commissionRate,
      min_listing_price:
        newSettings.minListingPrice ??
        current?.min_listing_price ??
        INITIAL_SETTINGS.minListingPrice,
      max_photos_per_listing:
        newSettings.maxPhotosPerListing ??
        current?.max_photos_per_listing ??
        INITIAL_SETTINGS.maxPhotosPerListing,
      ...(newSettings.promoBanners !== undefined
        ? { promo_banners: newSettings.promoBanners }
        : current && 'promo_banners' in current
          ? { promo_banners: current.promo_banners }
          : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from('settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    assertNoError(error, 'updateSettings');
    return mapSettingsRow(data, (cityRes.data || []).map(mapCityRow));
  });
}

export async function upsertCityRecordSupabase(city: City): Promise<City> {
  return sbWrap('upsertCityRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('cities')
      .upsert(
        {
          id: city.id,
          name: city.name,
          region: city.region,
          neighborhoods: city.neighborhoods,
          active: city.active,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();
    assertNoError(error, 'upsertCity');
    return mapCityRow(data);
  });
}

export async function addNeighborhoodRecordSupabase(
  cityIdOrName: string,
  neighborhood: string
): Promise<City | null> {
  return sbWrap('addNeighborhoodRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data: all, error } = await sb.from('cities').select('*');
    assertNoError(error, 'cities list');
    const target = (all || []).find(
      (c) =>
        String(c.id) === cityIdOrName ||
        String(c.name).toLowerCase() === cityIdOrName.toLowerCase()
    );
    if (!target) return null;
    const currentList = Array.isArray(target.neighborhoods)
      ? target.neighborhoods.map(String)
      : [];
    if (currentList.includes(neighborhood)) return mapCityRow(target);

    const updatedList = [...currentList, neighborhood].slice(0, 100);
    const { data: updated, error: upErr } = await sb
      .from('cities')
      .update({ neighborhoods: updatedList })
      .eq('id', target.id)
      .select()
      .maybeSingle();
    assertNoError(upErr, 'addNeighborhood');
    return updated ? mapCityRow(updated) : null;
  });
}

export async function createAdminLogRecordSupabase(input: {
  action: string;
  targetType: AdminLog['targetType'];
  targetId: string;
  adminId?: string;
  details?: string;
}): Promise<AdminLog> {
  return sbWrap('createAdminLogRecordSupabase', async () => {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('admin_logs')
      .insert({
        id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        action: input.action,
        target_type: input.targetType,
        target_id: input.targetId,
        performed_by: 'Adminlokoda',
        admin_id: input.adminId || null,
        details: input.details || null,
      })
      .select()
      .single();
    assertNoError(error, 'createAdminLog');
    return mapAdminLogRow(data);
  });
}
