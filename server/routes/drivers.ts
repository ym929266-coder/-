import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { OrderStateMachine } from '../services/orderStateMachine.js';

const router = Router();

// 1. Get Driver Profile & Current Task
router.get('/me', authenticate, requireRole(['driver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let driver = db.drivers.find(d => d.user_id === user.id);
  if (!driver && user.role === 'admin') {
    driver = db.drivers[0];
  }

  if (!driver) {
    return res.status(404).json({ success: false, message: 'حساب المندوب غير موجود' });
  }

  // Active Order details
  let activeOrder = null;
  if (driver.active_order_id) {
    activeOrder = db.orders.find(o => o.id === driver!.active_order_id);
    if (activeOrder && ['delivered', 'cancelled'].includes(activeOrder.status)) {
      driver.active_order_id = undefined;
      driver.status = driver.is_online ? 'online' : 'offline';
      activeOrder = null;
    }
  }

  // Total Earnings
  const earnings = db.driver_earnings.filter(e => e.driver_id === driver!.id);
  const totalEarned = earnings.reduce((sum, e) => sum + e.total_earned, 0);

  return res.json({
    success: true,
    driver,
    activeOrder,
    stats: {
      totalEarned,
      totalDeliveries: driver.total_deliveries,
      rating: driver.rating,
      earningsHistory: earnings.slice(-10).reverse(),
    },
  });
});

// 2. Toggle Online/Offline Status
router.put('/status', authenticate, requireRole(['driver']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { is_online, latitude, longitude } = req.body;

  const driver = db.drivers.find(d => d.user_id === user.id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'حساب المندوب غير موجود' });
  }

  if (!driver.is_approved) {
    return res.status(403).json({
      success: false,
      message: 'حسابك بانتظار موافقة الإدارة والتحقق من المستندات لتتمكن من استقبال الطلبات',
    });
  }

  if (typeof is_online === 'boolean') {
    driver.is_online = is_online;
    driver.status = is_online ? (driver.active_order_id ? 'busy' : 'online') : 'offline';
  }

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    driver.current_latitude = latitude;
    driver.current_longitude = longitude;
  }

  db.save();
  return res.json({
    success: true,
    message: is_online ? 'أنت الآن متصل وجاهز لاستقبال الطلبات 🚀' : 'تم تغيير الحالة إلى غير متصل ⏸️',
    driver,
  });
});

// 3. Get Pending Delivery Offers for this driver
router.get('/offers', authenticate, requireRole(['driver', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let driver = db.drivers.find(d => d.user_id === user.id);
  if (!driver && user.role === 'admin') {
    driver = db.drivers[0];
  }

  if (!driver) {
    return res.status(404).json({ success: false, message: 'حساب المندوب غير موجود' });
  }

  // Find assignments offered to this driver
  const pendingAssignments = db.driver_assignments.filter(
    a => a.driver_id === driver!.id && a.status === 'offered'
  );

  const offers = pendingAssignments
    .map(a => {
      const order = db.orders.find(o => o.id === a.order_id);
      if (!order || ['delivered', 'cancelled', 'picked_up'].includes(order.status)) return null;
      return {
        assignment_id: a.id,
        order,
        offered_at: a.offered_at,
      };
    })
    .filter(Boolean);

  return res.json({
    success: true,
    count: offers.length,
    offers,
  });
});

// 4. Respond to Delivery Offer (Accept / Decline)
router.post('/offers/:assignmentId/respond', authenticate, requireRole(['driver']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { assignmentId } = req.params;
  const { action } = req.body; // 'accept' or 'decline'

  const driver = db.drivers.find(d => d.user_id === user.id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'حساب المندوب غير موجود' });
  }

  const assignment = db.driver_assignments.find(a => a.id === assignmentId && a.driver_id === driver.id);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'عرض الطلب غير موجود' });
  }

  assignment.responded_at = new Date().toISOString();

  if (action === 'accept') {
    assignment.status = 'accepted';
    // Update order status to driver_assigned
    const result = OrderStateMachine.updateOrderStatus(
      assignment.order_id,
      'driver_assigned',
      user.id,
      user.role,
      'تم قبول التوصيل من قبل المندوب',
      { driverId: driver.id }
    );

    db.save();
    return res.json({
      success: true,
      message: 'مبروك! تم تثبيت الطلب في مهامك بنجاح',
      order: result.order,
    });
  } else {
    assignment.status = 'declined';
    db.save();
    return res.json({
      success: true,
      message: 'تم رفض العرض، سيتم إرساله لمندوب آخر',
    });
  }
});

// 5. Submit Driver Documents
router.post('/documents', authenticate, requireRole(['driver']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { doc_type, doc_url } = req.body;

  const driver = db.drivers.find(d => d.user_id === user.id);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
  }

  if (!driver.documents) {
    driver.documents = [];
  }

  const newDoc = {
    id: `doc-${Date.now()}`,
    driver_id: driver.id,
    doc_type: doc_type || 'driving_license',
    doc_url: doc_url || 'https://placehold.co/600x400/png?text=Submitted+Document',
    status: 'pending' as const,
    notes: 'بانتظار مراجعة الإدارة',
  };

  driver.documents.push(newDoc);
  db.save();

  return res.status(201).json({
    success: true,
    message: 'تم رفع المستند بنجاح وبانتظار التدقيق',
    document: newDoc,
  });
});

export default router;
