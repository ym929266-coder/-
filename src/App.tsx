import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { Header } from './components/common/Header.js';
import { BottomNav } from './components/common/BottomNav.js';
import { CustomerView } from './components/customer/CustomerView.js';
import { RestaurantDashboard } from './components/restaurant/RestaurantDashboard.js';
import { DriverPortal } from './components/driver/DriverPortal.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { SupportModal } from './components/support/SupportModal.js';

const MainApp: React.FC = () => {
  const { role } = useAuth();
  const [selectedCity, setSelectedCity] = useState('دمشق');
  const [selectedDistrict, setSelectedDistrict] = useState('كفرسوسة');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('home');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Sync tab with role changes
  React.useEffect(() => {
    if (role === 'customer' && !['home', 'orders'].includes(currentTab)) {
      setCurrentTab('home');
    } else if (role === 'restaurant') {
      setCurrentTab('restaurant-dash');
    } else if (role === 'driver') {
      setCurrentTab('driver-portal');
    } else if (role === 'admin') {
      setCurrentTab('admin-dash');
    }
  }, [role]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-['Tajawal',sans-serif]">
      {/* Universal Header */}
      <Header
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={setSelectedDistrict}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* Main Content Router based on Active Role & Tab */}
      <main className="flex-1">
        {role === 'customer' && (
          <CustomerView
            selectedCity={selectedCity}
            selectedDistrict={selectedDistrict}
            searchTerm={searchTerm}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {role === 'restaurant' && <RestaurantDashboard />}

        {role === 'driver' && <DriverPortal />}

        {role === 'admin' && <AdminDashboard />}
      </main>

      {/* Mobile Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
