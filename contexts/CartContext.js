import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import cartService from '../services/cartService';

const CartContext = createContext();

const normalizeCartItem = (item) => {
  const cartId = item.cart_id || item.id;
  const prodId = item.product_id || item.id;
  return {
    ...item,
    id: cartId,
    cart_id: cartId,
    product_id: prodId,
    name: item.product_name || item.name || 'Product',
    product_name: item.product_name || item.name || 'Product',
    price: item.price,
    quantity: Number(item.quantity) || 1,
    size: item.size || null,
    image: item.image || item.product_image || null,
    product_stock: item.product_stock !== undefined ? item.product_stock : (item.stock || 100),
    total_price: item.total_price !== undefined ? item.total_price : (Number(item.price) * (Number(item.quantity) || 1)),
  };
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total_items: 0, subtotal: 0 });

  // ─────────────────────────────────────────
  // Fetch Cart from API
  // ─────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cartService.getCart();
      if (res.success && Array.isArray(res.data)) {
        setCartItems(res.data.map(normalizeCartItem));
      }

      const sumRes = await cartService.getCartSummary();
      if (sumRes.success && sumRes.data) {
        setSummary({
          total_items: Number(sumRes.data.total_items) || 0,
          subtotal: Number(sumRes.data.subtotal) || 0,
        });
      }
    } catch (err) {
      console.error('Fetch cart error in CartContext:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // ─────────────────────────────────────────
  // Add To Cart
  // ─────────────────────────────────────────
  const addToCart = async (product, quantity = 1, size = null) => {
    const productId = product.product_id || product.id;
    const itemSize = size || product.size || null;
    try {
      const res = await cartService.addToCart(productId, quantity, itemSize);
      if (res.success) {
        await fetchCart();
        return { success: true, message: res.message, data: res.data };
      } else {
        return {
          success: false,
          isProfileIncomplete: res.isProfileIncomplete,
          isUnderReview: res.isUnderReview,
          profileData: res.profileData,
          message: res.message,
        };
      }
    } catch (err) {
      console.log('addToCart error in CartContext:', err.message);
      return { success: false, message: err.message || 'Failed to add to cart' };
    }
  };

  // ─────────────────────────────────────────
  // Update Quantity
  // ─────────────────────────────────────────
  const updateQuantity = async (cartIdOrProductId, quantity, size = null, productId = null) => {
    if (quantity <= 0) {
      return removeFromCart(cartIdOrProductId, productId, size);
    }

    try {
      const item = cartItems.find(
        (ci) =>
          ci.cart_id === cartIdOrProductId ||
          ci.id === cartIdOrProductId ||
          (ci.product_id === cartIdOrProductId && (!size || ci.size === size))
      );
      const effectiveCartId = item?.cart_id || (typeof cartIdOrProductId === 'number' ? cartIdOrProductId : null);
      const effectiveProductId = productId || item?.product_id;
      const effectiveSize = size || item?.size;

      const res = await cartService.updateCartQuantity(effectiveCartId, quantity, effectiveProductId, effectiveSize);
      if (res.success) {
        await fetchCart();
        return { success: true, message: res.message, data: res.data };
      } else {
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.error('updateQuantity error:', err);
      return { success: false, message: err.message || 'Failed to update quantity' };
    }
  };

  // ─────────────────────────────────────────
  // Remove Item from Cart
  // ─────────────────────────────────────────
  const removeFromCart = async (cartIdOrProductId, productId = null, size = null) => {
    try {
      const item = cartItems.find(
        (ci) =>
          ci.cart_id === cartIdOrProductId ||
          ci.id === cartIdOrProductId ||
          (ci.product_id === cartIdOrProductId && (!size || ci.size === size))
      );
      const effectiveCartId = item?.cart_id || (typeof cartIdOrProductId === 'number' ? cartIdOrProductId : null);
      const effectiveProductId = productId || item?.product_id;
      const effectiveSize = size || item?.size;

      const res = await cartService.removeFromCart(effectiveCartId, effectiveProductId, effectiveSize);
      if (res.success) {
        await fetchCart();
        return { success: true, message: res.message };
      } else {
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.error('removeFromCart error:', err);
      return { success: false, message: err.message || 'Failed to remove from cart' };
    }
  };

  // ─────────────────────────────────────────
  // Clear Cart
  // ─────────────────────────────────────────
  const clearCart = async () => {
    try {
      const res = await cartService.clearCart();
      if (res.success) {
        setCartItems([]);
        setSummary({ total_items: 0, subtotal: 0 });
        return { success: true, message: res.message };
      } else {
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.error('clearCart error:', err);
      return { success: false, message: err.message || 'Failed to clear cart' };
    }
  };

  // ─────────────────────────────────────────
  // Counts & Totals
  // ─────────────────────────────────────────
  const getCartCount = () => {
    if (summary && summary.total_items) return summary.total_items;
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  };

  const getCartTotal = () => {
    if (summary && summary.subtotal) return summary.subtotal;
    return cartItems.reduce((sum, item) => {
      const price =
        typeof item.price === 'number'
          ? item.price
          : parseInt(String(item.price || 0).replace(/[₹,]/g, '')) || 0;
      return sum + price * (Number(item.quantity) || 0);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        summary,
        fetchCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartCount,
        getCartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}