import { useEffect } from 'react';
import {
  HiOutlineX,
  HiPlus,
  HiMinus,
  HiOutlineShoppingBag,
  HiArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineTrash
} from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const CartDrawer = () => {
  const {
    items,
    availableItems,
    outOfStockCount,
    hasOutOfStockItems,
    updateQuantity,
    removeItem,
    totalItems,
    subtotal,
    isCartOpen,
    setIsCartOpen,
    refreshCartStock
  } = useCart();

  const freeShippingThreshold = 999;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFree = freeShippingThreshold - subtotal;

  useEffect(() => {
    if (isCartOpen) {
      refreshCartStock();
    }
  }, [isCartOpen, refreshCartStock]);

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
                    <h3 className="font-serif text-lg font-bold text-neutral-900 leading-tight">
                      Your Shopping Bag
                    </h3>
                    <span className="text-xs text-neutral-500">
                      {totalItems} {totalItems === 1 ? 'item available' : 'items available'}
                    </span>
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

              {/* Amazon/Flipkart Alert if any items are Out of Stock */}
              {hasOutOfStockItems && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-950 animate-fade-in">
                  <HiOutlineExclamationCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {outOfStockCount} {outOfStockCount === 1 ? 'item is' : 'items are'} out of stock
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Highlighted items are unavailable and excluded from checkout total.
                    </p>
                  </div>
                </div>
              )}

              {/* Free Shipping Progress Indicator */}
              <div className="bg-primary/5 px-4 py-3 border-b border-accent-100">
                <div className="flex items-center justify-between text-xs font-medium text-primary mb-1.5">
                  {remainingForFree > 0 ? (
                    <span>
                      Add <strong>₹{remainingForFree}</strong> more for <strong>FREE Delivery</strong>
                    </span>
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
                  {items.map((item, index) => {
                    const isSoldOut =
                      (item.stock !== undefined && item.stock <= 0) || item.isOutOfStock;

                    return (
                      <motion.div
                        key={`${item.product}-${item.size}-${item.color}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`pt-4 first:pt-0 flex gap-4 p-2.5 rounded-2xl transition-all ${
                          isSoldOut ? 'bg-red-50/50 border border-red-200' : ''
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative shrink-0">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.title}
                            onError={(e) => handleImageError(e, '/fallback-product.png')}
                            className={`w-20 h-24 object-cover object-top rounded-xl border border-accent-100 bg-neutral-50 ${
                              isSoldOut ? 'grayscale-[40%] opacity-70' : ''
                            }`}
                          />
                          {isSoldOut && (
                            <span className="absolute bottom-1 left-1 right-1 bg-red-600 text-white text-[9px] font-black uppercase text-center rounded py-0.5 tracking-wider shadow-xs">
                              Out of Stock
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/product/${item.slug}`}
                                onClick={() => setIsCartOpen(false)}
                                className={`font-serif text-sm font-semibold hover:text-primary transition-colors line-clamp-1 ${
                                  isSoldOut ? 'text-neutral-500 line-through' : 'text-neutral-900'
                                }`}
                              >
                                {item.title}
                              </Link>
                              <button
                                onClick={() => removeItem(index)}
                                className="text-neutral-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                aria-label="Remove item"
                                title="Remove item from bag"
                              >
                                <HiOutlineX className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Variant tag */}
                            {(item.size || item.color) && (
                              <p className="text-xs text-neutral-500 mt-0.5">
                                {item.color && (
                                  <span className="font-medium text-neutral-700">{item.color}</span>
                                )}
                                {item.size && item.color && ' • '}
                                {item.size && (
                                  <span className="font-medium text-neutral-700">Size: {item.size}</span>
                                )}
                              </p>
                            )}

                            {isSoldOut ? (
                              <div className="mt-1">
                                <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                                  <span>Currently Unavailable</span>
                                </span>
                                <span className="text-[10px] text-neutral-400 block">
                                  Excluded from checkout total
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm font-bold text-primary mt-1">
                                {formatPrice(item.price)}
                              </p>
                            )}
                          </div>

                          {/* Quantity Selector or Remove Notice */}
                          <div className="flex items-center justify-between mt-2">
                            {isSoldOut ? (
                              <button
                                onClick={() => removeItem(index)}
                                className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1"
                              >
                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                <span>Remove item</span>
                              </button>
                            ) : (
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
                            )}

                            <span
                              className={`text-xs font-semibold ${
                                isSoldOut ? 'text-neutral-400 line-through' : 'text-neutral-800'
                              }`}
                            >
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Footer Checkout Summary */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-accent-100 bg-cream-light/60 space-y-3">
                  <div className="flex items-center justify-between text-base">
                    <div>
                      <span className="text-neutral-700 font-medium block leading-tight">Subtotal</span>
                      <span className="text-[11px] text-neutral-400">
                        ({totalItems} {totalItems === 1 ? 'item' : 'items'} in stock)
                      </span>
                    </div>
                    <span className="font-serif text-xl font-bold text-neutral-900">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Taxes included. Standard delivery calculated during checkout.
                  </p>

                  <div className="space-y-2 pt-1">
                    {availableItems.length === 0 ? (
                      <div className="text-center p-3 rounded-xl bg-neutral-200 text-neutral-600 text-xs font-bold">
                        All items in your bag are currently out of stock
                      </div>
                    ) : (
                      <Link
                        to="/checkout"
                        onClick={() => setIsCartOpen(false)}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-semibold text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                      >
                        <span>
                          Proceed to Checkout ({availableItems.length}{' '}
                          {availableItems.length === 1 ? 'item' : 'items'})
                        </span>
                        <HiArrowRight className="w-4 h-4" />
                      </Link>
                    )}

                    <Link
                      to="/cart"
                      onClick={() => setIsCartOpen(false)}
                      className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-accent-300 text-neutral-700 hover:bg-white text-xs font-medium transition-colors"
                    >
                      View Full Bag Details
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
