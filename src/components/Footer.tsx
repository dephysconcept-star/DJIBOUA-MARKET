import React from 'react';
import { Phone, MessageCircle, MapPin, ShieldCheck } from 'lucide-react';
import { LokodaLogo } from './LokodaLogo';
import { useMarket } from '../context/MarketContext';

export const Footer: React.FC = () => {
  const { setCurrentView, setSelectedCity, cities } = useMarket();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Presentation */}
          <div className="lg:col-span-2 space-y-4">
            <LokodaLogo variant="light" size="lg" showTagline={true} />
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              DJIBOUA MARKET est la marketplace de référence pour digitaliser le commerce de proximité à <strong>Divo</strong>, <strong>Lakota</strong>, <strong>Gagnoa</strong> et <strong>Guitry</strong>. Achetez, vendez et trouvez vos biens et services près de chez vous en contactant directement les vendeurs.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Côte d'Ivoire • Régions du Lôh-Djiboua & du Gôh</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Support :{' '}
                  <a
                    href="tel:+2252724529562"
                    className="hover:text-amber-300 transition-colors font-semibold text-slate-300"
                  >
                    +225 2724529562
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  WhatsApp officiel :{' '}
                  <a
                    href="https://wa.me/2250777733284"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-300 transition-colors font-semibold text-slate-300"
                  >
                    0777733284
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* Target Zones */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Zones de Lancement
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {cities.map(c => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setSelectedCity(c.name);
                      setCurrentView('listings');
                    }}
                    className="hover:text-amber-400 transition flex items-center gap-1.5"
                  >
                    <span>📍 Ville de {c.name}</span>
                  </button>
                </li>
              ))}
              <li className="pt-2 text-[11px] text-slate-500">
                Extension prochaine : Abidjan, San Pedro, Daloa, Soubré, Yamoussoukro.
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => setCurrentView('home')} className="hover:text-white transition">
                  Accueil
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('listings')} className="hover:text-white transition">
                  Toutes les annonces
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('favorites')} className="hover:text-white transition">
                  Mes favoris
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('vendor_dashboard')} className="hover:text-white transition">
                  Espace Vendeur
                </button>
              </li>
            </ul>
          </div>

          {/* Security & Rules */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Commerce & Sécurité
            </h4>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Conseil de prudence :</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Ne payez pas à l'avance. Rencontrez le vendeur dans un lieu public, vérifiez l'article et réglez-le directement.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom bar with discreet copyright-triggered admin access */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            <button
              type="button"
              onClick={() => setCurrentView('admin_private')}
              className="text-left hover:text-slate-400 transition-colors cursor-pointer select-none focus:outline-none"
              aria-label="Copyright DJIBOUA MARKET"
            >
              © {new Date().getFullYear()} <strong className="text-slate-400">DJIBOUA MARKET</strong>. Tous droits réservés.
            </button>{' '}
            L'éléphant est l'emblème officiel de la marque.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Conditions d'utilisation (CGU)</span>
            <span>•</span>
            <span>Politique de confidentialité</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
