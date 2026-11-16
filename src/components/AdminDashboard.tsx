import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Store, 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Settings as SettingsIcon, 
  FileText, 
  Download, 
  Key, 
  Search, 
  Plus, 
  MapPin, 
  TrendingUp, 
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  LogOut,
  Sliders,
  DollarSign,
  Megaphone,
  ArrowUp,
  ArrowDown,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Star,
  CalendarClock,
  Receipt,
  MessageCircle,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { INITIAL_PROMO_BANNERS } from '../data/initialData';
import { PromoBannerCarousel } from './PromoBannerCarousel';
import {
  LISTING_DURATIONS,
  Listing,
  UserProfile,
  City,
  Category,
  PlatformSettings,
  PromoBannerSlide,
  PromoBannerTheme,
} from '../types';

export const AdminDashboard: React.FC = () => {
  const { 
    adminAuthenticated, 
    loginAdmin,
    updateAdminPasswordAsync,
    setAdminAuthenticated, 
    setCurrentView,
    listings,
    approveListing,
    setListingPriority,
    setListingDuration,
    rejectListing,
    suspendListing,
    users,
    updateUserStatus,
    transactions,
    updateTransactionStatus,
    reports,
    updateReportStatus,
    cities,
    addCity,
    addNeighborhoodToCity,
    categories,
    settings,
    updateSettings,
    adminLogs,
    resetPlatformData,
    isAdminAuthorized,
    seedFirestoreData,
    isDbSeeded,
  } = useMarket();

  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'seller' | 'buyer' | 'admin'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [financeSearchQuery, setFinanceSearchQuery] = useState('');

  const [dbActionMessage, setDbActionMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Login Form State (never prefill or expose credentials in DOM)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Password Update Modal / Form
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'moderation' | 'users' | 'locations' | 'finance' | 'reports' | 'banners' | 'settings' | 'logs'
  >('overview');

  // Promo Banners Draft State (Admin Only)
  const [draftBanners, setDraftBanners] = useState<PromoBannerSlide[]>(
    () => settings.promoBanners || INITIAL_PROMO_BANNERS
  );
  const [isSavingBanners, setIsSavingBanners] = useState(false);
  const [bannerStatusMsg, setBannerStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [adminWhatsAppDraft, setAdminWhatsAppDraft] = useState(() => settings.contactWhatsApp || '0777733284');
  const [receiptModalListing, setReceiptModalListing] = useState<Listing | null>(null);

  React.useEffect(() => {
    if (settings.promoBanners) {
      setDraftBanners(settings.promoBanners);
    }
  }, [settings.promoBanners]);

  React.useEffect(() => {
    if (settings.contactWhatsApp) {
      setAdminWhatsAppDraft(settings.contactWhatsApp);
    }
  }, [settings.contactWhatsApp]);

  // Search & Filter state
  const [searchModQuery, setSearchModQuery] = useState('');
  const [modFilter, setModFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectReasonInput, setRejectReasonInput] = useState<{ [id: string]: string }>({});

  // New City / Neighborhood Form
  const [newCityName, setNewCityName] = useState('');
  const [newCityRegion, setNewCityRegion] = useState('');
  const [selectedCityForNeighborhood, setSelectedCityForNeighborhood] = useState(cities[0]?.id || 'divo');
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');

  // Handles Login with Adminlokoda via server-signed HMAC admin session
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await loginAdmin(loginUsername, loginPassword);
      if (res.ok) {
        setLoginPassword('');
      } else {
        setLoginError(res.error || 'Identifiant ou mot de passe administrateur incorrect.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess('');
    if (newPassword.length < 8) {
      setPasswordChangeError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await updateAdminPasswordAsync(oldPassword, newPassword);
      if (res.ok) {
        setPasswordChangeSuccess('Mot de passe administrateur mis à jour avec succès.');
        setOldPassword('');
        setNewPassword('');
        setTimeout(() => setShowPasswordChange(false), 2000);
      } else {
        setPasswordChangeError(res.error || "L'ancien mot de passe fourni est incorrect.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAddNewCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    const cityId = newCityName.trim().toLowerCase().replace(/\s+/g, '_');
    addCity({
      id: cityId,
      name: newCityName.trim(),
      region: newCityRegion.trim() || 'Côte d\'Ivoire',
      neighborhoods: ['Centre-ville', 'Grand Marché'],
      active: true,
    });
    setNewCityName('');
    setNewCityRegion('');
  };

  const handleAddNeighborhood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeighborhoodName.trim()) return;
    addNeighborhoodToCity(selectedCityForNeighborhood, newNeighborhoodName.trim());
    setNewNeighborhoodName('');
  };

  const handleExportCSV = () => {
    const csvContent =
      'ID,Titre,Prix,Ville,Quartier,Statut,Vendeur,Vues,Appels,WhatsApp\n' +
      listings
        .map(
          (l) =>
            `"${l.id}","${l.title.replace(/"/g, '""')}",${l.price},"${l.city}","${l.neighborhood}","${l.status}","${l.sellerName}",${l.viewsCount},${l.callClicksCount},${l.whatsappClicksCount}`
        )
        .join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `djiboua_market_annonces_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Stats KPIs (Section 7.3)
  const totalUsers = users.length;
  const totalVendors = users.filter(u => u.role === 'seller').length;
  const totalBuyers = users.filter(u => u.role === 'buyer').length;
  const totalListings = listings.length;
  const approvedCount = listings.filter(l => l.status === 'approved').length;
  const pendingCount = listings.filter(l => l.status === 'pending').length;
  const rejectedCount = listings.filter(l => l.status === 'rejected' || l.status === 'suspended').length;
  const totalTransactionsCount = transactions.length;
  const totalVolumeFCFA = transactions.reduce((acc, t) => acc + t.totalAmount, 0);

  // If not logged in to the private zone, show strict login screen (Section 7.1 & 7.2)
  if (!adminAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-900">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-amber-500 flex items-center justify-center mx-auto shadow-lg ring-4 ring-slate-700">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Espace Administration Privé</h1>
            <p className="text-xs text-slate-400">
              Accès strictement restreint • DJIBOUA MARKET
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-900/60 border border-red-500/60 rounded-xl text-xs text-red-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Identifiant administratif</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Identifiant administrateur"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Mot de passe sécurisé</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-blue-950 font-black rounded-xl text-sm transition shadow-lg active:scale-95 mt-2"
            >
              {isLoggingIn ? 'Vérification sécurisée...' : "Déverrouiller le portail d'administration"}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-700">
            <button
              onClick={() => setCurrentView('home')}
              className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au site public DJIBOUA MARKET</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter listings for moderation
  const filteredModerationListings = listings.filter(l => {
    if (modFilter === 'pending' && l.status !== 'pending') return false;
    if (modFilter === 'approved' && l.status !== 'approved') return false;
    if (modFilter === 'rejected' && (l.status !== 'rejected' && l.status !== 'suspended')) return false;
    if (searchModQuery) {
      const q = searchModQuery.toLowerCase();
      return (
        l.title.toLowerCase().includes(q) ||
        l.sellerName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Admin Top Header */}
      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-blue-950 flex items-center justify-center font-black">
              🐘
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wide">DJIBOUA MARKET • GESTION PRIVÉE</span>
                <span className="bg-amber-400 text-blue-950 text-[10px] font-black px-1.5 py-0.2 rounded">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-[10px] text-blue-200">
                Administration centrale Divo • Lakota • Gagnoa • Guitry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Modifier le mot de passe administrateur"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sécurité MDP</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Exporter les données en CSV/Excel"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Exporter CSV</span>
            </button>

            <button
              onClick={() => setAdminAuthenticated(false)}
              className="px-3 py-1.5 bg-red-900/60 hover:bg-red-900 text-red-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              title="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>

            <button
              onClick={() => setCurrentView('home')}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voir le Site</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none py-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Tableau de Bord</span>
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'moderation' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Modération Annonces</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Utilisateurs & Vendeurs ({totalUsers})</span>
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'locations' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Villes & Quartiers ({cities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'finance' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Paiements & Commandes ({totalTransactionsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'reports' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Signalements ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'banners' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Bannière Pub ({draftBanners.filter(b => b.active).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Règles & Paramètres</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'logs' ? 'bg-amber-400 text-blue-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Journal d'audit ({adminLogs.length})</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isAdminAuthorized && !isDbSeeded && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-blue-950 font-semibold">
              Plateforme prête. Cliquez pour synchroniser les villes, catégories et annonces initiales si nécessaire.
            </p>
            <button
              onClick={() => void seedFirestoreData()}
              className="px-4 py-2 bg-blue-900 text-white font-bold rounded-xl text-xs shrink-0"
            >
              Initialiser les données
            </button>
          </div>
        )}

        {dbActionMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold border ${
              dbActionMessage.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {dbActionMessage.text}
          </div>
        )}

        {/* Change password modal dropdown if requested */}
        {showPasswordChange && (
          <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Renouveler le mot de passe administrateur (Section 7.2)</span>
              </h4>
              <button onClick={() => setShowPasswordChange(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordChangeSuccess && (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg font-medium">{passwordChangeSuccess}</p>
            )}
            {passwordChangeError && (
              <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg font-medium">{passwordChangeError}</p>
            )}

            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 mb-1 block">Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-slate-600 mb-1 block">Nouveau mot de passe sécurisé</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full py-2 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-950 disabled:opacity-60 transition"
                >
                  {isUpdatingPassword ? 'Enregistrement...' : 'Sauvegarder le nouveau mot de passe'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 1: OVERVIEW & KPIS (Section 7.3) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Vue d'ensemble de la plateforme</h2>
                <p className="text-xs text-slate-500">Statistiques en temps réel pour Divo, Lakota, Gagnoa et Guitry</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Rapport Synthétique</span>
              </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>TOTAL ANNONCES</span>
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{totalListings}</div>
                <div className="text-[11px] text-slate-500">
                  <span className="text-emerald-600 font-bold">{approvedCount}</span> en ligne • <span className="text-amber-600 font-bold">{pendingCount}</span> en attente
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>UTILISATEURS</span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{totalUsers}</div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-bold text-blue-900">{totalVendors}</span> vendeurs • <span className="font-bold">{totalBuyers}</span> acheteurs
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>TRANSACTIONS CONFIRMÉES</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600">{totalTransactionsCount}</div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  Volume : {totalVolumeFCFA.toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>ZONES COUVERTES</span>
                  <MapPin className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900">{cities.length} Villes</div>
                <div className="text-[11px] text-slate-500">
                  Divo, Lakota, Gagnoa, Guitry (+ quartiers)
                </div>
              </div>
            </div>

            {/* City Distribution & Categories distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* City Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between">
                  <span>Répartition géographique des annonces</span>
                  <MapPin className="w-4 h-4 text-blue-600" />
                </h3>

                <div className="space-y-3">
                  {cities.map(city => {
                    const count = listings.filter(l => l.city.toLowerCase() === city.name.toLowerCase()).length;
                    const percent = totalListings > 0 ? Math.round((count / totalListings) * 100) : 0;

                    return (
                      <div key={city.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-800">{city.name} ({city.region})</span>
                          <span className="text-slate-500">{count} annonces ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-800 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Moderation Status Breakdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between">
                  <span>Statuts des annonces</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Annonces Approuvées & En Ligne</span>
                    </span>
                    <span className="font-black text-emerald-800 text-sm">{approvedCount}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Annonces en Attente de Modération</span>
                    </span>
                    <span className="font-black text-amber-800 text-sm">{pendingCount}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-200">
                    <span className="font-bold text-red-900 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Annonces Refusées ou Suspendues</span>
                    </span>
                    <span className="font-black text-red-800 text-sm">{rejectedCount}</span>
                  </div>
                </div>

                {pendingCount > 0 && (
                  <button
                    onClick={() => {
                      setModFilter('pending');
                      setActiveTab('moderation');
                    }}
                    className="w-full py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition"
                  >
                    Examiner les {pendingCount} annonce(s) en attente maintenant →
                  </button>
                )}
              </div>
            </div>

            {/* Recent Clients & Transactions Summary on Overview */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Derniers clients & transactions récentes
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Aperçu direct des commandes clients enregistrées sur DJIBOUA MARKET
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('finance')}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  Voir tout ({transactions.length}) →
                </button>
              </div>

              {transactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Aucune transaction enregistrée pour le moment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Réf</th>
                        <th className="p-2.5">Client & Coordonnées</th>
                        <th className="p-2.5">Article & Vendeur</th>
                        <th className="p-2.5">Montant</th>
                        <th className="p-2.5">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.slice(0, 5).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-blue-900">{t.reference}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{t.buyerName}</div>
                            <div className="text-[11px] text-slate-500">
                              {t.buyerPhone} • {t.buyerCity} ({t.buyerNeighborhood})
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-800 line-clamp-1">{t.listingTitle}</div>
                            <div className="text-[11px] text-slate-500">Vendeur : {t.sellerName}</div>
                          </td>
                          <td className="p-2.5 font-black text-amber-600">
                            {t.totalAmount.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="p-2.5">
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MODERATION (Section 7.6) */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Modération des annonces</h2>
                <p className="text-xs text-slate-500">Contrôlez les photos, titres, descriptions et prix avant mise en ligne.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    modFilter === 'pending' ? 'bg-amber-500 text-blue-950' : 'bg-white text-slate-700 border'
                  }`}
                >
                  En attente ({pendingCount})
                </button>
                <button
                  onClick={() => setModFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    modFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border'
                  }`}
                >
                  Approuvées ({approvedCount})
                </button>
                <button
                  onClick={() => setModFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    modFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border'
                  }`}
                >
                  Refusées ({rejectedCount})
                </button>
                <button
                  onClick={() => setModFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    modFilter === 'all' ? 'bg-blue-900 text-white' : 'bg-white text-slate-700 border'
                  }`}
                >
                  Toutes
                </button>
              </div>
            </div>

            {/* Moderation Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une annonce par titre, vendeur, ville..."
                value={searchModQuery}
                onChange={(e) => setSearchModQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* List of Ads to Moderate */}
            {filteredModerationListings.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800">Aucune annonce trouvée dans cette sélection</h4>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredModerationListings.map(listing => {
                  const durationInfo = LISTING_DURATIONS.find(
                    (d) => d.days === listing.durationDays
                  );
                  const isExpired = Boolean(
                    listing.expiresAt && new Date(listing.expiresAt).getTime() <= Date.now()
                  );

                  return (
                    <div
                      key={listing.id}
                      className={`bg-white p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row gap-4 items-start justify-between ${
                        listing.isPriority ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex gap-4 min-w-0 flex-1">
                        <img
                          src={listing.photos[0]}
                          alt=""
                          className="w-24 h-24 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100"
                        />
                        <div className="space-y-1.5 text-xs min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                              listing.status === 'approved' ? 'bg-emerald-600' : listing.status === 'pending' ? 'bg-amber-500' : 'bg-red-600'
                            }`}>
                              {listing.status}
                            </span>
                            {listing.isPriority && (
                              <span className="bg-amber-400 text-blue-950 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                ★ Prioritaire
                              </span>
                            )}
                            {durationInfo && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  isExpired
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-indigo-50 text-indigo-800'
                                }`}
                              >
                                <CalendarClock className="w-3 h-3" />
                                <span>
                                  {isExpired
                                    ? `Expirée (${durationInfo.label})`
                                    : `Durée: ${durationInfo.label}${listing.expiresAt ? ` • Jusqu'au ${new Date(listing.expiresAt).toLocaleDateString('fr-FR')}` : ''}`}
                                </span>
                              </span>
                            )}
                            <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                              📍 {listing.city} • {listing.neighborhood}
                            </span>
                            <span className="text-slate-400">
                              {new Date(listing.createdAt).toLocaleString('fr-FR')}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-slate-900">{listing.title}</h4>

                          <div className="text-amber-600 font-black text-sm">
                            {listing.price.toLocaleString('fr-FR')} FCFA • <span className="text-slate-500 text-xs font-normal">État: {listing.condition}</span>
                          </div>

                          <p className="text-slate-600 line-clamp-2 max-w-xl">
                            {listing.description}
                          </p>

                          <div className="text-[11px] text-slate-500 pt-0.5">
                            Vendeur : <strong>{listing.sellerName}</strong> • Tél: {listing.sellerPhone} • WA: {listing.sellerWhatsApp}
                          </div>

                          {listing.paymentReceiptUrl && (
                            <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 max-w-xl">
                              <div className="flex items-center gap-2 min-w-0">
                                {listing.paymentReceiptUrl.startsWith('data:image/') ? (
                                  <img
                                    src={listing.paymentReceiptUrl}
                                    alt="Reçu vendeur"
                                    className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shrink-0 cursor-pointer"
                                    onClick={() => setReceiptModalListing(listing)}
                                  />
                                ) : (
                                  <Receipt className="w-5 h-5 text-emerald-700 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-emerald-900 truncate">
                                    Reçu de paiement joint : {listing.paymentReceiptName || 'capture'}
                                  </div>
                                  {listing.paymentReceiptSentAt && (
                                    <div className="text-[10px] text-emerald-700">
                                      Envoyé le {new Date(listing.paymentReceiptSentAt).toLocaleString('fr-FR')}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setReceiptModalListing(listing)}
                                  className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-bold"
                                >
                                  Voir la capture
                                </button>
                                <a
                                  href={listing.paymentReceiptUrl}
                                  download={listing.paymentReceiptName || `recu_${listing.id}`}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold"
                                >
                                  Télécharger
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Moderation Actions: Priority, Duration, Approve, Reject */}
                      <div className="flex flex-col gap-2 w-full md:w-64 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 text-xs">
                        {/* Priority Toggle */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await setListingPriority(listing.id, !listing.isPriority);
                            } catch (err) {
                              setDbActionMessage({
                                type: 'err',
                                text: err instanceof Error ? err.message : 'Erreur priorité',
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border ${
                            listing.isPriority
                              ? 'bg-amber-400 hover:bg-amber-500 text-blue-950 border-amber-500'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${listing.isPriority ? 'fill-blue-950' : ''}`} />
                          <span>{listing.isPriority ? 'Retirer Prioritaire' : 'Mettre Prioritaire'}</span>
                        </button>

                        {/* Duration Selector */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                            <CalendarClock className="w-3 h-3 text-blue-700" />
                            <span>Durée d'affichage</span>
                          </label>
                          <select
                            value={listing.durationDays ?? ''}
                            onChange={async (e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              try {
                                await setListingDuration(listing.id, val);
                                setDbActionMessage({
                                  type: 'ok',
                                  text: val
                                    ? `Durée définie à ${LISTING_DURATIONS.find((d) => d.days === val)?.label} pour "${listing.title}".`
                                    : `Durée illimitée rétablie pour "${listing.title}".`,
                                });
                              } catch (err) {
                                setDbActionMessage({
                                  type: 'err',
                                  text: err instanceof Error ? err.message : 'Erreur durée',
                                });
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            <option value="">Illimitée (sans expiration)</option>
                            {LISTING_DURATIONS.map((d) => (
                              <option key={d.days} value={d.days}>
                                {d.label} ({d.days} jours)
                              </option>
                            ))}
                          </select>
                        </div>

                        {listing.status !== 'approved' && (
                          <button
                            onClick={() =>
                              approveListing(listing.id, {
                                durationDays: listing.durationDays ?? null,
                                isPriority: listing.isPriority,
                              })
                            }
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approuver & Mettre en ligne</span>
                          </button>
                        )}

                        {listing.status !== 'rejected' && (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              placeholder="Motif de refus..."
                              value={rejectReasonInput[listing.id] || ''}
                              onChange={(e) => setRejectReasonInput({ ...rejectReasonInput, [listing.id]: e.target.value })}
                              className="px-2 py-1 text-[11px] border border-slate-300 rounded-lg"
                            />
                            <button
                              onClick={() => {
                                const reason = rejectReasonInput[listing.id] || 'Non conforme aux règles de publication DJIBOUA MARKET';
                                rejectListing(listing.id, reason);
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Refuser l'annonce</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USERS & SELLERS (Section 7.4 & 7.5) */}
        {activeTab === 'users' && (() => {
          const filteredUsers = users.filter((u) => {
            if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
            if (userSearchQuery.trim()) {
              const q = userSearchQuery.toLowerCase();
              return (
                u.name.toLowerCase().includes(q) ||
                (u.businessName || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q) ||
                u.city.toLowerCase().includes(q) ||
                u.neighborhood.toLowerCase().includes(q)
              );
            }
            return true;
          });

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Gestion complète des clients, vendeurs & comptes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Informations générales, identités et coordonnées vérifiées ({filteredUsers.length} affichés)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setUserRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'all' ? 'bg-blue-900 text-white' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    Tous ({users.length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('seller')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'seller' ? 'bg-blue-900 text-white' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    Vendeurs ({totalVendors})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter('buyer')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'buyer' ? 'bg-blue-900 text-white' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    Clients / Acheteurs ({totalBuyers})
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher un client ou vendeur par nom, boutique, téléphone, email, ville..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">Utilisateur / Boutique</th>
                        <th className="p-3">Rôle</th>
                        <th className="p-3">Localisation</th>
                        <th className="p-3">Coordonnées complètes</th>
                        <th className="p-3">Inscription</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold overflow-hidden shrink-0 border border-slate-200">
                                {u.avatarUrl ? (
                                  <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  u.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{u.name}</div>
                                {u.businessName && (
                                  <div className="text-[10px] text-blue-800 font-semibold">{u.businessName}</div>
                                )}
                                <div className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 12)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'seller'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {u.role === 'buyer' ? 'Client' : u.role === 'seller' ? 'Vendeur' : 'Admin'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">
                            <div className="font-semibold">{u.city}</div>
                            <div className="text-[10px] text-slate-500">{u.neighborhood}</div>
                          </td>
                          <td className="p-3 text-slate-700 space-y-0.5">
                            <div>📞 Tél : <strong>{u.phone || 'Non renseigné'}</strong></div>
                            <div>💬 WA : <strong className="text-emerald-700">{u.whatsapp || u.phone || 'Non renseigné'}</strong></div>
                            {u.email && (
                              <div className="text-[11px] text-slate-600">✉️ {u.email}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {u.status === 'active' ? (
                              <button
                                onClick={() => updateUserStatus(u.id, 'suspended')}
                                className="text-red-600 hover:underline font-bold"
                              >
                                Suspendre
                              </button>
                            ) : (
                              <button
                                onClick={() => updateUserStatus(u.id, 'active')}
                                className="text-emerald-600 hover:underline font-bold"
                              >
                                Réactiver
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: LOCATIONS & EXTENSION (Section 3 & 7.7) */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Zones géographiques & Quartiers</h2>
              <p className="text-xs text-slate-500">
                Gérez les villes autorisées et ajoutez des quartiers ou villages pour le déploiement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add New City */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Ajouter une nouvelle ville (ex: Yamoussoukro, Abidjan)</span>
                </h3>
                <form onSubmit={handleAddNewCity} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 mb-1 block">Nom de la Ville</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Yamoussoukro"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 mb-1 block">Région</label>
                    <input
                      type="text"
                      placeholder="Ex: Bélier"
                      value={newCityRegion}
                      onChange={(e) => setNewCityRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-950 transition"
                  >
                    Enregistrer la nouvelle ville
                  </button>
                </form>
              </div>

              {/* Add Neighborhood to Existing City */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-500" />
                  <span>Ajouter un Quartier ou Village</span>
                </h3>
                <form onSubmit={handleAddNeighborhood} className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 mb-1 block">Sélectionner la Ville</label>
                    <select
                      value={selectedCityForNeighborhood}
                      onChange={(e) => setSelectedCityForNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                    >
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-600 mb-1 block">Nom du Quartier ou Village</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Nouveau Quartier / Village X..."
                      value={newNeighborhoodName}
                      onChange={(e) => setNewNeighborhoodName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 text-blue-950 font-bold rounded-xl hover:bg-amber-600 transition"
                  >
                    Ajouter le quartier à la ville
                  </button>
                </form>
              </div>
            </div>

            {/* Existing Cities and their neighborhoods */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cities.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <div className="flex items-center justify-between font-black text-slate-900 text-sm">
                    <span>📍 {c.name}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-normal">
                      {c.region}
                    </span>
                  </div>
                  <div className="text-slate-500 font-semibold text-[11px]">
                    Quartiers enregistrés ({c.neighborhoods.length}) :
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                    {c.neighborhoods.map((n, i) => (
                      <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FINANCE & TRANSACTIONS (Section 8.3) */}
        {activeTab === 'finance' && (() => {
          const filteredTransactions = transactions.filter((t) => {
            if (!financeSearchQuery.trim()) return true;
            const q = financeSearchQuery.toLowerCase();
            return (
              t.reference.toLowerCase().includes(q) ||
              t.listingTitle.toLowerCase().includes(q) ||
              t.buyerName.toLowerCase().includes(q) ||
              t.buyerPhone.toLowerCase().includes(q) ||
              (t.buyerEmail || '').toLowerCase().includes(q) ||
              t.buyerCity.toLowerCase().includes(q) ||
              t.sellerName.toLowerCase().includes(q)
            );
          });

          const totalCommissionFCFA = filteredTransactions.reduce(
            (sum, t) => sum + Math.round((t.amount * settings.commissionRate) / 100),
            0
          );

          const handleExportTransactionsCSV = () => {
            const csv =
              'Reference,Date,Article,PrixArticle,Livraison,Total,Client,TelClient,WhatsAppClient,EmailClient,VilleClient,QuartierClient,Vendeur,TelVendeur,VilleVendeur,Methode,ModeLivraison,Statut\n' +
              filteredTransactions
                .map((t) =>
                  `"${t.reference}","${t.createdAt}","${t.listingTitle.replace(/"/g, '""')}",${t.amount},${t.deliveryFee},${t.totalAmount},"${t.buyerName}","${t.buyerPhone}","${t.buyerWhatsApp || t.buyerPhone}","${t.buyerEmail || ''}","${t.buyerCity}","${t.buyerNeighborhood}","${t.sellerName}","${t.sellerPhone}","${t.sellerCity}","${t.method}","${t.deliveryOption}","${t.status}"`
                )
                .join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute(
              'download',
              `djiboua_transactions_clients_${new Date().toISOString().split('T')[0]}.csv`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Suivi Financier, Clients & Transactions Complètes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Détails complets des commandes, coordonnées clients, vendeurs et commissions ({settings.commissionRate}%)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleExportTransactionsCSV}
                    className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter Clients & Transactions CSV</span>
                  </button>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">
                      Volume Total ({totalCommissionFCFA.toLocaleString('fr-FR')} FCFA comm.)
                    </span>
                    <span className="text-xl font-black text-emerald-600">
                      {totalVolumeFCFA.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrer par référence (#LOK-...), client, téléphone, email, vendeur, article ou ville..."
                  value={financeSearchQuery}
                  onChange={(e) => setFinanceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">Réf & Date</th>
                        <th className="p-3">Article commandé</th>
                        <th className="p-3">Informations Client</th>
                        <th className="p-3">Vendeur</th>
                        <th className="p-3">Paiement & Livraison</th>
                        <th className="p-3">Détail Montants</th>
                        <th className="p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((t) => {
                        const commissionAmt = Math.round((t.amount * settings.commissionRate) / 100);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 align-top">
                            <td className="p-3">
                              <div className="font-mono font-bold text-blue-900">{t.reference}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(t.createdAt).toLocaleString('fr-FR')}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={t.listingPhoto}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                                <span className="font-semibold text-slate-900 max-w-[180px] line-clamp-2">
                                  {t.listingTitle}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 space-y-0.5 text-slate-700">
                              <div className="font-bold text-slate-900">{t.buyerName}</div>
                              <div>📞 {t.buyerPhone}</div>
                              <div>💬 WA : <span className="text-emerald-700 font-semibold">{t.buyerWhatsApp || t.buyerPhone}</span></div>
                              {t.buyerEmail && <div className="text-[11px] text-slate-500">✉️ {t.buyerEmail}</div>}
                              <div className="text-[11px] text-blue-800 font-medium">
                                📍 {t.buyerCity} • {t.buyerNeighborhood}
                              </div>
                            </td>
                            <td className="p-3 space-y-0.5 text-slate-700">
                              <div className="font-bold text-slate-900">{t.sellerName}</div>
                              <div>📞 {t.sellerPhone}</div>
                              <div className="text-[11px] text-slate-500">📍 {t.sellerCity}</div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {t.method}
                              </span>
                              <span className="text-slate-500 block text-[10px] mt-1">
                                {t.deliveryOption === 'lokoda_express'
                                  ? 'DJIBOUA Express'
                                  : 'Remise directe'}
                              </span>
                            </td>
                            <td className="p-3 space-y-0.5">
                              <div className="font-black text-amber-600">
                                {t.totalAmount.toLocaleString('fr-FR')} FCFA
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Article: {t.amount.toLocaleString('fr-FR')} • Livr.: {t.deliveryFee.toLocaleString('fr-FR')}
                              </div>
                              <div className="text-[10px] text-emerald-700 font-semibold">
                                Comm. ({settings.commissionRate}%): {commissionAmt.toLocaleString('fr-FR')} FCFA
                              </div>
                            </td>
                            <td className="p-3">
                              <select
                                value={t.status}
                                disabled={t.status === 'refunded'}
                                onChange={(e) =>
                                  void updateTransactionStatus(
                                    t.id,
                                    e.target.value as typeof t.status
                                  )
                                }
                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border cursor-pointer ${
                                  t.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : t.status === 'pending' || t.status === 'initiated'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                <option value="paid">PAID</option>
                                <option value="pending">PENDING</option>
                                <option value="failed">FAILED</option>
                                <option value="refunded">REFUNDED</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 6: REPORTS (Section 7.8) */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">Signalements d'annonces suspectes</h2>
            {reports.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-500">Aucun signalement en attente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="bg-white p-4 rounded-2xl border border-red-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        Motif : {r.reason}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900">Annonce : {r.listingTitle}</h4>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-xl">"{r.comment}"</p>

                    <div className="flex items-center justify-between pt-1 text-slate-500">
                      <span>Vendeur signalé : {r.sellerName}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateReportStatus(r.id, 'dismissed')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                        >
                          Classer sans suite
                        </button>
                        <button
                          onClick={() => {
                            suspendListing(r.listingId, `Signalement vérifié: ${r.reason}`);
                            updateReportStatus(r.id, 'action_taken');
                          }}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                        >
                          Suspendre l'annonce
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: BANNERS / NAV CAROUSEL (ADMIN ONLY) */}
        {activeTab === 'banners' && (() => {
          const handleAddSlide = () => {
            const newSlide: PromoBannerSlide = {
              id: `pub_${Date.now()}`,
              badge: 'PROMO',
              title: 'Nouvelle offre DJIBOUA MARKET',
              subtitle: 'Profitez des meilleurs prix à Divo, Lakota, Gagnoa & Guitry.',
              ctaLabel: 'Voir les offres',
              ctaUrl: '#listings',
              theme: 'royal',
              active: true,
            };
            setDraftBanners((prev) => [...prev, newSlide]);
            setBannerStatusMsg(null);
          };

          const updateSlide = (index: number, patch: Partial<PromoBannerSlide>) => {
            setDraftBanners((prev) =>
              prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
            );
            setBannerStatusMsg(null);
          };

          const moveSlide = (index: number, direction: -1 | 1) => {
            const target = index + direction;
            if (target < 0 || target >= draftBanners.length) return;
            setDraftBanners((prev) => {
              const copy = [...prev];
              const [removed] = copy.splice(index, 1);
              copy.splice(target, 0, removed);
              return copy;
            });
            setBannerStatusMsg(null);
          };

          const deleteSlide = (index: number) => {
            setDraftBanners((prev) => prev.filter((_, idx) => idx !== index));
            setBannerStatusMsg(null);
          };

          const handleUploadBannerImage = (index: number, file: File) => {
            const reader = new FileReader();
            reader.onload = () => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxWidth = 600;
                const scale = Math.min(1, maxWidth / img.width);
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  updateSlide(index, { imageUrl: canvas.toDataURL('image/jpeg', 0.82) });
                }
              };
              if (typeof reader.result === 'string') {
                img.src = reader.result;
              }
            };
            reader.readAsDataURL(file);
          };

          const handleSaveBanners = async () => {
            const invalid = draftBanners.some((b) => !b.title.trim());
            if (invalid) {
              setBannerStatusMsg({
                type: 'err',
                text: 'Chaque bannière doit obligatoirement comporter un titre.',
              });
              return;
            }
            setIsSavingBanners(true);
            setBannerStatusMsg(null);
            try {
              await updateSettings({ promoBanners: draftBanners });
              setBannerStatusMsg({
                type: 'ok',
                text: 'Carrousel publicitaire enregistré et mis en ligne dans la barre de navigation !',
              });
            } catch (err) {
              setBannerStatusMsg({
                type: 'err',
                text:
                  err instanceof Error
                    ? err.message
                    : "Erreur lors de l'enregistrement. Vérifiez votre session administrateur.",
              });
            } finally {
              setIsSavingBanners(false);
            }
          };

          return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-blue-700" />
                    <span>Bannière Publicitaire de la Navigation (Carrousel)</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Seul l'administrateur peut créer, modifier, ordonner ou masquer les publicités affichées dans la barre de navigation.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftBanners(INITIAL_PROMO_BANNERS);
                      setBannerStatusMsg(null);
                    }}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Modèles par défaut
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-blue-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une pub</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSavingBanners}
                    onClick={() => void handleSaveBanners()}
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <Check className="w-4 h-4 text-amber-400" />
                    <span>{isSavingBanners ? 'Enregistrement...' : 'Enregistrer et publier'}</span>
                  </button>
                </div>
              </div>

              {bannerStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold border ${
                    bannerStatusMsg.type === 'ok'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {bannerStatusMsg.text}
                </div>
              )}

              {/* Live Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Aperçu en direct dans la barre de navigation ({draftBanners.filter((b) => b.active).length} slide(s) active(s))
                  </span>
                  <span className="text-[11px] text-slate-500">Défilement automatique toutes les 5s</span>
                </div>
                {draftBanners.some((b) => b.active && b.title.trim()) ? (
                  <PromoBannerCarousel slides={draftBanners} previewMode />
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Aucune publicité active : la bannière est actuellement masquée sur le site.
                  </div>
                )}
              </div>

              {/* Slides Editor List */}
              {draftBanners.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                  <Megaphone className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Aucune bannière publicitaire configurée.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
                  >
                    Créer ma première bannière pub
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {draftBanners.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className={`bg-white p-5 rounded-2xl border shadow-xs space-y-4 text-xs ${
                        slide.active ? 'border-slate-200' : 'border-slate-200 opacity-75 bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-900 text-amber-400 font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-black text-slate-900 text-sm">
                            {slide.title || 'Bannière sans titre'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              slide.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {slide.active ? 'Visible' : 'Masquée'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateSlide(idx, { active: !slide.active })}
                            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
                              slide.active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                            title={slide.active ? 'Masquer cette pub' : 'Activer cette pub'}
                          >
                            {slide.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{slide.active ? 'Active' : 'Masquée'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSlide(idx, -1)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draftBanners.length - 1}
                            onClick={() => moveSlide(idx, 1)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSlide(idx)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            title="Supprimer cette bannière"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="text-slate-600 font-bold mb-1 block">
                            Badge (optionnel)
                          </label>
                          <input
                            type="text"
                            maxLength={40}
                            placeholder="Ex: PROMO FLASH, SPONSORISÉ..."
                            value={slide.badge || ''}
                            onChange={(e) => updateSlide(idx, { badge: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-slate-600 font-bold mb-1 block">
                            Titre publicitaire *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={180}
                            placeholder="Ex: Grand Déstockage Smartphones à Divo — -20% cette semaine !"
                            value={slide.title}
                            onChange={(e) => updateSlide(idx, { title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-slate-600 font-bold mb-1 block">
                            Sous-titre / Précision (optionnel)
                          </label>
                          <input
                            type="text"
                            maxLength={260}
                            placeholder="Ex: Livraison rapide sur Divo, Lakota, Gagnoa et Guitry."
                            value={slide.subtitle || ''}
                            onChange={(e) => updateSlide(idx, { subtitle: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="text-slate-600 font-bold mb-1 block">
                            Couleur / Thème
                          </label>
                          <select
                            value={slide.theme || 'royal'}
                            onChange={(e) =>
                              updateSlide(idx, { theme: e.target.value as PromoBannerTheme })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold"
                          >
                            <option value="royal">Bleu Royal & Or (DJIBOUA)</option>
                            <option value="gold">Or & Bleu Nuit (Flash)</option>
                            <option value="emerald">Vert Émeraude (Confiance)</option>
                            <option value="crimson">Rouge Promo (Choc)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-600 font-bold mb-1 block">
                            Texte du bouton d'action
                          </label>
                          <input
                            type="text"
                            maxLength={40}
                            placeholder="Ex: Voir l'offre, Contacter..."
                            value={slide.ctaLabel || ''}
                            onChange={(e) => updateSlide(idx, { ctaLabel: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="text-slate-600 font-bold mb-1 block">
                            Lien / Action au clic
                          </label>
                          <input
                            type="text"
                            maxLength={400}
                            placeholder="#listings, #publish, ou https://..."
                            value={slide.ctaUrl || ''}
                            onChange={(e) => updateSlide(idx, { ctaUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                          />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[
                              { label: 'Annonces', val: '#listings' },
                              { label: 'Publier', val: '#publish' },
                              { label: 'Favoris', val: '#favorites' },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => updateSlide(idx, { ctaUrl: preset.val })}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-[10px] rounded font-semibold text-slate-700"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-600 font-bold mb-1 block">
                            Image / Logo pub (URL ou fichier)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="https://... ou téléverser"
                              value={slide.imageUrl || ''}
                              onChange={(e) => updateSlide(idx, { imageUrl: e.target.value })}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-xl min-w-0"
                            />
                            <label className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer font-bold flex items-center gap-1 shrink-0">
                              <Upload className="w-3.5 h-3.5 text-blue-700" />
                              <span>Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadBannerImage(idx, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {slide.imageUrl && (
                              <button
                                type="button"
                                onClick={() => updateSlide(idx, { imageUrl: undefined })}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Retirer l'image"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 8: SETTINGS & SECTION 22 CHOICES (Section 7.9 & 22) */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Paramètres Généraux & Règles Commerciales</h2>
              <p className="text-xs text-slate-500">
                Arbitrages stratégiques et règles de fonctionnement de DJIBOUA MARKET.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 text-xs">
              {/* Question 1: Mode de livraison */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="font-bold text-slate-800 text-sm block">
                  1. Modèle de Livraison (Section 22.1)
                </label>
                <p className="text-slate-500">
                  Définissez comment les acheteurs et vendeurs récupèrent les produits.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    onClick={() => updateSettings({ deliveryMode: 'both' })}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      settings.deliveryMode === 'both' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'border-slate-200'
                    }`}
                  >
                    🌟 Les deux options (Recommandé)
                    <span className="block text-[10px] font-normal text-slate-500 mt-1">
                      Directe en main propre ET réseau de livreurs DJIBOUA Express.
                    </span>
                  </button>

                  <button
                    onClick={() => updateSettings({ deliveryMode: 'direct_only' })}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      settings.deliveryMode === 'direct_only' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'border-slate-200'
                    }`}
                  >
                    🤝 Organisation directe uniquement
                    <span className="block text-[10px] font-normal text-slate-500 mt-1">
                      Les parties s'entendent librement sur le lieu de rencontre.
                    </span>
                  </button>

                  <button
                    onClick={() => updateSettings({ deliveryMode: 'lokoda_only' })}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      settings.deliveryMode === 'lokoda_only' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'border-slate-200'
                    }`}
                  >
                    🚚 Réseau de livreurs DJIBOUA seul
                    <span className="block text-[10px] font-normal text-slate-500 mt-1">
                      Toutes les livraisons passent par des coursiers agréés.
                    </span>
                  </button>
                </div>
              </div>

              {/* Question 2: Modération */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="font-bold text-slate-800 text-sm block">
                  2. Politique de Modération des Annonces (Section 22.2)
                </label>
                <p className="text-slate-500">
                  Contrôle avant ou après publication sur le catalogue public.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => updateSettings({ autoApproveListings: false })}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      !settings.autoApproveListings ? 'bg-amber-50 border-amber-600 text-amber-900 ring-1 ring-amber-400' : 'border-slate-200'
                    }`}
                  >
                    🛡️ Validation obligatoire avant mise en ligne
                    <span className="block text-[10px] font-normal text-slate-600 mt-1">
                      L'administrateur valide chaque annonce manuellement. Sécurité maximale contre les arnaques.
                    </span>
                  </button>

                  <button
                    onClick={() => updateSettings({ autoApproveListings: true })}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      settings.autoApproveListings ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-400' : 'border-slate-200'
                    }`}
                  >
                    ⚡ Publication immédiate avec contrôle ultérieur
                    <span className="block text-[10px] font-normal text-slate-600 mt-1">
                      L'annonce est immédiatement visible, modération a posteriori ou sur signalement.
                    </span>
                  </button>
                </div>
              </div>

              {/* Question 3: Taux de commission */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="font-bold text-slate-800 text-sm block">
                  3. Commission sur Paiement Électronique (Section 22.3)
                </label>
                <p className="text-slate-500">
                  Taux de commission configuré pour les transactions de la plateforme.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={settings.commissionRate}
                    onChange={(e) => updateSettings({ commissionRate: Number(e.target.value) })}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                  <span className="font-bold text-slate-700">% de commission par transaction</span>
                </div>
              </div>

              {/* Question 4: Admin WhatsApp number for seller payment receipts */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>4. Numéro WhatsApp Administrateur (Réception des reçus de paiement)</span>
                </label>
                <p className="text-slate-500">
                  Les vendeurs enverront leurs captures de reçus de paiement à ce numéro WhatsApp après soumission d'annonce.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="tel"
                    maxLength={40}
                    placeholder="Ex: 0777733284"
                    value={adminWhatsAppDraft}
                    onChange={(e) => setAdminWhatsAppDraft(e.target.value)}
                    className="w-56 px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!adminWhatsAppDraft.trim()) return;
                      await updateSettings({ contactWhatsApp: adminWhatsAppDraft.trim() });
                      setDbActionMessage({
                        type: 'ok',
                        text: `Numéro WhatsApp administrateur mis à jour : ${adminWhatsAppDraft.trim()}`,
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
                  >
                    Enregistrer le numéro WhatsApp
                  </button>
                </div>
              </div>

              {/* Reset seed data button */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center gap-3">
                <span className="text-slate-500">Synchroniser ou restaurer les données initiales de la plateforme :</span>
                {confirmReset ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        setConfirmReset(false);
                        await resetPlatformData();
                        setDbActionMessage({ type: 'ok', text: 'Données initiales synchronisées avec succès.' });
                      }}
                      className="px-3.5 py-1.5 bg-blue-900 text-white rounded-xl font-bold"
                    >
                      Confirmer la synchronisation
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Synchroniser / Réinitialiser les données</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT LOGS (Section 7.4 & 10) */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900">Journal d'Audit Administratif</h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
              {adminLogs.map(log => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono uppercase">
                        {log.targetType}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-slate-600">{log.details}</p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <div>{new Date(log.timestamp).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <span className="text-blue-900 font-semibold">{log.performedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Payment Receipt Preview Modal */}
      {receiptModalListing && receiptModalListing.paymentReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReceiptModalListing(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-blue-950 text-white flex items-center justify-between">
              <div className="min-w-0">
                <h4 className="font-bold text-sm truncate">
                  Reçu de paiement • {receiptModalListing.title}
                </h4>
                <p className="text-[11px] text-blue-200">
                  Vendeur : {receiptModalListing.sellerName} ({receiptModalListing.sellerPhone})
                </p>
              </div>
              <button
                onClick={() => setReceiptModalListing(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-blue-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {receiptModalListing.paymentReceiptUrl.startsWith('data:image/') ? (
                <img
                  src={receiptModalListing.paymentReceiptUrl}
                  alt="Capture du reçu de paiement"
                  className="w-full max-h-[65vh] object-contain rounded-xl border border-slate-200 bg-slate-50"
                />
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Receipt className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-900">
                    {receiptModalListing.paymentReceiptName || 'Document reçu de paiement'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cliquez ci-dessous pour télécharger et ouvrir ce fichier reçu.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <a
                  href={receiptModalListing.paymentReceiptUrl}
                  download={receiptModalListing.paymentReceiptName || `recu_${receiptModalListing.id}`}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger le reçu</span>
                </a>
                <button
                  onClick={() => setReceiptModalListing(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
