import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { Review } from '../types/index.js';

const router = Router();

// 1. Submit review for an order (Enforce 1 review per order)
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { order_id, restaurant_rating, driver_rating, comment } = req.body;

  if (!order_id || !restaurant_rating) {
    return res.status(400).json({ success: false, message: 'يرجى تقديم التقييم ورقم الطلب' });
  }

  const order = db.orders.find(o => o.id === order_id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  }

  if (order.status !== 'delivered') {
    return res.status(400).json({ success: false, message: 'يمكن تقييم الطلبات المكتملة والمستلمة فقط' });
  }

  const existingReview = db.reviews.find(r => r.order_id === order_id && r.customer_id === user.id);
  if (existingReview) {
    return res.status(400).json({ success: false, message: 'تم تقييم هذا الطلب مسبقاً' });
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    order_id: order.id,
    order_number: order.order_number,
    customer_id: user.id,
    customer_name: user.full_name,
    restaurant_id: order.restaurant_id,
    restaurant_name: order.restaurant_name,
    driver_id: order.driver_id,
    driver_name: order.driver_name,
    restaurant_rating: Math.min(5, Math.max(1, Number(restaurant_rating))),
    driver_rating: driver_rating ? Math.min(5, Math.max(1, Number(driver_rating))) : undefined,
    comment: comment || '',
    created_at: new Date().toISOString(),
  };

  db.reviews.push(newReview);

  // Recalculate restaurant rating
  const restaurantReviews = db.reviews.filter(r => r.restaurant_id === order.restaurant_id);
  const restaurant = db.restaurants.find(r => r.id === order.restaurant_id);
  if (restaurant && restaurantReviews.length > 0) {
    const avg = restaurantReviews.reduce((sum, r) => sum + r.restaurant_rating, 0) / restaurantReviews.length;
    restaurant.rating = Math.round(avg * 10) / 10;
    restaurant.rating_count = restaurantReviews.length;
  }

  // Recalculate driver rating
  if (order.driver_id && driver_rating) {
    const driverReviews = db.reviews.filter(r => r.driver_id === order.driver_id && r.driver_rating);
    const driver = db.drivers.find(d => d.id === order.driver_id);
    if (driver && driverReviews.length > 0) {
      const avg = driverReviews.reduce((sum, r) => sum + (r.driver_rating || 5), 0) / driverReviews.length;
      driver.rating = Math.round(avg * 10) / 10;
    }
  }

  db.save();
  return res.status(201).json({
    success: true,
    message: 'شكراً لتقييمك! تقييمك يساعدنا في تحسين جودة الخدمة',
    review: newReview,
  });
});

// 2. Get Restaurant Reviews
router.get('/restaurant/:restaurantId', (req, res) => {
  const { restaurantId } = req.params;
  const reviews = db.reviews
    .filter(r => r.restaurant_id === restaurantId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({
    success: true,
    count: reviews.length,
    reviews,
  });
});

export default router;
