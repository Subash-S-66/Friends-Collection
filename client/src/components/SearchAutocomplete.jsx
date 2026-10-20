import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineArrowNarrowRight,
  HiOutlineSparkles,
  HiOutlineShoppingBag,
  HiOutlineTag
} from 'react-icons/hi';
import API from '../utils/api';
import { formatPrice, getDiscount, getImageUrl, handleImageError } from '../utils/formatters';

const DEFAULT_POPULAR_SEARCHES = [
  'Pure Silk Sarees',
  'Bridal Lehengas',
  'Designer Kurtis',
  'Men Linen Shirts',
  'Kids Festive Wear'
];

/**
 * Highlights matching letters/words in the product title (Amazon/Flipkart style)
 */
const highlightMatch = (text, query) => {
  if (!query || !query.trim()) return text;
  const cleanQ = query.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const parts = text.split(new RegExp(`(${cleanQ})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <span key={i} className="text-primary font-black underline decoration-accent-400 decoration-2">
        {part}
      </span>
    ) : (
      part
    )
  );
};

const SearchAutocomplete = ({
  autoFocus = true,
  onClose,
  placeholder = "Search silk sarees, anarkalis, linen shirts, festive kurtas...",
  className = "",
  initialQuery = "",
  onSearch,
  onClear,
  onCategorySelect
}) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const [query, setQuery] = useState(initialQuery || '');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suggestions, setSuggestions] = useState(DEFAULT_POPULAR_SEARCHES);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Synchronize internal query when initialQuery prop updates
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Fetch suggestions from backend
  const fetchSuggestions = useCallback(async (searchTerm) => {
    setLoading(true);
    try {
      const res = await API.get('/products/search/suggestions', {
        params: { q: searchTerm || '' }
      });
      setProducts(res.data?.products || []);
      setCategories(res.data?.categories || []);
      if (res.data?.suggestions && res.data.suggestions.length > 0) {
        setSuggestions(res.data.suggestions);
      } else if (!searchTerm) {
        setSuggestions(DEFAULT_POPULAR_SEARCHES);
      }
      setTotalCount(res.data?.total ?? (res.data?.products?.length || 0));
    } catch (err) {
      console.error('Search suggestions error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle typing with 180ms debounce for instantaneous feel without server overload
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
      setSelectedIndex(-1);
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Submit search query
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    setIsOpen(false);
    if (onClose) onClose();
    if (onSearch) {
      onSearch(trimmed);
    } else if (trimmed) {
      navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
    }
  };

  // Click on a specific product from dropdown
  const handleSelectProduct = (productSlug) => {
    setIsOpen(false);
    if (onClose) onClose();
    navigate(`/product/${productSlug}`);
  };

  // Click on a category suggestion
  const handleSelectCategory = (catSlug) => {
    setIsOpen(false);
    if (onClose) onClose();
    if (onCategorySelect) {
      onCategorySelect(catSlug);
    } else {
      navigate(`/shop?category=${encodeURIComponent(catSlug)}`);
    }
  };

  // Click on a suggestion chip
  const handleSelectSuggestion = (tag) => {
    setQuery(tag);
    setIsOpen(false);
    if (onClose) onClose();
    if (onSearch) {
      onSearch(tag);
    } else {
      navigate(`/shop?search=${encodeURIComponent(tag)}`);
    }
  };

  // Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      if (onClose) onClose();
      return;
    }

    if (!isOpen || products.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < products.length) {
        e.preventDefault();
        handleSelectProduct(products[selectedIndex].slug);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <HiOutlineSearch className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (products.length === 0) {
              fetchSuggestions(query);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-11 pr-24 py-3 bg-white border border-accent-200/90 rounded-full text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm transition-all"
        />

        {/* Clear query button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              fetchSuggestions('');
              if (onClear) onClear();
              if (inputRef.current) inputRef.current.focus();
            }}
            className="absolute right-12 p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            title="Clear search"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}

        {/* Loading Spinner or Close Toggle */}
        <div className="absolute right-3 flex items-center gap-1.5">
          {loading && (
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Close search"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {/* ============================================================== */}
      {/* AMAZON & FLIPKART STYLE AUTOCOMPLETE DROPDOWN                   */}
      {/* ============================================================== */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] flex flex-col">
          
          {/* 1. Quick Keyword Suggestions / Popular Searches */}
          {suggestions && suggestions.length > 0 && (
            <div className="p-3 sm:px-4 sm:py-2.5 bg-neutral-50/80 border-b border-neutral-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-500" />
                <span>{query.trim() ? 'Related:' : 'Trending:'}</span>
              </span>
              {suggestions.map((item, idx) => (
                <button
                  key={`sug-${idx}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-cream border border-neutral-200 text-neutral-700 hover:text-primary text-xs font-medium transition-all shadow-2xs cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* 2. Category Shortcuts (like Flipkart "saree in Women", "shirt in Men") */}
          {categories && categories.length > 0 && (
            <div className="px-4 py-2 bg-cream/30 border-b border-neutral-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <HiOutlineTag className="w-3.5 h-3.5 text-primary" />
                <span>Explore in:</span>
              </span>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className="text-xs font-semibold text-primary hover:text-primary-dark hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{cat.name}</span>
                  {cat.gender && (
                    <span className="text-[10px] text-neutral-400">({cat.gender})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 3. Product Results List with Images */}
          <div className="overflow-y-auto divide-y divide-neutral-100 flex-1">
            {products.length > 0 ? (
              products.map((item, index) => {
                const isSelected = index === selectedIndex;
                const salePrice = item.salePrice;
                const effectivePrice = salePrice || item.price;
                const discount = getDiscount(item.price, salePrice);
                const thumb = item.images?.[0];

                return (
                  <div
                    key={item._id}
                    onClick={() => handleSelectProduct(item.slug)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-accent-50/70' : 'hover:bg-cream/40'
                    }`}
                  >
                    {/* Product Image Thumbnail */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-neutral-100 border border-neutral-200/80 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <img
                        src={getImageUrl(thumb)}
                        alt={item.title}
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Product Title, Department, Category */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-primary transition-colors truncate">
                        {highlightMatch(item.title, query)}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-500 font-medium">
                        {item.category?.name && (
                          <span>{item.category.name}</span>
                        )}
                        {item.gender && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{item.gender}</span>
                          </>
                        )}
                        {item.stock === 0 ? (
                          <>
                            <span>•</span>
                            <span className="text-red-600 font-bold">Out of stock</span>
                          </>
                        ) : item.stock <= 3 ? (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-bold">Only <span className="font-numeric">{item.stock}</span> left</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Price & Discount Pill */}
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-numeric font-extrabold text-neutral-900 group-hover:text-primary transition-colors tracking-tight">
                        {formatPrice(effectivePrice)}
                      </div>
                      {discount > 0 && (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-numeric text-neutral-400 line-through">
                            {formatPrice(item.price)}
                          </span>
                          <span className="text-[9px] font-numeric font-bold text-red-600 bg-red-50 border border-red-100 px-1 rounded-sm">
                            {discount}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow Indicator */}
                    <div className="text-neutral-300 group-hover:text-primary transition-colors hidden sm:block">
                      <HiOutlineArrowNarrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })
            ) : !loading && query.trim() ? (
              /* Empty state */
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                  <HiOutlineShoppingBag className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-neutral-700">
                  No dresses found for "{query}"
                </p>
                <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                  Check your spelling or try searching for <em>Silk Sarees</em>, <em>Designer Kurtis</em>, or <em>Lehengas</em>.
                </p>
              </div>
            ) : null}
          </div>

          {/* 4. Bottom Footer: "View all X results for query" */}
          {query.trim() && (
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="p-3 bg-neutral-50 hover:bg-neutral-100 border-t border-neutral-100 text-xs font-bold text-primary flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5">
                <HiOutlineSearch className="w-3.5 h-3.5 text-accent-600" />
                <span>
                  View all {totalCount > 0 ? totalCount : ''} matching results for "{query.trim()}"
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                <span>See all</span>
                <HiOutlineArrowNarrowRight className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
