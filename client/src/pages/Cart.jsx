import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineShoppingBag,
  HiOutlineTrash,
  HiPlus,
  HiMinus,
  HiArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineBell
} from 'react-icons/hi';
import { useCart } from '../context/CartContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';
import NotifyModal from '../components/NotifyModal';

const Cart = () => {
  const {
    items,
    availableItems,
    outOfStockCount,
    hasOutOfStockItems,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotal,
    refreshCartStock
  } = useCart();
  const { confirm } = useConfirm();
  const [notifyModalState, setNotifyModalState] = useState({
    isOpen: false,
    item: null
  });

  const handleRemoveWithConfirm = async (index, item) => {
    const ok = await confirm({
      title: 'Remove from Bag?',
      message: `Are you sure you want to remove "${item.title || 'this item'}" from your shopping bag?`,
      type: 'danger',
      confirmText: 'Yes, Remove',
      cancelText: 'Keep in Bag',
      details: item.size ? `Selected: Size ${item.size}${item.color ? ` • ${item.color}` : ''}` : null
    });
    if (ok) {
      removeItem(index);
    }
  };

  const handleClearWithConfirm = async () => {
    const ok = await confirm({
      title: 'Clear Entire Shopping Bag?',
      message: 'Are you sure you want to remove all dresses from your shopping bag? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Yes, Clear Bag',
      cancelText: 'Cancel'
    });
    if (ok) {
      clearCart();
    }
  };

  useEffect(() => {
    refreshCartStock();
  }, [refreshCartStock]);

  const freeShippingThreshold = 999;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCharge = isFreeShipping ? 0 : 79;
  const totalAmount = subtotal + shippingCharge;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cream py-16 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 text-center">
          <div className="w-24 h-24 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <HiOutlineShoppingBag className="w-12 h-12" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-neutral-900 mb-2">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-sm text-neutral-600 mb-8 leading-relaxed">
            Looks like you haven&apos;t added any beautiful dresses yet. Explore our latest arrivals and seasonal trends!
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary hover:bg-primary-light text-white text-sm font-semibold shadow-lg transition-all"
          >
            <span>Start Shopping</span>
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-accent-200/60">
          <div>
            <h1 className="font-serif text-3xl font-bold text-neutral-900">Your Shopping Bag</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {totalItems} {totalItems === 1 ? 'available item' : 'available items'} in your bag
            </p>
          </div>
          <button
            onClick={handleClearWithConfirm}
            className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <HiOutlineTrash className="w-4 h-4" /> Clear Bag
          </button>
        </div>

        {/* Amazon/Flipkart Alert if items are Out of Stock */}
        {hasOutOfStockItems && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
            <HiOutlineExclamationCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block">
                {outOfStockCount} {outOfStockCount === 1 ? 'item is' : 'items are'} currently out of stock
              </span>
              <p className="text-amber-800 mt-0.5">
                These items are unavailable and have been automatically excluded from your order summary below.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-6">
            <div className="divide-y divide-neutral-100">
              {items.map((item, index) => {
                const isSoldOut =
                  (item.stock !== undefined && item.stock <= 0) || item.isOutOfStock;

                return (
                  <div
                    key={`${item.product}-${item.size}-${item.color}-${index}`}
                    className={`py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-5 items-start sm:items-center rounded-2xl p-3 transition-colors ${
                      isSoldOut ? 'bg-red-50/50 border border-red-200' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        onError={(e) => handleImageError(e, '/fallback-product.png')}
                        className={`w-24 h-32 object-cover object-top rounded-2xl border border-accent-100 bg-neutral-50 ${
                          isSoldOut ? 'grayscale-[40%] opacity-70' : ''
                        }`}
                      />
                      {isSoldOut && (
                        <span className="absolute bottom-1.5 left-1.5 right-1.5 bg-red-600 text-white text-[9px] font-black uppercase text-center rounded py-0.5 tracking-wider shadow-xs">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <Link
                        to={`/product/${item.slug}`}
                        className={`font-serif text-lg font-bold hover:text-primary transition-colors block leading-tight ${
                          isSoldOut ? 'text-neutral-500 line-through' : 'text-neutral-900'
                        }`}
                      >
                        {item.title}
                      </Link>

                      {(item.size || item.color) && (
                        <p className="text-xs text-neutral-500">
                          {item.size && (
                            <span className="font-semibold text-neutral-700">Size: {item.size}</span>
                          )}
                          {item.size && item.color && ' • '}
                          {item.color && <span>Color: {item.color}</span>}
                        </p>
                      )}

                      {isSoldOut ? (
                        <div className="text-xs">
                          <span className="font-bold text-red-600 block">Currently Unavailable</span>
                          <span className="text-[11px] text-neutral-400">
                            Excluded from order total
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-primary font-numeric">
                            {formatPrice(item.price)}
                          </span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-xs text-neutral-400 line-through font-numeric">
                              {formatPrice(item.originalPrice)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity or Out of Stock Actions */}
                    <div className="flex items-center gap-6">
                      {isSoldOut ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemoveWithConfirm(index, item)}
                            className="px-3 py-1.5 rounded-xl border border-red-300 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Remove unavailable item"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                            <span>Remove</span>
                          </button>
                          <button
                            onClick={() => setNotifyModalState({ isOpen: true, item })}
                            className="px-3 py-1.5 rounded-xl bg-accent-100 hover:bg-accent-200 border border-accent-300 text-xs font-bold text-accent-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Notify me when restocked"
                          >
                            <HiOutlineBell className="w-4 h-4 text-accent-700" />
                            <span>Notify Me</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-neutral-50">
                          <button
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="p-2 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30"
                          >
                            <HiMinus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3.5 text-xs font-bold text-neutral-900 font-numeric">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            disabled={item.stock && item.quantity >= item.stock}
                            className="p-2 text-neutral-600 hover:bg-neutral-200 disabled:opacity-30"
                          >
                            <HiPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <span
                        className={`font-numeric text-base font-bold min-w-20 text-right ${
                          isSoldOut ? 'text-neutral-400 line-through' : 'text-neutral-900'
                        }`}
                      >
                        {formatPrice(item.price * item.quantity)}
                      </span>

                      {!isSoldOut && (
                        <button
                          onClick={() => handleRemoveWithConfirm(index, item)}
                          className="p-2 text-neutral-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          aria-label="Remove item"
                          title="Remove item"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span>Need help? Call +91 95007 57024</span>
              <Link to="/shop" className="text-primary font-semibold hover:underline">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-6 sticky top-24">
            <h2 className="font-serif text-xl font-bold text-neutral-900 pb-3 border-b border-neutral-100">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal ({totalItems} in-stock {totalItems === 1 ? 'item' : 'items'})</span>
                <span className="font-bold text-neutral-900 font-numeric">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Standard Delivery</span>
                <span className="font-bold text-neutral-900 font-numeric">
                  {isFreeShipping ? (
                    <span className="text-emerald-700 uppercase text-xs font-bold font-sans">FREE</span>
                  ) : (
                    formatPrice(shippingCharge)
                  )}
                </span>
              </div>
              {!isFreeShipping && subtotal > 0 && (
                <p className="text-xs text-accent-700 bg-accent-50 p-2.5 rounded-xl border border-accent-200">
                  Add <strong className="font-numeric">₹{freeShippingThreshold - subtotal}</strong> more to qualify for <strong>FREE Delivery</strong>!
                </p>
              )}
              <div className="pt-4 border-t border-neutral-100 flex justify-between items-baseline text-base">
                <span className="font-bold text-neutral-900">Estimated Total</span>
                <span className="font-numeric text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {availableItems.length === 0 ? (
                <button
                  disabled
                  className="w-full py-4 px-6 rounded-2xl bg-neutral-300 text-neutral-500 font-bold text-sm cursor-not-allowed text-center"
                >
                  All items are out of stock
                </button>
              ) : (
                <Link
                  to="/checkout"
                  className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-light text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  <span>
                    Proceed to Checkout ({availableItems.length}{' '}
                    {availableItems.length === 1 ? 'item' : 'items'})
                  </span>
                  <HiArrowRight className="w-4 h-4" />
                </Link>
              )}
              <p className="text-[11px] text-neutral-400 text-center">
                Guest checkout supported. Phone number is mandatory for delivery confirmation.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Notify Me Modal for Waitlisting Out of Stock Items */}
      {notifyModalState.isOpen && notifyModalState.item && (
        <NotifyModal
          isOpen={notifyModalState.isOpen}
          onClose={() => setNotifyModalState({ isOpen: false, item: null })}
          product={notifyModalState.item}
          selectedColor={notifyModalState.item.color || ''}
          selectedSize={notifyModalState.item.size || ''}
        />
      )}
    </div>
  );
};

export default Cart;
