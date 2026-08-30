import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { OrderStateMachine } from '../services/orderStateMachine.js';
import { Coupon, DeliveryZone } from '../types/index.js';

const router = Router();

// All routes require Admin role
router.use(authenticate, requireRole(['admin']));

// 1. Dashboard KPI Metrics
router.get('/kpis', (req, res) => {
  const orders = db.orders;
  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  const grossOrderValue = deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const platformRevenue = deliveredOrders.reduce((sum, o) => sum + o.platform_commission + o.service_fee, 0);
  const totalRestaurantPayouts = deliveredOrders.reduce((sum, o) => sum + o.restaurant_net, 0);
  const totalDriverPayouts = deliveredOrders.reduce((sum, o) => sum + o.driver_earning, 0);

  const activeOrdersCount = orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length;
  const onlineDriversCount = db.drivers.filter(d => d.is_online).length;
  const approvedRestaurantsCount = db.restaurants.filter(r => r.is_approved && r.is_active).length;

  return res.json({
    success: true,
    kpis: {
      grossOrderValue,
      platformRevenue,
      totalRestaurantPayouts,
      totalDriverPayouts,
      totalOrdersCount: orders.length,
      deliveredOrdersCount: deliveredOrders.length,
      activeOrdersCount,
      onlineDriversCount,
      totalDriversCount: db.drivers.length,
      approvedRestaurantsCount,
      totalRestaurantsCount: db.restaurants.length,
      totalCustomersCount: db.users.filter(u => u.role === 'customer').length,
    },
  });
});

// 2. Live Map Operations Feed
router.get('/live-map', (req, res) => {
  const activeOrders = db.orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status));
  const drivers = db.drivers.map(d => ({
    id: d.id,
    name: d.full_name,
    phone: d.phone,
    vehicle: d.vehicle_type,
    plate: d.vehicle_plate,
    status: d.status,
    is_online: d.is_online,
    latitude: d.current_latitude,
    longitude: d.current_longitude,
    active_order_id: d.active_order_id,
  }));

  const restaurants = db.restaurants.map(r => ({
    id: r.id,
    name: r.name_ar,
    city: r.city,
    district: r.district,
    latitude: r.latitude,
    longitude: r.longitude,
    is_open: r.is_open,
    is_busy: r.is_busy,
  }));

  return res.json({
    success: true,
    activeOrders,
    drivers,
    restaurants,
  });
});

// 3. Restaurants Management
router.get('/restaurants', (req, res) => {
  return res.json({
    success: true,
    restaurants: db.restaurants,
  });
});

// Create new Restaurant
router.post('/restaurants', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const {
    name_ar,
    name_en,
    description_ar,
    logo_url,
    banner_url,
    category_id,
    phone,
    city,
    district,
    address_text,
    latitude,
    longitude,
    opening_time,
    closing_time,
    status,
    min_order_amount,
    base_delivery_fee,
    prep_time_minutes,
    commission_rate_percentage,
    is_approved,
    is_active,
  } = req.body;

  if (!name_ar || !category_id) {
    return res.status(400).json({ success: false, message: 'اسم المطعم والتصنيف حقول مطلوبة' });
  }

  const category = db.restaurant_categories.find(c => c.id === category_id);
  const restStatus = status || 'OPEN';

  const newRestaurant = {
    id: `rest-${Date.now()}`,
    owner_user_id: user.id,
    name_ar,
    name_en: name_en || name_ar,
    description_ar: description_ar || '',
    logo_url: logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60',
    banner_url: banner_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=60',
    phone: phone || '+963911000000',
    category_id,
    category_name: category ? category.name_ar : 'وجبات سريعة',
    city: city || 'دمشق',
    district: district || 'وسط المدينة',
    latitude: typeof latitude === 'number' ? latitude : 33.5138,
    longitude: typeof longitude === 'number' ? longitude : 36.2765,
    address_text: address_text || `${city || 'دمشق'} - ${district || 'وسط المدينة'}`,
    opening_time: opening_time || '10:00',
    closing_time: closing_time || '23:30',
    status: restStatus,
    is_open: restStatus === 'OPEN',
    is_busy: restStatus === 'BUSY',
    is_approved: is_approved !== undefined ? !!is_approved : true,
    is_active: is_active !== undefined ? !!is_active : true,
    min_order_amount: Number(min_order_amount) || 25000,
    base_delivery_fee: Number(base_delivery_fee) || 6000,
    prep_time_minutes: Number(prep_time_minutes) || 25,
    rating: 5.0,
    rating_count: 1,
    commission_rate_percentage: Number(commission_rate_percentage) || 12,
    created_at: new Date().toISOString(),
  };

  db.restaurants.push(newRestaurant);

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'RESTAURANT_CREATED_BY_ADMIN',
    entity_type: 'RESTAURANT',
    entity_id: newRestaurant.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    new_values: newRestaurant,
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.status(201).json({
    success: true,
    message: 'تم إضافة المطعم بنجاح',
    restaurant: newRestaurant,
  });
});

// Update Restaurant (Admin full update)
router.put('/restaurants/:id', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const restaurant = db.restaurants.find(r => r.id === id);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const oldValues = { ...restaurant };
  const b = req.body;

  if (b.name_ar) restaurant.name_ar = b.name_ar;
  if (b.name_en) restaurant.name_en = b.name_en;
  if (b.description_ar !== undefined) restaurant.description_ar = b.description_ar;
  if (b.logo_url) restaurant.logo_url = b.logo_url;
  if (b.banner_url) restaurant.banner_url = b.banner_url;
  if (b.category_id) {
    restaurant.category_id = b.category_id;
    const category = db.restaurant_categories.find(c => c.id === b.category_id);
    if (category) restaurant.category_name = category.name_ar;
  }
  if (b.phone) restaurant.phone = b.phone;
  if (b.city) restaurant.city = b.city;
  if (b.district) restaurant.district = b.district;
  if (b.address_text) restaurant.address_text = b.address_text;
  if (typeof b.latitude === 'number') restaurant.latitude = b.latitude;
  if (typeof b.longitude === 'number') restaurant.longitude = b.longitude;
  if (b.opening_time) restaurant.opening_time = b.opening_time;
  if (b.closing_time) restaurant.closing_time = b.closing_time;
  if (b.min_order_amount !== undefined) restaurant.min_order_amount = Number(b.min_order_amount);
  if (b.base_delivery_fee !== undefined) restaurant.base_delivery_fee = Number(b.base_delivery_fee);
  if (b.prep_time_minutes !== undefined) restaurant.prep_time_minutes = Number(b.prep_time_minutes);
  if (b.commission_rate_percentage !== undefined) restaurant.commission_rate_percentage = Number(b.commission_rate_percentage);
  if (b.is_approved !== undefined) restaurant.is_approved = !!b.is_approved;
  if (b.is_active !== undefined) restaurant.is_active = !!b.is_active;

  if (b.status) {
    restaurant.status = b.status;
    restaurant.is_open = b.status === 'OPEN';
    restaurant.is_busy = b.status === 'BUSY';
    if (b.status === 'SUSPENDED') {
      restaurant.is_active = false;
    }
  }

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'RESTAURANT_DETAILS_UPDATED',
    entity_type: 'RESTAURANT',
    entity_id: restaurant.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    old_values: oldValues,
    new_values: b,
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: 'تم تحديث بيانات المطعم بنجاح',
    restaurant,
  });
});

// Toggle suspend status
router.put('/restaurants/:id/suspend', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const restaurant = db.restaurants.find(r => r.id === id);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const isSuspended = restaurant.status === 'SUSPENDED';
  restaurant.status = isSuspended ? 'OPEN' : 'SUSPENDED';
  restaurant.is_open = !isSuspended;
  restaurant.is_active = !isSuspended;

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: isSuspended ? 'RESTAURANT_UNSUSPENDED' : 'RESTAURANT_SUSPENDED',
    entity_type: 'RESTAURANT',
    entity_id: restaurant.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    new_values: { status: restaurant.status },
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: isSuspended ? 'تم إلغاء إيقاف المطعم وتفعيله' : 'تم إيقاف المطعم (تعليق الحساب)',
    restaurant,
  });
});

// Delete Restaurant
router.delete('/restaurants/:id', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const index = db.restaurants.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const deletedRest = db.restaurants.splice(index, 1)[0];

  // Also remove associated menu categories and menu items
  const cats = db.menu_categories.filter(c => c.restaurant_id === id);
  cats.forEach(c => {
    const cIdx = db.menu_categories.indexOf(c);
    if (cIdx !== -1) db.menu_categories.splice(cIdx, 1);
  });

  const items = db.menu_items.filter(m => m.restaurant_id === id);
  items.forEach(m => {
    const mIdx = db.menu_items.indexOf(m);
    if (mIdx !== -1) db.menu_items.splice(mIdx, 1);
  });

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'RESTAURANT_DELETED',
    entity_type: 'RESTAURANT',
    entity_id: deletedRest.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    old_values: deletedRest,
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: 'تم حذف المطعم وجميع أصنافه بنجاح',
  });
});

router.put('/restaurants/:id/approve', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { is_approved, is_active, commission_rate } = req.body;

  const restaurant = db.restaurants.find(r => r.id === id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const oldValues = { ...restaurant };

  if (typeof is_approved === 'boolean') restaurant.is_approved = is_approved;
  if (typeof is_active === 'boolean') restaurant.is_active = is_active;
  if (typeof commission_rate === 'number') restaurant.commission_rate_percentage = commission_rate;

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'RESTAURANT_UPDATED_BY_ADMIN',
    entity_type: 'RESTAURANT',
    entity_id: restaurant.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    old_values: oldValues,
    new_values: { is_approved, is_active, commission_rate },
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: 'تم تحديث بيانات المطعم والعمولة بنجاح',
    restaurant,
  });
});

// 4. Drivers Management
router.get('/drivers', (req, res) => {
  return res.json({
    success: true,
    drivers: db.drivers,
  });
});

router.put('/drivers/:id/approve', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { is_approved, status } = req.body;

  const driver = db.drivers.find(d => d.id === id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
  }

  if (typeof is_approved === 'boolean') {
    driver.is_approved = is_approved;
    if (driver.documents) {
      driver.documents.forEach(doc => {
        doc.status = is_approved ? 'verified' : 'rejected';
        doc.verified_at = new Date().toISOString();
      });
    }
  }

  if (status) driver.status = status;

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'DRIVER_STATUS_UPDATED',
    entity_type: 'DRIVER',
    entity_id: driver.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    new_values: { is_approved, status },
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: 'تم تحديث حالة اعتماد المندوب بنجاح',
    driver,
  });
});

// 5. Global Commission & Rates Configuration
router.get('/commissions', (req, res) => {
  return res.json({
    success: true,
    commissionConfig: db.commissions[0],
  });
});

router.put('/commissions', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { default_restaurant_commission_pct, default_service_fee, base_delivery_fee_per_km, min_delivery_fee } = req.body;

  let config = db.commissions[0];
  if (!config) {
    config = {
      id: 'comm-1',
      name: 'الإعدادات المالية للمنصة',
      default_restaurant_commission_pct: 12.0,
      default_service_fee: 2500,
      base_delivery_fee_per_km: 1500,
      min_delivery_fee: 5000,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    db.commissions.push(config);
  }

  const oldValues = { ...config };

  if (typeof default_restaurant_commission_pct === 'number') config.default_restaurant_commission_pct = default_restaurant_commission_pct;
  if (typeof default_service_fee === 'number') config.default_service_fee = default_service_fee;
  if (typeof base_delivery_fee_per_km === 'number') config.base_delivery_fee_per_km = base_delivery_fee_per_km;
  if (typeof min_delivery_fee === 'number') config.min_delivery_fee = min_delivery_fee;
  config.updated_at = new Date().toISOString();
  config.updated_by = user.id;

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'GLOBAL_COMMISSION_RATES_UPDATED',
    entity_type: 'COMMISSION_CONFIG',
    entity_id: config.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    old_values: oldValues,
    new_values: config,
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: 'تم حفظ الإعدادات المالية والعمولات بنجاح',
    config,
  });
});

// 6. Delivery Zones
router.get('/zones', (req, res) => {
  return res.json({
    success: true,
    zones: db.delivery_zones,
  });
});

router.post('/zones', (req, res) => {
  const { city, name_ar, base_fee, min_order, center_lat, center_lng } = req.body;
  const newZone: DeliveryZone = {
    id: `zone-${Date.now()}`,
    city: city || 'دمشق',
    name_ar,
    base_fee: Number(base_fee) || 5000,
    min_order: Number(min_order) || 30000,
    is_active: true,
    center_lat: Number(center_lat) || 33.5138,
    center_lng: Number(center_lng) || 36.2765,
  };
  db.delivery_zones.push(newZone);
  db.save();
  return res.status(201).json({ success: true, zone: newZone });
});

// 7. Coupons Management
router.get('/coupons', (req, res) => {
  return res.json({
    success: true,
    coupons: db.coupons,
  });
});

router.post('/coupons', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { code, discount_type, discount_value, min_order_amount, max_discount, start_date, end_date, max_usage_total } = req.body;

  if (!code || !discount_value) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال كود الكوبون وقيمة الخصم' });
  }

  const newCoupon: Coupon = {
    id: `coup-${Date.now()}`,
    code: String(code).toUpperCase().trim(),
    discount_type: discount_type === 'fixed' ? 'fixed' : 'percentage',
    discount_value: Number(discount_value),
    min_order_amount: Number(min_order_amount) || 0,
    max_discount: max_discount ? Number(max_discount) : undefined,
    start_date: start_date || new Date().toISOString(),
    end_date: end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    max_usage_total: Number(max_usage_total) || 500,
    usage_count: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  db.coupons.push(newCoupon);

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'COUPON_CREATED',
    entity_type: 'COUPON',
    entity_id: newCoupon.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    new_values: newCoupon,
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.status(201).json({
    success: true,
    message: 'تم إنشاء كود الخصم بنجاح',
    coupon: newCoupon,
  });
});

router.delete('/coupons/:id', (req, res) => {
  const { id } = req.params;
  const index = db.coupons.findIndex(c => c.id === id);
  if (index !== -1) {
    db.coupons.splice(index, 1);
    db.save();
  }
  return res.json({ success: true, message: 'تم حذف الكود' });
});

// 8. Financial Ledger Records
router.get('/financial-ledger', (req, res) => {
  const txns = [...db.financial_transactions].reverse();
  return res.json({
    success: true,
    count: txns.length,
    transactions: txns,
  });
});

// 9. Audit Logs
router.get('/audit-logs', (req, res) => {
  const logs = [...db.audit_logs].reverse();
  return res.json({
    success: true,
    logs,
  });
});

// 10. All Orders (Admin oversight)
router.get('/orders', (req, res) => {
  const orders = [...db.orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return res.json({
    success: true,
    count: orders.length,
    orders,
  });
});

// 11. Cash Collection & Driver Reconciliation Dashboard
router.get('/cash-collections', (req, res) => {
  const cashOrders = db.orders.filter(
    o => o.payment_method === 'CASH' && o.status === 'delivered'
  );

  // Group cash in hand by driver
  const driverCashHoldings = db.drivers.map(driver => {
    const driverDeliveredCashOrders = cashOrders.filter(o => o.driver_id === driver.id);
    const totalCashCollected = driverDeliveredCashOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const driverEarnings = driverDeliveredCashOrders.reduce((sum, o) => sum + o.driver_earning, 0);
    const netCashOwedToPlatform = totalCashCollected - driverEarnings;

    return {
      driver_id: driver.id,
      driver_name: driver.full_name,
      driver_phone: driver.phone,
      total_orders_count: driverDeliveredCashOrders.length,
      total_cash_collected: totalCashCollected,
      driver_earnings: driverEarnings,
      net_cash_owed_to_platform: Math.max(0, netCashOwedToPlatform),
      unsettled_orders: driverDeliveredCashOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        total_amount: o.total_amount,
        driver_earning: o.driver_earning,
        delivered_at: o.delivered_at,
      })),
    };
  });

  return res.json({
    success: true,
    totalCashCirculating: cashOrders.reduce((sum, o) => sum + o.total_amount, 0),
    driverCashHoldings,
  });
});

// 12. Settlements & Payouts Processing
router.get('/settlements', (req, res) => {
  return res.json({
    success: true,
    settlements: [...db.settlements].reverse(),
  });
});

// Create/Execute Settlement
router.post('/settlements', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { entity_type, entity_id, amount, order_ids, notes, payout_reference } = req.body;

  if (!entity_type || !entity_id || !amount) {
    return res.status(400).json({ success: false, message: 'بيانات التسوية غير مكتملة' });
  }

  let entityName = '';
  if (entity_type === 'restaurant') {
    const r = db.restaurants.find(item => item.id === entity_id);
    entityName = r ? r.name_ar : 'مطعم';
  } else {
    const d = db.drivers.find(item => item.id === entity_id);
    entityName = d ? d.full_name : 'كابتن';
  }

  const newSettlement = {
    id: `stl-${Date.now()}`,
    settlement_number: `SET-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    entity_type,
    entity_id,
    entity_name: entityName,
    amount: Number(amount),
    status: 'PAID' as const,
    period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    order_ids: order_ids || [],
    notes: notes || 'تم تحويل المستحقات وتسوية الحساب المالي',
    processed_by_admin_id: user.id,
    processed_at: new Date().toISOString(),
    payout_reference: payout_reference || `TXN-SYP-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.settlements.push(newSettlement);

  // Financial Transaction
  db.financial_transactions.push({
    id: `txn-stl-${Date.now()}`,
    transaction_number: `TXN-${Date.now()}`,
    order_id: (order_ids && order_ids[0]) || 'SETTLEMENT',
    entity_type: entity_type === 'restaurant' ? 'restaurant' : 'driver',
    entity_id,
    entity_name: entityName,
    amount: Number(amount),
    direction: 'credit',
    transaction_type: entity_type === 'restaurant' ? 'restaurant_payout' : 'driver_payout',
    balance_after: 0,
    status: 'completed',
    notes: `تسوية مالية رسمية رقم ${newSettlement.settlement_number} - ${entityName}`,
    created_at: new Date().toISOString(),
  });

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'SETTLEMENT_PROCESSED',
    entity_type: 'SETTLEMENT',
    entity_id: newSettlement.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    new_values: newSettlement,
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.status(201).json({
    success: true,
    message: 'تم تسجيل وتأكيد التسوية المالية بنجاح',
    settlement: newSettlement,
  });
});

// 13. Promotions Management & Approvals
router.get('/promotions', (req, res) => {
  return res.json({
    success: true,
    promotions: [...db.promotions].reverse(),
  });
});

router.put('/promotions/:id/approve', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { is_approved } = req.body;

  const promo = db.promotions.find(p => p.id === id);
  if (!promo) {
    return res.status(404).json({ success: false, message: 'العرض الترويجي غير موجود' });
  }

  promo.is_approved_by_admin = !!is_approved;
  promo.is_active = !!is_approved;

  db.audit_logs.push({
    id: `aud-${Date.now()}`,
    action_type: 'PROMOTION_APPROVAL_UPDATED',
    entity_type: 'PROMOTION',
    entity_id: promo.id,
    user_id: user.id,
    user_name: user.full_name,
    user_role: 'admin',
    ip_address: '127.0.0.1',
    new_values: { is_approved },
    created_at: new Date().toISOString(),
  });

  db.save();
  return res.json({
    success: true,
    message: is_approved ? 'تمت الموافقة على العرض وتفعيله في الواجهة الرئيسية' : 'تم إلغاء تفعيل العرض',
    promotion: promo,
  });
});

export default router;
