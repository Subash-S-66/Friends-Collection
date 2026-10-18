import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { HiCheckCircle, HiOutlineShoppingBag, HiOutlineLocationMarker, HiOutlinePhone, HiArrowRight } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import API from '../utils/api';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order && orderId) {
      API.get(`/orders/track/${orderId}`)
        .then((res) => setOrder(res.data))
        .catch((err) => console.error('Track order error:', err))
        .finally(() => setLoading(false));
    }
  }, [orderId, order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-accent-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(
    `Hello Friends Collections! I placed an order with Order ID #${orderId}. Please confirm my order details.`
  );

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-card text-center space-y-6">
          {/* Animated Success Badge */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-scale-up">
            <HiCheckCircle className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Order Confirmed & Received
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">
              Thank You for Shopping with Us!
            </h1>
            <p className="text-sm text-neutral-600 max-w-md mx-auto">
              Your order has been placed successfully and transmitted directly to our Jamalia store team.
            </p>
          </div>

          {/* Order ID Pill */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cream-dark/60 border border-accent-200 text-sm">
            <span className="text-neutral-500 font-medium">Order Reference:</span>
            <span className="font-mono font-bold text-primary text-base sm:text-lg">{orderId}</span>
          </div>

          {/* Order Details Grid */}
          {order && (
            <div className="text-left bg-cream-light p-6 rounded-2xl border border-accent-100 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-accent-200/50 text-xs text-neutral-700">
                <div>
                  <span className="font-bold text-neutral-900 block mb-1">Delivering to:</span>
                  <p className="font-semibold text-sm text-neutral-800">{order.customer?.name}</p>
                  <p className="text-neutral-600 mt-0.5">{order.customer?.address?.street}</p>
                  <p className="text-neutral-600">
                    {order.customer?.address?.city}, {order.customer?.address?.state} - {order.customer?.address?.pincode}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-neutral-900 block mb-1">Contact Details:</span>
                  <p className="flex items-center gap-1.5 font-medium text-neutral-800">
                    <HiOutlinePhone className="w-4 h-4 text-accent-700" />
                    +91 {order.customer?.phone}
                  </p>
                  {order.customer?.email && (
                    <p className="text-neutral-500 mt-1">{order.customer.email}</p>
                  )}
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                    Cash / UPI on Delivery
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-neutral-500 block">
                  Items in this order:
                </span>
                <div className="divide-y divide-neutral-200/60 max-h-56 overflow-y-auto pr-1">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.title}
                          onError={handleImageError}
                          className="w-10 h-12 object-cover object-top rounded-lg border border-neutral-200"
                        />
                        <div>
                          <p className="font-semibold text-neutral-900">{item.title}</p>
                          <p className="text-neutral-500">
                            Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-neutral-800">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="border-t border-accent-200/60 pt-3 flex items-center justify-between text-sm">
                <span className="font-bold text-neutral-900">Total Payable at Delivery:</span>
                <span className="font-serif text-xl font-bold text-primary">
                  {formatPrice(order.totalAmount + (order.shippingCharge || 0))}
                </span>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/919500757024?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>Get WhatsApp Updates</span>
            </a>

            <Link
              to="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-light text-white font-semibold text-xs sm:text-sm shadow-md transition-all"
            >
              <span>Continue Shopping</span>
              <HiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
