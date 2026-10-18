import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const CART_KEY = 'fc_cart';
const ADDRESS_KEY = 'fc_saved_address';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product, quantity = 1, size = '', color = '') => {
    // Derive variant-specific stock
    let itemStock = product.stock !== undefined && product.stock !== null ? product.stock : 99;
    if (product.variants && product.variants.length > 0) {
      const match = product.variants.find(
        (v) =>
          (!size || !v.size || v.size.toLowerCase() === size.toLowerCase()) &&
          (!color || !v.color || v.color.toLowerCase() === color.toLowerCase())
      );
      itemStock = match ? match.stock : 0;
    }

    if (itemStock <= 0) return;

    setItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product === product._id && item.size === size && item.color === color
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].stock = itemStock;
        updated[existingIndex].quantity = Math.min(itemStock, updated[existingIndex].quantity + quantity);
        return updated;
      }

      return [...prev, {
        product: product._id,
        title: product.title,
        price: product.salePrice || product.price,
        originalPrice: product.price,
        size,
        color,
        quantity: Math.min(itemStock, quantity),
        image: product.images?.[0] || '',
        slug: product.slug,
        stock: itemStock
      }];
    });
    setIsCartOpen(true);
  }, []);

  const updateQuantity = useCallback((index, quantity) => {
    if (quantity < 1) return;
    setItems(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const maxStock = updated[index].stock !== undefined && updated[index].stock !== null ? updated[index].stock : 99;
      updated[index].quantity = Math.min(maxStock, quantity);
      return updated;
    });
  }, []);

  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Guest address saving
  const getSavedAddress = () => {
    try {
      const saved = localStorage.getItem(ADDRESS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const saveAddress = (address) => {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  };

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeItem, clearCart,
      totalItems, subtotal,
      isCartOpen, setIsCartOpen,
      getSavedAddress, saveAddress
    }}>
      {children}
    </CartContext.Provider>
  );
};
