import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, BOOTSTRAPPED_ADMIN_EMAIL, googleProvider } from '../firebase';
import {
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
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_CITIES,
  INITIAL_LISTINGS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from '../data/initialData';

export type AppView =
  | 'home'
  | 'listings'
  | 'vendor_dashboard'
  | 'favorites'
  | 'admin_private';

interface BootstrapPayload {
  isDbSeeded: boolean;
  cities: City[];
  categories: Category[];
  settings: PlatformSettings;
  publicListings: Listing[];
  publicSellers: UserProfile[];
  currentUser: UserProfile | null;
  myListings: Listing[];
  myFavorites: string[];
  myNotifications: AppNotification[];
  myTransactions: Transaction[];
  myReports: Report[];
  adminData: {
    allListings: Listing[];
    allUsers: UserProfile[];
    allTransactions: Transaction[];
    allReports: Report[];
    allNotifications: AppNotification[];
    adminLogs: AdminLog[];
  } | null;
}

interface MarketContextType {
  // Navigation & View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedListingId: string | null;
  setSelectedListingId: (id: string | null) => void;
  checkoutListing: Listing | null;
  setCheckoutListing: (listing: Listing | null) => void;
  deviceMode: 'web' | 'android';
  setDeviceMode: (mode: 'web' | 'android') => void;

  // Data Collections
  listings: Listing[];
  categories: Category[];
  cities: City[];
  users: UserProfile[];
  transactions: Transaction[];
  reports: Report[];
  settings: PlatformSettings;
  notifications: AppNotification[];
  adminLogs: AdminLog[];
  firestoreListingIds: Set<string>;
  isDbSeeded: boolean;

  // Firebase Auth & Credential Auth & User
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  isFirebaseAdmin: boolean;
  isAdminAuthorized: boolean;
  currentUser: UserProfile | null;
  isLoggedIn: boolean;
  signInWithGoogle: () => Promise<{
    firebaseUser: FirebaseUser;
    profileExists: boolean;
    profile: UserProfile | null;
  }>;
  loginUser: (
    identifier?: string,
    password?: string
  ) => Promise<{ success: boolean; message?: string; user?: UserProfile }>;
  registerWithCredentials: (userData: {
    identifier: string;
    password: string;
    name: string;
    businessName?: string;
    email?: string;
    phone: string;
    whatsapp: string;
    city: string;
    neighborhood: string;
    avatarUrl?: string;
    role?: UserRole;
  }) => Promise<UserProfile>;
  loginWithCredentials: (identifier: string, password: string) => Promise<UserProfile>;
  registerUser: (userData: {
    name: string;
    businessName?: string;
    phone: string;
    whatsapp: string;
    city: string;
    neighborhood: string;
    avatarUrl?: string;
    password?: string;
    role?: UserRole;
  }) => Promise<UserProfile>;
  logoutUser: () => Promise<void>;

  // Admin Security
  adminAuthenticated: boolean;
  setAdminAuthenticated: (auth: boolean) => void;
  adminPasswordVerified: boolean;
  loginAdmin: (login: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  updateAdminPasswordAsync: (
    oldPass: string,
    newPass: string
  ) => Promise<{ ok: boolean; error?: string }>;
  seedFirestoreData: () => Promise<void>;

  // Filters & Search
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedNeighborhood: string;
  setSelectedNeighborhood: (neighborhood: string) => void;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  conditionFilter: 'all' | 'neuf' | 'occasion';
  setConditionFilter: (cond: 'all' | 'neuf' | 'occasion') => void;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'popular';
  setSortBy: (sort: 'recent' | 'price_asc' | 'price_desc' | 'popular') => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;

  // Listing Operations
  addListing: (
    listingData: Omit<
      Listing,
      'id' | 'createdAt' | 'viewsCount' | 'callClicksCount' | 'whatsappClicksCount' | 'status'
    >
  ) => Promise<Listing>;
  updateListing: (id: string, updates: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  approveListing: (
    id: string,
    options?: { durationDays?: number | null; isPriority?: boolean }
  ) => Promise<void>;
  setListingPriority: (id: string, isPriority: boolean) => Promise<void>;
  setListingDuration: (id: string, durationDays: number | null) => Promise<void>;
  uploadListingPaymentReceipt: (
    id: string,
    receiptUrl: string,
    receiptName: string
  ) => Promise<Listing>;
  rejectListing: (id: string, reason: string) => Promise<void>;
  suspendListing: (id: string, reason: string) => Promise<void>;
  trackListingView: (id: string) => Promise<void>;
  trackCallClick: (id: string) => Promise<void>;
  trackWhatsAppClick: (id: string) => Promise<void>;

  // Transactions & Checkout
  createTransaction: (
    data: Omit<Transaction, 'id' | 'reference' | 'status' | 'createdAt'>
  ) => Promise<Transaction>;
  updateTransactionStatus: (id: string, status: Transaction['status']) => Promise<void>;

  // Reports
  submitReport: (data: Omit<Report, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateReportStatus: (id: string, status: Report['status']) => Promise<void>;

  // Settings & Cities Management
  updateSettings: (newSettings: Partial<PlatformSettings>) => Promise<void>;
  addCity: (city: City) => Promise<void>;
  addNeighborhoodToCity: (cityId: string, neighborhood: string) => Promise<void>;

  // User Management
  updateUserStatus: (userId: string, status: UserProfile['status']) => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => Promise<void>;

  // Reset to initial
  resetPlatformData: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

const LOCAL_FAV_KEY = 'lokoda_market_visitor_favorites';
const USER_TOKEN_KEY = 'djiboua_user_auth_token';
const ADMIN_TOKEN_KEY = 'djiboua_admin_auth_token';

function getStoredUserToken(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(USER_TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

function setStoredUserToken(token: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (token) {
      window.localStorage.setItem(USER_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(USER_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function getStoredAdminToken(): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

function setStoredAdminToken(token: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  fbUserOverride?: FirebaseUser | null
): Promise<T> {
  const activeUser = fbUserOverride !== undefined ? fbUserOverride : auth.currentUser;
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (activeUser) {
    const token = await activeUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    const storedUserToken = getStoredUserToken();
    if (storedUserToken) {
      headers.set('Authorization', `Bearer ${storedUserToken}`);
    }
  }

  const adminToken = getStoredAdminToken();
  if (adminToken) {
    headers.set('x-admin-token', adminToken);
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text };
    }
  }
  if (!res.ok) {
    throw new Error(String(parsed.error || `Erreur serveur (${res.status})`));
  }
  return parsed as T;
}

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash === '#gestion-privee' || path.includes('gestion-privee')) {
        return 'admin_private';
      }
    }
    return 'home';
  });

  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [deviceMode, setDeviceMode] = useState<'web' | 'android'>('web');

  // Auth State (Firebase Auth + HMAC Session Tokens)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [hasCredentialSession, setHasCredentialSession] = useState<boolean>(() =>
    Boolean(getStoredUserToken())
  );
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const isFirebaseAdmin = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
  const [adminAuthenticated, setAdminAuthenticatedState] = useState<boolean>(() =>
    Boolean(getStoredAdminToken())
  );
  const isAdminAuthorized = Boolean(isFirebaseAdmin || adminAuthenticated);
  const isUserAuthenticated = Boolean(firebaseUser || hasCredentialSession);

  // PostgreSQL Cloud SQL Hydrated State
  const [dbCities, setDbCities] = useState<City[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbSettings, setDbSettings] = useState<PlatformSettings | null>(null);
  const [isDbSeeded, setIsDbSeeded] = useState<boolean>(true);

  const [publicListings, setPublicListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [adminAllListings, setAdminAllListings] = useState<Listing[]>([]);

  const [publicSellers, setPublicSellers] = useState<UserProfile[]>([]);
  const [adminAllUsers, setAdminAllUsers] = useState<UserProfile[]>([]);

  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [adminAllTransactions, setAdminAllTransactions] = useState<Transaction[]>([]);

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [adminAllReports, setAdminAllReports] = useState<Report[]>([]);

  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [adminAllNotifications, setAdminAllNotifications] = useState<AppNotification[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);

  const [dbFavorites, setDbFavorites] = useState<string[]>([]);
  const [visitorFavorites, setVisitorFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_FAV_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Admin portal gate state is initialized above via sessionStorage token

  // Filters
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'neuf' | 'occasion'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'popular'>('recent');

  // Hash listener for private route /gestion-privee
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#gestion-privee') {
        setCurrentViewState('admin_private');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setCurrentView = (view: AppView) => {
    setCurrentViewState(view);
    if (view === 'admin_private') {
      window.location.hash = 'gestion-privee';
    } else if (window.location.hash === '#gestion-privee') {
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyBootstrapPayload = useCallback(
    (data: BootstrapPayload, activeFbUser: FirebaseUser | null) => {
      setIsDbSeeded(Boolean(data.isDbSeeded));
      setDbCities(Array.isArray(data.cities) ? data.cities : []);
      setDbCategories(Array.isArray(data.categories) ? data.categories : []);
      setDbSettings(data.settings || null);
      setPublicListings(Array.isArray(data.publicListings) ? data.publicListings : []);
      setPublicSellers(Array.isArray(data.publicSellers) ? data.publicSellers : []);

      const storedUserTok = getStoredUserToken();
      const hasUserAuth = Boolean(activeFbUser || storedUserTok);

      if (hasUserAuth) {
        const profile = data.currentUser;
        if (!activeFbUser && !profile) {
          // Stale or expired credential session token
          setStoredUserToken(null);
          setHasCredentialSession(false);
          setCurrentUser(null);
          setMyListings([]);
          setDbFavorites([]);
          setMyNotifications([]);
          setMyTransactions([]);
          setMyReports([]);
        } else {
          setCurrentUser(profile && profile.status === 'active' ? profile : null);
          setMyListings(Array.isArray(data.myListings) ? data.myListings : []);
          setDbFavorites(Array.isArray(data.myFavorites) ? data.myFavorites : []);
          setMyNotifications(Array.isArray(data.myNotifications) ? data.myNotifications : []);
          setMyTransactions(Array.isArray(data.myTransactions) ? data.myTransactions : []);
          setMyReports(Array.isArray(data.myReports) ? data.myReports : []);
        }
      } else {
        setCurrentUser(null);
        setMyListings([]);
        setDbFavorites([]);
        setMyNotifications([]);
        setMyTransactions([]);
        setMyReports([]);
      }

      if (data.adminData) {
        setAdminAllListings(data.adminData.allListings || []);
        setAdminAllUsers(data.adminData.allUsers || []);
        setAdminAllTransactions(data.adminData.allTransactions || []);
        setAdminAllReports(data.adminData.allReports || []);
        setAdminAllNotifications(data.adminData.allNotifications || []);
        setAdminLogs(data.adminData.adminLogs || []);
      } else {
        if (getStoredAdminToken() && !activeFbUser) {
          // Admin token expired or invalid
          setStoredAdminToken(null);
          setAdminAuthenticatedState(false);
        }
        setAdminAllListings([]);
        setAdminAllUsers([]);
        setAdminAllTransactions([]);
        setAdminAllReports([]);
        setAdminAllNotifications([]);
        setAdminLogs([]);
      }
    },
    []
  );

  const refreshBootstrap = useCallback(
    async (fbUserOverride?: FirebaseUser | null) => {
      const activeUser = fbUserOverride !== undefined ? fbUserOverride : auth.currentUser;
      try {
        const data = await apiFetch<BootstrapPayload>('/api/bootstrap', {}, activeUser);
        applyBootstrapPayload(data, activeUser);
      } catch (err) {
        console.error('Failed to sync market data:', err);
      }
    },
    [applyBootstrapPayload]
  );

  // Auth State Listener + Initial Bootstrap Load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      await refreshBootstrap(fbUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [refreshBootstrap]);

  // Derived Collections (with graceful fallback before initial load completes)
  const cities = useMemo<City[]>(() => {
    const byId = new Map<string, City>();
    INITIAL_CITIES.forEach((c) => byId.set(c.id, c));
    dbCities.forEach((c) => byId.set(c.id, c));
    return Array.from(byId.values());
  }, [dbCities]);

  const settings = useMemo<PlatformSettings>(() => {
    const base = dbSettings || INITIAL_SETTINGS;
    return { ...base, cities };
  }, [dbSettings, cities]);

  const listings = useMemo<Listing[]>(() => {
    const byId = new Map<string, Listing>();
    if (!dbSettings && publicListings.length === 0) {
      INITIAL_LISTINGS.forEach((l) => byId.set(l.id, l));
    }
    publicListings.forEach((l) => byId.set(l.id, l));
    myListings.forEach((l) => byId.set(l.id, l));
    if (isAdminAuthorized) {
      adminAllListings.forEach((l) => byId.set(l.id, l));
    }
    return Array.from(byId.values()).sort((a, b) => {
      const pDiff = Number(Boolean(b.isPriority)) - Number(Boolean(a.isPriority));
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [dbSettings, publicListings, myListings, adminAllListings, isAdminAuthorized]);

  const firestoreListingIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    listings.forEach((l) => set.add(l.id));
    return set;
  }, [listings]);

  const categories = useMemo<Category[]>(() => {
    const base = dbCategories.length > 0 ? dbCategories : INITIAL_CATEGORIES;
    const nowMs = Date.now();
    const approved = listings.filter(
      (l) => l.status === 'approved' && (!l.expiresAt || new Date(l.expiresAt).getTime() > nowMs)
    );
    return base
      .map((cat) => ({
        ...cat,
        listingCount: approved.filter((l) => l.categoryId === cat.id).length,
      }))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [dbCategories, listings]);

  const users = useMemo<UserProfile[]>(() => {
    const byId = new Map<string, UserProfile>();
    if (!dbSettings && publicSellers.length === 0) {
      INITIAL_USERS.forEach((u) => byId.set(u.id, u));
    }
    publicSellers.forEach((u) => byId.set(u.id, u));
    if (isAdminAuthorized) {
      adminAllUsers.forEach((u) => byId.set(u.id, u));
    }
    if (currentUser) {
      byId.set(currentUser.id, currentUser);
    }
    return Array.from(byId.values());
  }, [dbSettings, publicSellers, adminAllUsers, currentUser, isAdminAuthorized]);

  const transactions = useMemo<Transaction[]>(() => {
    const source = isAdminAuthorized ? adminAllTransactions : myTransactions;
    return [...source].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [isAdminAuthorized, adminAllTransactions, myTransactions]);

  const reports = useMemo<Report[]>(() => {
    const source = isAdminAuthorized ? adminAllReports : myReports;
    return [...source].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [isAdminAuthorized, adminAllReports, myReports]);

  const notifications = useMemo<AppNotification[]>(() => {
    const source = isAdminAuthorized ? adminAllNotifications : myNotifications;
    if (source.length === 0 && !isUserAuthenticated && !isAdminAuthorized) {
      return [
        {
          id: 'notif_welcome',
          title: 'Bienvenue sur DJIBOUA MARKET',
          message: 'Découvrez la marketplace de proximité pour Divo, Lakota, Gagnoa et Guitry.',
          type: 'system',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return [...source].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [isAdminAuthorized, adminAllNotifications, myNotifications, isUserAuthenticated]);

  const favorites = isUserAuthenticated ? dbFavorites : visitorFavorites;

  // =========================================================================
  // Auth & User Registration
  // =========================================================================

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    setStoredUserToken(null);
    setHasCredentialSession(false);
    const { profile } = await apiFetch<{ profile: UserProfile | null }>(
      '/api/users/me',
      {},
      cred.user
    );
    await refreshBootstrap(cred.user);
    if (profile) {
      if (profile.status === 'suspended' || profile.status === 'blocked') {
        await signOut(auth);
        throw new Error("Ce compte est actuellement suspendu par l'administration.");
      }
      setCurrentUser(profile);
      return { firebaseUser: cred.user, profileExists: true, profile };
    }
    return { firebaseUser: cred.user, profileExists: false, profile: null };
  };

  const registerWithCredentials = async (userData: {
    identifier: string;
    password: string;
    name: string;
    businessName?: string;
    email?: string;
    phone: string;
    whatsapp: string;
    city: string;
    neighborhood: string;
    avatarUrl?: string;
    role?: UserRole;
  }): Promise<UserProfile> => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    const { token, user } = await apiFetch<{ token: string; user: UserProfile }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      },
      null
    );
    setStoredUserToken(token);
    setHasCredentialSession(true);
    setCurrentUser(user);
    await refreshBootstrap(null);
    return user;
  };

  const loginWithCredentials = async (
    identifier: string,
    password: string
  ): Promise<UserProfile> => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    const { token, user } = await apiFetch<{ token: string; user: UserProfile }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      },
      null
    );
    setStoredUserToken(token);
    setHasCredentialSession(true);
    setCurrentUser(user);
    await refreshBootstrap(null);
    return user;
  };

  const registerUser = async (userData: {
    name: string;
    businessName?: string;
    phone: string;
    whatsapp: string;
    city: string;
    neighborhood: string;
    avatarUrl?: string;
    password?: string;
    role?: UserRole;
  }): Promise<UserProfile> => {
    let fbUser = auth.currentUser;
    if (!fbUser) {
      const cred = await signInWithPopup(auth, googleProvider);
      fbUser = cred.user;
    }

    const { user } = await apiFetch<{ user: UserProfile }>(
      '/api/users/register',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      },
      fbUser
    );

    setCurrentUser(user);
    await refreshBootstrap(fbUser);
    return user;
  };

  const loginUser = async (
    identifier?: string,
    password?: string
  ): Promise<{ success: boolean; message?: string; user?: UserProfile }> => {
    try {
      if (identifier && password) {
        const user = await loginWithCredentials(identifier, password);
        return { success: true, user };
      }
      const res = await signInWithGoogle();
      if (!res.profileExists || !res.profile) {
        return {
          success: false,
          message: 'Compte Google connecté. Veuillez finaliser votre profil ci-dessus.',
        };
      }
      return { success: true, user: res.profile };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Échec de la connexion.',
      };
    }
  };

  const logoutUser = async () => {
    setStoredUserToken(null);
    setHasCredentialSession(false);
    if (auth.currentUser) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setMyListings([]);
    setDbFavorites([]);
    setMyNotifications([]);
    setMyTransactions([]);
    setMyReports([]);
    setCurrentView('home');
  };

  // =========================================================================
  // Admin Security Gate & Seed
  // =========================================================================

  const setAdminAuthenticated = (nextAuth: boolean) => {
    if (!nextAuth) {
      setStoredAdminToken(null);
      setAdminAuthenticatedState(false);
      void refreshBootstrap();
    } else {
      setAdminAuthenticatedState(true);
    }
  };

  const seedFirestoreData = async (force = false): Promise<void> => {
    if (!isAdminAuthorized) return;
    await apiFetch('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
    await refreshBootstrap();
  };

  const loginAdmin = async (
    login: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { token } = await apiFetch<{ ok: boolean; token: string }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });
      setStoredAdminToken(token);
      setAdminAuthenticatedState(true);
      await refreshBootstrap();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Identifiant ou mot de passe administrateur incorrect.',
      };
    }
  };

  const updateAdminPasswordAsync = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await apiFetch('/api/admin/password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Impossible de modifier le mot de passe administrateur.",
      };
    }
  };

  // =========================================================================
  // Favorites
  // =========================================================================

  const toggleFavorite = async (id: string) => {
    const hasSession = Boolean(auth.currentUser || getStoredUserToken());
    if (!hasSession) {
      setVisitorFavorites((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        try {
          localStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }

    const { added } = await apiFetch<{ added: boolean }>('/api/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ listingId: id }),
    });
    setDbFavorites((prev) =>
      added ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
    );
  };

  const isFavorite = (id: string) => favorites.includes(id) || visitorFavorites.includes(id);

  // =========================================================================
  // Notifications
  // =========================================================================

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    if (!auth.currentUser && !getStoredUserToken() && !getStoredAdminToken()) return;
    await apiFetch('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notif),
    });
    await refreshBootstrap();
  };

  const markNotificationRead = async (id: string) => {
    if (!auth.currentUser && !getStoredUserToken() && !getStoredAdminToken()) return;
    await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
    await refreshBootstrap();
  };

  const clearAllNotifications = async () => {
    if (!auth.currentUser && !getStoredUserToken() && !getStoredAdminToken()) return;
    await apiFetch('/api/notifications', { method: 'DELETE' });
    await refreshBootstrap();
  };

  // =========================================================================
  // Listings CRUD & Moderation
  // =========================================================================

  const addListing = async (
    listingData: Omit<
      Listing,
      'id' | 'createdAt' | 'viewsCount' | 'callClicksCount' | 'whatsappClicksCount' | 'status'
    >
  ): Promise<Listing> => {
    if (!auth.currentUser && !getStoredUserToken()) {
      throw new Error('Veuillez vous connecter avant de publier une annonce.');
    }
    const { listing } = await apiFetch<{ listing: Listing }>('/api/listings', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
    await refreshBootstrap();
    return listing;
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    await refreshBootstrap();
  };

  const deleteListing = async (id: string) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await refreshBootstrap();
  };

  const approveListing = async (
    id: string,
    options?: { durationDays?: number | null; isPriority?: boolean }
  ) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    await refreshBootstrap();
  };

  const setListingPriority = async (id: string, isPriority: boolean) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPriority }),
    });
    await refreshBootstrap();
  };

  const setListingDuration = async (id: string, durationDays: number | null) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ durationDays }),
    });
    await refreshBootstrap();
  };

  const uploadListingPaymentReceipt = async (
    id: string,
    receiptUrl: string,
    receiptName: string
  ): Promise<Listing> => {
    const { listing } = await apiFetch<{ listing: Listing }>(
      `/api/listings/${encodeURIComponent(id)}/receipt`,
      {
        method: 'POST',
        body: JSON.stringify({ receiptUrl, receiptName }),
      }
    );
    await refreshBootstrap();
    return listing;
  };

  const rejectListing = async (id: string, reason: string) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await refreshBootstrap();
  };

  const suspendListing = async (id: string, reason: string) => {
    await apiFetch(`/api/listings/${encodeURIComponent(id)}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await refreshBootstrap();
  };

  const trackListingView = async (id: string) => {
    try {
      await fetch(`/api/listings/${encodeURIComponent(id)}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'view' }),
      });
    } catch {
      // Non-critical metric increment
    }
  };

  const trackCallClick = async (id: string) => {
    try {
      await fetch(`/api/listings/${encodeURIComponent(id)}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'call' }),
      });
    } catch {
      // Non-critical metric increment
    }
  };

  const trackWhatsAppClick = async (id: string) => {
    try {
      await fetch(`/api/listings/${encodeURIComponent(id)}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'whatsapp' }),
      });
    } catch {
      // Non-critical metric increment
    }
  };

  // =========================================================================
  // Transactions & Reports
  // =========================================================================

  const createTransaction = async (
    data: Omit<Transaction, 'id' | 'reference' | 'status' | 'createdAt'>
  ): Promise<Transaction> => {
    let fbUser = auth.currentUser;
    const storedToken = getStoredUserToken();
    if (!fbUser && !storedToken) {
      const cred = await signInWithPopup(auth, googleProvider);
      fbUser = cred.user;
    }

    const { transaction } = await apiFetch<{ transaction: Transaction }>(
      '/api/transactions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      fbUser
    );
    await refreshBootstrap(fbUser);
    return transaction;
  };

  const updateTransactionStatus = async (id: string, status: Transaction['status']) => {
    await apiFetch(`/api/admin/transactions/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await refreshBootstrap();
  };

  const submitReport = async (data: Omit<Report, 'id' | 'status' | 'createdAt'>) => {
    let fbUser = auth.currentUser;
    const storedToken = getStoredUserToken();
    if (!fbUser && !storedToken) {
      const cred = await signInWithPopup(auth, googleProvider);
      fbUser = cred.user;
    }
    await apiFetch(
      '/api/reports',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      fbUser
    );
    await refreshBootstrap(fbUser);
  };

  const updateReportStatus = async (id: string, status: Report['status']) => {
    await apiFetch(`/api/admin/reports/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await refreshBootstrap();
  };

  // =========================================================================
  // Settings, Cities, Users Management
  // =========================================================================

  const updateSettings = async (newSettings: Partial<PlatformSettings>) => {
    await apiFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(newSettings),
    });
    await refreshBootstrap();
  };

  const addCity = async (city: City) => {
    await apiFetch('/api/admin/cities', {
      method: 'POST',
      body: JSON.stringify(city),
    });
    await refreshBootstrap();
  };

  const addNeighborhoodToCity = async (cityId: string, neighborhood: string) => {
    await apiFetch(`/api/admin/cities/${encodeURIComponent(cityId)}/neighborhoods`, {
      method: 'POST',
      body: JSON.stringify({ neighborhood }),
    });
    await refreshBootstrap();
  };

  const updateUserStatus = async (userId: string, status: UserProfile['status']) => {
    await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await refreshBootstrap();
  };

  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const { user } = await apiFetch<{ user: UserProfile | null }>(
      `/api/users/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    if (user && currentUser && currentUser.id === userId) {
      setCurrentUser(user);
    }
    await refreshBootstrap();
  };

  const resetPlatformData = async () => {
    await seedFirestoreData(true);
  };

  return (
    <MarketContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedListingId,
        setSelectedListingId,
        checkoutListing,
        setCheckoutListing,
        deviceMode,
        setDeviceMode,
        listings,
        categories,
        cities,
        users,
        transactions,
        reports,
        settings,
        notifications,
        adminLogs,
        firestoreListingIds,
        isDbSeeded,
        firebaseUser,
        authReady,
        isFirebaseAdmin,
        isAdminAuthorized,
        currentUser,
        isLoggedIn: currentUser !== null,
        signInWithGoogle,
        loginUser,
        registerWithCredentials,
        loginWithCredentials,
        registerUser,
        logoutUser,
        adminAuthenticated,
        setAdminAuthenticated,
        adminPasswordVerified: adminAuthenticated,
        loginAdmin,
        updateAdminPasswordAsync,
        seedFirestoreData: () => seedFirestoreData(false),
        selectedCity,
        setSelectedCity,
        selectedNeighborhood,
        setSelectedNeighborhood,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        conditionFilter,
        setConditionFilter,
        sortBy,
        setSortBy,
        favorites,
        toggleFavorite,
        isFavorite,
        addListing,
        updateListing,
        deleteListing,
        approveListing,
        setListingPriority,
        setListingDuration,
        uploadListingPaymentReceipt,
        rejectListing,
        suspendListing,
        trackListingView,
        trackCallClick,
        trackWhatsAppClick,
        createTransaction,
        updateTransactionStatus,
        submitReport,
        updateReportStatus,
        updateSettings,
        addCity,
        addNeighborhoodToCity,
        updateUserStatus,
        updateUserProfile,
        markNotificationRead,
        clearAllNotifications,
        addNotification,
        resetPlatformData,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
