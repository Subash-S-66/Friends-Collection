import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingBag,
  HiOutlineLightningBolt,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineRefresh,
  HiPlus,
  HiMinus,
  HiCheck,
  HiOutlineShare,
  HiOutlineBell,
  HiOutlineX
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';
import NotifyModal from '../components/NotifyModal';
import { useCart } from '../context/CartContext';
import { formatPrice, getDiscount, getImageUrl, handleImageError } from '../utils/formatters';

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Variant Selection State
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [isWaitlisted, setIsWaitlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/products/${slug}`);
        const prod = res.data;
        setProduct(prod);
        setActiveImageIndex(0);

        // Derive initial color & size
        if (prod.variants && prod.variants.length > 0) {
          const firstInStock = prod.variants.find((v) => v.stock > 0) || prod.variants[0];
          setSelectedColor(firstInStock.color || '');
          setSelectedSize(firstInStock.size || '');
        } else {
          if (prod.sizes && prod.sizes.length > 0) setSelectedSize(prod.sizes[0]);
          if (prod.colors && prod.colors.length > 0) setSelectedColor(prod.colors[0]);
        }

        // Fetch related products
        if (prod.category?._id) {
          const relRes = await API.get(`/products?category=${prod.category.slug}&limit=4`).catch(() => ({ data: { products: [] } }));
          const relProducts = Array.isArray(relRes.data?.products)
            ? relRes.data.products
            : (Array.isArray(relRes.data) ? relRes.data : []);
          setRelated(relProducts.filter((p) => p && p._id !== prod._id));
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Check if current customer is waitlisted for this variant
  useEffect(() => {
    if (product?._id) {
      API.get(`/notifications/status?productId=${product._id}&color=${encodeURIComponent(selectedColor || '')}&size=${encodeURIComponent(selectedSize || '')}`)
        .then((res) => setIsWaitlisted(Boolean(res.data?.subscribed)))
        .catch(() => setIsWaitlisted(false));
    }
  }, [product?._id, selectedColor, selectedSize]);

  // Safe variant stock derivation before early returns
  const hasVariants = Boolean(product?.variants && product.variants.length > 0);
  const currentVariant = hasVariants
    ? product.variants.find(
        (v) =>
          (!selectedColor || !v.color || v.color.trim().toLowerCase() === (selectedColor || '').trim().toLowerCase()) &&
          (!selectedSize || !v.size || v.size.trim().toLowerCase() === (selectedSize || '').trim().toLowerCase())
      )
    : null;

  const currentStock = currentVariant !== null && currentVariant !== undefined
    ? currentVariant.stock
    : (hasVariants ? 0 : (product?.stock ?? 0));

  const isOutOfStock = currentStock <= 0;

  // Clamp quantity to available variant stock (ALWAYS called unconditionally on every render)
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    } else if (quantity < 1 && currentStock > 0) {
      setQuantity(1);
    }
  }, [currentStock, quantity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream py-8 sm:py-12 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Skeleton */}
          <div className="h-4 bg-neutral-200/80 rounded w-48 mb-6" />

          {/* Product Card Showcase Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-sm">
            {/* Gallery Skeleton */}
            <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
              <div className="flex sm:flex-col gap-3 overflow-hidden sm:w-20 shrink-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[3/4] w-16 sm:w-20 rounded-xl bg-neutral-200" />
                ))}
              </div>
              <div className="aspect-[3/4] flex-1 rounded-2xl bg-neutral-200" />
            </div>

            {/* Info Column Skeleton */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-4 bg-neutral-200 rounded w-28" />
                <div className="h-8 bg-neutral-200 rounded w-4/5" />
                <div className="h-6 bg-neutral-200 rounded w-1/3" />
                <div className="space-y-2 pt-4">
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 w-12 rounded-xl bg-neutral-200" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6">
                <div className="h-14 rounded-2xl bg-neutral-200 w-full" />
                <div className="h-12 rounded-2xl bg-neutral-200 w-full" />
                <div className="h-11 rounded-2xl bg-neutral-200 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-neutral-900 mb-2">Product Not Found</h2>
        <p className="text-sm text-neutral-500 mb-6">The dress you are looking for may have been sold or moved.</p>
        <Link to="/shop" className="px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold shadow-md">
          Explore Our Store
        </Link>
      </div>
    );
  }

  const discount = getDiscount(product.price, product.salePrice);

  // Clean and prepare product images
  const rawImages = (product.images || []).filter(
    (img) => typeof img === 'string' && !img.toLowerCase().includes('logo')
  );
  const displayImages =
    rawImages.length > 0
      ? rawImages
      : ['/fallback-product-1.png', '/fallback-product-2.png'];

  const getFallbackForIndex = (idx) => `/fallback-product-${(idx % 2) + 1}.png`;

  // Distinct colors and sizes for chips
  const allColors = hasVariants
    ? Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean)))
    : product.colors || [];

  const allSizes = hasVariants
    ? Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)))
    : product.sizes || [];

  const handleAddToCart = () => {
    if (isOutOfStock || isProcessing || added) return;
    setIsProcessing(true);
    addToCart(product, quantity, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setIsProcessing(false);
    }, 1500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock || isProcessing) return;
    setIsProcessing(true);
    addToCart(product, quantity, selectedSize, selectedColor);
    navigate('/checkout');
  };

  const whatsappMessage = encodeURIComponent(
    `Hi Friends Collections! I am inquiring about "${product.title}" (${selectedColor ? selectedColor + ' - ' : ''}${selectedSize || 'standard'}) priced at ₹${product.salePrice || product.price}. Is it available for delivery?`
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-cream py-8 sm:py-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb with Subcategory */}
        <nav className="text-xs text-neutral-500 mb-6 flex flex-wrap items-center gap-1.5">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary transition-colors">Shop</Link>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link to={`/shop?category=${product.category.slug}`} className="hover:text-primary transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          {product.subcategory?.name && (
            <>
              <span>/</span>
              <Link
                to={`/shop?category=${product.category?.slug}&subcategory=${product.subcategory.slug}`}
                className="hover:text-primary transition-colors font-medium text-neutral-700"
              >
                {product.subcategory.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-neutral-900 font-semibold truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Main Showcase Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-sm">
          {/* Gallery Column */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:w-20 shrink-0 scrollbar-none">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-[3/4] w-16 sm:w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx
                        ? 'border-primary ring-2 ring-primary/20 shadow-md scale-102'
                        : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={getImageUrl(img, getFallbackForIndex(idx))}
                      alt={`View ${idx + 1}`}
                      onError={(e) => handleImageError(e, getFallbackForIndex(idx))}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Featured Image with 3:4 Aspect Ratio Guard */}
            <div
              onClick={() => setLightboxOpen(true)}
              className="relative aspect-[3/4] flex-1 rounded-2xl overflow-hidden bg-cream-dark border border-accent-100 shadow-xs group cursor-zoom-in"
              title="Click to view full screen high-resolution detail"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageIndex}
                  src={getImageUrl(displayImages[activeImageIndex] || displayImages[0], getFallbackForIndex(activeImageIndex))}
                  alt={product.title}
                  onError={(e) => handleImageError(e, getFallbackForIndex(activeImageIndex))}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 ${
                    product.stock <= 0 ? 'grayscale-[25%] opacity-90' : ''
                  }`}
                  loading="lazy"
                />
              </AnimatePresence>

              {/* Click to zoom indicator badge */}
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-neutral-900/70 backdrop-blur-xs text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <span>🔍 Tap to Zoom</span>
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {product.stock <= 0 ? (
                  <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-black rounded-lg shadow-md tracking-wider uppercase">
                    Out of Stock
                  </span>
                ) : (
                  <>
                    {discount > 0 && (
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg shadow-md tracking-wider uppercase">
                        {discount}% OFF
                      </span>
                    )}
                    {product.tags?.includes('trending') && (
                      <span className="px-3 py-1 bg-accent-600 text-white text-xs font-semibold rounded-lg shadow-md tracking-wider">
                        Trending
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Product Purchase Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Subcategory Tag */}
              <div className="flex items-center gap-2">
                {product.category?.name && (
                  <Link
                    to={`/shop?category=${product.category.slug}`}
                    className="text-xs uppercase font-bold tracking-widest text-accent-700 hover:text-primary transition-colors"
                  >
                    {product.category.name}
                  </Link>
                )}
                {product.subcategory?.name && (
                  <>
                    <span className="text-neutral-300">•</span>
                    <Link
                      to={`/shop?category=${product.category?.slug}&subcategory=${product.subcategory.slug}`}
                      className="text-xs uppercase font-bold tracking-widest text-primary hover:underline"
                    >
                      {product.subcategory.name}
                    </Link>
                  </>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 leading-tight">
                {product.title}
              </h1>

              {/* Price Details */}
              <div className="flex items-baseline gap-3 pt-1">
                {product.salePrice ? (
                  <>
                    <span className="font-serif text-3xl font-bold text-primary">
                      {formatPrice(product.salePrice)}
                    </span>
                    <span className="text-base text-neutral-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Save {formatPrice(product.price - product.salePrice)}
                    </span>
                  </>
                ) : (
                  <span className="font-serif text-3xl font-bold text-neutral-900">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">Inclusive of all taxes. Free doorstep shipping above ₹999.</p>

              {/* Flipkart-Style Out of Stock Banner when product.stock <= 0 */}
              {product.stock <= 0 && (
                <div className="p-4 rounded-2xl bg-neutral-900 text-white flex items-start gap-3 shadow-lg border border-neutral-700 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-sm">
                    !
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-red-400">
                      Currently Out of Stock
                    </h4>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      This design is temporarily unavailable from seller. We are working on getting it restocked soon!
                    </p>
                  </div>
                </div>
              )}

              {/* Color Variant Selector */}
              {allColors.length > 0 && (
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      Color: <strong className="text-primary font-semibold">{selectedColor}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allColors.map((color) => {
                      const colorStock = hasVariants
                        ? product.variants
                            .filter((v) => v.color?.trim().toLowerCase() === color.trim().toLowerCase())
                            .reduce((sum, v) => sum + (v.stock || 0), 0)
                        : product.stock;
                      const isColorSoldOut = colorStock <= 0;

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                            selectedColor === color
                              ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                              : isColorSoldOut
                              ? 'bg-neutral-100 text-neutral-400 line-through border border-dashed border-neutral-300'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <span>{color}</span>
                          {isColorSoldOut && (
                            <span className="text-[9px] ml-1.5 text-red-500 font-normal no-underline">
                              (Sold Out)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Variant Selector with individual variant stock feedback */}
              {allSizes.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      Size: <strong className="text-primary font-semibold">{selectedSize}</strong>
                    </span>
                    <span className="text-xs text-accent-700 font-medium">Standard Fit</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {allSizes.map((size) => {
                      const sizeVariant = hasVariants
                        ? product.variants.find(
                            (v) =>
                              (!selectedColor || !v.color || v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase()) &&
                              v.size?.trim().toLowerCase() === size.trim().toLowerCase()
                          )
                        : null;
                      const sizeStock = sizeVariant ? sizeVariant.stock : (hasVariants ? 0 : product.stock);
                      const isSizeSoldOut = sizeStock <= 0;
                      const isSizeSelected = selectedSize === size;

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-14 h-12 px-3 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                            isSizeSelected
                              ? isSizeSoldOut
                                ? 'bg-red-50 text-red-700 border-2 border-red-400'
                                : 'bg-primary text-white shadow-md border-2 border-primary ring-2 ring-primary/20'
                              : isSizeSoldOut
                              ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 opacity-60'
                              : 'bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-400 hover:shadow-xs'
                          }`}
                        >
                          <span className={isSizeSoldOut ? 'line-through text-neutral-400' : ''}>{size}</span>
                          {isSizeSoldOut ? (
                            <span className="block text-[8px] font-bold text-red-600 no-underline leading-none mt-0.5">
                              Sold Out
                            </span>
                          ) : sizeStock <= 3 ? (
                            <span className={`block text-[8px] font-bold leading-none mt-0.5 ${
                              isSizeSelected ? 'text-amber-200' : 'text-amber-600'
                            }`}>
                              {sizeStock} left
                            </span>
                          ) : (
                            <span className={`block text-[8px] font-medium leading-none mt-0.5 ${
                              isSizeSelected ? 'text-accent-200' : 'text-neutral-400'
                            }`}>
                              {sizeStock} in stock
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Variant Stock Status Indicator */}
              <div className="pt-2">
                {isOutOfStock ? (
                  <div className="p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-red-900 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-ping" />
                      <span className="text-xs font-bold">
                        Out of Stock in {selectedColor ? `${selectedColor} • ` : ''}{selectedSize || 'this selection'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-xs whitespace-nowrap"
                    >
                      {isWaitlisted ? 'Waitlisted' : 'Notify Me'}
                    </button>
                  </div>
                ) : currentStock <= 3 ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Hurry, Only {currentStock} Left in {selectedColor ? `${selectedColor} • ` : ''}{selectedSize}!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    In Stock & Ready for Dispatch ({currentStock} available in {selectedColor ? `${selectedColor} • ` : ''}{selectedSize})
                  </span>
                )}
              </div>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="pt-2 flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">Quantity</span>
                  <div className="flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-neutral-50">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2.5 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30"
                    >
                      <HiMinus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-bold text-neutral-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                      disabled={quantity >= currentStock}
                      className="p-2.5 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30"
                    >
                      <HiPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-3">
                {isOutOfStock ? (
                  <div className="space-y-2.5">
                    <div className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-neutral-100 text-neutral-500 uppercase tracking-wider text-center border border-neutral-200">
                      Out of Stock in {selectedColor ? `${selectedColor} - ` : ''}{selectedSize || 'this option'}
                    </div>

                    {/* Notify Me Button */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setNotifyModalOpen(true)}
                      className="w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-accent to-accent-dark hover:from-accent-light hover:to-accent text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
                    >
                      <HiOutlineBell className="w-5 h-5 text-amber-200 animate-pulse" />
                      <span>
                        {isWaitlisted ? "✓ On Waitlist (Manage Alert)" : "Notify Me When Available"}
                      </span>
                    </motion.button>
                  </div>
                ) : (
                  <>
                    <motion.button
                      whileTap={!isProcessing && !added ? { scale: 0.98 } : undefined}
                      onClick={handleAddToCart}
                      disabled={isProcessing || added}
                      className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all ${
                        added
                          ? 'bg-emerald-600 text-white'
                          : isProcessing
                          ? 'bg-primary/80 text-white cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-light text-white shadow-lg'
                      }`}
                    >
                      {added ? (
                        <>
                          <HiCheck className="w-5 h-5" /> Added to Shopping Bag
                        </>
                      ) : isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Adding to Bag...</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineShoppingBag className="w-5 h-5" /> Add to Shopping Bag
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileTap={!isProcessing ? { scale: 0.98 } : undefined}
                      onClick={handleBuyNow}
                      disabled={isProcessing}
                      className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Preparing Checkout...</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineLightningBolt className="w-5 h-5" /> Buy Now (No Login Needed)
                        </>
                      )}
                    </motion.button>
                  </>
                )}

                {/* WhatsApp Direct Inquire */}
                <a
                  href={`https://wa.me/919500757024?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <FaWhatsapp className="w-5 h-5 text-emerald-600" />
                  <span>
                    {isOutOfStock
                      ? 'Inquire Restock Date on WhatsApp'
                      : 'Inquire Variant on WhatsApp (+91 95007 57024)'}
                  </span>
                </a>
              </div>
            </div>

            {/* Trust Assurances */}
            <div className="border-t border-neutral-100 pt-5 space-y-3 text-xs text-neutral-600">
              <div className="flex items-center gap-3">
                <HiOutlineTruck className="w-5 h-5 text-accent-700 shrink-0" />
                <span>Fast Express Delivery in Chennai & All Over India</span>
              </div>
              <div className="flex items-center gap-3">
                <HiOutlineShieldCheck className="w-5 h-5 text-accent-700 shrink-0" />
                <span>100% Genuine Fabrics & Authentic Tailoring</span>
              </div>
              <div className="flex items-center gap-3">
                <HiOutlineRefresh className="w-5 h-5 text-accent-700 shrink-0" />
                <span>Hassle-free 3-day Exchange Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-sm space-y-4">
          <h2 className="font-serif text-2xl font-bold text-neutral-900 pb-2 border-b border-neutral-100">
            Product Details & Fabric Care
          </h2>
          <div className="prose prose-sm text-neutral-700 max-w-none leading-relaxed whitespace-pre-line">
            {product.description || (
              <p>
                Experience unmatched luxury and style with this premium design from Friends Collections. Meticulously
                crafted with high-grade fabric, featuring refined embroidery and comfort tailoring suited for celebrations,
                parties, and graceful daily wear.
              </p>
            )}
          </div>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-600 bg-cream-light p-4 rounded-2xl border border-accent-100">
            <div>
              <strong className="text-neutral-900 block mb-0.5">Fabric & Wash Care:</strong>
              <span>Dry clean or gentle hand wash separately in cold water. Do not bleach.</span>
            </div>
            <div>
              <strong className="text-neutral-900 block mb-0.5">Store Pickup Available:</strong>
              <span>7/4 Perambur High Road, Jamalia, Chennai – 12</span>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-xs uppercase tracking-[0.25em] text-accent-700 font-semibold">
                You May Also Like
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900 mt-1">
                Related Designs
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {related.map((item) => (
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Fullscreen Fabric Lightbox Zoom Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6 animate-fade-in backdrop-blur-md">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
            aria-label="Close Fullscreen View"
          >
            <HiOutlineX className="w-7 h-7" />
          </button>

          <div className="max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center relative">
            <img
              src={getImageUrl(displayImages[activeImageIndex] || displayImages[0], getFallbackForIndex(activeImageIndex))}
              alt={product.title}
              onError={(e) => handleImageError(e, getFallbackForIndex(activeImageIndex))}
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
            
            {/* Lightbox thumbnail row */}
            {displayImages.length > 1 && (
              <div className="flex items-center gap-2.5 mt-4 overflow-x-auto p-2">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImageIndex === i ? 'border-primary ring-2 ring-white scale-105' : 'border-white/30 opacity-60'
                    }`}
                  >
                    <img
                      src={getImageUrl(img, getFallbackForIndex(i))}
                      alt=""
                      onError={(e) => handleImageError(e, getFallbackForIndex(i))}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back In Stock Notify Modal */}
      <NotifyModal
        isOpen={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onSubscribed={() => setIsWaitlisted(true)}
      />
    </motion.div>
  );
};

export default ProductDetail;
