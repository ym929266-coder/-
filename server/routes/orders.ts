import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, optionalAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { FinancialEngine } from '../services/financialEngine.js';
import { OrderStateMachine } from '../services/orderStateMachine.js';
import { DriverDispatcher } from '../services/driverDispatcher.js';
import { Order, OrderItem, OrderStatus, PaymentMethod } from '../types/index.js';

const router = Router();

// 1. Create New Order (Server-Side Price Validation - Client CANNOT tamper with prices)
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const {
      restaurant_id,
      items,
      coupon_code,
      payment_method,
      delivery_address,
      customer_notes,
    } = req.body;

    if (!restaurant_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'بيانات الطلب غير مكتملة أو السلة فارغة' });
    }

    if (!delivery_address || !delivery_address.city || !delivery_address.district) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد عنوان التوصيل ورقم الهاتف' });
    }

    const restaurant = db.restaurants.find(r => r.id === restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
    }

    if (!restaurant.is_open || restaurant.is_busy) {
      return res.status(400).json({ success: false, message: 'نعتذر، المطعم مغلق حالياً أو مشغول' });
    }

    // SERVER-SIDE VALIDATION: Calculate subtotal from authoritative DB menu items
    let authoritativeSubtotal = 0;
    const validatedItems: OrderItem[] = [];

    for (const clientItem of items) {
      const dbItem = db.menu_items.find(i => i.id === clientItem.menu_item_id && i.restaurant_id === restaurant_id);
      if (!dbItem) {
        return res.status(400).json({ success: false, message: `الوجبة المحددة [${clientItem.item_name || 'غير معروف'}] غير متوفرة في المطعم` });
      }

      if (!dbItem.is_available) {
        return res.status(400).json({ success: false, message: `الوجبة [${dbItem.name_ar}] نفدت حالياً` });
      }

      const qty = Math.max(1, Math.floor(Number(clientItem.quantity) || 1));
      let itemPrice = dbItem.price;

      // Validate selected options
      const validatedOptions: any[] = [];
      if (Array.isArray(clientItem.selected_options)) {
        for (const selOpt of clientItem.selected_options) {
          const dbOpt = dbItem.options.find(o => o.name_ar === selOpt.name_ar);
          if (dbOpt) {
            itemPrice += dbOpt.price_modifier;
            validatedOptions.push({
              group_name_ar: dbOpt.group_name_ar,
              name_ar: dbOpt.name_ar,
              price_modifier: dbOpt.price_modifier,
            });
          }
        }
      }

      const itemTotal = itemPrice * qty;
      authoritativeSubtotal += itemTotal;

      validatedItems.push({
        id: `oitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        order_id: '', // set below
        menu_item_id: dbItem.id,
        item_name: dbItem.name_ar,
        unit_price: itemPrice,
        quantity: qty,
        subtotal: itemTotal,
        selected_options: validatedOptions,
        special_instructions: clientItem.special_instructions || '',
      });
    }

    // Minimum order check
    if (authoritativeSubtotal < restaurant.min_order_amount) {
      return res.status(400).json({
        success: false,
        message: `الحد الأدنى للطلب من هذا المطعم هو ${restaurant.min_order_amount.toLocaleString()} ل.س`,
      });
    }

    // Coupon discount validation
    let discountAmount = 0;
    let validCouponCode: string | undefined = undefined;

    if (coupon_code) {
      const coupon = db.coupons.find(
        c => c.code.toUpperCase() === String(coupon_code).toUpperCase() && c.is_active
      );
      if (coupon) {
        const now = new Date();
        const start = new Date(coupon.start_date);
        const end = new Date(coupon.end_date);
        const isValidDate = now >= start && now <= end;
        const isValidMin = authoritativeSubtotal >= coupon.min_order_amount;
        const isValidRestaurant = !coupon.restaurant_id || coupon.restaurant_id === restaurant.id;
        const hasUsageLeft = coupon.usage_count < coupon.max_usage_total;

        if (isValidDate && isValidMin && isValidRestaurant && hasUsageLeft) {
          validCouponCode = coupon.code;
          if (coupon.discount_type === 'percentage') {
            discountAmount = Math.round((authoritativeSubtotal * coupon.discount_value) / 100);
            if (coupon.max_discount) {
              discountAmount = Math.min(discountAmount, coupon.max_discount);
            }
          } else {
            discountAmount = Math.min(coupon.discount_value, authoritativeSubtotal);
          }
          coupon.usage_count += 1;
        }
      }
    }

    // Server-side financial calculations
    const coords = {
      lat: delivery_address.latitude || restaurant.latitude + 0.01,
      lng: delivery_address.longitude || restaurant.longitude + 0.01,
    };
    const distanceKm = DriverDispatcher.calculateDistanceKm(
      restaurant.latitude,
      restaurant.longitude,
      coords.lat,
      coords.lng
    );

    const financials = FinancialEngine.calculateOrderFinancials(
      restaurant.id,
      authoritativeSubtotal,
      distanceKm,
      discountAmount
    );

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `WS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      customer_id: user.id,
      customer_name: user.full_name,
      customer_phone: delivery_address.phone || user.phone,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name_ar,
      restaurant_phone: restaurant.phone,
      restaurant_latitude: restaurant.latitude,
      restaurant_longitude: restaurant.longitude,
      status: 'pending',
      subtotal: financials.subtotal,
      delivery_fee: financials.delivery_fee,
      service_fee: financials.service_fee,
      discount_amount: financials.discount_amount,
      total_amount: financials.total_amount,
      restaurant_net: financials.restaurant_net,
      platform_commission: financials.platform_commission,
      driver_earning: financials.driver_earning,
      coupon_code: validCouponCode,
      payment_method: payment_method === 'SHAM_CASH' ? 'SHAM_CASH' : 'CASH',
      payment_status: 'pending',
      delivery_address: {
        city: delivery_address.city,
        district: delivery_address.district,
        street_details: delivery_address.street_details || '',
        building: delivery_address.building || '',
        floor: delivery_address.floor || '',
        notes: delivery_address.notes || customer_notes || '',
        phone: delivery_address.phone || user.phone,
      },
      delivery_latitude: coords.lat,
      delivery_longitude: coords.lng,
      customer_notes: customer_notes || '',
      prep_time_estimate: restaurant.prep_time_minutes || 25,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: validatedItems.map(i => ({ ...i, order_id: orderId })),
      status_history: [
        {
          id: `sh-${Date.now()}`,
          order_id: orderId,
          new_status: 'pending',
          changed_by_user_id: user.id,
          role: 'customer',
          notes: 'تم إنشاء الطلب بنجاح وبانتظار قبول المطعم',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    db.orders.unshift(newOrder);
    validatedItems.forEach(i => {
      i.order_id = orderId;
      db.order_items.push(i);
    });

    // Notify Restaurant Owner
    const restaurantOwner = db.users.find(u => u.id === restaurant.owner_user_id);
    if (restaurantOwner) {
      db.notifications.push({
        id: `notif-rest-${Date.now()}`,
        user_id: restaurantOwner.id,
        title_ar: 'طلب جديد وارد 🔔',
        body_ar: `طلب جديد رقم ${orderNumber} بقيمة ${newOrder.total_amount.toLocaleString()} ل.س`,
        type: 'order',
        order_id: orderId,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    db.save();

    return res.status(201).json({
      success: true,
      message: 'تم إرسال الطلب إلى المطعم بنجاح',
      order: newOrder,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء إنشاء الطلب' });
  }
});

// 2. Get Single Order by ID
router.get('/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const order = db.orders.find(o => o.id === id || o.order_number === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  // Populate items and status history if not embedded
  const items = db.order_items.filter(i => i.order_id === order.id);
  const history = db.order_status_history
    .filter(h => h.order_id === order.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Attach driver live GPS if active
  let liveDriver = null;
  if (order.driver_id) {
    const driver = db.drivers.find(d => d.id === order.driver_id);
    if (driver) {
      liveDriver = {
        name: driver.full_name,
        phone: driver.phone,
        vehicle: driver.vehicle_type === 'motorcycle' ? 'دراجة نارية' : 'سيارة',
        plate: driver.vehicle_plate,
        rating: driver.rating,
        latitude: driver.current_latitude,
        longitude: driver.current_longitude,
      };
    }
  }

  return res.json({
    success: true,
    order: {
      ...order,
      items: items.length > 0 ? items : order.items,
      status_history: history.length > 0 ? history : order.status_history,
      live_driver: liveDriver,
    },
  });
});

// 3. Get Current User's Orders (Customer)
router.get('/my/all', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const orders = db.orders
    .filter(o => o.customer_id === user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({
    success: true,
    count: orders.length,
    orders,
  });
});

// 4. Get Restaurant Orders (Restaurant Owner / Admin)
router.get('/restaurant/all', authenticate, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
  if (!restaurant && user.role === 'admin') {
    restaurant = db.restaurants[0];
  }

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const orders = db.orders
    .filter(o => o.restaurant_id === restaurant!.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({
    success: true,
    restaurant_name: restaurant.name_ar,
    orders,
  });
});

// 5. Restaurant Action: Accept Order
router.post('/:id/accept', authenticate, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { prep_time } = req.body;

  // Verify ownership
  if (user.role === 'restaurant') {
    const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
    const order = db.orders.find(o => o.id === id);
    if (!order || !restaurant || order.restaurant_id !== restaurant.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بقبول طلبات مطعم آخر' });
    }
  }

  const result = OrderStateMachine.updateOrderStatus(id, 'accepted', user.id, user.role, 'تم قبول الطلب من المطعم', {
    prepTime: prep_time ? Number(prep_time) : 25,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 6. Restaurant Action: Reject Order
router.post('/:id/reject', authenticate, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { reason } = req.body;

  // Verify ownership
  if (user.role === 'restaurant') {
    const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
    const order = db.orders.find(o => o.id === id);
    if (!order || !restaurant || order.restaurant_id !== restaurant.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برفض طلبات مطعم آخر' });
    }
  }

  const result = OrderStateMachine.updateOrderStatus(
    id,
    'rejected',
    user.id,
    user.role,
    reason || 'المطعم مشغول جداً ولا يمكن تلبية الطلب حالياً',
    { rejectReason: reason }
  );

  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 7. Restaurant Action: Mark as Preparing
router.post('/:id/preparing', authenticate, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;

  // Verify ownership
  if (user.role === 'restaurant') {
    const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
    const order = db.orders.find(o => o.id === id);
    if (!order || !restaurant || order.restaurant_id !== restaurant.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل حالة طلبات مطعم آخر' });
    }
  }

  const result = OrderStateMachine.updateOrderStatus(id, 'preparing', user.id, user.role, 'جاري تحضير الوجبات');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 8. Restaurant Action: Mark as Ready -> triggers auto-dispatch
router.post('/:id/ready', authenticate, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;

  // Verify ownership
  if (user.role === 'restaurant') {
    const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
    const order = db.orders.find(o => o.id === id);
    if (!order || !restaurant || order.restaurant_id !== restaurant.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل حالة طلبات مطعم آخر' });
    }
  }

  const result = OrderStateMachine.updateOrderStatus(id, 'ready', user.id, user.role, 'الوجبة جاهزة للاستلام');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 9. Driver Action: Pickup Order from restaurant
router.post('/:id/pickup', authenticate, requireRole(['driver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;

  if (user.role === 'driver') {
    const driver = db.drivers.find(d => d.user_id === user.id);
    const order = db.orders.find(o => o.id === id);
    if (!order || !driver || order.driver_id !== driver.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك باستلام هذا الطلب؛ الطلب غير مسند إليك' });
    }
  }

  const result = OrderStateMachine.updateOrderStatus(id, 'picked_up', user.id, user.role, 'تم استلام الطلب من المطعم والانطلاق للعميل');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 10. Driver Action: Deliver Order & Collect Cash
router.post('/:id/deliver', authenticate, requireRole(['driver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;

  if (user.role === 'driver') {
    const driver = db.drivers.find(d => d.user_id === user.id);
    const order = db.orders.find(o => o.id === id);
    if (!order || !driver || order.driver_id !== driver.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتسليم هذا الطلب؛ الطلب غير مسند إليك' });
    }
  }

  const result = OrderStateMachine.updateOrderStatus(id, 'delivered', user.id, user.role, 'تم تسليم الطلب للعميل واستلام المبلغ نقداً');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 11. Customer or Admin Cancel
router.post('/:id/cancel', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { reason } = req.body;

  const order = db.orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  if (user.role === 'customer' && order.customer_id !== user.id) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بإلغاء طلب عميل آخر' });
  }

  const result = OrderStateMachine.updateOrderStatus(id, 'cancelled', user.id, user.role, reason || 'تم إلغاء الطلب');
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

// 12. Driver Live Location Update (GPS Simulation / Real GPS)
router.post('/:id/update-driver-location', authenticate, requireRole(['driver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  const order = db.orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  if (user.role === 'driver') {
    const driver = db.drivers.find(d => d.user_id === user.id);
    if (!driver || order.driver_id !== driver.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتحديث موقع هذا الطلب' });
    }
  }
  if (!order) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    order.driver_latitude = latitude;
    order.driver_longitude = longitude;

    if (order.driver_id) {
      const driver = db.drivers.find(d => d.id === order.driver_id);
      if (driver) {
        driver.current_latitude = latitude;
        driver.current_longitude = longitude;
      }
    }

    db.save();
  }

  return res.json({ success: true, latitude, longitude });
});

export default router;
