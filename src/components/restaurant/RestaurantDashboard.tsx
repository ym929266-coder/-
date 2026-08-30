import React, { useState, useEffect } from 'react';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Utensils,
  Receipt,
  Phone,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ApiClient } from '../../lib/api.js';
import { Order, MenuItem, Restaurant } from '../../types/index.js';

export const RestaurantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'financials' | 'settings'>('orders');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [acceptModalOrder, setAcceptModalOrder] = useState<Order | null>(null);
  const [prepTimeInput, setPrepTimeInput] = useState(25);
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Menu item modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name_ar: '',
    description_ar: '',
    category_id: '',
    price: 35000,
    image_url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500&auto=format&fit=crop&q=60',
    preparation_time_mins: 20,
    is_available: true,
  });

  const [newCatName, setNewCatName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, ordersRes] = await Promise.all([
        ApiClient.getRestaurantDashboard(),
        ApiClient.getRestaurantOrders(),
      ]);

      if (dashRes.success) {
        setRestaurant(dashRes.restaurant);
        setCategories(dashRes.categories || []);
        setMenuItems(dashRes.menu_items || []);
      }

      if (ordersRes.success && ordersRes.orders) {
        setOrders(ordersRes.orders);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStatus = async (field: 'is_open' | 'is_busy') => {
    if (!restaurant) return;
    const newStatus = {
      is_open: field === 'is_open' ? !restaurant.is_open : restaurant.is_open,
      is_busy: field === 'is_busy' ? !restaurant.is_busy : restaurant.is_busy,
    };
    try {
      const res = await ApiClient.updateRestaurantStatus(newStatus);
      if (res.success && res.restaurant) {
        setRestaurant(res.restaurant);
      }
    } catch {
      // ignore
    }
  };

  const handleAcceptOrder = async () => {
    if (!acceptModalOrder) return;
    try {
      const res = await ApiClient.acceptOrder(acceptModalOrder.id, prepTimeInput);
      if (res.success) {
        setAcceptModalOrder(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'فشل قبول الطلب');
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectModalOrder) return;
    try {
      const res = await ApiClient.rejectOrder(rejectModalOrder.id, rejectReason);
      if (res.success) {
        setRejectModalOrder(null);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'فشل رفض الطلب');
    }
  };

  const handleMarkPreparing = async (orderId: string) => {
    try {
      await ApiClient.markOrderPreparing(orderId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      const res = await ApiClient.markOrderReady(orderId);
      if (res.success) {
        alert('تم تعيين الطلب كجاهز! تم إرسال إشعار لمناديب التوصيل القريبين تلقائياً 🛵');
        await loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await ApiClient.updateMenuItem(editingItem.id, itemForm);
      } else {
        await ApiClient.addMenuItem(itemForm);
      }
      setIsAddingItem(false);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوجبة؟')) return;
    try {
      await ApiClient.deleteMenuItem(itemId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      await ApiClient.updateMenuItem(item.id, { is_available: !item.is_available });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await ApiClient.addMenuCategory({ name_ar: newCatName });
      setNewCatName('');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Financial calculations for restaurant
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const grossSales = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const platformCommissionsDeducted = deliveredOrders.reduce((sum, o) => sum + o.platform_commission, 0);
  const netEarnings = deliveredOrders.reduce((sum, o) => sum + o.restaurant_net, 0);

  const incomingOrders = orders.filter(o => o.status === 'pending');
  const activeKitchenOrders = orders.filter(o => ['accepted', 'preparing', 'ready', 'driver_assigned'].includes(o.status));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Restaurant Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-600/20">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 font-['Tajawal']">
                لوحة تحكم: {restaurant?.name_ar || 'مطعم الشام'}
              </h1>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                عمولة المنصة: {restaurant?.commission_rate_percentage || 12}%
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {restaurant?.district} - {restaurant?.city} • رقم الهاتف: {restaurant?.phone}
            </p>
          </div>
        </div>

        {/* Operating Status Controls */}
        <div className="flex items-center gap-3 bg-stone-50 p-2 rounded-2xl border border-stone-200">
          <button
            onClick={() => handleToggleStatus('is_open')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              restaurant?.is_open
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            <span>{restaurant?.is_open ? '🟢 المطعم مفتوح' : '🔴 المطعم مغلق'}</span>
          </button>

          <button
            onClick={() => handleToggleStatus('is_busy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              restaurant?.is_busy
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            <span>{restaurant?.is_busy ? '⚠️ ضغط طلبات (مشغول)' : '✅ استقبال عادي'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>إدارة الطلبات الحية ({incomingOrders.length + activeKitchenOrders.length})</span>
          {incomingOrders.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
              {incomingOrders.length} جديد
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'menu'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>قائمة المأكولات والأسعار ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'financials'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>الحسابات المالية والعمولات</span>
        </button>
      </div>

      {/* TAB 1: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming Orders Column */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-stone-900 text-base flex items-center gap-2 font-['Tajawal']">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <span>طلبات واردة جديدة ({incomingOrders.length})</span>
              </h2>
              <span className="text-xs text-stone-500">يتطلب اتخاذ إجراء فوري</span>
            </div>

            <div className="space-y-4">
              {incomingOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 text-stone-400">
                  <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold">لا توجد طلبات جديدة واردة حالياً</p>
                  <p className="text-[11px] text-stone-400 mt-1">ستصلك تنبيهات فورية عند قيام العملاء بالطلب</p>
                </div>
              ) : (
                incomingOrders.map(order => (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-5 shadow-md border-2 border-amber-400 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                      <div>
                        <span className="font-extrabold text-stone-900 text-base">{order.order_number}</span>
                        <div className="text-xs text-stone-500">
                          العميل: {order.customer_name} ({order.customer_phone})
                        </div>
                      </div>
                      <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-xl">
                        {order.delivery_address.district}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 text-xs mb-4">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="bg-stone-50 p-2.5 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="font-bold text-stone-900">
                              {item.quantity}x {item.item_name}
                            </span>
                            {item.special_instructions && (
                              <div className="text-[10px] text-amber-700">ملاحظة: {item.special_instructions}</div>
                            )}
                          </div>
                          <span className="font-bold text-stone-700">{item.subtotal.toLocaleString()} ل.س</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 mb-4 text-xs">
                      <span className="text-stone-500">صافي المطعم من الطلب:</span>
                      <span className="font-extrabold text-emerald-600 text-sm">
                        {order.restaurant_net.toLocaleString()} ل.س
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setAcceptModalOrder(order);
                          setPrepTimeInput(25);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-2.5 rounded-xl shadow-xs transition text-xs flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبول وتحديد الوقت</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectModalOrder(order);
                          setRejectReason('المطعم مشغول جداً ولا يمكن تلبية الطلب حالياً');
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl border border-rose-200 transition text-xs flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>اعتذار عن الطلب</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Kitchen & Delivery Orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-stone-900 text-base flex items-center gap-2 font-['Tajawal']">
                <span>طلبات قيد التحضير والتسليم ({activeKitchenOrders.length})</span>
              </h2>
              <span className="text-xs text-stone-500">تحديث الحالة ينبه العميل والمندوب</span>
            </div>

            <div className="space-y-4">
              {activeKitchenOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-stone-200 text-stone-400">
                  <p className="text-xs font-bold">لا توجد طلبات جارية في المطبخ حالياً</p>
                </div>
              ) : (
                activeKitchenOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-stone-900 text-sm">{order.order_number}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          order.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'preparing'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.status === 'accepted'
                          ? 'مقبول وبانتظار البدء'
                          : order.status === 'preparing'
                          ? 'جاري التحضير في المطبخ'
                          : 'الوجبة جاهزة للاستلام'}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 mb-3">
                      {order.items?.map(i => `${i.quantity}x ${i.item_name}`).join(' | ')}
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleMarkPreparing(order.id)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition"
                        >
                          🍳 بدء التحضير في المطبخ
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition"
                        >
                          ✅ الوجبة جاهزة (استدعاء المندوب)
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <div className="flex-1 text-center py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200">
                          {order.driver_name
                            ? `الكابتن (${order.driver_name}) في طريقه للاستلام 🛵`
                            : 'جاري البحث عن أقرب كابتن توصيل...'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MENU & PRICES MANAGEMENT */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900 font-['Tajawal']">إدارة قائمة المأكولات والأسعار</h2>
              <p className="text-xs text-stone-500">تحكم بالوجبات، الأسعار، والإتاحة الفورية</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setItemForm({
                    name_ar: '',
                    description_ar: '',
                    category_id: categories[0]?.id || '',
                    price: 35000,
                    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60',
                    preparation_time_mins: 20,
                    is_available: true,
                  });
                  setIsAddingItem(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وجبة جديدة</span>
              </button>
            </div>
          </div>

          {/* Categories bar + Add Category */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-stone-500">التصنيفات الحالية:</span>
              {categories.map(c => (
                <span key={c.id} className="text-xs bg-stone-100 text-stone-800 font-bold px-2.5 py-1 rounded-xl">
                  {c.name_ar}
                </span>
              ))}
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="اسم تصنيف جديد..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition"
              >
                إضافة تصنيف
              </button>
            </form>
          </div>

          {/* Menu Items Table / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex flex-col justify-between">
                <div className="flex gap-3">
                  <img src={item.image_url} alt={item.name_ar} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-stone-900 text-sm">{item.name_ar}</h3>
                      <button
                        onClick={() => handleToggleItemAvailability(item)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                          item.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.is_available ? 'متوفر' : 'نفد'}
                      </button>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{item.description_ar}</p>
                    <div className="font-extrabold text-amber-600 text-sm mt-1">
                      {item.price.toLocaleString()} ل.س
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setItemForm({
                        name_ar: item.name_ar,
                        description_ar: item.description_ar,
                        category_id: item.category_id,
                        price: item.price,
                        image_url: item.image_url,
                        preparation_time_mins: item.preparation_time_mins,
                        is_available: item.is_available,
                      });
                      setIsAddingItem(true);
                    }}
                    className="text-stone-600 hover:text-stone-900 text-xs font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    تعديل
                  </button>

                  <button
                    onClick={() => handleDeleteMenuItem(item.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIALS & COMMISSION */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold mb-1">إجمالي المبيعات الإجمالية</div>
              <div className="text-2xl font-black text-stone-900 font-['Tajawal']">
                {grossSales.toLocaleString()} ل.س
              </div>
              <div className="text-[10px] text-stone-400 mt-1">من {deliveredOrders.length} طلبات مكتملة ومسلمة</div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
              <div className="text-xs text-stone-500 font-bold mb-1">
                عمولة المنصة المستحقة ({restaurant?.commission_rate_percentage || 12}%)
              </div>
              <div className="text-2xl font-black text-rose-600 font-['Tajawal']">
                {platformCommissionsDeducted.toLocaleString()} ل.س
              </div>
              <div className="text-[10px] text-stone-400 mt-1">تخصم تلقائياً عند التسليم</div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-emerald-200 bg-emerald-50/50 shadow-xs">
              <div className="text-xs text-emerald-800 font-bold mb-1">صافي مستحقات المطعم الجاهزة للتحويل</div>
              <div className="text-2xl font-black text-emerald-700 font-['Tajawal']">
                {netEarnings.toLocaleString()} ل.س
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">يتم التسوية أسبوعياً عبر الحساب البنكي / كاش</div>
            </div>
          </div>

          {/* Orders History Ledger */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
            <h3 className="font-extrabold text-base text-stone-900 mb-4 font-['Tajawal']">سجل الطلبات والتحاسب المالي</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-bold">
                    <th className="pb-3">رقم الطلب</th>
                    <th className="pb-3">التاريخ</th>
                    <th className="pb-3">قيمة الطلب</th>
                    <th className="pb-3">عمولة المنصة</th>
                    <th className="pb-3">صافي المطعم</th>
                    <th className="pb-3">طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {deliveredOrders.map(o => (
                    <tr key={o.id} className="text-stone-800">
                      <td className="py-3 font-bold text-stone-900">{o.order_number}</td>
                      <td className="py-3 text-stone-500">{new Date(o.created_at).toLocaleDateString('ar-SY')}</td>
                      <td className="py-3">{o.subtotal.toLocaleString()} ل.س</td>
                      <td className="py-3 text-red-600">-{o.platform_commission.toLocaleString()} ل.س</td>
                      <td className="py-3 font-extrabold text-emerald-600">{o.restaurant_net.toLocaleString()} ل.س</td>
                      <td className="py-3">{o.payment_method === 'CASH' ? 'كاش عند الاستلام' : 'شام كاش'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ACCEPT ORDER MODAL */}
      {acceptModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200">
            <h3 className="font-bold text-base text-stone-900 mb-2">قبول الطلب {acceptModalOrder.order_number}</h3>
            <p className="text-xs text-stone-500 mb-4">حدد الوقت المتوقع لتحضير وتجهيز الوجبة للمندوب:</p>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {[15, 25, 40].map(mins => (
                <button
                  key={mins}
                  onClick={() => setPrepTimeInput(mins)}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    prepTimeInput === mins ? 'bg-emerald-600 text-white' : 'bg-stone-100 hover:bg-stone-200'
                  }`}
                >
                  {mins} دقيقة
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAcceptOrder}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                تأكيد القبول
              </button>
              <button
                onClick={() => setAcceptModalOrder(null)}
                className="px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT ORDER MODAL */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-200">
            <h3 className="font-bold text-base text-stone-900 mb-2">الاعتذار عن الطلب {rejectModalOrder.order_number}</h3>
            <p className="text-xs text-stone-500 mb-3">سبب الاعتذار للعميل:</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:outline-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectOrder}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                تأكيد الاعتذار
              </button>
              <button
                onClick={() => setRejectModalOrder(null)}
                className="px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MENU ITEM MODAL */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-stone-900 mb-4">
              {editingItem ? 'تعديل وجبة' : 'إضافة وجبة جديدة للمنيو'}
            </h3>

            <form onSubmit={handleSaveMenuItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">اسم الوجبة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شاورما دجاج عربي دبل"
                  value={itemForm.name_ar}
                  onChange={e => setItemForm({ ...itemForm, name_ar: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف</label>
                <select
                  value={itemForm.category_id}
                  onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">السعر (بالليرة السورية SYP)</label>
                <input
                  type="number"
                  required
                  value={itemForm.price}
                  onChange={e => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الوصف والمكونات</label>
                <textarea
                  rows={2}
                  value={itemForm.description_ar}
                  onChange={e => setItemForm({ ...itemForm, description_ar: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">رابط صورة الوجبة (URL)</label>
                <input
                  type="url"
                  value={itemForm.image_url}
                  onChange={e => setItemForm({ ...itemForm, image_url: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  حفظ الوجبة
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
