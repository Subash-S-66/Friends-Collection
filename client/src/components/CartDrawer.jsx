import { HiOutlineX, HiPlus, HiMinus, HiOutlineShoppingBag, HiArrowRight } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const CartDrawer = () => {
  const { items, updateQuantity, removeItem, totalItems, subtotal, isCartOpen, setIsCartOpen } = useCart();

  const freeShippingThreshold = 999;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFree = freeShippingThreshold - subtotal;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-accent-100 flex items-center justify-between bg-cream-light">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <HiOutlineShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-neutral-900 leading-tight">Your Shopping Bag</h3>
                    <span className="text-xs text-neutral-500">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                  aria-label="Close cart"
                >
                  <HiOutlineX className="w-6 h-6" />
                </button>
              </div>

              {/* Free Shipping Progress Indicator */}
              <div className="bg-primary/5 px-4 py-3 border-b border-accent-100">
                <div className="flex items-center justify-between text-xs font-medium text-primary mb-1.5">
                  {remainingForFree > 0 ? (
                    <span>Add <strong>₹{remainingForFree}</strong> more for <strong>FREE Delivery</strong></span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">🎉 You unlocked FREE Delivery!</span>
                  )}
                  <span className="text-neutral-500">{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Cart Items List */}
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-cream-light/30">
                  <div className="w-20 h-20 rounded-full bg-accent-100/60 flex items-center justify-center text-accent-700 mb-4 shadow-inner">
                    <HiOutlineShoppingBag className="w-10 h-10" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-neutral-900 mb-1">Your bag is empty</h4>
                  <p className="text-sm text-neutral-500 max-w-xs mb-6">
                    Explore our handpicked collection of sarees, kurtis, and designer wear.
                  </p>
                  <Link
                    to="/shop"
                    onClick={() => setIsCartOpen(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold shadow-md hover:bg-primary-light transition-all transform hover:-translate-y-0.5"
                  >
                    <span>Browse Dresses</span>
                    <HiArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-neutral-100 space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={`${item.product}-${item.size}-${item.color}-${index}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="pt-4 first:pt-0 flex gap-4"
                    >
                      {/* Thumbnail */}
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        onError={(e) => handleImageError(e, '/fallback-product.png')}
                        className="w-20 h-24 object-cover object-top rounded-xl border border-accent-100 bg-neutral-50 shrink-0"
                      />

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/product/${item.slug}`}
                              onClick={() => setIsCartOpen(false)}
                              className="font-serif text-sm font-semibold text-neutral-900 hover:text-primary transition-colors line-clamp-1"
                            >
                              {item.title}
                            </Link>
                            <button
                              onClick={() => removeItem(index)}
                              className="text-neutral-400 hover:text-red-500 p-1 rounded-md transition-colors"
                              aria-label="Remove item"
                            >
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Variant tag */}
                          {(item.size || item.color) && (
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {item.color && <span className="font-medium text-neutral-700">{item.color}</span>}
                              {item.size && item.color && ' • '}
                              {item.size && <span className="font-medium text-neutral-700">Size: {item.size}</span>}
                            </p>
                          )}

                          <p className="text-sm font-bold text-primary mt-1">
                            {formatPrice(item.price)}
                          </p>
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                            <button
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="p-1.5 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label="Decrease quantity"
                            >
                              <HiMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-semibold text-neutral-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              disabled={item.stock && item.quantity >= item.stock}
                              className="p-1.5 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label="Increase quantity"
                            >
                              <HiPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-xs font-semibold text-neutral-600">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Footer Checkout Summary */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-accent-100 bg-cream-light/60 space-y-3">
                  <div className="flex items-center justify-between text-base">
                    <span className="text-neutral-600 font-medium">Subtotal</span>
                    <span className="font-serif text-xl font-bold text-neutral-900">{formatPrice(subtotal)}</span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Taxes included. Standard delivery calculated during checkout.
                  </p>

                  <div className="space-y-2 pt-1">
                    <Link
                      to="/checkout"
                      onClick={() => setIsCartOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-semibold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                      <span>Proceed to Checkout</span>
                      <HiArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setIsCartOpen(false)}
                      className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-accent-300 text-neutral-700 hover:bg-white text-xs font-medium transition-colors"
                    >
                      View Bag Details
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
