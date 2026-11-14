import React, { useState } from 'react';
import {
  Store,
  PlusCircle,
  Eye,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  MapPin,
  Settings,
  UserCheck,
  LogOut,
  UserPlus,
  Lock,
  Camera,
  ShoppingBag,
  Mail,
  Truck,
  Loader2,
  Upload,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { Listing } from '../types';
import { compressImageFile } from '../utils/imageCompression';

interface VendorDashboardProps {
  onOpenPublishModal: () => void;
  onOpenListingDetail: (listing: Listing) => void;
  onOpenAuthModal?: () => void;
}

const formatWhatsAppNumber = (phone: string): string => {
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.startsWith('225') ? digits : `225${digits}`;
};

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  onOpenPublishModal,
  onOpenListingDetail,
  onOpenAuthModal,
}) => {
  const {
    currentUser,
    updateUserProfile,
    listings,
    transactions,
    deleteListing,
    cities,
    logoutUser,
    setCurrentView,
  } = useMarket();

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'orders' | 'purchases'
  >(() => (currentUser?.role === 'buyer' ? 'purchases' : 'all'));
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editBusiness, setEditBusiness] = useState(currentUser?.businessName || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editWhatsApp, setEditWhatsApp] = useState(currentUser?.whatsapp || '');
  const [editCity, setEditCity] = useState(currentUser?.city || cities[0]?.name || 'Divo');
  const [editNeighborhood, setEditNeighborhood] = useState(currentUser?.neighborhood || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // If visitor is not connected, show connection prompt
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-blue-100 text-blue-900 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Espace Personnel (Client & Vendeur)
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Connectez-vous ou créez votre compte pour personnaliser votre photo ou logo de profil, suivre vos achats, publier des annonces et consulter vos contacts clients.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-blue-950 font-black rounded-xl text-sm transition shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Créer un compte ou Se connecter</span>
          </button>

          <button
            onClick={() => setCurrentView('listings')}
            className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            <span>Retour au catalogue</span>
          </button>
        </div>
      </div>
    );
  }

  // STRICT ISOLATION: A vendor ONLY sees their own listings and client orders
  const vendorListings = listings.filter((l) => l.sellerId === currentUser.id);
  const vendorOrders = transactions.filter((t) => t.sellerId === currentUser.id);
  const myPurchases = transactions.filter((t) => t.buyerId === currentUser.id);

  const pendingListings = vendorListings.filter((l) => l.status === 'pending');
  const approvedListings = vendorListings.filter((l) => l.status === 'approved');
  const rejectedListings = vendorListings.filter(
    (l) => l.status === 'rejected' || l.status === 'suspended'
  );

  // Stats calculation for this vendor only
  const totalViews = vendorListings.reduce((sum, l) => sum + l.viewsCount, 0);
  const totalCalls = vendorListings.reduce((sum, l) => sum + l.callClicksCount, 0);
  const totalWhatsApp = vendorListings.reduce((sum, l) => sum + l.whatsappClicksCount, 0);

  // Filtered listings by tab
  const displayedListings = vendorListings.filter((l) => {
    if (activeTab === 'pending') return l.status === 'pending';
    if (activeTab === 'approved') return l.status === 'approved';
    if (activeTab === 'rejected') return l.status === 'rejected' || l.status === 'suspended';
    return true;
  });

  const handleToggleEditProfile = () => {
    if (!isEditingProfile) {
      setEditName(currentUser.name);
      setEditBusiness(currentUser.businessName || '');
      setEditPhone(currentUser.phone);
      setEditWhatsApp(currentUser.whatsapp);
      setEditCity(currentUser.city);
      setEditNeighborhood(currentUser.neighborhood);
      setEditBio(currentUser.bio || '');
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError(null);
    setAvatarSuccess(null);

    if (file.size > 10 * 1024 * 1024) {
      setActionError("L'image choisie est trop volumineuse (maximum 10 Mo).");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const compressed = await compressImageFile(file, 256, 50000);
      await updateUserProfile(currentUser.id, { avatarUrl: compressed });
      setAvatarSuccess('Photo / Logo de profil mis à jour avec succès !');
      setTimeout(() => setAvatarSuccess(null), 3500);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Impossible de mettre à jour votre photo ou logo de profil.'
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await updateUserProfile(currentUser.id, {
        name: editName,
        businessName: editBusiness,
        phone: editPhone,
        whatsapp: editWhatsApp,
        city: editCity,
        neighborhood: editNeighborhood,
        bio: editBio,
      });
      setIsEditingProfile(false);
      setAvatarSuccess('Vos coordonnées et votre profil ont été enregistrés.');
      setTimeout(() => setAvatarSuccess(null), 3500);
    } catch {
      setActionError('Erreur lors de la sauvegarde de votre profil dans la base de données.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setActionError(null);
    try {
      await deleteListing(id);
      setConfirmDeleteId(null);
    } catch {
      setActionError("Erreur lors de la suppression de l'annonce.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {avatarSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{avatarSuccess}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-blue-800/80 ring-4 ring-amber-400/40 shrink-0 group flex items-center justify-center">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.businessName || currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-amber-300 select-none">
                  {(currentUser.businessName || currentUser.name).charAt(0).toUpperCase()}
                </span>
              )}
              <label
                title="Télécharger ma photo de profil ou mon logo"
                className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center cursor-pointer text-[10px] font-bold text-amber-300 text-center px-1"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Photo / Logo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <label
                title="Importer une photo ou un logo"
                className="absolute bottom-1 right-1 bg-amber-400 hover:bg-amber-300 text-blue-950 p-1.5 rounded-lg shadow cursor-pointer transition"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black">
                  {currentUser.businessName || currentUser.name}
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{currentUser.role === 'buyer' ? 'Compte Client' : 'Espace Vendeur'}</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-blue-200 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {currentUser.city} • Quartier {currentUser.neighborhood}
                </span>
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-blue-200 pt-1">
                <span>
                  📞 Appel : <strong className="text-white">{currentUser.phone}</strong>
                </span>
                <span>
                  💬 WhatsApp : <strong className="text-emerald-400">{currentUser.whatsapp}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="px-4 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-amber-300/40 cursor-pointer">
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>
                {isUploadingAvatar
                  ? 'Envoi en cours...'
                  : currentUser.avatarUrl
                    ? 'Changer photo / logo'
                    : 'Télécharger photo / logo'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleToggleEditProfile}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
            >
              <Settings className="w-3.5 h-3.5 text-amber-300" />
              <span>{isEditingProfile ? "Fermer l'édition" : 'Modifier mon profil / logo'}</span>
            </button>

            <button
              onClick={onOpenPublishModal}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-blue-950 rounded-xl text-xs sm:text-sm font-black shadow-lg transition flex items-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publier une annonce</span>
            </button>

            <button
              onClick={logoutUser}
              className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-red-500/30"
              title="Se déconnecter de mon compte"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Profile edit inline drawer */}
        {isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs"
          >
            <div>
              <label className="text-blue-200 block mb-1">Nom & Prénom</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300"
              />
            </div>

            <div>
              <label className="text-blue-200 block mb-1">Nom commercial ou Boutique</label>
              <input
                type="text"
                value={editBusiness}
                onChange={(e) => setEditBusiness(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300"
              />
            </div>

            <div>
              <label className="text-blue-200 block mb-1">
                {currentUser.role === 'buyer'
                  ? 'Photo de profil ou Logo du compte'
                  : 'Photo de profil ou Logo boutique'}
              </label>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-800 border border-amber-400/50 overflow-hidden flex items-center justify-center shrink-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-black text-amber-300 text-xs">
                      {(currentUser.businessName || currentUser.name).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-amber-300 font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <span>
                    {isUploadingAvatar
                      ? 'Compression...'
                      : currentUser.avatarUrl
                        ? 'Changer photo / logo'
                        : 'Télécharger photo / logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-blue-200 block mb-1">Numéro Téléphone d'appel</label>
              <input
                type="tel"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="text-blue-200 block mb-1">Numéro WhatsApp</label>
              <input
                type="tel"
                required
                value={editWhatsApp}
                onChange={(e) => setEditWhatsApp(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="text-blue-200 block mb-1">Ville</label>
              <select
                value={editCity}
                onChange={(e) => {
                  const nextCity = e.target.value;
                  setEditCity(nextCity);
                  const cityObj = cities.find((c) => c.name === nextCity);
                  if (cityObj && cityObj.neighborhoods.length > 0) {
                    setEditNeighborhood(cityObj.neighborhoods[0]);
                  }
                }}
                className="w-full px-3 py-2 bg-blue-900 border border-white/20 rounded-xl text-white"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-blue-200 block mb-1">Quartier ou Village (liste ou saisie libre)</label>
              <input
                type="text"
                list="vendor-neighborhoods-list"
                required
                maxLength={120}
                placeholder="Choisissez ou tapez votre quartier / village..."
                value={editNeighborhood}
                onChange={(e) => setEditNeighborhood(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300"
              />
              <datalist id="vendor-neighborhoods-list">
                {(cities.find((c) => c.name.toLowerCase() === editCity.toLowerCase())?.neighborhoods || []).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-2">
              <label className="text-blue-200 block mb-1">Description / Présentation de votre activité</label>
              <input
                type="text"
                maxLength={500}
                placeholder="Ex: Livraison rapide sur Divo, garantie sur tous les produits..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-blue-950 font-black rounded-xl transition"
              >
                Enregistrer mes coordonnées
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats Cards Section (Only for this seller) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Mes Annonces</span>
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{vendorListings.length}</p>
          <span className="text-[10px] text-slate-400">Total publications</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>En Ligne</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{approvedListings.length}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Visibles au public</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>En Attente</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingListings.length}</p>
          <span className="text-[10px] text-amber-700 font-semibold">Examen admin</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Vues Reçues</span>
            <Eye className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-black text-blue-900">{totalViews}</p>
          <span className="text-[10px] text-slate-400">Sur mes articles</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Contacts Directs</span>
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{totalCalls + totalWhatsApp}</span>
            <span className="text-[10px] text-slate-500">
              ({totalCalls} tél / {totalWhatsApp} WA)
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">Clics acheteurs</span>
        </div>

        <button
          onClick={() => setActiveTab('orders')}
          className="bg-amber-50 hover:bg-amber-100 text-left p-4 rounded-2xl border border-amber-300 shadow-xs space-y-1 transition"
        >
          <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
            <span>Commandes Clients</span>
            <ShoppingBag className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-blue-950">{vendorOrders.length}</p>
          <span className="text-[10px] text-amber-800 font-semibold block">
            Voir coordonnées & relancer →
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Toutes mes annonces ({vendorListings.length})
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Approuvées</span>
              <span className="text-[10px] bg-white/20 px-1.5 rounded-full">
                {approvedListings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-blue-950 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>En attente</span>
              <span className="text-[10px] bg-blue-950/20 px-1.5 rounded-full">
                {pendingListings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Refusées / Suspendues</span>
              <span className="text-[10px] bg-white/20 px-1.5 rounded-full">
                {rejectedListings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-blue-950 shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Commandes & Clients</span>
              <span className="text-[10px] bg-blue-950 text-amber-300 px-1.5 rounded-full font-black">
                {vendorOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'purchases'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Mes Achats ({myPurchases.length})</span>
            </button>
          </div>

          <button
            onClick={onOpenPublishModal}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ajouter une publication</span>
          </button>
        </div>

        {/* BUYER PURCHASES TAB */}
        {activeTab === 'purchases' ? (
          myPurchases.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">
                Vous n'avez pas encore passé de commande
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Parcourez le catalogue DJIBOUA MARKET pour commander vos articles à Divo, Lakota, Gagnoa et Guitry.
              </p>
              <button
                onClick={() => setCurrentView('listings')}
                className="mt-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow"
              >
                Explorer le catalogue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPurchases.map((order) => (
                <div
                  key={order.id}
                  className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={order.listingPhoto}
                      alt={order.listingTitle}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                          #{order.reference}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                          {order.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                        {order.listingTitle}
                      </h4>
                      <p className="text-xs font-black text-amber-600 mt-0.5">
                        {order.totalAmount.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                    <div>Vendeur : <strong>{order.sellerName}</strong> ({order.sellerCity})</div>
                    <div>Téléphone vendeur : <strong>{order.sellerPhone}</strong></div>
                    <div>Livraison : <strong>{order.buyerCity}, {order.buyerNeighborhood}</strong></div>
                  </div>
                  <a
                    href={`tel:${order.sellerPhone.replace(/[^\d+]/g, '')}`}
                    className="w-full py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-300" />
                    <span>Contacter le vendeur</span>
                  </a>
                </div>
              ))}
            </div>
          )
        ) : /* ORDERS & CLIENT FOLLOW-UP TAB */
        activeTab === 'orders' ? (
          vendorOrders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">
                Aucune commande client enregistrée pour le moment
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Dès qu'un acheteur commande l'un de vos articles, toutes ses coordonnées (Nom, Téléphone, WhatsApp, Email, Ville et Quartier) apparaîtront ici pour vous permettre de le relancer directement.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Retrouvez ci-dessous toutes les informations et coordonnées de vos clients pour confirmer la livraison ou les relancer en un clic par <strong>Appel</strong> ou <strong>WhatsApp</strong>.
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {vendorOrders.map((order) => {
                  const waPhone = formatWhatsAppNumber(order.buyerWhatsApp || order.buyerPhone);
                  const followUpText = encodeURIComponent(
                    `Bonjour ${order.buyerName}, ici ${currentUser.businessName || currentUser.name} sur DJIBOUA MARKET concernant votre commande #${order.reference} ("${order.listingTitle}" - ${order.totalAmount.toLocaleString('fr-FR')} FCFA). Comment souhaitez-vous organiser la remise à ${order.buyerCity} (${order.buyerNeighborhood}) ?`
                  );
                  const waHref = `https://wa.me/${waPhone}?text=${followUpText}`;

                  return (
                    <div
                      key={order.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3.5"
                    >
                      {/* Top Order Header */}
                      <div className="flex items-start gap-3">
                        <img
                          src={order.listingPhoto}
                          alt={order.listingTitle}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                              #{order.reference}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                              {order.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                            {order.listingTitle}
                          </h4>
                          <div className="flex items-center gap-3 text-xs mt-1 flex-wrap">
                            <span className="font-black text-amber-600">
                              {order.totalAmount.toLocaleString('fr-FR')} FCFA
                            </span>
                            <span className="text-[11px] text-slate-500">
                              • {order.method.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-700" />
                              {order.deliveryOption === 'lokoda_express'
                                ? 'DJIBOUA Express'
                                : 'Remise en main propre'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Complete Client Contact Card */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                        <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                          Coordonnées complètes du client
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700">
                          <div>
                            <span className="text-slate-500">Client :</span>{' '}
                            <strong className="text-slate-900">{order.buyerName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Localisation :</span>{' '}
                            <strong className="text-slate-900">
                              {order.buyerCity} • {order.buyerNeighborhood}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Téléphone :</span>{' '}
                            <strong className="text-blue-900">{order.buyerPhone}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">WhatsApp :</span>{' '}
                            <strong className="text-emerald-700">
                              {order.buyerWhatsApp || order.buyerPhone}
                            </strong>
                          </div>
                          {order.buyerEmail && (
                            <div className="sm:col-span-2 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-500">Email :</span>{' '}
                              <strong className="text-slate-800">{order.buyerEmail}</strong>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1">
                          Commande passée le{' '}
                          {new Date(order.createdAt).toLocaleString('fr-FR')}
                        </div>
                      </div>

                      {/* Direct Follow-up Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <a
                          href={`tel:${order.buyerPhone.replace(/[^\d+]/g, '')}`}
                          className="py-2.5 px-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-300" />
                          <span>Appeler le client</span>
                        </a>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Relancer WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : displayedListings.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Store className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">Aucune annonce dans cet onglet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Vous n'avez pas encore publié d'annonce dans cette section. Cliquez ci-dessous pour déposer votre produit.
            </p>
            <button
              onClick={onOpenPublishModal}
              className="mt-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow"
            >
              Publier une annonce maintenant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedListings.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenListingDetail(item)}
                className="border border-slate-200 rounded-2xl p-4 flex gap-3.5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white group"
              >
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                  <span
                    className={`absolute top-1 left-1 text-[9px] font-black uppercase px-1.5 py-0.2 rounded text-white ${
                      item.status === 'approved'
                        ? 'bg-emerald-600'
                        : item.status === 'pending'
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                    }`}
                  >
                    {item.status === 'approved'
                      ? 'En ligne'
                      : item.status === 'pending'
                        ? 'Examen'
                        : 'Refusée'}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-sm font-black text-amber-600">
                        {item.price.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition">
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>
                        {item.city} • {item.neighborhood}
                      </span>
                    </p>

                    {item.rejectionReason && (
                      <p className="text-[10px] text-red-600 font-semibold mt-1 bg-red-50 p-1 rounded">
                        Motif : {item.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Vues">
                        <Eye className="w-3 h-3" />
                        <span>{item.viewsCount}</span>
                      </span>
                      <span className="flex items-center gap-1 text-blue-700" title="Appels reçus">
                        <Phone className="w-3 h-3" />
                        <span>{item.callClicksCount}</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700" title="WhatsApp reçus">
                        <MessageCircle className="w-3 h-3" />
                        <span>{item.whatsappClicksCount}</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className={`px-2 py-1 rounded transition text-[11px] font-bold flex items-center gap-1 ${
                        confirmDeleteId === item.id
                          ? 'bg-red-600 text-white'
                          : 'text-slate-400 hover:text-red-600'
                      }`}
                      title="Supprimer mon annonce"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDeleteId === item.id && <span>Confirmer</span>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
