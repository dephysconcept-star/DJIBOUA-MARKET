import React from 'react';
import { useMarket } from '../context/MarketContext';
import { CategoryIcon } from './CategoryIcon';

export const CategoriesBar: React.FC = () => {
  const { 
    categories, 
    selectedCategory, 
    setSelectedCategory, 
    setCurrentView 
  } = useMarket();

  const handleSelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentView('listings');
  };

  return (
    <section className="bg-white border-b border-slate-200/80 py-4 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>Catégories officielles</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              18
            </span>
          </h2>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Afficher tout
            </button>
          )}
        </div>

        {/* Scrollable categories strip */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
          <button
            onClick={() => handleSelect('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-900 text-white shadow-sm ring-2 ring-blue-900/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Toutes les catégories</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all group ${
                  isSelected
                    ? 'bg-blue-800 text-white shadow-sm ring-2 ring-amber-400'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/90'
                }`}
                title={cat.description}
              >
                <span className={`p-1 rounded-lg ${
                  isSelected ? 'bg-amber-400 text-blue-950' : 'bg-white text-blue-700 group-hover:bg-blue-50'
                }`}>
                  <CategoryIcon name={cat.iconName} className="w-3.5 h-3.5" />
                </span>
                <span>{cat.name}</span>
                {cat.listingCount !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-blue-950/60 text-amber-300' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {cat.listingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
