import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Store, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  PhoneCall, 
  MessageCircle,
  Truck,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { HeroBanner } from './HeroBanner';
import { CategoriesBar } from './CategoriesBar';
import { ListingCard } from './ListingCard';
import { Listing } from '../types';

interface HomeViewProps {
  onOpenPublishModal: () => void;
  onOpenListingDetail: (listing: Listing) => void;
  onQuickBuy: (listing: Listing) => void;
  onOpenAuthModal?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenPublishModal,
  onOpenListingDetail,
  onQuickBuy,
  onOpenAuthModal,
}) => {
  const { 
    listings, 
    cities, 
    users, 
    setCurrentView, 
    setSelectedCity,
    currentUser
  } = useMarket();

  const handlePublishClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
    } else {
      onOpenPublishModal();
    }
  };

  const nowMs = Date.now();
  const approved = listings.filter(
    (l) => l.status === 'approved' && (!l.expiresAt || new Date(l.expiresAt).getTime() > nowMs)
  );

  const byPriorityThenRecent = (a: Listing, b: Listing) => {
    const pDiff = Number(Boolean(b.isPriority)) - Number(Boolean(a.isPriority));
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };

  // Featured / Recommandées / Prioritaires
  const featuredListings = approved
    .filter((l) => l.featured || l.isPriority)
    .sort(byPriorityThenRecent)
    .slice(0, 4);
  // Populaires
  const popularListings = approved
    .filter((l) => l.popular || l.viewsCount > 200)
    .sort(byPriorityThenRecent)
    .slice(0, 4);
  // Récents (Prioritaires en tête)
  const recentListings = [...approved].sort(byPriorityThenRecent).slice(0, 8);

  // Local vendors
  const vendors = users.filter(u => u.role === 'seller');

  return (
    <div className="space-y-8 pb-12">
      {/* 1 & 2 & 3: Hero Banner with City Selector & Search */}
      <HeroBanner onOpenPublishModal={onOpenPublishModal} onOpenAuthModal={onOpenAuthModal} />

      {/* 4: Official Categories Bar */}
      <CategoriesBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        
        {/* 7: Recommended / Featured Section */}
        {featuredListings.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-600 tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Sélection DJIBOUA MARKET</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Annonces Recommandées à Divo, Lakota, Gagnoa & Guitry
                </h2>
              </div>
              <button
                onClick={() => setCurrentView('listings')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Voir tout ({approved.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onOpenDetail={onOpenListingDetail}
                  onQuickBuy={onQuickBuy}
                />
              ))}
            </div>
          </section>
        )}

        {/* 5: Recent Products Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-blue-700 tracking-wider">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Nouveautés</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Dernières Annonces Publiées
              </h2>
            </div>
            <button
              onClick={() => setCurrentView('listings')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Tout parcourir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {recentListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onOpenDetail={onOpenListingDetail}
                onQuickBuy={onQuickBuy}
              />
            ))}
          </div>
        </section>

        {/* 6: Popular Products */}
        {popularListings.length > 0 && (
          <section className="space-y-4 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-blue-50/30 p-6 rounded-3xl border border-amber-200/60">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-800 tracking-wider">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>Très recherchés</span>
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Produits les Plus Populaires du Moment
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {popularListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onOpenDetail={onOpenListingDetail}
                  onQuickBuy={onQuickBuy}
                />
              ))}
            </div>
          </section>
        )}

        {/* 8: Verified Local Sellers Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-blue-800 tracking-wider">
                <Store className="w-4 h-4 text-blue-700" />
                <span>Commerçants & Producteurs</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Boutiques et Vendeurs Vérifiés de Proximité
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {vendors.map(vendor => {
              const vendorCount = approved.filter(l => l.sellerId === vendor.id).length;

              return (
                <div
                  key={vendor.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={vendor.avatarUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-100"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1">
                        <span>{vendor.businessName || vendor.name}</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span>{vendor.city} ({vendor.neighborhood})</span>
                      </p>
                    </div>
                  </div>

                  {vendor.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {vendor.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-blue-900">{vendorCount} annonces actives</span>
                    <button
                      onClick={() => {
                        setSelectedCity(vendor.city);
                        setCurrentView('listings');
                      }}
                      className="text-amber-600 font-bold hover:underline"
                    >
                      Voir ses offres →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 10: Section de Présentation de la Plateforme (Section 5.1 & 1.1) */}
        <section className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 bottom-0 text-[180px] font-black text-white/5 leading-none select-none pointer-events-none">
            🐘
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Pourquoi choisir DJIBOUA MARKET ?
            </span>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Le commerce local réinventé pour Divo, Lakota, Gagnoa et Guitry
            </h2>
            <p className="text-sm text-blue-100 leading-relaxed">
              Inspirée des réalités commerciales ivoiriennes, DJIBOUA MARKET offre une plateforme rapide, sans intermédiaire contraignant, permettant aux particuliers et commerçants de vendre simplement, et aux acheteurs de trouver exactement ce qui est disponible au coin de leur rue.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-amber-400 shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Appels & WhatsApp directs</h4>
                  <p className="text-blue-200 text-[11px] mt-0.5">
                    Un clic pour appeler ou discuter avec message automatique.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-amber-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Commande directe</h4>
                  <p className="text-blue-200 text-[11px] mt-0.5">
                    Réglez le vendeur en espèces à la remise de l'article.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-amber-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Précision par Quartier</h4>
                  <p className="text-blue-200 text-[11px] mt-0.5">
                    Bada, Babré, Dioulabougou, Kouta... ou saisissez votre village.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-amber-400 shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Livraison Flexible</h4>
                  <p className="text-blue-200 text-[11px] mt-0.5">
                    Retrait direct ou réseau de livreurs locaux DJIBOUA Express.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handlePublishClick}
                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-blue-950 font-black rounded-xl text-sm transition shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span>Déposer une annonce maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
