import React, { useState } from 'react';
import {
  X,
  Upload,
  MapPin,
  CheckCircle,
  Eye,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { ListingCondition } from '../types';
import { compressImageFile } from '../utils/imageCompression';

interface PublishListingModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PHOTO_PRESETS = [
  {
    label: 'Smartphone / Téléphone',
    url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Moto / Deux roues',
    url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Riz / Produits vivriers',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Électroménager / Froid',
    url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Meuble / Salon bois',
    url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Pagne / Mode locale',
    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Matériaux / Bâtiment',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Agriculture / Équipement',
    url: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
  },
];


export const PublishListingModal: React.FC<PublishListingModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { categories, cities, currentUser, addListing, settings } = useMarket();

  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '1');
  const [price, setPrice] = useState<number | ''>('');
  const [condition, setCondition] = useState<ListingCondition>('neuf');
  const [description, setDescription] = useState('');
  const [selectedCity, setSelectedCity] = useState(currentUser?.city || cities[0]?.name || 'Divo');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    currentUser?.neighborhood || cities[0]?.neighborhoods[0] || 'Bada'
  );
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [addressDetails, setAddressDetails] = useState('');

  // Contact details pre-filled from user
  const [sellerName, setSellerName] = useState(
    currentUser?.businessName || currentUser?.name || ''
  );
  const [sellerPhone, setSellerPhone] = useState(currentUser?.phone || '+225 07 ');
  const [sellerWhatsApp, setSellerWhatsApp] = useState(
    currentUser?.whatsapp || currentUser?.phone || '+225 07 '
  );

  // Photos
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
  ]);

  const [error, setError] = useState<string | null>(null);

  const currentCityObj =
    cities.find((c) => c.name.toLowerCase() === selectedCity.toLowerCase()) || cities[0];

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setCustomNeighborhood('');
    const newCityObj = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (newCityObj && newCityObj.neighborhoods.length > 0) {
      setSelectedNeighborhood(newCityObj.neighborhoods[0]);
    }
  };

  const handleAddPhotoPreset = (url: string) => {
    setError(null);
    if (photos.length >= settings.maxPhotosPerListing) {
      setError(`Vous ne pouvez pas ajouter plus de ${settings.maxPhotosPerListing} photos.`);
      return;
    }
    if (photos.length === 1 && photos[0].includes('photo-1526170375885')) {
      setPhotos([url]);
    } else {
      setPhotos((prev) => [...prev, url]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (photos.length >= settings.maxPhotosPerListing) {
      setError(`Vous ne pouvez pas ajouter plus de ${settings.maxPhotosPerListing} photos.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier est trop volumineux (maximum 10 Mo).');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      if (photos.length === 1 && photos[0].includes('photo-1526170375885')) {
        setPhotos([compressed]);
      } else {
        setPhotos((prev) => [...prev, compressed]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement de la photo.');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!title.trim() || title.trim().length < 3) {
      return 'Veuillez saisir un titre valide (au moins 3 caractères).';
    }
    if (!price || Number(price) < settings.minListingPrice) {
      return `Veuillez indiquer un prix valide (minimum ${settings.minListingPrice} FCFA).`;
    }
    if (!description.trim() || description.trim().length < 5) {
      return 'Veuillez décrire votre produit ou service (au moins 5 caractères).';
    }
    if (!sellerPhone.trim() || sellerPhone.replace(/\D/g, '').length < 6) {
      return 'Veuillez renseigner un numéro de téléphone valide.';
    }
    if (!sellerWhatsApp.trim() || sellerWhatsApp.replace(/\D/g, '').length < 6) {
      return 'Veuillez renseigner un numéro WhatsApp valide.';
    }
    if (selectedNeighborhood === 'autre' && customNeighborhood.trim().length < 2) {
      return 'Veuillez saisir manuellement le nom de votre quartier ou village.';
    }
    if (photos.length === 0) return 'Veuillez ajouter au moins une photo.';
    return null;
  };

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep('preview');
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    const finalNeighborhood =
      selectedNeighborhood === 'autre' && customNeighborhood.trim()
        ? customNeighborhood.trim()
        : selectedNeighborhood;

    try {
      await addListing({
        title: title.trim(),
        price: Number(price),
        categoryId,
        condition,
        description: description.trim(),
        photos,
        sellerId: currentUser ? currentUser.id : 'usr_visitor',
        sellerName: sellerName.trim() || currentUser?.name || 'Vendeur',
        sellerBusinessName: sellerName.trim() || currentUser?.businessName,
        sellerPhone: sellerPhone.trim(),
        sellerWhatsApp: sellerWhatsApp.trim(),
        sellerAvatar: currentUser?.avatarUrl,
        sellerVerified: true,
        city: selectedCity,
        neighborhood: finalNeighborhood,
        addressDetails: addressDetails.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch {
      setError(
        "Impossible d'enregistrer l'annonce pour le moment. Vérifiez votre connexion et vos champs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-950 text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🐘</span>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {step === 'form'
                  ? 'Publier une nouvelle annonce'
                  : 'Prévisualisation de votre annonce'}
              </h3>
              <p className="text-xs text-blue-200">DJIBOUA MARKET • Divo, Lakota, Gagnoa, Guitry</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Form Wizard */}
        {step === 'form' ? (
          <form onSubmit={handleGoToPreview} className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
            {/* Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Titre du produit ou service <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={180}
                  placeholder="Ex: Moto Apsonic 125cc neuve / Sacs de riz de Lakota..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Prix en Franc CFA (FCFA) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={settings.minListingPrice}
                    required
                    placeholder="Ex: 25000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-3.5 pr-16 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-bold text-slate-900"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-black text-amber-600">
                    FCFA
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  État du produit <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition('neuf')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      condition === 'neuf'
                        ? 'bg-blue-900 text-white border-blue-900 ring-2 ring-blue-900/20'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ✨ Produit Neuf
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('occasion')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      condition === 'occasion'
                        ? 'bg-blue-900 text-white border-blue-900 ring-2 ring-blue-900/20'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    📦 Occasion
                  </button>
                </div>
              </div>
            </div>

            {/* Geographical Location */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/60 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-blue-700" />
                <span>Localisation du produit (Obligatoire)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Ville officielle
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        📍 {c.name} ({c.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Quartier ou Village
                  </label>
                  <select
                    value={selectedNeighborhood}
                    onChange={(e) => setSelectedNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    {currentCityObj?.neighborhoods.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                    <option value="autre">Autre quartier ou village (saisir manuellement)...</option>
                  </select>
                </div>
              </div>

              {selectedNeighborhood === 'autre' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-950 block">
                    Saisissez manuellement le nom de votre quartier ou village <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="Ex: Village de Kouta, Quartier Soleil..."
                    value={customNeighborhood}
                    onChange={(e) => setCustomNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Informations complémentaires de repère (ex: Face au grand marché, près de la pharmacie...)"
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Photos & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Photos du produit ({photos.length}/{settings.maxPhotosPerListing})
                </label>
                <span className="text-[11px] text-slate-500">
                  Compression automatique sécurisée (JPG, PNG)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-xs group"
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {photos.length < settings.maxPhotosPerListing && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-blue-600">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Ajouter</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Ou choisissez une photo thématique prête à l'emploi :</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PHOTO_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddPhotoPreset(preset.url)}
                      className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium border border-slate-200"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description détaillée <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                maxLength={4000}
                placeholder="Décrivez les caractéristiques, l'état, la marque, les dimensions, les conditions de vente..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-medium"
              />
            </div>

            {/* Contact Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Vos Coordonnées de Vendeur (Appel & WhatsApp)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Nom ou Boutique
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Téléphone d'appel
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={40}
                    placeholder="+225 07..."
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">
                    Numéro WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={40}
                    placeholder="+225 07..."
                    value={sellerWhatsApp}
                    onChange={(e) => setSellerWhatsApp(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Prévisualiser l'annonce</span>
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Preview Mode */
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                Veuillez vérifier les informations de votre annonce avant l'enregistrement définitif dans la base de données.
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
                  <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {condition === 'neuf' ? 'Neuf' : 'Occasion'}
                    </span>
                    <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedCity} •{' '}
                      {selectedNeighborhood === 'autre' ? customNeighborhood : selectedNeighborhood}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900">{title}</h3>

                  <div className="text-2xl font-black text-amber-600">
                    {Number(price).toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-bold text-slate-600">FCFA</span>
                  </div>

                  <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-4">
                    {description}
                  </p>

                  <div className="pt-2 text-xs border-t border-slate-100 text-slate-500">
                    Vendeur : <strong>{sellerName}</strong> • Tél: {sellerPhone} • WhatsApp:{' '}
                    {sellerWhatsApp}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
              <p>
                Mode de publication :{' '}
                {settings.autoApproveListings ? (
                  <strong className="text-emerald-700">Mise en ligne immédiate</strong>
                ) : (
                  <strong className="text-blue-700">
                    Soumis à la modération de l'administrateur DJIBOUA MARKET
                  </strong>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('form')}
                className="px-4 py-2.5 text-sm font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier les informations</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-blue-950 font-black rounded-xl text-sm shadow-md transition active:scale-95 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Confirmer et Publier l'annonce</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
