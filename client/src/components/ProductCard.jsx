import { Link } from 'react-router-dom';
import { HiOutlineShoppingBag, HiCheck, HiOutlineBell } from 'react-icons/hi';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import NotifyModal from './NotifyModal';
import { formatPrice, getDiscount, getImageUrl, handleImageError } from '../utils/formatters';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [selectedColorOverride, setSelectedColorOverride] = useState(null);
  const discount = getDiscount(product.price, product.salePrice);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  // Extract distinct colors and their images for color dot previews
  const colorSwatches = (() => {
    const list = [];
    const seen = new Set();

    if (Array.isArray(product.colorImages)) {
      product.colorImages.forEach((ci) => {
        const c = (ci.color || '').trim();
        if (c && !seen.has(c.toLowerCase())) {
          seen.add(c.toLowerCase());
          list.push({ color: c, image: ci.image });
        }
      });
    }

    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        const c = (v.color || '').trim();
        if (c && !seen.has(c.toLowerCase())) {
          seen.add(c.toLowerCase());
          list.push({ color: c, image: v.image || '' });
        }
      });
    }

    if (list.length === 0 && Array.isArray(product.colors)) {
      product.colors.forEach((c) => {
        const clean = (c || '').trim();
        if (clean && !seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase());
          list.push({ color: clean, image: '' });
        }
      });
    }

    return list;
  })();

  const activeSwatch = selectedColorOverride
    ? colorSwatches.find((s) => s.color.toLowerCase() === selectedColorOverride.toLowerCase())
    : null;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding || added || isOutOfStock) return;
    setIsAdding(true);

    try {
      // Pick first available in-stock variant or size, preferring active swatch color if selected
      let defaultSize = '';
      let defaultColor = selectedColorOverride || '';
      if (product.variants && product.variants.length > 0) {
        let inStock = null;
        if (defaultColor) {
          inStock = product.variants.find(
            (v) => (v.color || '').trim().toLowerCase() === defaultColor.toLowerCase() && v.stock > 0
          );
        }
        if (!inStock) {
          inStock = product.variants.find((v) => v.stock > 0);
        }
        if (!inStock) {
          setIsAdding(false);
          setNotifyOpen(true);
          return;
        }
        defaultSize = inStock.size || '';
        defaultColor = inStock.color || '';
      } else {
        if (product.stock <= 0) {
          setIsAdding(false);
          setNotifyOpen(true);
          return;
        }
        defaultSize = product.sizes?.[0] || '';
        defaultColor = defaultColor || product.colors?.[0] || '';
      }

      const success = addToCart(product, 1, defaultSize, defaultColor);
      if (success !== false) {
        setAdded(true);
        setTimeout(() => {
          setAdded(false);
          setIsAdding(false);
        }, 1500);
      } else {
        setIsAdding(false);
      }
    } catch (err) {
      console.error('Error adding to bag from card:', err);
      setIsAdding(false);
    }
  };

  // Clean product images: remove any store logo mistakenly placed in product images
  const cleanImages = (product.images || []).filter(
    (img) => typeof img === 'string' && !img.toLowerCase().includes('logo')
  );

  const rawPrimary = activeSwatch?.image || cleanImages[0];
  const rawSecondary =
    !activeSwatch?.image && cleanImages.length > 1 && cleanImages[1] && cleanImages[1] !== rawPrimary
      ? cleanImages[1]
      : null;

  // Detect whether primary image is missing or a fallback
  const isPrimaryFallback =
    !rawPrimary ||
    rawPrimary === '/fallback-product.png' ||
    rawPrimary === '/fallback-product-1.png' ||
    rawPrimary.includes('card.png');

  // Primary image to display
  const primaryImage = isPrimaryFallback ? '/fallback-product-1.png' : rawPrimary;

  // Secondary/Hover image:
  const hoverImage = rawSecondary || (isPrimaryFallback ? '/fallback-product-2.png' : null);
  const hasHoverImage = Boolean(hoverImage);

  const targetLink = selectedColorOverride
    ? `/product/${product.slug}?color=${encodeURIComponent(selectedColorOverride)}`
    : `/product/${product.slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col bg-white rounded-xl sm:rounded-2xl overflow-hidden border shadow-xs hover:shadow-card-hover transition-all duration-300 ${
        isOutOfStock
          ? 'border-neutral-300 opacity-90'
          : 'border-accent-100 hover:border-accent-300'
      }`}
    >
      <Link to={targetLink} className="flex flex-col h-full">
        {/* Image Container with 3:4 Aspect Ratio Guard */}
        <div className={`relative aspect-[3/4] w-full overflow-hidden bg-cream-dark ${isOutOfStock ? 'grayscale-[35%]' : ''}`}>
          <img
            src={getImageUrl(primaryImage, '/fallback-product-1.png')}
            alt={product.title}
            onError={(e) => handleImageError(e, '/fallback-product-1.png')}
            className={`w-full h-full object-cover object-top ${
              hasHoverImage && !isOutOfStock ? 'transition-transform duration-700 ease-out group-hover:scale-105' : ''
            } ${isOutOfStock ? 'opacity-80' : ''}`}
            loading="lazy"
          />
          {hasHoverImage && !isOutOfStock && (
            <img
              src={getImageUrl(hoverImage, '/fallback-product-2.png')}
              alt={`${product.title} hover view`}
              onError={(e) => handleImageError(e, '/fallback-product-2.png')}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 bg-white"
              loading="lazy"
            />
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5 z-10">
            {isOutOfStock ? (
              <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white rounded shadow-xs">
                Out of Stock
              </span>
            ) : (
              <>
                {discount > 0 && (
                  <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider bg-primary text-white rounded shadow-xs">
                    <span className="font-numeric">{discount}%</span> OFF
                  </span>
                )}
                {isLowStock && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold tracking-wider bg-amber-600 text-white rounded shadow-xs">
                    Only <span className="font-numeric">{product.stock}</span> Left!
                  </span>
                )}
                {product.tags?.includes('new-arrival') && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-semibold tracking-wider bg-accent text-white rounded shadow-xs">
                    New
                  </span>
                )}
              </>
            )}
          </div>

          {/* Out of Stock Banner + Notify Me Quick Action */}
          {isOutOfStock ? (
            <div className="absolute inset-x-0 bottom-2 sm:bottom-3 mx-2 sm:mx-3 flex flex-col gap-1 z-20">
              <div className="bg-neutral-900/90 backdrop-blur-xs py-1 px-2 text-center rounded-lg shadow-sm border border-neutral-700">
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-white uppercase flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  OUT OF STOCK
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNotifyOpen(true);
                }}
                className="hidden sm:flex w-full py-1.5 px-2.5 rounded-lg bg-accent hover:bg-accent-light text-white text-[11px] font-bold items-center justify-center gap-1.5 shadow-md transition-all transform hover:scale-[1.02]"
              >
                <HiOutlineBell className="w-3.5 h-3.5" />
                <span>Notify Me</span>
              </button>
            </div>
          ) : (
            /* Quick Add Overlay on desktop hover with double-click guard */
            <motion.button
              whileTap={!isAdding && !added ? { scale: 0.95 } : undefined}
              onClick={handleQuickAdd}
              type="button"
              disabled={isAdding || added}
              className={`hidden sm:flex absolute bottom-3 left-3 right-3 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm items-center justify-center gap-2 shadow-lg transition-all duration-300 z-10 ${
                added
                  ? 'bg-emerald-600 text-white translate-y-0 opacity-100'
                  : isAdding
                  ? 'bg-primary text-white translate-y-0 opacity-100 cursor-not-allowed'
                  : 'bg-primary/95 hover:bg-primary text-white translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 sm:translate-y-3'
              }`}
            >
              {added ? (
                <>
                  <HiCheck className="w-4 h-4" /> Added to Bag
                </>
              ) : isAdding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <HiOutlineShoppingBag className="w-4 h-4" /> Quick Add
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Product Details */}
        <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between bg-white">
          <div>
            {product.category?.name && (
              <p className="text-[9px] sm:text-[11px] font-semibold tracking-wider uppercase text-accent-700 mb-0.5 sm:mb-1 flex items-center gap-1 truncate">
                <span>{product.category.name}</span>
                {product.subcategory?.name && (
                  <>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-500 font-medium">{product.subcategory.name}</span>
                  </>
                )}
              </p>
            )}
            <h3 className="font-serif text-xs sm:text-base font-semibold text-neutral-900 group-hover:text-primary transition-colors line-clamp-1 leading-snug">
              {product.title}
            </h3>

            {/* Color Swatch Dots for Multi-Color Preview */}
            {colorSwatches.length > 1 && (
              <div
                className="flex items-center gap-1.5 pt-1.5 overflow-x-auto scrollbar-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {colorSwatches.slice(0, 5).map((swatch) => {
                  const isSelected = selectedColorOverride
                    ? selectedColorOverride.toLowerCase() === swatch.color.toLowerCase()
                    : false;

                  return (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedColorOverride(swatch.color);
                      }}
                      onMouseEnter={() => {
                        if (swatch.image) setSelectedColorOverride(swatch.color);
                      }}
                      className={`relative p-0.5 rounded-full transition-transform hover:scale-110 cursor-pointer ${
                        isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-neutral-400'
                      }`}
                      title={`${swatch.color}${swatch.image ? ' (View photo)' : ''}`}
                    >
                      {swatch.image ? (
                        <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full overflow-hidden block border border-white shadow-2xs">
                          <img
                            src={getImageUrl(swatch.image)}
                            alt={swatch.color}
                            onError={handleImageError}
                            className="w-full h-full object-cover object-top"
                          />
                        </span>
                      ) : (
                        <span
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full block border border-neutral-300 shadow-2xs bg-neutral-200"
                        />
                      )}
                    </button>
                  );
                })}
                {colorSwatches.length > 5 && (
                  <span className="text-[10px] text-neutral-400 font-semibold">
                    +{colorSwatches.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 sm:mt-3 flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              {product.salePrice ? (
                <>
                  <span className="font-numeric text-xs sm:text-lg font-extrabold text-primary tracking-tight">
                    {formatPrice(product.salePrice)}
                  </span>
                  <span className="font-numeric text-[10px] sm:text-sm text-neutral-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="font-numeric text-xs sm:text-lg font-extrabold text-neutral-900 tracking-tight">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Mobile quick action button */}
            {isOutOfStock ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNotifyOpen(true);
                }}
                className="sm:hidden p-1.5 rounded-full bg-accent text-white hover:bg-accent-light transition-colors shrink-0 shadow-xs"
                title="Notify Me When Available"
                aria-label="Notify me when available"
              >
                <HiOutlineBell className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleQuickAdd}
                disabled={isAdding || added}
                className="sm:hidden p-1.5 rounded-full bg-accent-100/80 text-primary hover:bg-primary hover:text-white transition-colors shrink-0 disabled:opacity-50"
                aria-label="Add to cart"
              >
                {added ? (
                  <HiCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : isAdding ? (
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiOutlineShoppingBag className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* Notify Modal */}
      <NotifyModal
        isOpen={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        product={product}
      />
    </motion.div>
  );
};

export default ProductCard;
