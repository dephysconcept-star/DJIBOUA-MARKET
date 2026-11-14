import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Heart, 
  PlusCircle, 
  Store, 
  Smartphone, 
  Bell, 
  Menu, 
  X,
  Laptop,
  User,
  LogOut,
  UserPlus
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { LokodaLogo } from './LokodaLogo';

interface NavbarProps {
  onOpenPublishModal: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenPublishModal, 
  onOpenAuthModal 
}) => {
  const {
    currentView,
    setCurrentView,
    selectedCity,
    setSelectedCity,
    cities,
    favorites,
    searchQuery,
    setSearchQuery,
    notifications,
    deviceMode,
    setDeviceMode,
    currentUser,
    logoutUser,
  } = useMarket();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    if (currentView !== 'listings' && currentView !== 'home') {
      setCurrentView('listings');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView !== 'listings') {
      setCurrentView('listings');
    }
  };

  // Requirement: "créer un compte avant de faire une annonce"
  const handlePublishClick = () => {
    if (!currentUser) {
      onOpenAuthModal();
    } else {
      onOpenPublishModal();
    }
  };

  const handleVendorSpaceClick = () => {
    if (!currentUser) {
      onOpenAuthModal();
    } else {
      setCurrentView('vendor_dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner - Localisation & Mode Device switch */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-blue-900 text-white text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-flex items-center justify-center bg-amber-500 text-blue-950 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
              Côte d'Ivoire
            </span>
            <span className="hidden sm:inline text-blue-100/90 font-medium">
              Marketplace de proximité : <strong className="text-amber-300">Divo</strong> • <strong className="text-amber-300">Lakota</strong> • <strong className="text-amber-300">Gagnoa</strong> • <strong className="text-amber-300">Guitry</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Device Mode Switch: Web vs Android */}
            <button
              onClick={() => setDeviceMode(deviceMode === 'web' ? 'android' : 'web')}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-all ${
                deviceMode === 'android'
                  ? 'bg-amber-400 text-blue-950 shadow-xs'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Basculer entre la vue Web Ordinateur et la vue Application Android"
            >
              {deviceMode === 'android' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mode Android Actif</span>
                </>
              ) : (
                <>
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Vue Web</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 md:gap-6">
          {/* Logo */}
          <button 
            onClick={() => setCurrentView('home')} 
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-0.5"
          >
            <LokodaLogo size="md" showTagline={true} />
          </button>

          {/* City Selector & Search Bar (Desktop) */}
          <div className="hidden lg:flex items-center flex-1 max-w-2xl gap-2">
            {/* City Selector */}
            <div className="relative shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-700">
                <MapPin className="w-4 h-4" />
              </div>
              <select
                value={selectedCity}
                onChange={handleCityChange}
                className="pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-300/80 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors cursor-pointer appearance-none"
              >
                <option value="all">Toutes les villes ({cities.length})</option>
                {cities.map(c => (
                  <option key={c.id} value={c.name}>
                    📍 {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                placeholder="Rechercher à Divo, Lakota, Gagnoa ou Guitry (ex: moto, riz, téléphone...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 focus:bg-white border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-blue-600"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* Favorites */}
            <button
              onClick={() => setCurrentView('favorites')}
              className={`relative p-2 rounded-xl transition-colors ${
                currentView === 'favorites' 
                  ? 'bg-amber-50 text-amber-600' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Mes favoris"
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-blue-950 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                    <span className="text-xs text-blue-600 font-medium">DJIBOUA</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Aucune notification</p>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div key={n.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-600 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Account / Login State */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 pl-2.5 rounded-2xl border border-slate-200">
                <button
                  onClick={handleVendorSpaceClick}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-900 py-1"
                  title="Accéder à mon compte et ma photo de profil"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-800 text-amber-400 font-black flex items-center justify-center text-[10px] overflow-hidden shrink-0">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="max-w-[110px] truncate">{currentUser.businessName || currentUser.name}</span>
                </button>

                <button
                  onClick={handleVendorSpaceClick}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    currentView === 'vendor_dashboard'
                      ? 'bg-blue-900 text-white'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{currentUser.role === 'buyer' ? 'Mon Compte' : 'Mon Espace'}</span>
                </button>

                <button
                  onClick={logoutUser}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title="Déconnexion"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 transition border border-blue-200"
              >
                <User className="w-4 h-4 text-blue-700" />
                <span>Connexion / Inscription</span>
              </button>
            )}

            {/* Post an ad CTA (Royalty Blue & Gold) */}
            <button
              onClick={handlePublishClick}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/20 hover:shadow-lg transition-all active:scale-95 text-sm"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Publier une annonce</span>
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handlePublishClick}
              className="bg-blue-800 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>Vendre</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search & City selector */}
        <div className="pb-3 lg:hidden flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative w-40 shrink-0">
              <select
                value={selectedCity}
                onChange={handleCityChange}
                className="w-full py-1.5 pl-2 pr-6 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="all">Toutes villes</option>
                {cities.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs placeholder-slate-400"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </form>
          </div>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="pt-2 pb-1 border-t border-slate-200 flex flex-col gap-1 text-sm">
              {currentUser ? (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl mb-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleVendorSpaceClick();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                  >
                    <span className="w-9 h-9 rounded-xl bg-blue-900 text-amber-400 font-black flex items-center justify-center text-xs overflow-hidden shrink-0 border border-amber-400/50">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        currentUser.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-blue-950 truncate">
                        {currentUser.businessName || currentUser.name}
                      </p>
                      <p className="text-[10px] text-blue-700 truncate">
                        {currentUser.phone} • {currentUser.city}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      logoutUser();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-red-600 font-bold shrink-0"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-left font-bold text-blue-900 bg-blue-50 rounded-lg flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-blue-700" />
                  <span>Se connecter / Créer un compte</span>
                </button>
              )}

              <button
                onClick={() => {
                  setCurrentView('home');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left font-medium text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Accueil
              </button>
              <button
                onClick={() => {
                  setCurrentView('listings');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left font-medium text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Toutes les annonces
              </button>
              <button
                onClick={() => {
                  setCurrentView('favorites');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left font-medium text-slate-800 hover:bg-slate-100 rounded-lg flex items-center justify-between"
              >
                <span>Mes Favoris</span>
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {favorites.length}
                </span>
              </button>
              <button
                onClick={() => {
                  handleVendorSpaceClick();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-left font-medium text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                <span>
                  {currentUser?.role === 'buyer'
                    ? 'Mon Compte Client & Profil'
                    : 'Mon Espace Vendeur & Profil'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
