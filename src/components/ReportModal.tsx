import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Listing, ReportReason } from '../types';
import { useMarket } from '../context/MarketContext';

interface ReportModalProps {
  listing: Listing;
  onClose: () => void;
}

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'arnaque', label: 'Arnaque présumée ou tentative de fraude' },
  { id: 'faux_produit', label: 'Faux produit ou contrefaçon' },
  { id: 'prix_trompeur', label: 'Prix trompeur ou différent de la réalité' },
  { id: 'mauvaise_description', label: 'Mauvaise description ou photos non conformes' },
  { id: 'produit_interdit', label: 'Produit illégal ou interdit à la vente' },
  { id: 'vendeur_suspect', label: 'Comportement suspect du vendeur' },
  { id: 'contenu_inapproprie', label: 'Contenu offensant ou inapproprié' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ listing, onClose }) => {
  const { submitReport, currentUser, firebaseUser, isLoggedIn, firestoreListingIds } = useMarket();

  const [reason, setReason] = useState<ReportReason>('arnaque');
  const [comment, setComment] = useState('');
  const [contact, setContact] = useState(currentUser?.phone || '');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (comment.trim().length < 3) {
      setError('Veuillez décrire le problème (minimum 3 caractères).');
      return;
    }
    if (!firestoreListingIds.has(listing.id)) {
      setError("Cette annonce de démonstration n'est pas encore synchronisée dans la base de données.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitReport({
        listingId: listing.id,
        listingTitle: listing.title,
        sellerName: listing.sellerName,
        reason,
        comment: comment.trim(),
        reporterContact: contact.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setError('Connexion Google annulée. Une vérification Google est requise pour enregistrer un signalement.');
      } else {
        setError("Erreur lors de l'envoi du signalement.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-red-700 text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base">Signaler une annonce</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-red-100 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Signalement transmis</h4>
            <p className="text-xs text-slate-600">
              Merci de votre vigilance. Notre équipe de modération DJIBOUA MARKET va examiner cette publication sous 24h.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}
            {!firebaseUser && !isLoggedIn && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
                Une connexion à votre compte sera demandée lors de l'envoi pour éviter les faux signalements.
              </div>
            )}
            <div>
              <p className="text-slate-600">
                Vous signalez l'annonce : <strong className="text-slate-900">{listing.title}</strong>
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Vendeur : {listing.sellerName} ({listing.city})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Motif principal du signalement <span className="text-red-500">*</span>
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                      reason === r.id
                        ? 'bg-red-50/70 border-red-300 font-semibold text-red-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      checked={reason === r.id}
                      onChange={() => setReason(r.id)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Détails complémentaires
              </label>
              <textarea
                rows={3}
                required
                placeholder="Expliquez ce qui vous semble anormal (comportement, faux numéro, etc.)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-600 block">
                Votre contact (facultatif, pour suivi)
              </label>
              <input
                type="text"
                placeholder="Votre numéro de téléphone ou email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs transition"
              >
                {isSubmitting ? 'Enregistrement...' : 'Envoyer le signalement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
