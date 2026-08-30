import React, { useState, useEffect } from 'react';
import {
  Search,
  Star,
  Clock,
  Bike,
  Plus,
  Minus,
  X,
  MapPin,
  Phone,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Navigation,
  CreditCard,
  Banknote,
  Send,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { ApiClient } from '../../lib/api.js';
import { Restaurant, MenuItem, RestaurantCategory, Order, CartItemOption } from '../../types/index.js';
import { LeafletMap } from '../common/LeafletMap.js';

interface CustomerViewProps {
  selectedCity: string;
  selectedDistrict: string;
  searchTerm: string;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  selectedCity,
  selectedDistrict,
  searchTerm,
  currentTab,
  onTabChange,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const {
    items,
    restaurant: cartRestaurant,
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
  } = useCart();

  // State
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [restaurantMenu, setRestaurantMenu] = useState<{ categories: any[]; menu_items: MenuItem[] }>({
    categories: [],
    menu_items: [],
  });
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('all');

  // Item Customization Modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<CartItemOption[]>([]);
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemInstructions, setItemInstructions] = useState<string>('');

  // Orders State
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Checkout Flow
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    city: selectedCity,
    district: selectedDistrict,
    street_details: '',
    building: '',
    floor: '',
    phone: user?.phone || '+9639',
    notes: '',
  });
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: 33.5138,
    lng: 36.2765,
  });
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'SHAM_CASH'>('CASH');
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success?: boolean; message?: string }>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Review Modal
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Quick Filters
  const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);
  const [filterHighRated, setFilterHighRated] = useState(false);

  // Fetch initial categories & restaurants
  useEffect(() => {
    loadCategories();
    loadRestaurants();
    if (user) {
      loadMyOrders();
    }
  }, [selectedCity, selectedCategory, filterOnlyOpen, filterHighRated, searchTerm]);

  // Sync city to address state
  useEffect(() => {
    setDeliveryAddress(prev => ({
      ...prev,
      city: selectedCity,
      district: selectedDistrict,
    }));
  }, [selectedCity, selectedDistrict]);

  const loadCategories = async () => {
    try {
      const res = await ApiClient.getCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch {
      // ignore
    }
  };

  const loadRestaurants = async () => {
    try {
      const res = await ApiClient.getRestaurants({
        city: selectedCity,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        open_only: filterOnlyOpen,
        high_rated: filterHighRated,
      });
      if (res.success && res.restaurants) {
        setRestaurants(res.restaurants);
      }
    } catch {
      // ignore
    }
  };

  const loadMyOrders = async () => {
    try {
      const res = await ApiClient.getMyOrders();
      if (res.success && res.orders) {
        setMyOrders(res.orders);
        // If there's an ongoing active order, automatically pick it up for tracking
        const active = res.orders.find((o: Order) => !['delivered', 'cancelled', 'rejected'].includes(o.status));
        if (active && !activeTrackingOrder) {
          setActiveTrackingOrder(active);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleOpenRestaurant = async (rest: Restaurant) => {
    try {
      setSelectedRestaurant(rest);
      const res = await ApiClient.getRestaurantDetail(rest.id);
      if (res.success) {
        setRestaurantMenu({
          categories: res.categories || [],
          menu_items: res.menu_items || [],
        });
      }
    } catch {
      // ignore
    }
  };

  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setSelectedOptions([]);
    setItemQuantity(1);
    setItemInstructions('');
  };

  const handleToggleOption = (opt: any) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.name_ar === opt.name_ar);
      if (exists) {
        return prev.filter(o => o.name_ar !== opt.name_ar);
      } else {
        return [
          ...prev,
          {
            group_name_ar: opt.group_name_ar,
            name_ar: opt.name_ar,
            price_modifier: opt.price_modifier,
          },
        ];
      }
    });
  };

  const handleConfirmAddToCart = () => {
    if (!selectedRestaurant || !customizingItem) return;
    addItem(selectedRestaurant, customizingItem, selectedOptions, itemQuantity, itemInstructions);
    setCustomizingItem(null);
  };

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    const res = await applyCoupon(couponInput);
    setCouponFeedback(res);
  };

  const handleSubmitOrder = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!cartRestaurant || items.length === 0) return;

    if (!deliveryAddress.district || !deliveryAddress.phone) {
      alert('يرجى التأكد من كتابة الحي ورقم الهاتف للتوصيل');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const payload = {
        restaurant_id: cartRestaurant.id,
        items: items.map(i => ({
          menu_item_id: i.menu_item_id,
          item_name: i.name_ar,
          quantity: i.quantity,
          selected_options: i.selected_options,
          special_instructions: i.special_instructions,
        })),
        coupon_code: couponCode || undefined,
        payment_method: paymentMethod,
        delivery_address: {
          city: deliveryAddress.city,
          district: deliveryAddress.district,
          street_details: deliveryAddress.street_details,
          building: deliveryAddress.building,
          floor: deliveryAddress.floor,
          phone: deliveryAddress.phone,
          notes: deliveryAddress.notes,
          latitude: pinCoords.lat,
          longitude: pinCoords.lng,
        },
        customer_notes: deliveryAddress.notes,
      };

      const res = await ApiClient.createOrder(payload);
      if (res.success && res.order) {
        clearCart();
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        setActiveTrackingOrder(res.order);
        onTabChange('orders');
        await loadMyOrders();
      }
    } catch (err: any) {
      alert(err.message || 'فشل إرسال الطلب');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Poll active order tracking
  useEffect(() => {
    if (!activeTrackingOrder) return;
    const interval = setInterval(async () => {
      try {
        const res = await ApiClient.getOrder(activeTrackingOrder.id);
        if (res.success && res.order) {
          setActiveTrackingOrder(res.order);
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTrackingOrder?.id]);

  const handleSubmitReview = async () => {
    if (!reviewOrder) return;
    try {
      const res = await ApiClient.submitReview({
        order_id: reviewOrder.id,
        restaurant_rating: restaurantRating,
        driver_rating: driverRating,
        comment: reviewComment,
      });
      if (res.success) {
        setReviewSuccess(true);
        setTimeout(() => {
          setReviewOrder(null);
          setReviewSuccess(false);
          loadMyOrders();
        }, 1800);
      }
    } catch (err: any) {
      alert(err.message || 'فشل إرسال التقييم');
    }
  };

  // 10-Step State Machine Status Helper
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'بانتظار قبول المطعم', color: 'bg-amber-100 text-amber-800 border-amber-300', step: 1 };
      case 'accepted':
        return { label: 'تم قبول الطلب وجاري التجهيز', color: 'bg-blue-100 text-blue-800 border-blue-300', step: 2 };
      case 'preparing':
        return { label: 'المطبخ يقوم بتحضير وجباتك الآن 🍳', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', step: 3 };
      case 'ready':
        return { label: 'الوجبة جاهزة وبانتظار استلام المندوب', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', step: 4 };
      case 'driver_assigned':
        return { label: 'تم تعيين الكابتن وهو متوجه للمطعم', color: 'bg-sky-100 text-sky-800 border-sky-300', step: 5 };
      case 'picked_up':
        return { label: 'استلم المندوب الطلب وبدأ التوصيل 🛵', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', step: 6 };
      case 'on_the_way':
        return { label: 'الكابتن على الطريق إليك الآن', color: 'bg-teal-100 text-teal-800 border-teal-300', step: 7 };
      case 'delivered':
        return { label: 'تم التوصيل بنجاح وبالهناء والشفاء! 🎉', color: 'bg-green-100 text-green-800 border-green-300', step: 8 };
      case 'rejected':
        return { label: 'اعتذر المطعم عن قبول الطلب', color: 'bg-rose-100 text-rose-800 border-rose-300', step: 0 };
      case 'cancelled':
        return { label: 'تم إلغاء الطلب', color: 'bg-red-100 text-red-800 border-red-300', step: 0 };
      default:
        return { label: status, color: 'bg-stone-100 text-stone-800 border-stone-300', step: 1 };
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* 1. ORDERS / TRACKING VIEW */}
      {currentTab === 'orders' ? (
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-stone-900 font-['Tajawal']">سجل طلباتي</h2>
              <p className="text-xs text-stone-500">تابع مسار طلباتك الحية وتقييم الوجبات المكتملة</p>
            </div>
            <button
              onClick={() => onTabChange('home')}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              طلب وجبة جديدة
            </button>
          </div>

          {/* Active Order Live Tracker Banner */}
          {activeTrackingOrder && (
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-amber-200 mb-8 relative overflow-hidden animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      طلب جاري ومباشر
                    </span>
                    <span className="font-extrabold text-stone-900 text-base">{activeTrackingOrder.order_number}</span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">مطعم: {activeTrackingOrder.restaurant_name}</div>
                </div>

                <div className={`px-3 py-1 rounded-xl text-xs font-bold border ${getStatusDisplay(activeTrackingOrder.status).color}`}>
                  {getStatusDisplay(activeTrackingOrder.status).label}
                </div>
              </div>

              {/* Progress Steps Timeline */}
              <div className="grid grid-cols-4 gap-2 my-4 relative">
                {[
                  { step: 1, label: 'قبول الطلب' },
                  { step: 2, label: 'تحضير الوجبة' },
                  { step: 3, label: 'استلام الكابتن' },
                  { step: 4, label: 'التسليم' },
                ].map((s, idx) => {
                  const currentStepNum = getStatusDisplay(activeTrackingOrder.status).step;
                  const isDone = currentStepNum >= s.step * 2 - 1;
                  const isCurrent = currentStepNum >= s.step * 2 - 2 && currentStepNum <= s.step * 2 - 1;

                  return (
                    <div key={idx} className="flex flex-col items-center text-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : isCurrent
                            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500 animate-pulse'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                      </div>
                      <span className={`text-[11px] mt-1.5 font-medium ${isDone ? 'text-amber-900 font-bold' : 'text-stone-500'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Live Map */}
              <div className="mt-4">
                <LeafletMap
                  center={[activeTrackingOrder.restaurant_latitude || 33.5138, activeTrackingOrder.restaurant_longitude || 36.2765]}
                  restaurantLocation={{
                    lat: activeTrackingOrder.restaurant_latitude,
                    lng: activeTrackingOrder.restaurant_longitude,
                    name: activeTrackingOrder.restaurant_name,
                  }}
                  customerLocation={{
                    lat: activeTrackingOrder.delivery_latitude,
                    lng: activeTrackingOrder.delivery_longitude,
                    address: `${activeTrackingOrder.delivery_address.city} - ${activeTrackingOrder.delivery_address.district}`,
                  }}
                  driverLocation={
                    activeTrackingOrder.live_driver
                      ? {
                          lat: activeTrackingOrder.live_driver.latitude,
                          lng: activeTrackingOrder.live_driver.longitude,
                          name: activeTrackingOrder.live_driver.name,
                        }
                      : undefined
                  }
                  height="260px"
                />
              </div>

              {/* Driver & Contact Bar */}
              {activeTrackingOrder.live_driver && (
                <div className="mt-4 p-3.5 bg-stone-50 rounded-2xl flex items-center justify-between border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                      🛵
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900">{activeTrackingOrder.live_driver.name}</div>
                      <div className="text-[10px] text-stone-500">
                        {activeTrackingOrder.live_driver.vehicle} | لوحة: {activeTrackingOrder.live_driver.plate} | تقييم: ⭐ {activeTrackingOrder.live_driver.rating}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${activeTrackingOrder.live_driver.phone}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl flex items-center gap-1 text-xs font-bold transition shadow-xs"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال</span>
                  </a>
                </div>
              )}

              {/* Order Items Breakdown */}
              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">
                  إجمالي المبلغ ({activeTrackingOrder.payment_method === 'CASH' ? 'الدفع عند الاستلام كاش' : 'شام كاش'}):
                </span>
                <span className="font-extrabold text-stone-900 text-sm">
                  {activeTrackingOrder.total_amount.toLocaleString()} ل.س
                </span>
              </div>
            </div>
          )}

          {/* Past Orders List */}
          <div className="space-y-4">
            <h3 className="font-bold text-stone-800 text-sm">جميع الطلبات السابقة:</h3>
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 text-stone-400">
                <Bike className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">لم تقم بأي طلبات بعد</p>
                <p className="text-xs text-stone-500 mt-1">تصفح المطاعم السورية واطلب وجبتك المفضلة الآن</p>
                <button
                  onClick={() => onTabChange('home')}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
                >
                  استكشف المطاعم
                </button>
              </div>
            ) : (
              myOrders.map(order => {
                const statusInfo = getStatusDisplay(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200 hover:border-amber-300 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-stone-900 text-sm">{order.restaurant_name}</span>
                        <div className="text-[10px] text-stone-400">
                          {order.order_number} • {new Date(order.created_at).toLocaleDateString('ar-SY')}
                        </div>
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-xl font-bold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1 mb-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {item.quantity}x {item.item_name}
                          </span>
                          <span>{item.subtotal.toLocaleString()} ل.س</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <div className="font-extrabold text-stone-900 text-sm">
                        المجموع: {order.total_amount.toLocaleString()} ل.س
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'delivered' && (
                          <button
                            onClick={() => setReviewOrder(order)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-amber-200 transition"
                          >
                            ⭐ تقييم الطلب
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTrackingOrder(order)}
                          className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-1.5 px-3 rounded-xl transition"
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : selectedRestaurant ? (
        /* 2. RESTAURANT DETAIL & MENU VIEW */
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 mb-4 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>العودة للمطاعم</span>
          </button>

          {/* Restaurant Banner Card */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-200 mb-6">
            <div className="h-48 sm:h-64 relative bg-stone-200">
              <img
                src={selectedRestaurant.banner_url}
                alt={selectedRestaurant.name_ar}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 right-4 text-white">
                <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full mb-1 inline-block">
                  {selectedRestaurant.district} - {selectedRestaurant.city}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-['Tajawal']">{selectedRestaurant.name_ar}</h1>
                <p className="text-xs text-stone-200 mt-1 max-w-xl">{selectedRestaurant.description_ar}</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100">
              <div className="flex items-center gap-4 text-xs text-stone-600">
                <div className="flex items-center gap-1 font-bold text-stone-900 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{selectedRestaurant.rating}</span>
                  <span className="text-[10px] text-stone-400">({selectedRestaurant.rating_count} تقييم)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-stone-400" />
                  <span>{selectedRestaurant.prep_time_minutes || 25} دقيقة تحضير</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bike className="w-4 h-4 text-stone-400" />
                  <span>توصيل: {selectedRestaurant.base_delivery_fee.toLocaleString()} ل.س</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4 text-stone-400" />
                  <span>حد أدنى: {selectedRestaurant.min_order_amount.toLocaleString()} ل.س</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold ${
                    selectedRestaurant.is_open && !selectedRestaurant.is_busy
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedRestaurant.is_open && !selectedRestaurant.is_busy ? '🟢 مفتوح ويستقبل الطلبات' : '🔴 مغلق حالياً'}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Categories Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            <button
              onClick={() => setSelectedMenuCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedMenuCategory === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              جميع الأصناف
            </button>
            {restaurantMenu.categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedMenuCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedMenuCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat.name_ar}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurantMenu.menu_items
              .filter(item => selectedMenuCategory === 'all' || item.category_id === selectedMenuCategory)
              .map(item => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex flex-col justify-between transition hover:shadow-md ${
                    !item.is_available ? 'opacity-60 grayscale-50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={item.image_url}
                      alt={item.name_ar}
                      className="w-24 h-24 rounded-xl object-cover shrink-0 bg-stone-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-stone-900 text-sm">{item.name_ar}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">{item.description_ar}</p>
                      <div className="font-extrabold text-amber-600 text-sm mt-2">
                        {item.price.toLocaleString()} ل.س
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">{item.preparation_time_mins || 20} دقيقة</span>
                    {item.is_available ? (
                      <button
                        onClick={() => openCustomizer(item)}
                        className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة للسلة</span>
                      </button>
                    ) : (
                      <span className="text-xs text-red-500 font-bold">نفد حالياً</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* 3. HOME DISCOVERY VIEW */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {/* Syrian Hero Promo Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl mb-8">
            <div className="relative z-10 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full inline-block mb-3">
                أسرع توصيل طعام في سوريا 🇸🇾
              </span>
              <h1 className="text-2xl sm:text-4xl font-black font-['Tajawal'] leading-tight mb-2">
                أشهى المأكولات الشامية والحلبية توصلك لباب بيتك
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 mb-4 leading-relaxed">
                اطلب من أفضل مطاعم {selectedCity}، ادفع عند الاستلام نقدًا أو عبر شام كاش، وتابع كابتن التوصيل لايف على الخريطة.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl font-bold">
                  🎁 استخدم كود: <span className="text-amber-300">WASSALNI10</span> لخصم 10%
                </span>
                <span className="bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-xl font-bold">
                  ⚡ توصيل سريع خلال 25-35 دقيقة
                </span>
              </div>
            </div>
          </div>

          {/* Categories Carousel */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-stone-900 text-lg font-['Tajawal']">التصنيفات والمأكولات</h2>
              <span className="text-xs text-stone-400">اختر نوع طعامك المفضل</span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl min-w-[80px] transition border cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md font-bold'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">🍽️</div>
                <span className="text-xs whitespace-nowrap">الكل</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl min-w-[90px] transition border cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <img src={cat.image_url} alt={cat.name_ar} className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-xs whitespace-nowrap">{cat.name_ar}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-400" />
              <span className="text-xs font-bold text-stone-700">تصفية النتائج:</span>
              <button
                onClick={() => setFilterOnlyOpen(!filterOnlyOpen)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                  filterOnlyOpen ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                مفتوح الآن 🟢
              </button>
              <button
                onClick={() => setFilterHighRated(!filterHighRated)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                  filterHighRated ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                الأعلى تقييماً ⭐ 4.5+
              </button>
            </div>
            <div className="text-xs text-stone-400">
              المطاعم المتاحة: <span className="font-bold text-stone-800">{restaurants.length}</span> مطعم
            </div>
          </div>

          {/* Restaurants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {restaurants.map(rest => (
              <div
                key={rest.id}
                onClick={() => handleOpenRestaurant(rest)}
                className="bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-xl border border-stone-200 hover:border-amber-400 transition cursor-pointer group flex flex-col justify-between"
              >
                <div className="h-44 relative overflow-hidden bg-stone-100">
                  <img
                    src={rest.banner_url}
                    alt={rest.name_ar}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-stone-900 font-extrabold text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{rest.rating}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    {rest.district} - {rest.city}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-lg text-stone-900 group-hover:text-amber-600 transition font-['Tajawal']">
                      {rest.name_ar}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-1">{rest.description_ar}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{rest.prep_time_minutes || 25} دقيقة</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bike className="w-3.5 h-3.5 text-stone-400" />
                      <span>{rest.base_delivery_fee.toLocaleString()} ل.س توصيل</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rest.is_open && !rest.is_busy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rest.is_open && !rest.is_busy ? 'مفتوح' : 'مغلق'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ITEM CUSTOMIZATION MODAL */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative h-44 bg-stone-100">
              <img src={customizingItem.image_url} alt={customizingItem.name_ar} className="w-full h-full object-cover" />
              <button
                onClick={() => setCustomizingItem(null)}
                className="absolute top-3 left-3 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <h3 className="font-extrabold text-lg text-stone-900">{customizingItem.name_ar}</h3>
              <p className="text-xs text-stone-500 mt-1">{customizingItem.description_ar}</p>
              <div className="text-amber-600 font-extrabold text-base mt-2">
                {customizingItem.price.toLocaleString()} ل.س
              </div>

              {/* Options & Additions */}
              {customizingItem.options && customizingItem.options.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <h4 className="font-bold text-xs text-stone-800 mb-2">الإضافات والخيارات:</h4>
                  <div className="space-y-2">
                    {customizingItem.options.map(opt => {
                      const isSelected = selectedOptions.some(o => o.name_ar === opt.name_ar);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleToggleOption(opt)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs border transition ${
                            isSelected ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold' : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <span>{opt.name_ar}</span>
                          <span className="text-stone-500">
                            {opt.price_modifier > 0 ? `+${opt.price_modifier.toLocaleString()} ل.س` : 'مجاناً'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div className="mt-4 pt-4 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 mb-1">ملاحظات إضافية للمطبخ:</label>
                <input
                  type="text"
                  placeholder="مثال: بدون بصل، ثومية زيادة..."
                  value={itemInstructions}
                  onChange={e => setItemInstructions(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Quantity Counter */}
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-stone-100">
                <span className="text-xs font-bold text-stone-700">الكمية:</span>
                <div className="flex items-center gap-3 bg-stone-100 p-1 rounded-xl">
                  <button
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    className="p-1 rounded-lg bg-white shadow-xs hover:bg-stone-200 transition"
                  >
                    <Minus className="w-4 h-4 text-stone-700" />
                  </button>
                  <span className="font-extrabold text-sm text-stone-900 w-6 text-center">{itemQuantity}</span>
                  <button
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                    className="p-1 rounded-lg bg-white shadow-xs hover:bg-stone-200 transition"
                  >
                    <Plus className="w-4 h-4 text-stone-700" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50">
              <button
                onClick={handleConfirmAddToCart}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <span>إضافة إلى السلة</span>
                <span>•</span>
                <span>
                  {(
                    (customizingItem.price +
                      selectedOptions.reduce((s, o) => s + o.price_modifier, 0)) *
                    itemQuantity
                  ).toLocaleString()}{' '}
                  ل.س
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SHOPPING CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base font-['Tajawal']">سلة الطلبات</span>
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                  {items.length} وجبات
                </span>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone-400 text-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-3 text-2xl">
                  🛒
                </div>
                <h4 className="font-bold text-stone-800 text-sm">السلة فارغة حالياً</h4>
                <p className="text-xs text-stone-400 mt-1">أضف وجباتك المفضلة لبدء الطلب</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="text-xs font-bold text-stone-500 mb-2">
                    الطلب من مطعم: <span className="text-amber-600 font-extrabold">{cartRestaurant?.name_ar}</span>
                  </div>

                  {items.map(item => (
                    <div
                      key={item.cart_item_id}
                      className="bg-stone-50 rounded-2xl p-3 border border-stone-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-xs text-stone-900">{item.name_ar}</div>
                        {item.selected_options.length > 0 && (
                          <div className="text-[10px] text-stone-500">
                            {item.selected_options.map(o => o.name_ar).join(', ')}
                          </div>
                        )}
                        <div className="font-extrabold text-amber-600 text-xs mt-1">
                          {(item.total_unit_price * item.quantity).toLocaleString()} ل.س
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200">
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                          className="p-1 rounded-md hover:bg-stone-100 text-stone-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs text-stone-900 w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                          className="p-1 rounded-md hover:bg-stone-100 text-stone-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Coupon Code Input */}
                  <div className="pt-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="كود الخصم (مثال: WASSALNI10)"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none uppercase"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
                      >
                        تطبيق
                      </button>
                    </div>
                    {couponFeedback.message && (
                      <p
                        className={`text-[11px] mt-1.5 font-medium ${
                          couponFeedback.success ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {couponFeedback.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>قيمة الوجبات:</span>
                    <span>{subtotal.toLocaleString()} ل.س</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>رسوم التوصيل:</span>
                    <span>{deliveryFee.toLocaleString()} ل.س</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>رسوم الخدمة والتشغيل:</span>
                    <span>{serviceFee.toLocaleString()} ل.س</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>الخصم ({couponCode}):</span>
                      <span>-{discountAmount.toLocaleString()} ل.س</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm text-stone-900 pt-2 border-t border-stone-200">
                    <span>الإجمالي المستحق:</span>
                    <span className="text-amber-600">{totalAmount.toLocaleString()} ل.س</span>
                  </div>

                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl shadow-md transition text-sm mt-3"
                  >
                    متابعة إلى تأكيد الطلب
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. CHECKOUT CONFIRMATION MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base font-['Tajawal']">تأكيد عنوان التوصيل والدفع</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 rounded-full hover:bg-stone-800 text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Map Location Pin Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  تحديد موقع التوصيل على الخريطة:
                </label>
                <LeafletMap
                  center={[pinCoords.lat, pinCoords.lng]}
                  interactivePinPlacement={true}
                  customerLocation={{
                    lat: pinCoords.lat,
                    lng: pinCoords.lng,
                    address: `${deliveryAddress.city} - ${deliveryAddress.district}`,
                  }}
                  onLocationSelected={(lat, lng) => setPinCoords({ lat, lng })}
                  height="180px"
                />
              </div>

              {/* Address Form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المحافظة</label>
                  <input
                    type="text"
                    disabled
                    value={deliveryAddress.city}
                    className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الحي / المنطقة</label>
                  <input
                    type="text"
                    value={deliveryAddress.district}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, district: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الشارع / المعلم</label>
                  <input
                    type="text"
                    placeholder="مثال: جانب جامع العثمان"
                    value={deliveryAddress.street_details}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, street_details: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">البناء والطابق</label>
                  <input
                    type="text"
                    placeholder="مثال: بناء 4، طابق 2"
                    value={deliveryAddress.building}
                    onChange={e => setDeliveryAddress({ ...deliveryAddress, building: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="tel"
                  value={deliveryAddress.phone}
                  onChange={e => setDeliveryAddress({ ...deliveryAddress, phone: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">طريقة الدفع:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-2xl border text-right transition ${
                      paymentMethod === 'CASH'
                        ? 'bg-amber-50 border-amber-500 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="font-bold text-xs text-stone-900">الدفع نقداً (كاش)</div>
                        <div className="text-[10px] text-stone-500">عند استلام الوجبة من الكابتن</div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('SHAM_CASH')}
                    className={`p-3 rounded-2xl border text-right transition ${
                      paymentMethod === 'SHAM_CASH'
                        ? 'bg-amber-50 border-amber-500 shadow-xs'
                        : 'bg-stone-50 border-stone-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-600" />
                      <div>
                        <div className="font-bold text-xs text-stone-900">شام كاش (Sham Cash)</div>
                        <div className="text-[10px] text-stone-500">دفع إلكتروني فوري</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-stone-500">الإجمالي النهائي:</div>
                <div className="text-base font-black text-amber-600">{totalAmount.toLocaleString()} ل.س</div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={isSubmittingOrder}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold py-3 px-6 rounded-2xl shadow-md transition text-xs disabled:opacity-50"
              >
                {isSubmittingOrder ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال الطلب الآن 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. REVIEW MODAL */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-stone-900">تقييم الطلب {reviewOrder.order_number}</h3>
              <button onClick={() => setReviewOrder(null)} className="p-1 rounded-full text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-stone-900">شكراً جزيلاً لتقييمك!</h4>
                <p className="text-xs text-stone-500">تم تسجيل رأيك لمساعدة الآخرين وتحسين الخدمة</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    تقييم المطعم ({reviewOrder.restaurant_name}):
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRestaurantRating(star)}
                        className="p-1 text-2xl transition hover:scale-110"
                      >
                        {star <= restaurantRating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">تقييم كابتن التوصيل:</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setDriverRating(star)}
                        className="p-1 text-2xl transition hover:scale-110"
                      >
                        {star <= driverRating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">تعليقك وملاحظاتك:</label>
                  <textarea
                    rows={3}
                    placeholder="كيف كانت تجربة الطعام وسرعة التوصيل؟"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSubmitReview}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-xs transition text-xs"
                >
                  إرسال التقييم
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
