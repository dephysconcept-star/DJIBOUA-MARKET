import React from 'react';
import { 
  Wifi, 
  Battery, 
  Signal, 
  Home, 
  Search, 
  PlusCircle, 
  Heart, 
  Store, 
  Smartphone, 
  Laptop,
  ArrowLeft
} from 'lucide-react';
import { useMarket } from '../context/MarketContext';

interface AndroidDeviceSimulatorProps {
  children: React.ReactNode;
  onOpenPublishModal: () => void;
  onOpenAuthModal?: () => void;
}

export const AndroidDeviceSimulator: React.FC<AndroidDeviceSimulatorProps> = ({ 
  children,
  onOpenPublishModal,
  onOpenAuthModal 
}) => {
  const { 
    currentView, 
    setCurrentView, 
    favorites, 
    setDeviceMode,
    currentUser 
  } = useMarket();

  const handleVendreClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
    } else {
      onOpenPublishModal();
    }
  };

  const handleVendeurTabClick = () => {
    if (!currentUser) {
      if (onOpenAuthModal) onOpenAuthModal();
    } else {
      setCurrentView('vendor_dashboard');
    }
  };

  // Current simulated time
  const currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-6 py-4">
      {/* Top Controller Bar */}
      <div className="w-full max-w-sm mb-3 flex items-center justify-between text-xs text-slate-300 px-2">
        <div className="flex items-center gap-1.5 font-bold text-amber-400">
          <Smartphone className="w-4 h-4" />
          <span>Simulateur Android DJIBOUA MARKET</span>
        </div>

        <button
          onClick={() => setDeviceMode('web')}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-1 shadow"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Vue Web Plein Écran</span>
        </button>
      </div>

      {/* Android Smartphone Shell */}
      <div className="relative w-full max-w-[395px] h-[820px] bg-slate-950 rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800 shadow-blue-900/30 flex flex-col overflow-hidden border-4 border-slate-700">
        
        {/* Device Punch Hole / Camera */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-50 ring-1 ring-slate-800 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-blue-950 rounded-full" />
        </div>

        {/* Android Native Status Bar */}
        <div className="h-8 bg-blue-950 text-white text-[11px] px-6 flex items-center justify-between font-medium z-40 select-none shrink-0 pt-1">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3 text-white" />
            <span className="text-[9px] font-bold">4G+</span>
            <Wifi className="w-3 h-3 text-white" />
            <Battery className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Smartphone Screen Viewport (Scrollable child content) */}
        <div className="flex-1 bg-slate-50 overflow-y-auto overflow-x-hidden relative flex flex-col scrollbar-thin scrollbar-thumb-slate-300">
          {children}
        </div>

        {/* Android Bottom Navigation Bar */}
        <div className="h-14 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shrink-0">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition ${
              currentView === 'home' ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Accueil</span>
          </button>

          <button
            onClick={() => setCurrentView('listings')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition ${
              currentView === 'listings' ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px]">Rechercher</span>
          </button>

          {/* Big Center Action: Vendre */}
          <button
            onClick={handleVendreClick}
            className="flex flex-col items-center justify-center -mt-5"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-blue-950 flex items-center justify-center shadow-lg ring-4 ring-white active:scale-95 transition">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-800 mt-0.5">Vendre</span>
          </button>

          <button
            onClick={() => setCurrentView('favorites')}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 relative transition ${
              currentView === 'favorites' ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Heart className="w-5 h-5" />
            {favorites.length > 0 && (
              <span className="absolute top-1 right-5 bg-amber-500 text-blue-950 font-black text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {favorites.length}
              </span>
            )}
            <span className="text-[10px]">Favoris</span>
          </button>

          <button
            onClick={handleVendeurTabClick}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition ${
              currentView === 'vendor_dashboard' ? 'text-blue-900 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px]">Vendeur</span>
          </button>
        </div>

        {/* Android gesture navigation bar pill */}
        <div className="h-4 bg-white flex items-center justify-center shrink-0">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};
