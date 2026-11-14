import React, { useState } from 'react';
import { MarketProvider, useMarket } from './context/MarketContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { ListingsView } from './components/ListingsView';
import { VendorDashboard } from './components/VendorDashboard';
import { FavoritesView } from './components/FavoritesView';
import { AdminDashboard } from './components/AdminDashboard';
import { ListingDetailModal } from './components/ListingDetailModal';
import { PublishListingModal } from './components/PublishListingModal';
import { PaymentModal } from './components/PaymentModal';
import { ReportModal } from './components/ReportModal';
import { AndroidDeviceSimulator } from './components/AndroidDeviceSimulator';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { Listing, Transaction } from './types';

const MainAppContent: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    deviceMode,
    trackListingView,
    currentUser
  } = useMarket();

  // Modals state
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [reportingListing, setReportingListing] = useState<Listing | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<'publish' | 'vendor_space' | 'buy' | 'general'>('general');
  const [pendingBuyListing, setPendingBuyListing] = useState<Listing | null>(null);

  // Success Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenListingDetail = (listing: Listing) => {
    trackListingView(listing.id);
    setSelectedListing(listing);
  };

  // Requirement: visitors must create an account or sign in as soon as they want to buy an item
  const handleQuickBuy = (listing: Listing) => {
    setSelectedListing(null);
    if (!currentUser) {
      setPendingBuyListing(listing);
      setAuthIntent('buy');
      setIsAuthModalOpen(true);
    } else {
      setCheckoutListing(listing);
    }
  };

  const handleOpenReport = (listing: Listing) => {
    setReportingListing(listing);
  };

  // Requirement: "créer un compte avant de faire une annonce"
  const handleOpenPublish = () => {
    if (!currentUser) {
      setAuthIntent('publish');
      setIsAuthModalOpen(true);
    } else {
      setIsPublishModalOpen(true);
    }
  };

  const handleOpenGeneralAuth = () => {
    setAuthIntent('general');
    setIsAuthModalOpen(true);
  };

  const handleOpenAuthForVendor = () => {
    setAuthIntent('vendor_space');
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    if (authIntent === 'buy' && pendingBuyListing) {
      showToast('Compte activé ! Vous pouvez maintenant finaliser votre achat.');
      setCheckoutListing(pendingBuyListing);
      setPendingBuyListing(null);
    } else if (authIntent === 'publish') {
      showToast('Compte activé ! Vous pouvez maintenant publier votre annonce.');
      setIsPublishModalOpen(true);
    } else if (authIntent === 'vendor_space') {
      showToast('Bienvenue dans votre espace personnel.');
      setCurrentView('vendor_dashboard');
    } else {
      showToast('Connexion réussie.');
    }
    setAuthIntent('general');
  };

  // If currently in private admin route (/gestion-privee)
  if (currentView === 'admin_private') {
    return <AdminDashboard />;
  }

  // Active view content
  const renderActiveView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            onOpenPublishModal={handleOpenPublish}
            onOpenAuthModal={handleOpenPublish}
            onOpenListingDetail={handleOpenListingDetail}
            onQuickBuy={handleQuickBuy}
          />
        );
      case 'listings':
        return (
          <ListingsView
            onOpenListingDetail={handleOpenListingDetail}
            onQuickBuy={handleQuickBuy}
            onOpenPublishModal={handleOpenPublish}
            onOpenAuthModal={handleOpenPublish}
          />
        );
      case 'vendor_dashboard':
        return (
          <VendorDashboard
            onOpenPublishModal={handleOpenPublish}
            onOpenListingDetail={handleOpenListingDetail}
            onOpenAuthModal={handleOpenAuthForVendor}
          />
        );
      case 'favorites':
        return (
          <FavoritesView
            onOpenListingDetail={handleOpenListingDetail}
            onQuickBuy={handleQuickBuy}
          />
        );
      default:
        return (
          <HomeView
            onOpenPublishModal={handleOpenPublish}
            onOpenAuthModal={handleOpenPublish}
            onOpenListingDetail={handleOpenListingDetail}
            onQuickBuy={handleQuickBuy}
          />
        );
    }
  };

  // Web Layout vs Android Simulation Layout
  const appLayout = deviceMode === 'android' ? (
    <AndroidDeviceSimulator 
      onOpenPublishModal={handleOpenPublish}
      onOpenAuthModal={handleOpenGeneralAuth}
    >
      <Navbar
        onOpenPublishModal={handleOpenPublish}
        onOpenAuthModal={handleOpenGeneralAuth}
      />
      <div className="flex-1">
        {renderActiveView()}
      </div>
      <Footer />
    </AndroidDeviceSimulator>
  ) : (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        onOpenPublishModal={handleOpenPublish}
        onOpenAuthModal={handleOpenGeneralAuth}
      />
      <main className="flex-1">
        {renderActiveView()}
      </main>
      <Footer />
    </div>
  );

  return (
    <>
      {appLayout}

      {/* Account Creation & Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingBuyListing(null);
        }}
        onSuccess={handleAuthSuccess}
        defaultRole={authIntent === 'buy' ? 'buyer' : 'seller'}
        title={
          authIntent === 'buy'
            ? 'Créer un compte ou se connecter pour acheter'
            : authIntent === 'publish'
              ? 'Créer un compte avant de publier'
              : 'Connexion à votre espace DJIBOUA MARKET'
        }
        subtitle={
          authIntent === 'buy'
            ? 'Pour acheter un article sur DJIBOUA MARKET, veuillez créer votre compte ou vous connecter afin que le vendeur puisse vous contacter et livrer votre commande.'
            : authIntent === 'publish'
              ? 'Chaque vendeur doit créer son compte vérifié pour publier et gérer ses annonces en toute sécurité.'
              : 'Connectez-vous ou créez votre compte pour acheter, publier vos annonces et suivre vos commandes.'
        }
      />

      {/* Modals */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onOpenReport={handleOpenReport}
          onOpenCheckout={handleQuickBuy}
        />
      )}

      {isPublishModalOpen && (
        <PublishListingModal
          onClose={() => setIsPublishModalOpen(false)}
          onSuccess={() => {
            showToast('Votre annonce a été soumise avec succès ! Vous êtes dans votre espace personnel.');
            setCurrentView('vendor_dashboard');
          }}
        />
      )}

      {checkoutListing && (
        <PaymentModal
          listing={checkoutListing}
          onClose={() => setCheckoutListing(null)}
          onSuccess={(trx: Transaction) => showToast(`Commande #${trx.reference} confirmée !`)}
        />
      )}

      {reportingListing && (
        <ReportModal
          listing={reportingListing}
          onClose={() => setReportingListing(null)}
        />
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-xl">🐘</span>
          <p className="text-xs font-bold text-amber-300">{toastMessage}</p>
        </div>
      )}
    </>
  );
};

export function App() {
  return (
    <MarketProvider>
      <MainAppContent />
    </MarketProvider>
  );
}

export default App;
