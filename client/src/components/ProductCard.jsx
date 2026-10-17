import { Link } from 'react-router-dom';
import { HiOutlineShoppingBag, HiCheck } from 'react-icons/hi';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { formatPrice, getDiscount, getImageUrl } from '../utils/formatters';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const discount = getDiscount(product.price, product.salePrice);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      // Pick first available variant or size
      let defaultSize = '';
      let defaultColor = '';
      if (product.variants && product.variants.length > 0) {
        const inStock = product.variants.find((v) => v.stock > 0) || product.variants[0];
        defaultSize = inStock.size || '';
        defaultColor = inStock.color || '';
      } else {
        defaultSize = product.sizes?.[0] || '';
        defaultColor = product.colors?.[0] || '';
      }

      addToCart(product, 1, defaultSize, defaultColor);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

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
      <Link to={`/product/${product.slug}`} className="flex flex-col h-full">
        {/* Image Container with 3:4 Aspect Ratio Guard */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-cream-dark">
          <img
            src={getImageUrl(product.images?.[0])}
            alt={product.title}
            className={`w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105 ${
              isOutOfStock ? 'grayscale-[35%] opacity-85' : ''
            }`}
            loading="lazy"
          />
          {product.images?.[1] && (
            <img
              src={getImageUrl(product.images[1])}
              alt={product.title}
              className={`absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 ${
                isOutOfStock ? 'grayscale-[35%] opacity-85' : ''
              }`}
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
                    {discount}% OFF
                  </span>
                )}
                {isLowStock && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold tracking-wider bg-amber-600 text-white rounded shadow-xs">
                    Only {product.stock} Left!
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

          {/* Out of Stock Banner */}
          {isOutOfStock ? (
            <div className="absolute inset-x-0 bottom-2 sm:bottom-4 mx-2 sm:mx-3 bg-neutral-900/90 backdrop-blur-xs py-1 sm:py-2 px-2 sm:px-3 text-center rounded-lg sm:rounded-xl shadow-lg z-20 border border-neutral-700">
              <span className="text-[9px] sm:text-[11px] font-bold tracking-wider text-white uppercase flex items-center justify-center gap-1 sm:gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                OUT OF STOCK
              </span>
            </div>
          ) : (
            /* Quick Add Overlay on desktop hover */
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickAdd}
              type="button"
              className={`hidden sm:flex absolute bottom-3 left-3 right-3 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm items-center justify-center gap-2 shadow-lg transition-all duration-300 z-10 ${
                added
                  ? 'bg-emerald-600 text-white translate-y-0 opacity-100'
                  : 'bg-primary/95 hover:bg-primary text-white translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 sm:translate-y-3'
              }`}
            >
              {added ? (
                <>
                  <HiCheck className="w-4 h-4" /> Added to Bag
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
          </div>

          <div className="mt-2 sm:mt-3 flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              {product.salePrice ? (
                <>
                  <span className="text-xs sm:text-lg font-bold text-primary">
                    {formatPrice(product.salePrice)}
                  </span>
                  <span className="text-[10px] sm:text-sm text-neutral-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-xs sm:text-lg font-bold text-neutral-900">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Mobile quick tap button */}
            {!isOutOfStock && (
              <button
                onClick={handleQuickAdd}
                className="sm:hidden p-1.5 rounded-full bg-accent-100/80 text-primary hover:bg-primary hover:text-white transition-colors shrink-0"
                aria-label="Add to cart"
              >
                {added ? <HiCheck className="w-3.5 h-3.5 text-emerald-600" /> : <HiOutlineShoppingBag className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
