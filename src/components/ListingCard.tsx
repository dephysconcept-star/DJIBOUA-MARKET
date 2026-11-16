import React from 'react';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Heart, 
  CheckCircle2, 
  Eye
} from 'lucide-react';
import { Listing } from '../types';
import { useMarket } from '../context/MarketContext';

interface ListingCardProps {
  listing: Listing;
  onOpenDetail: (listing: Listing) => void;
  onQuickBuy?: (listing: Listing) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ 
  listing, 
  onOpenDetail
}) => {
  const { 
    isFavorite, 
    toggleFavorite, 
    trackCallClick, 
    trackWhatsAppClick 
  } = useMarket();

  const favorite = isFavorite(listing.id);

  // Clean phone number for tel: and whatsapp:
  const rawPhone = listing.sellerPhone.replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.startsWith('225') ? rawPhone : `225${rawPhone}`;

  // WhatsApp prefilled message as mandated by section 5.5 of specification:
  const waMessage = encodeURIComponent(
    `Bonjour, je viens de voir votre annonce "${listing.title}" à ${listing.price.toLocaleString('fr-FR')} FCFA sur DJIBOUA MARKET (${listing.city}, ${listing.neighborhood}). Je suis intéressé(e) par votre produit. Est-il toujours disponible ?`
  );
  const waUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackCallClick(listing.id);
    window.location.href = `tel:${listing.sellerPhone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackWhatsAppClick(listing.id);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(listing.id);
  };

  return (
    <div 
      onClick={() => onOpenDetail(listing)}
      className={`group bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col cursor-pointer relative ${
        listing.isPriority
          ? 'border-amber-400 ring-1 ring-amber-300/70'
          : 'border-slate-200'
      }`}
    >
      {/* Photo Container */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={listing.photos[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80'}
          alt={listing.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Condition & Priority Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap pr-10">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${
            listing.condition === 'neuf'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-white'
          }`}>
            {listing.condition === 'neuf' ? 'Neuf' : 'Occasion'}
          </span>

          {listing.isPriority && (
            <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
              ★ Prioritaire
            </span>
          )}

          {listing.featured && !listing.isPriority && (
            <span className="bg-amber-400 text-blue-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs">
              ★ Sponsorisé
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={handleToggleFav}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
            favorite
              ? 'bg-amber-500 text-white'
              : 'bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-white hover:text-red-500'
          }`}
          title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`w-4 h-4 ${favorite ? 'fill-white' : ''}`} />
        </button>

        {/* Location Overlay Badge */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <span className="inline-flex items-center gap-1 bg-blue-950/85 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
            <MapPin className="w-3 h-3 text-amber-400" />
            <strong className="text-amber-300">{listing.city}</strong>
            <span className="text-slate-300">• {listing.neighborhood}</span>
          </span>

          {listing.photos.length > 1 && (
            <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
              +{listing.photos.length - 1}
            </span>
          )}
        </div>
      </div>

      {/* Body details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Price */}
          <div className="flex items-baseline justify-between gap-1 mb-1">
            <div className="text-lg font-black text-blue-950">
              <span className="text-amber-600">{listing.price.toLocaleString('fr-FR')}</span>
              <span className="text-xs font-bold text-slate-600 ml-1">FCFA</span>
            </div>
            
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Eye className="w-3 h-3" />
              <span>{listing.viewsCount}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">
            {listing.title}
          </h3>

          {/* Seller preview */}
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[9px]">
              {listing.sellerName.charAt(0)}
            </span>
            <span className="truncate font-medium">{listing.sellerBusinessName || listing.sellerName}</span>
            {listing.sellerVerified && (
              <span title="Vendeur vérifié DJIBOUA MARKET" className="inline-flex">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons (Call, WhatsApp, Buy) */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
          {/* Direct Phone Call Button */}
          <button
            onClick={handleCall}
            className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-blue-200"
            title={`Appeler le vendeur (${listing.sellerPhone})`}
          >
            <Phone className="w-3.5 h-3.5 text-blue-700" />
            <span>Appeler</span>
          </button>

          {/* WhatsApp Direct Button with pre-filled message */}
          <button
            onClick={handleWhatsApp}
            className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-200"
            title="Contacter sur WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
