import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Bell,
  MapPin,
  ChevronDown,
  User as UserIcon,
  Store,
  Bike,
  ShieldCheck,
  LogOut,
  Sparkles,
  Search,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { ApiClient } from '../../lib/api.js';
import { AppNotification, UserRole } from '../../types/index.js';

interface HeaderProps {
  onOpenAuth: () => void;
  onOpenSupport: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onOpenSupport,
  selectedCity,
  onSelectCity,
  selectedDistrict,
  onSelectDistrict,
  searchTerm,
  onSearchChange,
  currentTab,
  onTabChange,
}) => {
  const { user, role, demoLogin, logout } = useAuth();
  const { items, setIsCartOpen } = useCart();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const totalCartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const CITIES_DATA: Record<string, string[]> = {
    'دمشق': ['كفرسوسة', 'المزة', 'الشعلان', 'أبو رمانة', 'القصاع', 'الميدان', 'المزرعة', 'باب توما', 'المالكي', 'دمر'],
    'حلب': ['الفرقان', 'الشهباء', 'الجميلية', 'السليمانية', 'الموغامبو', 'حلب الجديدة'],
    'حمص': ['الحمرا', 'الإنشاءات', 'الدبلان', 'عكرمة', 'الغوطة', 'الوعر'],
    'اللاذقية': ['الصليبة', 'الزراعة', 'مشروع الصليبة', 'الأمريكان', 'الشاطئ الأزرق'],
    'طرطوس': ['الكورنيش البحري', 'الحمرات', 'الرادار', 'المينا', 'الإنشاءات'],
  };

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const res = await ApiClient.getNotifications();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await ApiClient.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Top Bar: Market Info, Location, Active Role Badge */}
      <div className="bg-stone-900 text-stone-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Market & Location Selector */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-stone-300">السوق السوري (SYP)</span>
            <span className="text-stone-600">|</span>
            <div className="relative">
              <button
                id="city-district-selector-btn"
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedCity} - {selectedDistrict}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showCityDropdown && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white text-stone-800 rounded-xl shadow-xl border border-stone-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="font-bold text-xs text-stone-500 mb-2">اختر المحافظة:</div>
                  <div className="grid grid-cols-3 gap-1 mb-3">
                    {Object.keys(CITIES_DATA).map(city => (
                      <button
                        key={city}
                        onClick={() => {
                          onSelectCity(city);
                          onSelectDistrict(CITIES_DATA[city][0]);
                        }}
                        className={`text-xs py-1 px-2 rounded-lg font-medium transition ${
                          selectedCity === city ? 'bg-amber-500 text-white font-bold' : 'bg-stone-100 hover:bg-stone-200'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                  <div className="font-bold text-xs text-stone-500 mb-1.5">اختر الحي / المنطقة:</div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {CITIES_DATA[selectedCity]?.map(dist => (
                      <button
                        key={dist}
                        onClick={() => {
                          onSelectDistrict(dist);
                          setShowCityDropdown(false);
                        }}
                        className={`w-full text-right text-xs py-1.5 px-2 rounded-md transition ${
                          selectedDistrict === dist ? 'bg-amber-50 text-amber-700 font-bold' : 'hover:bg-stone-50'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Authenticated Role Badge */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5">
                <span className="text-stone-400 text-[11px]">الواجهة النشطة:</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                  role === 'customer' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                  role === 'restaurant' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  role === 'driver' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' :
                  'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                }`}>
                  {role === 'customer' && <UserIcon className="w-3 h-3" />}
                  {role === 'restaurant' && <Store className="w-3 h-3" />}
                  {role === 'driver' && <Bike className="w-3 h-3" />}
                  {role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                  <span>
                    {role === 'customer' ? 'تطبيق العميل' : role === 'restaurant' ? 'لوحة المطعم' : role === 'driver' ? 'بوابة المندوب' : 'لوحة الإدارة المركزية'}
                  </span>
                </span>
              </div>
            ) : (
              <span className="text-stone-400 text-[11px]">نظام وصّلني الموحّد للتوصيل</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange(role === 'customer' ? 'home' : role === 'restaurant' ? 'restaurant-dash' : role === 'driver' ? 'driver-portal' : 'admin-dash')}
              className="flex items-center gap-2.5 group text-right cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Bike className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-2xl tracking-tight text-stone-900 font-['Tajawal']">وصّلني</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">سوري</span>
                </div>
                <p className="text-[10px] text-stone-500 hidden sm:block">طعامك المفضل يوصلك سخن وطازة</p>
              </div>
            </button>
          </div>

          {/* Search bar (for Customer view) */}
          {role === 'customer' && (
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن وجبة، شاورما، مشاوي، برغر، أو مطعم..."
                  value={searchTerm}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full bg-stone-100 text-stone-900 text-sm rounded-xl pr-10 pl-4 py-2 border border-transparent focus:border-amber-400 focus:bg-white focus:outline-none transition"
                />
                <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Actions: Support, Notifications, Cart, Profile */}
          <div className="flex items-center gap-2">
            {/* Support Ticket Button */}
            <button
              id="support-ticket-btn"
              onClick={onOpenSupport}
              className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 transition relative"
              title="مركز الدعم والمساعدة"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                id="notifications-popover-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 transition relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-2">
                    <span className="font-bold text-stone-900 text-sm">الإشعارات ({notifications.length})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-amber-600 hover:underline font-medium"
                      >
                        تعيين الكل كمقروء
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-stone-400 py-6">لا توجد إشعارات جديدة</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs transition ${
                            n.is_read ? 'bg-stone-50' : 'bg-amber-50/80 border border-amber-200/50'
                          }`}
                        >
                          <div className="font-bold text-stone-900 mb-1">{n.title_ar}</div>
                          <p className="text-stone-600 leading-relaxed">{n.body_ar}</p>
                          <div className="text-[10px] text-stone-400 mt-1.5">
                            {new Date(n.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Button (Customer role) */}
            {role === 'customer' && (
              <button
                id="cart-drawer-trigger-btn"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3.5 py-2 rounded-xl font-bold shadow-md shadow-orange-500/20 active:scale-95 transition"
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-stone-900 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {totalCartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs hidden sm:inline">السلة</span>
              </button>
            )}

            {/* User Profile / Login */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden lg:block">
                  <div className="font-bold text-xs text-stone-900 leading-tight">{user.full_name}</div>
                  <div className="text-[10px] text-stone-500">
                    {role === 'customer' ? 'عميل' : role === 'restaurant' ? 'شريك مطعم' : role === 'driver' ? 'كابتن مندوب' : 'مدير النظام'}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
