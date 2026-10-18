import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlinePrinter, HiArrowLeft } from 'react-icons/hi';
import API from '../utils/api';
import InvoiceView from '../components/InvoiceView';

const InvoicePage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    API.get(`/orders/track/${encodeURIComponent(orderId)}`)
      .then((res) => {
        setOrder(res.data);
      })
      .catch((err) => {
        console.error('Invoice fetch error:', err);
        setError('Order invoice not found. Please verify the order ID.');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-accent-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-serif text-2xl font-bold text-neutral-900 mb-2">Invoice Not Found</h2>
        <p className="text-sm text-neutral-500 mb-6">{error || 'Unable to retrieve invoice.'}</p>
        <Link
          to="/account"
          className="px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold shadow-md"
        >
          Go to My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4 print:p-0 print:bg-white">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-primary transition-colors"
        >
          <HiArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-light transition-all"
        >
          <HiOutlinePrinter className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      <InvoiceView order={order} isOpen={true} onClose={() => window.history.back()} />
    </div>
  );
};

export default InvoicePage;
