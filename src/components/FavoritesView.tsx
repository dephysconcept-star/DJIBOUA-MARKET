import React from 'react';
import { Heart, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { ListingCard } from './ListingCard';
import { Listing } from '../types';

interface FavoritesViewProps {
  onOpenListingDetail: (listing: Listing) => void;
  onQuickBuy: (listing: Listing) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  onOpenListingDetail,
  onQuickBuy,
}) => {
  const { listings, favorites, setCurrentView } = useMarket();

  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => setCurrentView('home')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'accueil</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Heart className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>Mes Annonces Favorites</span>
          </h1>
          <p className="text-xs text-slate-500">
            Retrouvez rapidement les produits sauvegardés à Divo, Lakota, Gagnoa et Guitry.
          </p>
        </div>

        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
          {favoriteListings.length} article{favoriteListings.length > 1 ? 's' : ''} enregistré{favoriteListings.length > 1 ? 's' : ''}
        </span>
      </div>

      {favoriteListings.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-white rounded-3xl border border-slate-200 p-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Votre liste de favoris est vide</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Parcourez les produits de Divo, Lakota, Gagnoa et Guitry et cliquez sur l'icône cœur pour sauvegarder des annonces.
          </p>
          <button
            onClick={() => setCurrentView('listings')}
            className="mt-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            Explorer les annonces
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {favoriteListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onOpenDetail={onOpenListingDetail}
              onQuickBuy={onQuickBuy}
            />
          ))}
        </div>
      )}
    </div>
  );
};
