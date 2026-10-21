import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const CART_KEY = 'fc_cart';
const ADDRESS_KEY = 'fc_saved_address';

const norm = (s) => (s || '').toString().trim().toLowerCase();

const isSameCartItem = (a, b) => {
  const prodA = String(a.product?._id || a.product || '');
  const prodB = String(b.product?._id || b.product || '');
  if (!prodA || prodA !== prodB) return false;
  return norm(a.size) === norm(b.size) && norm(a.color) === norm(b.color);
};

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
  const syncTimerRef = useRef(null);
  const latestItemsRef = useRef(items);

  // Keep latestItemsRef synchronized
  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  // Helper to persist to localStorage immediately
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
            latestItemsRef.current = res.data.items;
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
    }
  }, [user?._id]);

  // Sync back to cloud with debouncing (350ms) to prevent competing requests on rapid clicks
  const syncToCloud = useCallback((updatedItems) => {
    saveToLocal(updatedItems);
    latestItemsRef.current = updatedItems;

    if (!user || !user._id) return;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(async () => {
      try {
        const res = await API.put('/cart', { items: updatedItems });
        // Only adopt server items if no newer local changes have happened during the request
        if (Array.isArray(res.data?.items) && latestItemsRef.current === updatedItems) {
          setItems(res.data.items);
          saveToLocal(res.data.items);
          latestItemsRef.current = res.data.items;
        }
      } catch (err) {
        console.warn('Background cloud cart update error:', err);
      }
    }, 350);
  }, [user]);

  // Refresh live stock validation directly against database stock for all shoppers (guests and logged-in)
  const refreshCartStock = useCallback(async () => {
    const currentLocal = latestItemsRef.current;
    if (!currentLocal || currentLocal.length === 0) return;

    try {
      const res = await API.post('/cart/validate', { items: currentLocal });
      if (Array.isArray(res.data?.items)) {
        const serverItems = res.data.items;

        // Merge: update live stock & prices for existing items, but NEVER delete items that exist locally!
        const merged = currentLocal.map((localItem) => {
          const serverMatch = serverItems.find((s) => isSameCartItem(s, localItem));
          if (serverMatch) {
            return {
              ...localItem,
              stock: serverMatch.stock,
              isOutOfStock: Boolean(serverMatch.isOutOfStock || serverMatch.stock <= 0),
              price: serverMatch.price,
              title: serverMatch.title || localItem.title,
              image: serverMatch.image || localItem.image,
              acceptCashOnDelivery: serverMatch.acceptCashOnDelivery !== false
            };
          }
          return localItem;
        });

        setItems(merged);
        saveToLocal(merged);
        latestItemsRef.current = merged;
      }
    } catch (e) {
      console.warn('Error refreshing cart stock:', e);
    }
  }, []);

  // Automatically refresh stock whenever shopping bag opens
  useEffect(() => {
    if (isCartOpen && items.length > 0) {
      refreshCartStock();
    }
  }, [isCartOpen, refreshCartStock]);

  // Initial mount live stock verification
  useEffect(() => {
    if (items.length > 0) {
      refreshCartStock();
    }
  }, []);

  const addToCart = useCallback((product, quantity = 1, size = '', color = '') => {
    if (!product) return false;

    const cleanSize = (size || '').toString().trim();
    const cleanColor = (color || '').toString().trim();
    const targetSize = norm(cleanSize);
    const targetColor = norm(cleanColor);

    // Derive variant-specific stock with graceful fallbacks
    let itemStock = product.stock !== undefined && product.stock !== null ? Number(product.stock) : 99;
    let match = null;
    if (product.variants && product.variants.length > 0) {
      // 1. Exact match (size + color)
      match = product.variants.find((v) => {
        const vSize = norm(v.size);
        const vColor = norm(v.color);
        return (
          (!targetSize || !vSize || vSize === targetSize || targetSize.startsWith(vSize)) &&
          (!targetColor || !vColor || vColor === targetColor)
        );
      });

      // 2. Match size only
      if (!match && targetSize) {
        match = product.variants.find((v) => {
          const vSize = norm(v.size);
          return vSize && (vSize === targetSize || targetSize.startsWith(vSize));
        });
      }

      // 3. Match color only
      if (!match && targetColor) {
        match = product.variants.find((v) => norm(v.color) === targetColor);
      }

      if (match) {
        itemStock = Number(match.stock) || 0;
      }
    }

    // Do not add if strictly out of stock
    if (itemStock <= 0) {
      toast.error('Sorry, this variant is currently out of stock!', {
        icon: '⚠️',
        duration: 3500
      });
      return false;
    }

    // Resolve variant or color specific image
    let resolvedVariantImage = '';
    if (match && match.image) {
      resolvedVariantImage = match.image;
    } else if (targetColor && product.colorImages && product.colorImages.length > 0) {
      const colorMatch = product.colorImages.find((ci) => norm(ci.color) === targetColor);
      if (colorMatch && colorMatch.image) {
        resolvedVariantImage = colorMatch.image;
      }
    }
    if (!resolvedVariantImage) {
      resolvedVariantImage = product.images?.[0] || '';
    }

    const resolvedSize = cleanSize || (match?.size ? match.size.trim() : (product.sizes?.[0] || ''));
    const resolvedColor = cleanColor || (match?.color ? match.color.trim() : (product.colors?.[0] || ''));

    const prodId = String(product._id || product);
    const targetItem = {
      product: prodId,
      size: resolvedSize,
      color: resolvedColor
    };

    setItems((prev) => {
      // Find existing item by exact product ID + size + color
      const existingIndex = prev.findIndex((item) => isSameCartItem(item, targetItem));

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
          image: resolvedVariantImage || nextItems[existingIndex].image,
          quantity: Math.min(itemStock, currentQty + quantity),
          acceptCashOnDelivery: product.acceptCashOnDelivery !== false
        };
      } else {
        // Distinct size, distinct color, or new product -> add as separate line item!
        nextItems = [
          ...prev,
          {
            product: prodId,
            title: product.title,
            price: product.salePrice || product.price,
            originalPrice: product.price,
            size: resolvedSize,
            color: resolvedColor,
            quantity: Math.min(itemStock, quantity),
            image: resolvedVariantImage,
            slug: product.slug,
            stock: itemStock,
            isOutOfStock: false,
            acceptCashOnDelivery: product.acceptCashOnDelivery !== false
          }
        ];
      }

      syncToCloud(nextItems);
      return nextItems;
    });

    // Open shopping bag immediately in 0ms
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
          ? Number(updated[index].stock)
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
    latestItemsRef.current = [];
    try {
      localStorage.removeItem(CART_KEY);
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
    }
    setIsCartOpen(false);
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

  // Subtotal and total count include ONLY available in-stock items
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
