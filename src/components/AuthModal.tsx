import React, { useEffect, useState } from 'react';
import {
  X,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Camera,
  Trash2,
  Store,
  ShoppingBag,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { compressImageFile } from '../utils/imageCompression';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  defaultRole?: 'buyer' | 'seller';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Connexion requise',
  subtitle = 'Veuillez créer un compte ou vous connecter pour continuer.',
  defaultRole = 'seller',
}) => {
  const {
    cities,
    registerUser,
    registerWithCredentials,
    loginWithCredentials,
    signInWithGoogle,
    firebaseUser,
  } = useMarket();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [accountRole, setAccountRole] = useState<'buyer' | 'seller'>(defaultRole);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Register Fields
  const [name, setName] = useState(firebaseUser?.displayName || '');
  const [businessName, setBusinessName] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState(cities[0]?.name || 'Divo');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(
    cities[0]?.neighborhoods[0] || 'Bada'
  );
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [phone, setPhone] = useState('+225 07 ');
  const [whatsapp, setWhatsapp] = useState('+225 07 ');
  const [sameAsPhone, setSameAsPhone] = useState(true);

  // Credential Registration Fields
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Credential Login Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccountRole(defaultRole);
      setError(null);
      if (firebaseUser?.displayName && !name) {
        setName(firebaseUser.displayName);
      }
    }
  }, [isOpen, defaultRole, firebaseUser]);

  if (!isOpen) return null;

  const activeCityObj =
    cities.find((c) => c.name.toLowerCase() === selectedCity.toLowerCase()) || cities[0];

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setCustomNeighborhood('');
    const cObj = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
    if (cObj && cObj.neighborhoods.length > 0) {
      setSelectedNeighborhood(cObj.neighborhoods[0]);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (sameAsPhone) {
      setWhatsapp(val);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("L'image est trop volumineuse (maximum 10 Mo).");
      return;
    }
    try {
      const compressed = await compressImageFile(file, 256, 50000);
      setCustomAvatar(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de traiter l'image.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError('Veuillez saisir votre nom complet (minimum 2 caractères).');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setError('Veuillez saisir un numéro de téléphone valide (au moins 8 chiffres).');
      return;
    }

    const finalNeighborhood =
      selectedNeighborhood === '__autre__' ? customNeighborhood.trim() : selectedNeighborhood;
    if (!finalNeighborhood || finalNeighborhood.length < 2) {
      setError('Veuillez indiquer votre quartier ou village.');
      return;
    }

    // If not already signed in with Google, validate identifier + password
    if (!firebaseUser) {
      const cleanId = regIdentifier.trim();
      if (cleanId.length < 3) {
        setError(
          "Veuillez choisir un identifiant de connexion (email, numéro ou pseudo d'au moins 3 caractères)."
        );
        return;
      }
      if (regPassword.length < 6) {
        setError('Votre mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (firebaseUser) {
        await registerUser({
          name: name.trim(),
          businessName: businessName.trim() || undefined,
          phone: phone.trim(),
          whatsapp: sameAsPhone ? phone.trim() : whatsapp.trim(),
          city: selectedCity,
          neighborhood: finalNeighborhood,
          avatarUrl: customAvatar || undefined,
          role: accountRole,
        });
      } else {
        const cleanId = regIdentifier.trim();
        await registerWithCredentials({
          identifier: cleanId,
          password: regPassword,
          name: name.trim(),
          businessName: businessName.trim() || undefined,
          email: cleanId.includes('@') ? cleanId : undefined,
          phone: phone.trim(),
          whatsapp: sameAsPhone ? phone.trim() : whatsapp.trim(),
          city: selectedCity,
          neighborhood: finalNeighborhood,
          avatarUrl: customAvatar || undefined,
          role: accountRole,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user')) {
        setError('La fenêtre de vérification Google a été fermée avant la fin.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Erreur lors de la création ou de l’enregistrement du compte dans la base de données.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Veuillez saisir votre identifiant et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithCredentials(loginIdentifier.trim(), loginPassword);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Identifiant ou mot de passe incorrect.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.profileExists && result.profile) {
        onSuccess();
        onClose();
      } else {
        if (result.firebaseUser.displayName && !name) {
          setName(result.firebaseUser.displayName);
        }
        setMode('register');
        setError(
          'Compte Google vérifié ! Complétez vos coordonnées locales (ville et téléphone) ci-dessous pour activer votre compte.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        setError(
          'La fenêtre Google a été fermée ou annulée. Vous pouvez aussi utiliser votre identifiant et mot de passe.'
        );
      } else if (msg.includes('popup-blocked')) {
        setError(
          'La fenêtre Google a été bloquée par votre navigateur. Utilisez l’inscription par identifiant et mot de passe ci-dessous.'
        );
      } else if (msg.includes('unauthorized-domain')) {
        setError(
          'Connexion Google non disponible sur ce domaine. Veuillez utiliser votre identifiant et mot de passe.'
        );
      } else if (msg.includes('suspendu')) {
        setError(msg);
      } else {
        setError(
          'Impossible de se connecter avec Google pour le moment. Utilisez votre identifiant et mot de passe.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const previewAvatar = customAvatar || firebaseUser?.photoURL || '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-950 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐘</span>
            <div>
              <h3 className="font-bold text-base sm:text-lg">{title}</h3>
              <p className="text-[11px] text-blue-200">
                DJIBOUA MARKET • Divo • Lakota • Gagnoa • Guitry
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-blue-200 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Subtitle Notice */}
        <div className="px-6 pt-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2.5 rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Créer un compte
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2.5 rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. J'ai déjà un compte
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* REGISTER FORM */}
        {mode === 'register' ? (
          <form
            onSubmit={handleRegisterSubmit}
            className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs"
          >
            {firebaseUser ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Identité Google vérifiée : <strong>{firebaseUser.email}</strong>
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-900 text-amber-400 font-black text-[10px] flex items-center justify-center">
                    G
                  </span>
                  <span>S'inscrire rapidement avec Google</span>
                </button>
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2.5 text-[11px] font-semibold text-slate-400 shrink-0">
                    ou avec identifiant & mot de passe
                  </span>
                  <div className="border-t border-slate-200 w-full" />
                </div>
              </div>
            )}

            {/* Account Type Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Type de compte
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountRole('buyer')}
                  className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition ${
                    accountRole === 'buyer'
                      ? 'bg-blue-50 border-blue-700 text-blue-950 ring-2 ring-blue-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Compte Acheteur</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountRole('seller')}
                  className={`p-2.5 rounded-xl border text-left font-bold flex items-center gap-2 transition ${
                    accountRole === 'seller'
                      ? 'bg-blue-50 border-blue-700 text-blue-950 ring-2 ring-blue-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Store className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Compte Vendeur</span>
                </button>
              </div>
            </div>

            {/* Profile Photo / Shop Logo Upload */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-blue-900 text-amber-400 font-black text-xl flex items-center justify-center overflow-hidden border-2 border-amber-400/50 shrink-0">
                {previewAvatar ? (
                  <img src={previewAvatar} alt="Aperçu profil" className="w-full h-full object-cover" />
                ) : (
                  <span>{name ? name.charAt(0).toUpperCase() : '🐘'}</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="font-bold text-slate-800">
                  {accountRole === 'seller'
                    ? 'Photo de profil ou Logo de votre boutique'
                    : 'Photo de profil ou Logo de votre compte'}
                </div>
                <p className="text-[11px] text-slate-500">
                  Téléchargez votre propre photo ou logo depuis votre téléphone ou ordinateur (JPG, PNG).
                </p>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold cursor-pointer transition text-[11px]">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {customAvatar ? 'Changer la photo / logo' : 'Télécharger une photo / logo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  {customAvatar && (
                    <button
                      type="button"
                      onClick={() => setCustomAvatar('')}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Retirer l'image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider block">
                Votre Nom & Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Kouassi Emmanuel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            {accountRole === 'seller' && (
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Nom Commercial ou Boutique (facultatif si particulier)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Divo Mobile Express / Ferme de Lakota..."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>
            )}

            {/* Geographical selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <label className="font-bold text-slate-700 mb-1 block">Ville de résidence</label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>
                      📍 {c.name} ({c.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 mb-1 block">Quartier ou Village</label>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  {activeCityObj?.neighborhoods.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="__autre__">Autre quartier / village (saisir manuellement)...</option>
                </select>
              </div>

              {selectedNeighborhood === '__autre__' && (
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Saisissez manuellement votre quartier ou village <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="Ex: Village de Kouta, Nouveau Quartier..."
                    value={customNeighborhood}
                    onChange={(e) => setCustomNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-400 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Phone & WhatsApp */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Numéro de téléphone d'appel <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+225 07 12 34 56 78"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameWhatsapp"
                  checked={sameAsPhone}
                  onChange={(e) => {
                    setSameAsPhone(e.target.checked);
                    if (e.target.checked) setWhatsapp(phone);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sameWhatsapp" className="text-slate-600 font-medium cursor-pointer">
                  Mon numéro WhatsApp est identique au numéro d'appel
                </label>
              </div>

              {!sameAsPhone && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Numéro WhatsApp distinct <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+225 05..."
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>
              )}
            </div>

            {/* Credentials section when not using Google */}
            {!firebaseUser && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 text-blue-950 font-black uppercase tracking-wider text-[11px]">
                  <KeyRound className="w-3.5 h-3.5 text-blue-700" />
                  <span>Identifiants de connexion</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Identifiant (email, pseudo ou numéro) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Ex: kouassi.emmanuel ou email@exemple.ci"
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Min. 6 caractères"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      Confirmer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Répétez le mot de passe"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                Votre compte, vos coordonnées et vos opérations sont enregistrés de manière sécurisée dans la base de données DJIBOUA MARKET.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-blue-950 font-black rounded-xl text-sm transition shadow-md active:scale-95 flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement sécurisé...</span>
                </>
              ) : (
                <>
                  <span>
                    {firebaseUser
                      ? 'Enregistrer mon profil Google et continuer'
                      : 'Créer mon compte et continuer'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* LOGIN VIEW (Credentials OR Google) */
          <div className="p-6 space-y-4 text-xs">
            <form onSubmit={handleCredentialLogin} className="space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-blue-800 shrink-0" />
                <p className="text-slate-600">
                  Connectez-vous avec votre <strong>identifiant et mot de passe</strong>, ou avec votre compte <strong>Google</strong>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Identifiant (pseudo, email ou téléphone)
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Ex: kouassi.emmanuel ou +225 07..."
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-900 hover:bg-blue-950 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 shrink-0">
                ou
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-60 text-slate-800 font-bold rounded-xl text-xs transition shadow-xs active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="w-4 h-4 rounded-full bg-blue-900 text-amber-400 font-black text-[10px] flex items-center justify-center">
                G
              </span>
              <span>Se connecter avec Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
