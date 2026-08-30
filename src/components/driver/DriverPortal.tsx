import React, { useState, useEffect } from 'react';
import {
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Navigation,
  Clock,
  AlertTriangle,
  UploadCloud,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ApiClient } from '../../lib/api.js';
import { DriverProfile, Order } from '../../types/index.js';
import { LeafletMap } from '../common/LeafletMap.js';

export const DriverPortal: React.FC = () => {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalEarned: 0, totalDeliveries: 0, rating: 5, earningsHistory: [] });
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Active step in the delivery process (1: Heading to restaurant, 2: Picking up, 3: Heading to customer, 4: Delivered)
  const [simulatedGpsStep, setSimulatedGpsStep] = useState(0);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      const [meRes, offersRes] = await Promise.all([
        ApiClient.getDriverMe(),
        ApiClient.getDriverOffers(),
      ]);

      if (meRes.success) {
        setDriver(meRes.driver);
        setActiveOrder(meRes.activeOrder);
        setStats(meRes.stats);
      }

      if (offersRes.success && offersRes.offers) {
        setOffers(offersRes.offers);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
    const interval = setInterval(loadDriverData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOnline = async () => {
    if (!driver) return;
    setIsUpdatingStatus(true);
    try {
      const res = await ApiClient.updateDriverStatus({
        is_online: !driver.is_online,
        latitude: driver.current_latitude,
        longitude: driver.current_longitude,
      });
      if (res.success && res.driver) {
        setDriver(res.driver);
      }
    } catch (err: any) {
      alert(err.message || 'فشل تحديث الحالة');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRespondToOffer = async (assignmentId: string, action: 'accept' | 'decline') => {
    try {
      const res = await ApiClient.respondToOffer(assignmentId, action);
      if (res.success) {
        await loadDriverData();
      }
    } catch (err: any) {
      alert(err.message || 'فشل الرد على العرض');
    }
  };

  const handlePickup = async () => {
    if (!activeOrder) return;
    try {
      await ApiClient.pickupOrder(activeOrder.id);
      await loadDriverData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeliver = async () => {
    if (!activeOrder) return;
    try {
      const res = await ApiClient.deliverOrder(activeOrder.id);
      if (res.success) {
        alert('🎉 تم تسليم الطلب بنجاح وإيداع أتعاب التوصيل في محفظتك!');
        await loadDriverData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Simulate moving GPS towards customer for live demo
  const handleSimulateGPSMove = async () => {
    if (!activeOrder) return;
    const destLat = activeOrder.delivery_latitude;
    const destLng = activeOrder.delivery_longitude;
    const currLat = driver?.current_latitude || 33.5138;
    const currLng = driver?.current_longitude || 36.2765;

    const nextLat = currLat + (destLat - currLat) * 0.4;
    const nextLng = currLng + (destLng - currLng) * 0.4;

    try {
      await ApiClient.updateDriverLocation(activeOrder.id, nextLat, nextLng);
      setSimulatedGpsStep(prev => prev + 1);
      await loadDriverData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Driver Status Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-stone-200 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white text-2xl shadow-md shadow-sky-600/20">
            <Bike className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-stone-900 font-['Tajawal']">
                الكابتن: {driver?.full_name || user?.full_name}
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                ⭐ {driver?.rating || 5.0} ({driver?.total_deliveries || 0} توصيلة)
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              مركبة: {driver?.vehicle_type === 'motorcycle' ? 'دراجة نارية' : 'سيارة'} • لوحة: {driver?.vehicle_plate} • {driver?.city}
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle */}
        <button
          onClick={handleToggleOnline}
          disabled={isUpdatingStatus}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs transition shadow-md ${
            driver?.is_online
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 animate-pulse'
              : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
          <span>{driver?.is_online ? 'أنت متصل (جاهز لاستقبال الطلبات)' : 'غير متصل (اضغط لتفعيل الاستقبال)'}</span>
        </button>
      </div>

      {/* Driver Stats Overview Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="text-[10px] text-stone-500 font-bold">أرباح اليوم والمحفظة</div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 font-['Tajawal'] mt-0.5">
            {stats.totalEarned.toLocaleString()} ل.س
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="text-[10px] text-stone-500 font-bold">الرحلات المكتملة</div>
          <div className="text-lg sm:text-xl font-black text-stone-900 font-['Tajawal'] mt-0.5">
            {stats.totalDeliveries}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="text-[10px] text-stone-500 font-bold">حالة التوثيق</div>
          <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>معتمد ونشط</span>
          </div>
        </div>
      </div>

      {/* 1. INCOMING DELIVERY RADAR OFFERS */}
      {offers.length > 0 && !activeOrder && (
        <div className="mb-6 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-sky-500 animate-ping" />
            <h2 className="font-extrabold text-stone-900 text-base font-['Tajawal']">
              عرض توصيل جديد وارد على الرادار! 🚨 ({offers.length})
            </h2>
          </div>

          <div className="space-y-4">
            {offers.map(off => (
              <div
                key={off.assignment_id}
                className="bg-white rounded-3xl p-5 shadow-xl border-2 border-sky-400 relative overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100 mb-3">
                  <div>
                    <span className="font-extrabold text-stone-900 text-base">{off.order.order_number}</span>
                    <div className="text-xs text-stone-500">
                      مطعم: <span className="font-bold text-stone-800">{off.order.restaurant_name}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-stone-400">أتعاب التوصيل لكاش المندوب:</div>
                    <div className="text-base font-black text-emerald-600">
                      +{off.order.driver_earning.toLocaleString()} ل.س
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-stone-700 mb-4 bg-stone-50 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span>
                      نقطة الاستلام (المطعم): {off.order.restaurant_name} ({off.order.delivery_address.district})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                    <span>
                      وجهة التسليم (العميل): {off.order.delivery_address.district} - {off.order.delivery_address.street_details}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-500 pt-1 border-t border-stone-200">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span>
                      المبلغ المطلوب تحصيله نقداً من العميل:{' '}
                      <span className="font-bold text-stone-900">{off.order.total_amount.toLocaleString()} ل.س</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRespondToOffer(off.assignment_id, 'accept')}
                    className="bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold py-3 rounded-xl shadow-md transition text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>قبول واستلام الطلب 🚀</span>
                  </button>

                  <button
                    onClick={() => handleRespondToOffer(off.assignment_id, 'decline')}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl transition text-xs"
                  >
                    رفض العرض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ACTIVE DELIVERY MISSION WORKFLOW */}
      {activeOrder ? (
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-emerald-400 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-stone-100 mb-4">
            <div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                مهمة التوصيل الحالية
              </span>
              <h2 className="text-lg font-black text-stone-900 font-['Tajawal'] mt-1">
                {activeOrder.order_number} • {activeOrder.restaurant_name}
              </h2>
            </div>

            <div className="text-right">
              <div className="text-xs text-stone-400">المبلغ المطلوب تحصيله كاش:</div>
              <div className="text-base font-black text-emerald-600">{activeOrder.total_amount.toLocaleString()} ل.س</div>
            </div>
          </div>

          {/* Interactive Route Map */}
          <div className="mb-4">
            <LeafletMap
              center={[activeOrder.restaurant_latitude || 33.5138, activeOrder.restaurant_longitude || 36.2765]}
              restaurantLocation={{
                lat: activeOrder.restaurant_latitude,
                lng: activeOrder.restaurant_longitude,
                name: activeOrder.restaurant_name,
              }}
              customerLocation={{
                lat: activeOrder.delivery_latitude,
                lng: activeOrder.delivery_longitude,
                address: `${activeOrder.delivery_address.city} - ${activeOrder.delivery_address.district}`,
              }}
              driverLocation={
                driver
                  ? {
                      lat: driver.current_latitude,
                      lng: driver.current_longitude,
                      name: driver.full_name,
                    }
                  : undefined
              }
              height="260px"
            />
          </div>

          {/* Customer & Restaurant Contact info */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div className="text-[10px] font-bold text-stone-500 mb-1">المطعم:</div>
              <div className="font-bold text-xs text-stone-900 truncate">{activeOrder.restaurant_name}</div>
              <a
                href={`tel:${activeOrder.restaurant_phone}`}
                className="mt-2 text-emerald-600 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال بالمطعم</span>
              </a>
            </div>

            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div className="text-[10px] font-bold text-stone-500 mb-1">العميل:</div>
              <div className="font-bold text-xs text-stone-900 truncate">{activeOrder.customer_name}</div>
              <a
                href={`tel:${activeOrder.customer_phone}`}
                className="mt-2 text-sky-600 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال بالعميل</span>
              </a>
            </div>
          </div>

          {/* Delivery Workflow Action Buttons */}
          <div className="space-y-2">
            {['driver_assigned', 'ready'].includes(activeOrder.status) && (
              <button
                onClick={handlePickup}
                className="w-full bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-bold py-3.5 rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>وصلت للمطعم واستلمت الوجبة (الانطلاق للعميل 🛵)</span>
              </button>
            )}

            {['picked_up', 'on_the_way'].includes(activeOrder.status) && (
              <div className="space-y-2">
                <button
                  onClick={handleSimulateGPSMove}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-2 rounded-xl text-xs transition border border-stone-300 flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-600" />
                  <span>تحديث موقع GPS باتجاه العميل (محاكاة الحركة المباشرة)</span>
                </button>

                <button
                  onClick={handleDeliver}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3.5 rounded-2xl shadow-lg transition text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد استلام المبلغ نقداً ({activeOrder.total_amount.toLocaleString()} ل.س) وتسليم الوجبة ✅</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        !offers.length && (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 text-stone-400">
            <Bike className="w-12 h-12 mx-auto mb-2 opacity-30 text-sky-500" />
            <h3 className="font-bold text-stone-800 text-sm">الرادار جاهز لاستقبال الطلبات القريبة</h3>
            <p className="text-xs text-stone-400 mt-1">
              أنت متصل بالشبكة، بمجرد تجهيز مطعم لوجبة قريبة سيصلك إشعار فوري
            </p>
          </div>
        )
      )}
    </div>
  );
};
