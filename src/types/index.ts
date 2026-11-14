export type CityId = 'divo' | 'lakota' | 'gagnoa' | string;

export interface City {
  id: CityId;
  name: string;
  region: string;
  neighborhoods: string[];
  active: boolean;
}

export type ListingCondition = 'neuf' | 'occasion';
export type ListingStatus = 'approved' | 'pending' | 'rejected' | 'suspended';

export interface Listing {
  id: string;
  title: string;
  price: number; // in FCFA
  description: string;
  categoryId: string;
  condition: ListingCondition;
  status: ListingStatus;
  rejectionReason?: string;
  photos: string[];
  sellerId: string;
  sellerName: string;
  sellerBusinessName?: string;
  sellerPhone: string;
  sellerWhatsApp: string;
  sellerAvatar?: string;
  sellerRating?: number;
  sellerVerified?: boolean;
  city: string;
  neighborhood: string;
  addressDetails?: string;
  createdAt: string;
  updatedAt?: string;
  viewsCount: number;
  callClicksCount: number;
  whatsappClicksCount: number;
  featured?: boolean;
  popular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  slug: string;
  description: string;
  listingCount?: number;
  active?: boolean;
}

export type UserRole = 'visitor' | 'buyer' | 'seller' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  whatsapp: string;
  password?: string;
  role: UserRole;
  city: string;
  neighborhood: string;
  avatarUrl: string;
  bio?: string;
  registeredAt: string;
  status: 'active' | 'suspended' | 'blocked';
  rating?: number;
}

export type PaymentMethod = 
  | 'wave' 
  | 'orange_money' 
  | 'mtn_momo' 
  | 'moov_money' 
  | 'cinetpay' 
  | 'cash_on_delivery';

export type PaymentStatus = 
  | 'initiated' 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export type DeliveryOption = 'direct' | 'lokoda_express';

export interface Transaction {
  id: string;
  reference: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string;
  amount: number; // FCFA
  deliveryFee: number;
  totalAmount: number;
  buyerId?: string;
  buyerName: string;
  buyerPhone: string;
  buyerWhatsApp?: string;
  buyerEmail?: string;
  buyerCity: string;
  buyerNeighborhood: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerCity: string;
  method: PaymentMethod;
  status: PaymentStatus;
  deliveryOption: DeliveryOption;
  createdAt: string;
  paidAt?: string;
}

export type ReportReason = 
  | 'arnaque' 
  | 'faux_produit' 
  | 'mauvaise_description' 
  | 'produit_interdit' 
  | 'prix_trompeur' 
  | 'contenu_inapproprie' 
  | 'vendeur_suspect';

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerName: string;
  reporterId?: string;
  reason: ReportReason;
  comment: string;
  reporterContact?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

export interface AdminLog {
  id: string;
  action: string;
  targetType: 'listing' | 'user' | 'category' | 'city' | 'setting' | 'payment';
  targetId: string;
  performedBy: string;
  adminId?: string;
  timestamp: string;
  details?: string;
}

export interface PlatformSettings {
  siteName: string;
  tagline: string;
  symbol: string;
  contactPhone: string;
  contactWhatsApp: string;
  contactEmail: string;
  cities: City[];
  autoApproveListings: boolean;
  deliveryMode: 'both' | 'direct_only' | 'lokoda_only';
  commissionRate: number; // percentage (e.g., 2.5)
  minListingPrice: number;
  maxPhotosPerListing: number;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'approval' | 'rejection' | 'transaction' | 'system';
  read: boolean;
  createdAt: string;
}
