import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { MenuItem, MenuCategory } from '../types/index.js';

const router = Router();

// 1. Public: Get all restaurant categories
router.get('/categories', (req, res) => {
  return res.json({
    success: true,
    categories: db.restaurant_categories.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
  });
});

// 2. Public: Discover and search restaurants
router.get('/', (req, res) => {
  const { category, search, city, open_only, high_rated } = req.query;

  let list = db.restaurants.filter(r => r.is_active && r.is_approved);

  if (city && typeof city === 'string' && city !== 'all') {
    list = list.filter(r => r.city === city);
  }

  if (category && typeof category === 'string' && category !== 'all') {
    list = list.filter(r => r.category_id === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      r =>
        r.name_ar.toLowerCase().includes(q) ||
        r.name_en.toLowerCase().includes(q) ||
        r.description_ar.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q)
    );
  }

  if (open_only === 'true') {
    list = list.filter(r => r.is_open && !r.is_busy);
  }

  if (high_rated === 'true') {
    list = list.filter(r => r.rating >= 4.7);
  }

  // Populate category name
  const populated = list.map(r => {
    const cat = db.restaurant_categories.find(c => c.id === r.category_id);
    return {
      ...r,
      category_name: cat?.name_ar || r.category_name || 'عام',
    };
  });

  return res.json({
    success: true,
    count: populated.length,
    restaurants: populated,
  });
});

// 3. Public: Get restaurant detail & full menu
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const restaurant = db.restaurants.find(r => r.id === id);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const categories = db.menu_categories
    .filter(c => c.restaurant_id === id && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const items = db.menu_items
    .filter(item => item.restaurant_id === id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const catName = db.restaurant_categories.find(c => c.id === restaurant.category_id)?.name_ar;

  return res.json({
    success: true,
    restaurant: {
      ...restaurant,
      category_name: catName || restaurant.category_name,
    },
    menu_categories: categories,
    menu_items: items,
  });
});

// 4. Restaurant Owner: Get current restaurant profile & menu
router.get('/my/dashboard', authenticate, requireRole(['restaurant', 'admin']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
  if (!restaurant && user.role === 'admin') {
    // If admin is inspecting, return the first restaurant
    restaurant = db.restaurants[0];
  }

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على مطعم مرتبط بحسابك' });
  }

  const categories = db.menu_categories
    .filter(c => c.restaurant_id === restaurant!.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const items = db.menu_items
    .filter(item => item.restaurant_id === restaurant!.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Calculate quick stats
  const orders = db.orders.filter(o => o.restaurant_id === restaurant!.id);
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const grossSales = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalCommissionDeducted = deliveredOrders.reduce((sum, o) => sum + o.platform_commission, 0);
  const netEarnings = grossSales - totalCommissionDeducted;

  return res.json({
    success: true,
    restaurant,
    categories,
    menu_items: items,
    analytics: {
      total_orders_count: orders.length,
      delivered_orders_count: deliveredOrders.length,
      gross_sales_syp: grossSales,
      commission_deducted_syp: totalCommissionDeducted,
      net_earnings_syp: netEarnings,
      commission_rate_percentage: restaurant.commission_rate_percentage,
    },
  });
});

// 5. Restaurant Owner: Toggle Open/Close & Busy status
router.put('/my/status', authenticate, requireRole(['restaurant']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { is_open, is_busy, prep_time_minutes } = req.body;

  const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  if (typeof is_open === 'boolean') restaurant.is_open = is_open;
  if (typeof is_busy === 'boolean') restaurant.is_busy = is_busy;
  if (typeof prep_time_minutes === 'number') restaurant.prep_time_minutes = prep_time_minutes;

  db.save();
  return res.json({
    success: true,
    message: 'تم تحديث حالة المطعم بنجاح',
    restaurant,
  });
});

// 6. Restaurant Owner: Menu Item CRUD
router.post('/my/menu-items', authenticate, requireRole(['restaurant']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const { name_ar, description_ar, price, category_id, image_url, preparation_time_mins, options } = req.body;

  if (!name_ar || !price || !category_id) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم الوجبة والسعر والتصنيف' });
  }

  const newItem: MenuItem = {
    id: `item-${Date.now()}`,
    restaurant_id: restaurant.id,
    category_id,
    name_ar,
    description_ar: description_ar || '',
    price: Number(price),
    image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
    is_available: true,
    preparation_time_mins: Number(preparation_time_mins) || 15,
    sort_order: db.menu_items.filter(i => i.restaurant_id === restaurant.id).length + 1,
    options: Array.isArray(options) ? options : [],
    created_at: new Date().toISOString(),
  };

  db.menu_items.push(newItem);
  db.save();

  return res.status(201).json({
    success: true,
    message: 'تمت إضافة الوجبة بنجاح',
    item: newItem,
  });
});

router.put('/my/menu-items/:itemId', authenticate, requireRole(['restaurant']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { itemId } = req.params;
  const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const item = db.menu_items.find(i => i.id === itemId && i.restaurant_id === restaurant.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'الوجبة غير موجودة' });
  }

  const { name_ar, description_ar, price, is_available, category_id, image_url, options } = req.body;

  if (name_ar) item.name_ar = name_ar;
  if (description_ar !== undefined) item.description_ar = description_ar;
  if (price !== undefined) item.price = Number(price);
  if (is_available !== undefined) item.is_available = Boolean(is_available);
  if (category_id) item.category_id = category_id;
  if (image_url) item.image_url = image_url;
  if (options) item.options = options;

  db.save();
  return res.json({
    success: true,
    message: 'تم تحديث الوجبة بنجاح',
    item,
  });
});

router.delete('/my/menu-items/:itemId', authenticate, requireRole(['restaurant']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { itemId } = req.params;
  const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);

  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const index = db.menu_items.findIndex(i => i.id === itemId && i.restaurant_id === restaurant.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'الوجبة غير موجودة' });
  }

  db.menu_items.splice(index, 1);
  db.save();
  return res.json({
    success: true,
    message: 'تم حذف الوجبة من القائمة',
  });
});

// 7. Add Menu Category
router.post('/my/categories', authenticate, requireRole(['restaurant']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const { name_ar } = req.body;
  if (!name_ar) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم التصنيف' });
  }

  const newCat: MenuCategory = {
    id: `mcat-${Date.now()}`,
    restaurant_id: restaurant.id,
    name_ar,
    sort_order: db.menu_categories.filter(c => c.restaurant_id === restaurant.id).length + 1,
    is_active: true,
  };

  db.menu_categories.push(newCat);
  db.save();

  return res.status(201).json({
    success: true,
    message: 'تمت إضافة التصنيف بنجاح',
    category: newCat,
  });
});

// 8. Public: Get Active & Approved Promotions / Deals
router.get('/deals/promotions', (req, res) => {
  const activePromos = db.promotions.filter(p => p.is_approved_by_admin && p.is_active);
  return res.json({
    success: true,
    promotions: activePromos,
  });
});

// 9. Restaurant Owner: Create Promotion Campaign for Admin Approval
router.post('/my/promotions', authenticate, requireRole(['restaurant']), (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const restaurant = db.restaurants.find(r => r.owner_user_id === user.id);
  if (!restaurant) {
    return res.status(404).json({ success: false, message: 'المطعم غير موجود' });
  }

  const { title_ar, description_ar, banner_url, discount_percentage, featured_item_id, start_date, end_date } = req.body;

  if (!title_ar || !discount_percentage) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال عنوان العرض ونسبة الخصم' });
  }

  const newPromo = {
    id: `prom-${Date.now()}`,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name_ar,
    title_ar,
    description_ar: description_ar || '',
    banner_url: banner_url || restaurant.banner_url,
    discount_percentage: Number(discount_percentage),
    featured_item_id,
    is_approved_by_admin: false, // Requires admin review
    is_active: false,
    start_date: start_date || new Date().toISOString(),
    end_date: end_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  db.promotions.push(newPromo);
  db.save();

  return res.status(201).json({
    success: true,
    message: 'تم إرسال طلب العرض الترويجي إلى إدارة التطبيق للمراجعة والموافقة',
    promotion: newPromo,
  });
});

export default router;
