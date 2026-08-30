import React, { useState } from 'react';
import { X, User, Store, Bike, ShieldCheck, Lock, Mail, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/index.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, demoLogin, isLoading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  // Form Fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'bicycle' | 'car'>('motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await login(emailOrPhone, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الدخول');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await register({
        email,
        phone,
        password,
        full_name: fullName,
        role: selectedRole,
        restaurant_name: restaurantName,
        vehicle_type: vehicleType,
        vehicle_plate: vehiclePlate,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء الحساب');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-right relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-2xl tracking-tight font-['Tajawal']">منصة وصّلني</span>
          </div>
          <p className="text-amber-100 text-xs">
            {isRegisterMode ? 'انضم كعميل، شريك مطعم، أو كابتن مندوب' : 'سجل الدخول لمتابعة طلباتك أو إدارة أعمالك'}
          </p>
        </div>

        {/* Content & Forms */}
        <div className="p-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium">
              {errorMsg}
            </div>
          )}

          {!isRegisterMode ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني أو رقم الهاتف</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="مثال: +963933123456 أو user@domain.sy"
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:border-amber-500 focus:outline-none transition"
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">كلمة المرور</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm focus:bg-white focus:border-amber-500 focus:outline-none transition"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold py-3 rounded-xl shadow-md transition disabled:opacity-50 text-sm"
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-xs text-amber-600 hover:underline font-bold"
                >
                  ليس لديك حساب؟ أنشئ حساباً جديداً الآن
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">نوع الحساب:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('customer')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      selectedRole === 'customer'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    عميل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('restaurant')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      selectedRole === 'restaurant'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    مطعم
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('driver')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      selectedRole === 'driver'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" />
                    مندوب
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يوسف الأحمد"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {selectedRole === 'restaurant' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المطعم / المنشأة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فلافل وبطاطا الشام"
                    value={restaurantName}
                    onChange={e => setRestaurantName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {selectedRole === 'driver' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">وسيلة التوصيل</label>
                    <select
                      value={vehicleType}
                      onChange={e => setVehicleType(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2 py-2 text-xs focus:outline-none"
                    >
                      <option value="motorcycle">دراجة نارية (موتوسيكل)</option>
                      <option value="bicycle">دراجة هوائية</option>
                      <option value="car">سيارة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">رقم اللوحة</label>
                    <input
                      type="text"
                      placeholder="دمشق 12345"
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    placeholder="user@wassalni.sy"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف (سوري)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+9639xxxxxxxx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-md transition disabled:opacity-50 text-sm mt-2"
              >
                {isLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="text-xs text-amber-600 hover:underline font-bold"
                >
                  لديك حساب بالفعل؟ تسجيل الدخول
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
