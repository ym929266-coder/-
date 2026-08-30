import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, CartItemOption, MenuItem, Restaurant } from '../types/index.js';

interface CartContextType {
  items: CartItem[];
  restaurant: Restaurant | null;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (restaurant: Restaurant, item: MenuItem, selectedOptions: CartItemOption[], quantity: number, notes?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('wassalni_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [restaurant, setRestaurant] = useState<Restaurant | null>(() => {
    try {
      const saved = localStorage.getItem('wassalni_cart_rest');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('wassalni_cart', JSON.stringify(items));
    localStorage.setItem('wassalni_cart_rest', JSON.stringify(restaurant));
  }, [items, restaurant]);

  // Calculate Subtotal
  const subtotal = items.reduce((acc, item) => acc + item.total_unit_price * item.quantity, 0);
  
  // Delivery & Service Fees
  const deliveryFee = restaurant ? (restaurant.base_delivery_fee || 5000) : 5000;
  const serviceFee = items.length > 0 ? 2500 : 0;
  const totalAmount = Math.max(0, subtotal + (items.length > 0 ? deliveryFee + serviceFee : 0) - discountAmount);

  const addItem = (
    targetRestaurant: Restaurant,
    item: MenuItem,
    selectedOptions: CartItemOption[],
    quantity: number,
    notes?: string
  ) => {
    // If cart has items from different restaurant, confirm or clear
    if (restaurant && restaurant.id !== targetRestaurant.id && items.length > 0) {
      const confirmChange = window.confirm(
        `لديك منتجات في السلة من مطعم (${restaurant.name_ar}). هل تريد إفراغ السلة وبدء طلب جديد من (${targetRestaurant.name_ar})؟`
      );
      if (!confirmChange) return;
      setItems([]);
      setDiscountAmount(0);
      setCouponCode('');
    }

    setRestaurant(targetRestaurant);

    const optionsModifier = selectedOptions.reduce((sum, opt) => sum + opt.price_modifier, 0);
    const totalUnitPrice = item.price + optionsModifier;

    const cartItemId = `${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newItem: CartItem = {
      cart_item_id: cartItemId,
      menu_item_id: item.id,
      restaurant_id: targetRestaurant.id,
      restaurant_name: targetRestaurant.name_ar,
      name_ar: item.name_ar,
      unit_price: item.price,
      total_unit_price: totalUnitPrice,
      quantity,
      image_url: item.image_url,
      selected_options: selectedOptions,
      special_instructions: notes,
    };

    setItems(prev => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.cart_item_id !== cartItemId);
      if (next.length === 0) {
        setRestaurant(null);
        setCouponCode('');
        setDiscountAmount(0);
      }
      return next;
    });
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems(prev =>
      prev.map(item => (item.cart_item_id === cartItemId ? { ...item, quantity: newQty } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    setRestaurant(null);
    setCouponCode('');
    setDiscountAmount(0);
    localStorage.removeItem('wassalni_cart');
    localStorage.removeItem('wassalni_cart_rest');
  };

  const applyCoupon = async (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    if (cleanCode === 'WASSALNI10') {
      const disc = Math.round((subtotal * 10) / 100);
      setDiscountAmount(disc);
      setCouponCode(cleanCode);
      return { success: true, message: `تم تفعيل كود الخصم 10% بنجاح (-${disc.toLocaleString()} ل.س)` };
    } else if (cleanCode === 'SHAM5000') {
      const disc = 5000;
      setDiscountAmount(disc);
      setCouponCode(cleanCode);
      return { success: true, message: `تم خصم 5,000 ليرة سورية بنجاح!` };
    } else {
      return { success: false, message: 'كود الخصم غير صالح أو منتهي الصلاحية' };
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscountAmount(0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        restaurant,
        subtotal,
        deliveryFee,
        serviceFee,
        discountAmount,
        totalAmount,
        couponCode,
        isCartOpen,
        setIsCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
