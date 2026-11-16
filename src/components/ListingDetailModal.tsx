import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Heart, 
  Share2, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight,
  Truck
} from 'lucide-react';
import { Listing } from '../types';
import { useMarket } from '../context/MarketContext';

interface ListingDetailModalProps {
  listing: Listing;
  onClose: () => void;
  onOpenReport: (listing: Listing) => void;
  onOpenCheckout: (listing: Listing) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  onClose,
  onOpenReport,
  onOpenCheckout,
}) => {
  const { 
    isFavorite, 
    toggleFavorite, 
    categories, 
    trackCallClick, 
    trackWhatsAppClick 
  } = useMarket();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const favorite = isFavorite(listing.id);
  const category = categories.find(c => c.id === listing.categoryId);

  // Phone clean formatting
  const rawPhone = listing.sellerPhone.replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.startsWith('225') ? rawPhone : `225${rawPhone}`;

  const waMessage = encodeURIComponent(
    `Bonjour, je viens de voir votre annonce "${listing.title}" à ${listing.price.toLocaleString('fr-FR')} FCFA sur DJIBOUA MARKET (${listing.city}, ${listing.neighborhood}). Je suis intéressé(e) par votre produit. Est-il toujours disponible ?`
  );
  const waUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

  const handleCall = () => {
    trackCallClick(listing.id);
    window.location.href = `tel:${listing.sellerPhone}`;
  };

  const handleWhatsApp = () => {
    trackWhatsAppClick(listing.id);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: `Découvrez "${listing.title}" à ${listing.price} FCFA sur DJIBOUA MARKET (${listing.city})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="bg-blue-900 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {listing.city}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Quartier {listing.neighborhood}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(listing.id)}
              className={`p-2 rounded-full transition-colors ${
                favorite ? 'text-amber-500 bg-amber-50' : 'text-slate-500 hover:bg-slate-200'
              }`}
              title="Favori"
            >
              <Heart className={`w-5 h-5 ${favorite ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors relative"
              title="Partager"
            >
              <Share2 className="w-5 h-5" />
              {copiedLink && (
                <span className="absolute -bottom-8 right-0 bg-blue-950 text-white text-[10px] px-2 py-0.5 rounded shadow">
                  Lien copié !
                </span>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[80vh] overflow-y-auto">
          {/* Photos Column */}
          <div className="md:col-span-7 p-4 sm:p-6 bg-slate-900/5 flex flex-col justify-between">
            {/* Main active photo */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-200 shadow-inner">
              <img
                src={listing.photos[activePhotoIdx] || listing.photos[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />

              {listing.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : listing.photos.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-xs transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIdx((prev) => (prev < listing.photos.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-xs transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Status & Condition */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-sm ${
                  listing.condition === 'neuf' ? 'bg-emerald-600' : 'bg-slate-800'
                }`}>
                  {listing.condition === 'neuf' ? 'Produit Neuf' : 'Occasion'}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {listing.photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {listing.photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      activePhotoIdx === idx ? 'border-amber-500 scale-105 shadow-md' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Local Security Advice Banner */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Conseil de sécurité DJIBOUA MARKET à {listing.city} :</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Ne payez pas à l'avance. Privilégiez un rendez-vous en lieu public et vérifiez l'article avant de régler le vendeur.
              </p>
            </div>
          </div>

          {/* Details & Contacts Column */}
          <div className="md:col-span-5 p-4 sm:p-6 flex flex-col justify-between space-y-5">
            <div>
              {/* Category & Date */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md">
                  <Tag className="w-3.5 h-3.5" />
                  {category?.name || 'Catégorie'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(listing.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {listing.title}
              </h2>

              {/* Price */}
              <div className="mt-3 p-3 bg-gradient-to-r from-blue-900 to-blue-950 rounded-2xl text-white flex items-baseline justify-between shadow-md">
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-300 font-bold block">Prix officiel</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">
                    {listing.price.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs font-bold text-slate-200 ml-1.5">FCFA</span>
                </div>
                <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-slate-200 font-medium">
                  {listing.condition === 'neuf' ? 'Prix ferme / Neuf' : 'Négociable'}
                </span>
              </div>

              {/* Location details */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-blue-700" />
                  <span>{listing.city}, {listing.neighborhood}</span>
                </div>
                {listing.addressDetails && (
                  <p className="text-xs text-slate-600 pl-6">
                    {listing.addressDetails}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="mt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description du produit
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white rounded-xl p-2 border border-slate-100 max-h-40 overflow-y-auto">
                  {listing.description}
                </p>
              </div>

              {/* Seller Profile Card */}
              <div className="mt-4 p-3 bg-slate-100/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-800 text-amber-400 font-bold flex items-center justify-center text-sm ring-2 ring-white overflow-hidden shrink-0">
                    {listing.sellerAvatar ? (
                      <img src={listing.sellerAvatar} alt={listing.sellerName} className="w-full h-full object-cover" />
                    ) : (
                      listing.sellerName.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <span>{listing.sellerBusinessName || listing.sellerName}</span>
                      {listing.sellerVerified && (
                        <span title="Vendeur certifié" className="inline-flex">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Membre actif • {listing.city}
                    </p>
                  </div>
                </div>

                {listing.sellerRating && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                      ★ {listing.sellerRating} / 5
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {/* Primary: Direct Call & WhatsApp */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCall}
                  className="py-3 px-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Phone className="w-4 h-4 text-amber-300" />
                  <span>Appeler ({listing.sellerPhone})</span>
                </button>

                <button
                  onClick={handleWhatsApp}
                  className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                  <span>WhatsApp direct</span>
                </button>
              </div>

              <button
                onClick={() => onOpenCheckout(listing)}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-600 hover:to-amber-500 text-blue-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Commander cet article</span>
              </button>

              {/* Bottom utilities */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 px-1">
                <button
                  onClick={() => onOpenReport(listing)}
                  className="flex items-center gap-1 hover:text-red-600 transition-colors"
                >
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span>Signaler un problème avec cette annonce</span>
                </button>

                <span>Réf: #{listing.id.replace('lst_', '')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
