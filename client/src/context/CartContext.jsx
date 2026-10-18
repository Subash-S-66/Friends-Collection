import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const CART_KEY = 'fc_cart';
const ADDRESS_KEY = 'fc_saved_address';

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialSyncRef = useRef(false);

  // Helper to persist to localStorage
  const saveToLocal = (cartItems) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Cross-device cart sync: When user logs in or page loads with active session
  useEffect(() => {
    if (user && user._id) {
      let isMounted = true;
      setIsSyncing(true);

      const localItems = (() => {
        try {
          const saved = localStorage.getItem(CART_KEY);
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })();

      API.post('/cart/sync', { items: localItems })
        .then((res) => {
          if (!isMounted) return;
          if (Array.isArray(res.data?.items)) {
            setItems(res.data.items);
            saveToLocal(res.data.items);
            isInitialSyncRef.current = true;
          }
        })
        .catch((err) => {
          console.error('Cart sync error:', err);
        })
        .finally(() => {
          if (isMounted) setIsSyncing(false);
        });

      return () => {
        isMounted = false;
      };
    } else {
      isInitialSyncRef.current = false;
    }
  }, [user?._id]);

  // Sync back to cloud whenever items change (and user is logged in)
  const syncToCloud = useCallback((updatedItems) => {
    saveToLocal(updatedItems);
    if (user && user._id) {
      API.put('/cart', { items: updatedItems }).catch((err) => {
        console.warn('Background cloud cart update error:', err);
      });
    }
  }, [user]);

  // Refresh live stock validation for all items currently in cart
  const refreshCartStock = useCallback(async () => {
    if (user && user._id) {
      try {
        const res = await API.get('/cart');
        if (Array.isArray(res.data?.items)) {
          setItems(res.data.items);
          saveToLocal(res.data.items);
        }
      } catch (e) {
        console.warn('Error refreshing cloud cart stock:', e);
      }
    }
  }, [user]);

  const addToCart = useCallback((product, quantity = 1, size = '', color = '') => {
    if (!product) return false;

    // Derive variant-specific or general stock
    let itemStock = product.stock !== undefined && product.stock !== null ? product.stock : 99;
    if (product.variants && product.variants.length > 0) {
      const match = product.variants.find(
        (v) =>
          (!size || !v.size || v.size.toLowerCase() === size.toLowerCase()) &&
          (!color || !v.color || v.color.toLowerCase() === color.toLowerCase())
      );
      itemStock = match ? match.stock : 0;
    }

    // Amazon/Flipkart strict check: Do not add if out of stock
    if (itemStock <= 0) {
      toast.error('Sorry, this dress is currently out of stock!', {
        icon: '⚠️',
        duration: 3500
      });
      return false;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          (item.product === product._id || item.product?._id === product._id) &&
          item.size === size &&
          item.color === color
      );

      let nextItems;
      if (existingIndex >= 0) {
        const currentQty = prev[existingIndex].quantity || 0;
        if (currentQty >= itemStock) {
          toast(`Maximum available stock reached (${itemStock} in stock)`, {
            icon: 'ℹ️'
          });
          return prev;
        }

        nextItems = [...prev];
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          stock: itemStock,
          isOutOfStock: false,
          quantity: Math.min(itemStock, currentQty + quantity)
        };
      } else {
        nextItems = [
          ...prev,
          {
            product: product._id,
            title: product.title,
            price: product.salePrice || product.price,
            originalPrice: product.price,
            size,
            color,
            quantity: Math.min(itemStock, quantity),
            image: product.images?.[0] || '',
            slug: product.slug,
            stock: itemStock,
            isOutOfStock: false
          }
        ];
      }

      syncToCloud(nextItems);
      return nextItems;
    });

    setIsCartOpen(true);
    return true;
  }, [syncToCloud]);

  const updateQuantity = useCallback((index, quantity) => {
    if (quantity < 1) return;
    setItems((prev) => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      const maxStock =
        updated[index].stock !== undefined && updated[index].stock !== null
          ? updated[index].stock
          : 99;

      if (maxStock <= 0) {
        toast.error('This item is currently out of stock.', { icon: '⚠️' });
        return prev;
      }

      updated[index] = {
        ...updated[index],
        quantity: Math.min(maxStock, quantity)
      };

      syncToCloud(updated);
      return updated;
    });
  }, [syncToCloud]);

  const removeItem = useCallback((index) => {
    setItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      syncToCloud(updated);
      return updated;
    });
  }, [syncToCloud]);

  const clearCart = useCallback(() => {
    setItems([]);
    saveToLocal([]);
    if (user && user._id) {
      API.delete('/cart').catch(() => {});
    }
  }, [user]);

  // Available items (strictly in stock) vs out of stock items
  const availableItems = items.filter(
    (item) => (item.stock === undefined || item.stock > 0) && !item.isOutOfStock
  );
  const outOfStockItems = items.filter(
    (item) => (item.stock !== undefined && item.stock <= 0) || item.isOutOfStock
  );
  const outOfStockCount = outOfStockItems.length;
  const hasOutOfStockItems = outOfStockCount > 0;

  // Subtotal and total count include ONLY available in-stock items (Amazon/Flipkart rule)
  const totalItems = availableItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = availableItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Guest address saving
  const getSavedAddress = () => {
    try {
      const saved = localStorage.getItem(ADDRESS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saveAddress = (address) => {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  };

  return (
    <CartContext.Provider
      value={{
        items,
        availableItems,
        outOfStockItems,
        outOfStockCount,
        hasOutOfStockItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCartStock,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        isSyncing,
        getSavedAddress,
        saveAddress
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
