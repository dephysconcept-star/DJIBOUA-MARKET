import React from 'react';
import { Search, MapPin, PhoneCall, MessageCircle, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useMarket } from '../context/MarketContext';

interface HeroBannerProps {
  onOpenPublishModal: () => void;
  onOpenAuthModal?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onOpenPublishModal, onOpenAuthModal }) => {
  const { 
    selectedCity, 
    setSelectedCity, 
    cities, 
    listings, 
    searchQuery, 
    setSearchQuery, 
    setCurrentView,
    currentUser
  } = useMarket();

  const handlePublishClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
    } else {
      onOpenPublishModal();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentView('listings');
  };

  const approvedListings = listings.filter(l => l.status === 'approved');

  const getCityCount = (cityName: string) => {
    return approvedListings.filter(l => l.city.toLowerCase() === cityName.toLowerCase()).length;
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8">
      {/* Decorative Elephant watermarks / shapes */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-blue-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main Hero Text */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-full px-3.5 py-1 text-xs font-semibold text-amber-300">
              <span className="text-base">🐘</span>
              <span>La marketplace de proximité du Lôh-Djiboua & du Gôh</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Achetez, vendez et trouvez
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
                près de chez vous
              </span>
            </h1>

            <p className="text-sm sm:text-base text-blue-100/90 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Trouvez rapidement des produits disponibles dans votre ville, votre quartier ou votre village à <strong>Divo</strong>, <strong>Lakota</strong>, <strong>Gagnoa</strong> et <strong>Guitry</strong>. Contact direct avec les vendeurs par appel ou WhatsApp.
            </p>

            {/* Quick Hero Search Form */}
            <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl max-w-xl mx-auto lg:mx-0 flex flex-col sm:flex-row gap-2 border border-slate-200">
              <div className="flex-1 flex items-center px-3 gap-2">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Que cherchez-vous aujourd'hui ?"
                  className="w-full py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="all">Toutes villes</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-blue-950 font-black px-5 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  Rechercher
                </button>
              </div>
            </form>

            {/* Key Advantages Tags */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-blue-200">
              <div className="flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>Appel téléphonique direct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Discussion WhatsApp instantanée</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Paiement direct au vendeur</span>
              </div>
            </div>
          </div>

          {/* City Selection Cards (Divo, Lakota, Gagnoa, Guitry) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-blue-200 font-semibold px-1">
              <span>Zones de lancement officielles</span>
              <span className="text-amber-400 font-bold">{approvedListings.length} annonces en ligne</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {cities.map(city => {
                const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();
                const count = getCityCount(city.name);

                return (
                  <button
                    key={city.id}
                    onClick={() => {
                      setSelectedCity(city.name);
                      setCurrentView('listings');
                    }}
                    className={`relative p-3.5 rounded-2xl text-left transition-all border group ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-800 to-blue-700 border-amber-400 shadow-lg shadow-blue-950/40 translate-x-1'
                        : 'bg-white/10 hover:bg-white/15 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-amber-400 text-blue-950' : 'bg-blue-800 text-white'
                        }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                            {city.name}
                            <span className="text-[11px] font-normal text-blue-300">({city.region})</span>
                          </h3>
                          <p className="text-xs text-blue-200 line-clamp-1">
                            {city.neighborhoods.slice(0, 3).join(', ')}...
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300">
                          {count} offres
                        </span>
                        <div className="text-[10px] text-blue-300 mt-1 flex items-center justify-end gap-1 group-hover:text-amber-300">
                          <span>Explorer</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Publish Banner */}
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between mt-1">
              <div>
                <p className="font-bold text-sm text-amber-200">Vous vendez à Divo, Lakota, Gagnoa ou Guitry ?</p>
                <p className="text-xs text-blue-100">Publiez votre produit gratuitement en 2 minutes.</p>
              </div>
              <button
                onClick={handlePublishClick}
                className="bg-amber-400 hover:bg-amber-500 text-blue-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors shrink-0 shadow-sm"
              >
                Vendre maintenant
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
