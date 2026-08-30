import React from 'react';
import { Home, UtensilsCrossed, ClipboardList, Bike, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, onOpenAuth }) => {
  const { user, role } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 sm:hidden shadow-lg">
      <div className="flex items-center justify-around">
        {/* Customer tabs */}
        {role === 'customer' && (
          <>
            <button
              onClick={() => onTabChange('home')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                currentTab === 'home' ? 'text-amber-600 font-bold' : 'text-stone-500'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">الرئيسية</span>
            </button>

            <button
              onClick={() => onTabChange('orders')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
                currentTab === 'orders' ? 'text-amber-600 font-bold' : 'text-stone-500'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[10px]">طلباتي</span>
            </button>
          </>
        )}

        {/* Restaurant Tab */}
        {role === 'restaurant' && (
          <button
            onClick={() => onTabChange('restaurant-dash')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              currentTab === 'restaurant-dash' ? 'text-emerald-600 font-bold' : 'text-stone-500'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" />
            <span className="text-[10px]">لوحة المطعم</span>
          </button>
        )}

        {/* Driver Tab */}
        {role === 'driver' && (
          <button
            onClick={() => onTabChange('driver-portal')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              currentTab === 'driver-portal' ? 'text-sky-600 font-bold' : 'text-stone-500'
            }`}
          >
            <Bike className="w-5 h-5" />
            <span className="text-[10px]">تطبيق المندوب</span>
          </button>
        )}

        {/* Admin Tab */}
        {role === 'admin' && (
          <button
            onClick={() => onTabChange('admin-dash')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              currentTab === 'admin-dash' ? 'text-purple-600 font-bold' : 'text-stone-500'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px]">لوحة الإدارة</span>
          </button>
        )}

        {/* User Account / Profile */}
        <button
          onClick={user ? () => onTabChange(role === 'customer' ? 'orders' : 'home') : onOpenAuth}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-stone-500 hover:text-stone-900 transition"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{user ? 'حسابي' : 'دخول'}</span>
        </button>
      </div>
    </nav>
  );
};
