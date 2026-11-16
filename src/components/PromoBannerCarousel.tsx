import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone, Pencil } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import type { PromoBannerSlide, PromoBannerTheme } from '../types';

interface PromoBannerCarouselProps {
  slides?: PromoBannerSlide[];
  onOpenPublishModal?: () => void;
  previewMode?: boolean;
}

const THEME_CLASSES: Record<
  PromoBannerTheme,
  { wrapper: string; badge: string; cta: string; dotActive: string }
> = {
  royal: {
    wrapper: 'bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white',
    badge: 'bg-amber-400 text-blue-950',
    cta: 'bg-amber-400 hover:bg-amber-300 text-blue-950',
    dotActive: 'bg-amber-400',
  },
  gold: {
    wrapper: 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-blue-950',
    badge: 'bg-blue-950 text-amber-300',
    cta: 'bg-blue-950 hover:bg-blue-900 text-white',
    dotActive: 'bg-blue-950',
  },
  emerald: {
    wrapper: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white',
    badge: 'bg-amber-300 text-emerald-950',
    cta: 'bg-white hover:bg-emerald-50 text-emerald-900',
    dotActive: 'bg-amber-300',
  },
  crimson: {
    wrapper: 'bg-gradient-to-r from-rose-700 via-red-700 to-amber-700 text-white',
    badge: 'bg-white text-rose-800',
    cta: 'bg-amber-300 hover:bg-amber-200 text-rose-950',
    dotActive: 'bg-amber-300',
  },
};

export const PromoBannerCarousel: React.FC<PromoBannerCarouselProps> = ({
  slides,
  onOpenPublishModal,
  previewMode = false,
}) => {
  const { settings, setCurrentView, isAdminAuthorized } = useMarket();
  const sourceSlides = slides ?? settings.promoBanners ?? [];
  const activeSlides = sourceSlides.filter((s) => s.active && s.title.trim().length > 0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeSlides.length, isPaused]);

  if (activeSlides.length === 0) {
    return null;
  }

  const safeIndex = currentIndex % activeSlides.length;
  const currentSlide = activeSlides[safeIndex];
  const theme = THEME_CLASSES[currentSlide.theme || 'royal'] || THEME_CLASSES.royal;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const handleInternalCta = (url?: string) => {
    if (previewMode || !url) return;
    if (url === '#publish') {
      if (onOpenPublishModal) {
        onOpenPublishModal();
      }
      return;
    }
    if (url === '#listings') {
      setCurrentView('listings');
      return;
    }
    if (url === '#favorites') {
      setCurrentView('favorites');
      return;
    }
    if (url === '#home') {
      setCurrentView('home');
      return;
    }
  };

  const isExternalUrl = Boolean(
    currentSlide.ctaUrl &&
      (currentSlide.ctaUrl.startsWith('http://') ||
        currentSlide.ctaUrl.startsWith('https://') ||
        currentSlide.ctaUrl.startsWith('tel:') ||
        currentSlide.ctaUrl.startsWith('mailto:'))
  );

  return (
    <div
      className={`${theme.wrapper} border-t border-white/15 transition-colors duration-500`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Bannière publicitaire"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Previous arrow */}
        {activeSlides.length > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="p-1 rounded-full bg-black/15 hover:bg-black/25 transition shrink-0"
            aria-label="Publicité précédente"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center justify-center p-1 rounded-full bg-black/15 shrink-0">
            <Megaphone className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Slide Content */}
        <div className="flex-1 min-w-0 flex items-center justify-center gap-2.5 sm:gap-3">
          {currentSlide.imageUrl && (
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-white/30 shrink-0 shadow-xs bg-white/10"
            />
          )}

          <div className="min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap justify-center">
            {currentSlide.badge && (
              <span
                className={`${theme.badge} text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0`}
              >
                {currentSlide.badge}
              </span>
            )}

            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold truncate">
                {currentSlide.title}
              </span>
              {currentSlide.subtitle && (
                <span className="hidden lg:inline text-xs opacity-90 truncate max-w-md">
                  — {currentSlide.subtitle}
                </span>
              )}
            </div>
          </div>

          {currentSlide.ctaLabel && currentSlide.ctaUrl && (
            isExternalUrl && !previewMode ? (
              <a
                href={currentSlide.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${theme.cta} text-[10px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-lg shadow-xs transition inline-flex items-center gap-1 shrink-0`}
              >
                <span>{currentSlide.ctaLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleInternalCta(currentSlide.ctaUrl)}
                className={`${theme.cta} text-[10px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-lg shadow-xs transition shrink-0`}
              >
                {currentSlide.ctaLabel}
              </button>
            )
          )}
        </div>

        {/* Right Controls: Dots + Admin Edit Shortcut + Next arrow */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {activeSlides.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              {activeSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Afficher la publicité ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === safeIndex ? `w-4 ${theme.dotActive}` : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}

          {isAdminAuthorized && !previewMode && (
            <button
              type="button"
              onClick={() => setCurrentView('admin_private')}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/20 hover:bg-black/35 text-[10px] font-bold transition"
              title="Modifier les bannières publicitaires (Admin)"
            >
              <Pencil className="w-3 h-3" />
              <span>Éditer</span>
            </button>
          )}

          {activeSlides.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-full bg-black/15 hover:bg-black/25 transition"
              aria-label="Publicité suivante"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
