import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Store,
  Bike,
  DollarSign,
  MapPin,
  Settings,
  Tag,
  Receipt,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { ApiClient } from '../../lib/api.js';
import { LeafletMap } from '../common/LeafletMap.js';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'map' | 'restaurants' | 'drivers' | 'orders' | 'settings' | 'coupons' | 'ledger' | 'audit'>('kpis');
  
  // Data states
  const [kpis, setKpis] = useState<any>(null);
  const [liveMapData, setLiveMapData] = useState<any>({ activeOrders: [], drivers: [], restaurants: [] });
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [commissionConfig, setCommissionConfig] = useState<any>({
    default_restaurant_commission_pct: 12.0,
    default_service_fee: 2500,
    base_delivery_fee_per_km: 1500,
    min_delivery_fee: 5000,
  });
  const [coupons, setCoupons] = useState<any[]>([]);
  const [financialLedger, setFinancialLedger] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Coupon modal
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 30000,
    max_discount: 15000,
    max_usage_total: 200,
  });

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [
        kpiRes,
        mapRes,
        restRes,
        driverRes,
        orderRes,
        commRes,
        couponRes,
        ledgerRes,
        auditRes,
      ] = await Promise.all([
        ApiClient.getAdminKpis(),
        ApiClient.getAdminLiveMap(),
        ApiClient.getAdminRestaurants(),
        ApiClient.getAdminDrivers(),
        ApiClient.getAdminOrders(),
        ApiClient.getAdminCommissions(),
        ApiClient.getAdminCoupons(),
        ApiClient.getAdminFinancialLedger(),
        ApiClient.getAdminAuditLogs(),
      ]);

      if (kpiRes.success) setKpis(kpiRes.kpis);
      if (mapRes.success) setLiveMapData(mapRes);
      if (restRes.success) setRestaurants(restRes.restaurants);
      if (driverRes.success) setDrivers(driverRes.drivers);
      if (orderRes.success) setOrders(orderRes.orders);
      if (commRes.success && commRes.commissionConfig) setCommissionConfig(commRes.commissionConfig);
      if (couponRes.success) setCoupons(couponRes.coupons);
      if (ledgerRes.success) setFinancialLedger(ledgerRes.transactions);
      if (auditRes.success) setAuditLogs(auditRes.logs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    const interval = setInterval(loadAllAdminData, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveRestaurant = async (id: string, is_approved: boolean, commission_rate?: number) => {
    try {
      await ApiClient.updateAdminRestaurant(id, { is_approved, commission_rate });
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveDriver = async (id: string, is_approved: boolean) => {
    try {
      await ApiClient.updateAdminDriver(id, { is_approved });
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCommissionRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.updateAdminCommissions(commissionConfig);
      alert('تم حفظ وتحديث إعدادات العمولات بنجاح!');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.createAdminCoupon(couponForm);
      setIsAddingCoupon(false);
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await ApiClient.deleteAdminCoupon(id);
      await loadAllAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold font-['Tajawal']">لوحة الإدارة والتحكم المركزية</h1>
              <span className="text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full">
                نسخة تجارية كاملة
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              مراقبة العمليات الحية، إدارة العمولات، اعتماد الشركاء، وسجل المعاملات المالية الموثقة
            </p>
          </div>
        </div>

        <button
          onClick={loadAllAdminData}
          className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'kpis' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>المؤشرات المالية والتشغيلية (KPIs)</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'map' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>الخريطة المباشرة (Live Operations)</span>
        </button>

        <button
          onClick={() => setActiveTab('restaurants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'restaurants' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>المطاعم والعمولات ({restaurants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'drivers' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>المناديب والتوثيق ({drivers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'settings' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>إعدادات العمولات والرسوم</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'coupons' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>كوبونات الخصم ({coupons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'ledger' ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>دفتر الأستاذ المالي ({financialLedger.length})</span>
        </button>
      </div>

      {/* TAB 1: KPIS & METRICS */}
      {activeTab === 'kpis' && kpis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
              <div className="text-xs font-bold text-stone-500 mb-1">إجمالي قيمة الطلبات (GMV)</div>
              <div className="text-2xl font-black text-stone-900 font-['Tajawal']">
                {kpis.grossOrderValue.toLocaleString()} ل.س
              </div>
              <div className="text-[10px] text-stone-400 mt-1">من {kpis.deliveredOrdersCount} طلب مكتمل</div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-purple-200 bg-purple-50/50 shadow-xs">
              <div className="text-xs font-bold text-purple-900 mb-1">صافي أرباح المنصة (عمولات + رسوم)</div>
              <div className="text-2xl font-black text-purple-700 font-['Tajawal']">
                {kpis.platformRevenue.toLocaleString()} ل.س
              </div>
              <div className="text-[10px] text-purple-600 mt-1">دخل المنصة التشغيلي الصافي</div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
              <div className="text-xs font-bold text-stone-500 mb-1">المناديب النشطين المتصلين</div>
              <div className="text-2xl font-black text-sky-600 font-['Tajawal']">
                {kpis.onlineDriversCount} / {kpis.totalDriversCount}
              </div>
              <div className="text-[10px] text-stone-400 mt-1">جاهزون لاستلام وتوصيل الطلبات</div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
              <div className="text-xs font-bold text-stone-500 mb-1">المطاعم المعتمدة النشطة</div>
              <div className="text-2xl font-black text-emerald-600 font-['Tajawal']">
                {kpis.approvedRestaurantsCount} / {kpis.totalRestaurantsCount}
              </div>
              <div className="text-[10px] text-stone-400 mt-1">في محافظات دمشق وحلب وحمص واللاذقية</div>
            </div>
          </div>

          {/* Quick Overview Table */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
            <h3 className="font-extrabold text-base text-stone-900 mb-4 font-['Tajawal']">آخر الطلبات المسجلة على المنصة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-bold">
                    <th className="pb-3">رقم الطلب</th>
                    <th className="pb-3">العميل</th>
                    <th className="pb-3">المطعم</th>
                    <th className="pb-3">القيمة الإجمالية</th>
                    <th className="pb-3">عمولة المنصة</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3">طريقة الدفع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.slice(0, 6).map(o => (
                    <tr key={o.id} className="text-stone-800">
                      <td className="py-3 font-bold text-stone-900">{o.order_number}</td>
                      <td className="py-3">{o.customer_name}</td>
                      <td className="py-3">{o.restaurant_name}</td>
                      <td className="py-3 font-extrabold">{o.total_amount.toLocaleString()} ل.س</td>
                      <td className="py-3 text-purple-700 font-bold">+{o.platform_commission.toLocaleString()} ل.س</td>
                      <td className="py-3">
                        <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3">{o.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MAP OPERATIONS */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-base text-stone-900 font-['Tajawal']">
                  رادار العمليات والتوصيل المباشر (دمشق وسوريا)
                </h3>
                <p className="text-xs text-stone-500">
                  مواقع المطاعم 🏪 والمناديب 🛵 والطلبات الجارية مباشرة
                </p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl">
                  {liveMapData.activeOrders.length} طلبات جارية
                </span>
                <span className="bg-sky-100 text-sky-900 px-2.5 py-1 rounded-xl">
                  {liveMapData.drivers.filter((d: any) => d.is_online).length} كابتن متصل
                </span>
              </div>
            </div>

            <LeafletMap
              center={[33.5138, 36.2765]}
              zoom={13}
              driverLocation={
                liveMapData.drivers.find((d: any) => d.is_online)
                  ? {
                      lat: liveMapData.drivers.find((d: any) => d.is_online).latitude,
                      lng: liveMapData.drivers.find((d: any) => d.is_online).longitude,
                      name: liveMapData.drivers.find((d: any) => d.is_online).name,
                    }
                  : undefined
              }
              restaurantLocation={{
                lat: 33.5138,
                lng: 36.2765,
                name: 'مطاعم دمشق الحية',
              }}
              height="450px"
            />
          </div>
        </div>
      )}

      {/* TAB 3: RESTAURANTS MANAGEMENT */}
      {activeTab === 'restaurants' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <h3 className="font-extrabold text-base text-stone-900 mb-4 font-['Tajawal']">قائمة المطاعم والتحكم بالعمولات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-bold">
                  <th className="pb-3">المطعم</th>
                  <th className="pb-3">المحافظة / الحي</th>
                  <th className="pb-3">التقييم</th>
                  <th className="pb-3">العمولة المخصصة (%)</th>
                  <th className="pb-3">حالة الاعتماد</th>
                  <th className="pb-3">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {restaurants.map(r => (
                  <tr key={r.id} className="text-stone-800">
                    <td className="py-3 font-bold text-stone-900">{r.name_ar}</td>
                    <td className="py-3">{r.city} - {r.district}</td>
                    <td className="py-3">⭐ {r.rating}</td>
                    <td className="py-3 font-bold text-purple-700">{r.commission_rate_percentage}%</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.is_approved ? 'معتمد ومفعل' : 'بانتظار الاعتماد'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleApproveRestaurant(r.id, !r.is_approved)}
                        className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                          r.is_approved
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {r.is_approved ? 'إيقاف مؤقت' : 'اعتماد المطعم'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DRIVERS MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <h3 className="font-extrabold text-base text-stone-900 mb-4 font-['Tajawal']">مناديب التوصيل وتوثيق الرخص</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-bold">
                  <th className="pb-3">اسم المندوب</th>
                  <th className="pb-3">الهاتف</th>
                  <th className="pb-3">المركبة واللوحة</th>
                  <th className="pb-3">التقييم والتوصيلات</th>
                  <th className="pb-3">حالة التوثيق</th>
                  <th className="pb-3">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {drivers.map(d => (
                  <tr key={d.id} className="text-stone-800">
                    <td className="py-3 font-bold text-stone-900">{d.full_name}</td>
                    <td className="py-3">{d.phone}</td>
                    <td className="py-3">{d.vehicle_type} ({d.vehicle_plate})</td>
                    <td className="py-3">⭐ {d.rating} ({d.total_deliveries} رحلة)</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.is_approved ? 'موثق ومعتمد' : 'بانتظار الفحص'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleApproveDriver(d.id, !d.is_approved)}
                        className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                          d.is_approved
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {d.is_approved ? 'تعطيل الحساب' : 'اعتماد وتوثيق'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COMMISSION RATES CONFIGURATOR */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs max-w-2xl">
          <h3 className="font-extrabold text-base text-stone-900 mb-2 font-['Tajawal']">
            إعدادات العمولات والرسوم التشغيلية للمنصة
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            جميع القيم محفوظة في قاعدة البيانات السحابية ويتم احتسابها في الـ Backend لضمان الأمان المالي
          </p>

          <form onSubmit={handleSaveCommissionRates} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                العمولة الافتراضية للمنصة من قيمة وجبات المطعم (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={commissionConfig.default_restaurant_commission_pct}
                onChange={e =>
                  setCommissionConfig({
                    ...commissionConfig,
                    default_restaurant_commission_pct: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                رسوم الخدمة والتشغيل الثابتة لكل طلب (ل.س)
              </label>
              <input
                type="number"
                value={commissionConfig.default_service_fee}
                onChange={e =>
                  setCommissionConfig({
                    ...commissionConfig,
                    default_service_fee: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                الحد الأدنى لرسوم التوصيل (ل.س)
              </label>
              <input
                type="number"
                value={commissionConfig.min_delivery_fee}
                onChange={e =>
                  setCommissionConfig({
                    ...commissionConfig,
                    min_delivery_fee: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                تعرفة التوصيل لكل كيلومتر إضافي (ل.س / كم)
              </label>
              <input
                type="number"
                value={commissionConfig.base_delivery_fee_per_km}
                onChange={e =>
                  setCommissionConfig({
                    ...commissionConfig,
                    base_delivery_fee_per_km: Number(e.target.value),
                  })
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-md transition text-xs"
            >
              حفظ الإعدادات المالية وتطبيقها على جميع الطلبات القادمة
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: COUPONS MANAGER */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-stone-900 font-['Tajawal']">أكواد الخصم الترويجية (Coupons)</h3>
              <p className="text-xs text-stone-500">إنشاء وتتبع كوبونات التسويق للعملاء</p>
            </div>

            <button
              onClick={() => setIsAddingCoupon(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء كود جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map(c => (
              <div key={c.id} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-black text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                      {c.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {c.discount_type === 'percentage' ? `${c.discount_value}% خصم` : `${c.discount_value.toLocaleString()} ل.س`}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-2">
                    الاستخدامات: {c.usage_count} / {c.max_usage_total}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">
                    حد أدنى للطلب: {c.min_order_amount.toLocaleString()} ل.س
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={() => handleDeleteCoupon(c.id)}
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

      {/* TAB 7: FINANCIAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <h3 className="font-extrabold text-base text-stone-900 mb-4 font-['Tajawal']">دفتر الأستاذ المالي (Financial Ledger)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-bold">
                  <th className="pb-3">رقم المعاملة</th>
                  <th className="pb-3">النوع</th>
                  <th className="pb-3">الطرف المستفيد</th>
                  <th className="pb-3">المبلغ</th>
                  <th className="pb-3">الرصيد بعد الحركة</th>
                  <th className="pb-3">الوصف</th>
                  <th className="pb-3">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {financialLedger.map(tx => (
                  <tr key={tx.id} className="text-stone-800">
                    <td className="py-3 font-mono text-stone-500">{tx.id}</td>
                    <td className="py-3 font-bold">{tx.type}</td>
                    <td className="py-3">{tx.entity_type}</td>
                    <td className="py-3 font-extrabold text-emerald-600">+{tx.amount.toLocaleString()} ل.س</td>
                    <td className="py-3 text-stone-600">{tx.balance_after?.toLocaleString()} ل.س</td>
                    <td className="py-3 text-stone-500">{tx.description_ar}</td>
                    <td className="py-3 text-stone-400">{new Date(tx.created_at).toLocaleTimeString('ar-SY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW COUPON MODAL */}
      {isAddingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200">
            <h3 className="font-bold text-base text-stone-900 mb-4">إنشاء كود خصم جديد</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">كود الخصم (Code)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: SHAM20"
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نوع الخصم</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={e => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (ل.س)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">قيمة الخصم</label>
                  <input
                    type="number"
                    required
                    value={couponForm.discount_value}
                    onChange={e => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الحد الأدنى لقيمة الطلب (ل.س)</label>
                <input
                  type="number"
                  value={couponForm.min_order_amount}
                  onChange={e => setCouponForm({ ...couponForm, min_order_amount: Number(e.target.value) })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  إنشاء وتفعيل الكود
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCoupon(false)}
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
