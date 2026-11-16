import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Truck, 
  MapPin, 
  ArrowRight, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Listing, PaymentMethod, DeliveryOption, Transaction } from '../types';
import { useMarket } from '../context/MarketContext';

interface PaymentModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  listing,
  onClose,
  onSuccess,
}) => {
  const { createTransaction, currentUser, firebaseUser, isLoggedIn, firestoreListingIds, cities } = useMarket();

  const [paymentType, setPaymentType] = useState<'electronic' | 'direct'>('electronic');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('wave');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('lokoda_express');

  // Buyer Info pre-filled from authenticated account
  const [buyerName, setBuyerName] = useState(currentUser?.name || firebaseUser?.displayName || 'Client DJIBOUA');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '+225 07 ');
  const [buyerWhatsApp, setBuyerWhatsApp] = useState(
    currentUser?.whatsapp || currentUser?.phone || '+225 07 '
  );
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || firebaseUser?.email || '');
  const [buyerCity, setBuyerCity] = useState(currentUser?.city || listing.city);
  const [buyerNeighborhood, setBuyerNeighborhood] = useState(
    currentUser?.neighborhood || listing.neighborhood
  );
  const [payError, setPayError] = useState<string | null>(null);

  // Steps: 'form' -> 'processing' -> 'success'
  const [status, setStatus] = useState<'form' | 'processing' | 'success'>('form');
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  const deliveryFee = deliveryOption === 'lokoda_express' ? 1500 : 0;
  const totalAmount = listing.price + deliveryFee;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);
    if (!firestoreListingIds.has(listing.id)) {
      setPayError("Cette annonce de démonstration n'a pas encore été synchronisée dans la base de données par l'administrateur.");
      return;
    }
    setStatus('processing');

    try {
      const trx = await createTransaction({
        listingId: listing.id,
        listingTitle: listing.title,
        listingPhoto: listing.photos[0],
        amount: listing.price,
        deliveryFee,
        totalAmount,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerWhatsApp: buyerWhatsApp.trim() || buyerPhone.trim(),
        buyerEmail: buyerEmail.trim() || undefined,
        buyerCity: buyerCity.trim(),
        buyerNeighborhood: buyerNeighborhood.trim(),
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        sellerPhone: listing.sellerPhone,
        sellerCity: listing.city,
        method: paymentType === 'direct' ? 'cash_on_delivery' : selectedMethod,
        deliveryOption,
      });

      setCompletedTransaction(trx);
      setStatus('success');
      onSuccess(trx);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } catch (err) {
      setStatus('form');
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setPayError('Vérification Google annulée. Connectez-vous pour enregistrer votre commande.');
      } else {
        setPayError("Impossible d'enregistrer la commande dans la base de données.");
      }
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-950 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base sm:text-lg">
              {status === 'success' ? 'Reçu officiel de commande' : 'Paiement Sécurisé DJIBOUA MARKET'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-blue-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'form' && (
          <form onSubmit={handlePay} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {payError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{payError}</span>
              </div>
            )}
            {!firebaseUser && !isLoggedIn && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px]">
                Une connexion à votre compte (identifiant/mot de passe ou Google) est requise lors de la validation pour sécuriser et archiver votre reçu.
              </div>
            )}
            {/* Product Summary */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <img
                src={listing.photos[0]}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-900 truncate">{listing.title}</h4>
                <p className="text-xs text-slate-500">
                  Vendu par <strong>{listing.sellerName}</strong> • {listing.city}
                </p>
                <div className="text-sm font-black text-amber-600 mt-0.5">
                  {listing.price.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            {/* Delivery Choice (Section 9) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Mode de Réception / Livraison
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeliveryOption('lokoda_express')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    deliveryOption === 'lokoda_express'
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950">
                      <Truck className="w-4 h-4 text-blue-700" />
                      <span>Réseau DJIBOUA Express</span>
                    </div>
                    <span className="text-[11px] font-black text-blue-900">+1 500 FCFA</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Livré à domicile ou point de rencontre sécurisé à {listing.city}.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryOption('direct')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    deliveryOption === 'direct'
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>Remise en Main Propre</span>
                    </div>
                    <span className="text-[11px] font-black text-emerald-600">Gratuit</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Vous convenez du lieu de retrait avec le vendeur.
                  </p>
                </button>
              </div>
            </div>

            {/* Payment Method Selector (Section 8.1 & 8.2) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Mode de Paiement
              </label>

              {/* Toggle Direct vs Electronic */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentType('electronic')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    paymentType === 'electronic'
                      ? 'bg-white text-blue-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Mobile Money Sécurisé
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('direct')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    paymentType === 'direct'
                      ? 'bg-white text-blue-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🤝 Paiement au Vendeur (Espèces)
                </button>
              </div>

              {/* Electronic Providers */}
              {paymentType === 'electronic' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('wave')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedMethod === 'wave'
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 text-sky-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full bg-sky-500 text-white font-black text-xs flex items-center justify-center">
                      W
                    </span>
                    <span className="text-xs font-bold">Wave CI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('orange_money')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedMethod === 'orange_money'
                        ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 text-orange-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center">
                      OM
                    </span>
                    <span className="text-xs font-bold">Orange MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('mtn_momo')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedMethod === 'mtn_momo'
                        ? 'bg-yellow-50 border-yellow-500 ring-2 ring-yellow-500/20 text-yellow-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full bg-yellow-400 text-blue-950 font-black text-xs flex items-center justify-center">
                      M
                    </span>
                    <span className="text-xs font-bold">MTN MoMo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('moov_money')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedMethod === 'moov_money'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                      MM
                    </span>
                    <span className="text-xs font-bold">Moov Money</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <p className="font-bold">Modalité de paiement en espèces :</p>
                  <p className="mt-0.5 text-amber-800">
                    Vous payez le vendeur directement lors de la remise du bien en main propre. Vérifiez minutieusement l'état du produit avant tout versement.
                  </p>
                </div>
              )}
            </div>

            {/* Buyer Contact & Delivery Address */}
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Vos Coordonnées de Réception
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 mb-1 block">Votre Nom complet</label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 mb-1 block">Numéro de téléphone / Mobile</label>
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 mb-1 block">Numéro WhatsApp (pour suivi vendeur)</label>
                  <input
                    type="tel"
                    required
                    value={buyerWhatsApp}
                    onChange={(e) => setBuyerWhatsApp(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 mb-1 block">Adresse e-mail</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="client@exemple.ci"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 mb-1 block">Ville de livraison</label>
                  <input
                    type="text"
                    list="checkout-cities-list"
                    required
                    value={buyerCity}
                    onChange={(e) => setBuyerCity(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                  <datalist id="checkout-cities-list">
                    {cities.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 mb-1 block">Quartier ou Village (saisie libre)</label>
                  <input
                    type="text"
                    list="checkout-neighborhoods-list"
                    required
                    maxLength={120}
                    placeholder="Choisissez ou tapez votre quartier / village"
                    value={buyerNeighborhood}
                    onChange={(e) => setBuyerNeighborhood(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                  <datalist id="checkout-neighborhoods-list">
                    {(cities.find((c) => c.name.toLowerCase() === buyerCity.toLowerCase())?.neighborhoods || []).map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Ces coordonnées complètes seront transmises au vendeur et à l'administration pour la livraison et le suivi de votre commande.
              </p>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 bg-blue-950 text-white rounded-2xl space-y-1.5">
              <div className="flex justify-between text-xs text-blue-200">
                <span>Prix de l'article</span>
                <span>{listing.price.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-xs text-blue-200">
                <span>Frais de livraison ({deliveryOption === 'lokoda_express' ? 'DJIBOUA Express' : 'Direct'})</span>
                <span>{deliveryFee === 0 ? 'Gratuit' : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}</span>
              </div>
              <div className="pt-2 border-t border-blue-800/80 flex justify-between items-baseline font-black text-base text-amber-400">
                <span>Total à régler</span>
                <span>{totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-blue-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Valider la commande ({totalAmount.toLocaleString('fr-FR')} FCFA)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {status === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-blue-900 rounded-full animate-spin mx-auto" />
            <h4 className="text-base font-bold text-slate-900">Traitement sécurisé de la transaction...</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Connexion à la passerelle Mobile Money Côte d'Ivoire. Veuillez patienter un instant.
            </p>
          </div>
        )}

        {status === 'success' && completedTransaction && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Commande Confirmée avec Succès !</h4>
              <p className="text-xs text-slate-500">
                Référence officielle : <strong className="text-blue-900 font-mono text-sm">{completedTransaction.reference}</strong>
              </p>
            </div>

            {/* Printable Receipt Card */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <span className="font-black text-blue-900">DJIBOUA MARKET</span>
                  <span className="text-[10px] text-slate-500 block">Divo • Lakota • Gagnoa • Guitry</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  PAYÉ & CONFIRMÉ
                </span>
              </div>

              <div className="space-y-1">
                <p><strong>Article :</strong> {completedTransaction.listingTitle}</p>
                <p><strong>Vendeur :</strong> {completedTransaction.sellerName} ({completedTransaction.sellerPhone})</p>
                <p><strong>Acheteur :</strong> {completedTransaction.buyerName} ({completedTransaction.buyerPhone})</p>
                <p><strong>Destination :</strong> {completedTransaction.buyerCity}, {completedTransaction.buyerNeighborhood}</p>
                <p><strong>Mode :</strong> {completedTransaction.method.toUpperCase()} • {completedTransaction.deliveryOption === 'lokoda_express' ? 'Livraison DJIBOUA' : 'Retrait Direct'}</p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Montant Réglé :</span>
                <span className="text-amber-600">{completedTransaction.totalAmount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimer le reçu</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Terminer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
