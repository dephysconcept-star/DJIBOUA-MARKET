import React from 'react';
import { 
  Filter, 
  MapPin, 
  Search, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { ListingCard } from './ListingCard';
import { Listing } from '../types';

interface ListingsViewProps {
  onOpenListingDetail: (listing: Listing) => void;
  onQuickBuy: (listing: Listing) => void;
  onOpenPublishModal: () => void;
  onOpenAuthModal?: () => void;
}

export const ListingsView: React.FC<ListingsViewProps> = ({
  onOpenListingDetail,
  onQuickBuy,
  onOpenPublishModal,
  onOpenAuthModal,
}) => {
  const {
    listings,
    categories,
    cities,
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
    currentUser,
  } = useMarket();

  const handlePublishClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
    } else {
      onOpenPublishModal();
    }
  };

  // Active city object to retrieve neighborhoods (+ custom ones used on approved listings)
  const activeCityObj = cities.find(c => c.name.toLowerCase() === selectedCity.toLowerCase());
  const cityNeighborhoodOptions = React.useMemo(() => {
    if (selectedCity === 'all') return [];
    const seen = new Set<string>();
    const combined: string[] = [];
    const addUnique = (val: string) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(trimmed);
      }
    };
    const nowMs = Date.now();
    activeCityObj?.neighborhoods.forEach(addUnique);
    listings
      .filter(
        (l) =>
          l.status === 'approved' &&
          (!l.expiresAt || new Date(l.expiresAt).getTime() > nowMs) &&
          l.city.toLowerCase() === selectedCity.toLowerCase()
      )
      .forEach((l) => addUnique(l.neighborhood));
    return combined;
  }, [activeCityObj, listings, selectedCity]);

  // Filter listings
  const filteredListings = listings.filter(item => {
    // Only approved & non-expired listings are visible to public
    if (item.status !== 'approved') return false;
    if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()) return false;

    // City Filter
    if (selectedCity !== 'all' && item.city.toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }

    // Neighborhood Filter
    if (selectedNeighborhood !== 'all' && item.neighborhood.toLowerCase() !== selectedNeighborhood.toLowerCase()) {
      return false;
    }

    // Category Filter
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
      return false;
    }

    // Condition Filter
    if (conditionFilter !== 'all' && item.condition !== conditionFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCity = item.city.toLowerCase().includes(q);
      const matchNeighborhood = item.neighborhood.toLowerCase().includes(q);
      const matchSeller = item.sellerName.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCity && !matchNeighborhood && !matchSeller) {
        return false;
      }
    }

    return true;
  });

  // Sort listings (Priority listings always appear first)
  const sortedListings = [...filteredListings].sort((a, b) => {
    const priorityDiff = Number(Boolean(b.isPriority)) - Number(Boolean(a.isPriority));
    if (priorityDiff !== 0) return priorityDiff;
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'popular') return b.viewsCount - a.viewsCount;
    // default recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activeFiltersCount = [
    selectedCity !== 'all',
    selectedNeighborhood !== 'all',
    selectedCategory !== 'all',
    conditionFilter !== 'all',
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSelectedCity('all');
    setSelectedNeighborhood('all');
    setSelectedCategory('all');
    setConditionFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Title & Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Toutes les annonces</span>
              <span className="text-xs bg-blue-100 text-blue-900 font-extrabold px-2.5 py-0.5 rounded-full">
                {sortedListings.length} disponible{sortedListings.length > 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Trouvez des produits vérifiés à Divo, Lakota, Gagnoa et Guitry.
            </p>
          </div>

          {/* Quick Sort By */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Trier par :</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
            >
              <option value="recent">Plus récentes</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="popular">Plus populaires</option>
            </select>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* City */}
          <div>
            <label className="font-bold text-slate-600 mb-1 block">Ville</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedNeighborhood('all');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="all">Toutes les villes</option>
              {cities.map(c => (
                <option key={c.id} value={c.name}>📍 {c.name}</option>
              ))}
            </select>
          </div>

          {/* Neighborhood */}
          <div>
            <label className="font-bold text-slate-600 mb-1 block">Quartier ou Village</label>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              disabled={selectedCity === 'all'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 disabled:opacity-50"
            >
              <option value="all">Tous les quartiers</option>
              {cityNeighborhoodOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="font-bold text-slate-600 mb-1 block">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="all">Toutes les catégories (18)</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="font-bold text-slate-600 mb-1 block">État du produit</label>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
            >
              <option value="all">Neuf & Occasion</option>
              <option value="neuf">Neuf uniquement</option>
              <option value="occasion">Occasion uniquement</option>
            </select>
          </div>
        </div>

        {/* Active Filters Chips & Reset */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 text-xs">
            <span className="text-slate-400 font-medium">Filtres actifs :</span>
            {selectedCity !== 'all' && (
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                Ville: {selectedCity}
                <button onClick={() => setSelectedCity('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedNeighborhood !== 'all' && (
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                Quartier: {selectedNeighborhood}
                <button onClick={() => setSelectedNeighborhood('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                Catégorie: {categories.find(c => c.id === selectedCategory)?.name}
                <button onClick={() => setSelectedCategory('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {conditionFilter !== 'all' && (
              <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                État: {conditionFilter}
                <button onClick={() => setConditionFilter('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
              </span>
            )}

            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:underline font-semibold ml-auto"
            >
              Réinitialiser tous les filtres
            </button>
          </div>
        )}
      </div>

      {/* Grid of Listings or Empty State */}
      {sortedListings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Aucune annonce ne correspond à votre recherche
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Essayez de modifier votre ville, de réinitialiser vos filtres ou soyez le premier à publier un article dans cette catégorie !
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Effacer les filtres
            </button>
            <button
              onClick={handlePublishClick}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow transition"
            >
              Déposer une annonce
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedListings.map(listing => (
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
