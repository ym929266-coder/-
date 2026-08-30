import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { User, UserRole } from '../types/index.js';

const router = Router();

// Register new user
router.post('/register', (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة' });
    }

    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.phone === phone);
    if (existing) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً' });
    }

    const validRole: UserRole = ['customer', 'restaurant', 'driver'].includes(role) ? role : 'customer';
    const userId = `usr-${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      phone,
      full_name,
      role: validRole,
      status: validRole === 'driver' ? 'pending_approval' : 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.user_passwords[userId] = passwordHash;

    // Create role-specific record
    if (validRole === 'driver') {
      db.drivers.push({
        id: `drv-${Date.now()}`,
        user_id: userId,
        full_name,
        phone,
        vehicle_type: req.body.vehicle_type || 'motorcycle',
        vehicle_plate: req.body.vehicle_plate || 'دمشق 00000',
        city: req.body.city || 'دمشق',
        current_latitude: 33.5138,
        current_longitude: 36.2765,
        is_online: false,
        status: 'offline',
        is_approved: false, // requires admin approval
        national_id: req.body.national_id || '',
        rating: 5.0,
        total_deliveries: 0,
        created_at: new Date().toISOString(),
      });
    } else if (validRole === 'restaurant') {
      db.restaurants.push({
        id: `rest-${Date.now()}`,
        owner_user_id: userId,
        name_ar: req.body.restaurant_name || full_name,
        name_en: req.body.restaurant_name_en || 'Restaurant',
        description_ar: req.body.description || 'مطعم معتمد في منصة وصّلني',
        logo_url: req.body.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=60',
        banner_url: req.body.banner_url || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80',
        phone,
        category_id: req.body.category_id || 'cat-shawarma',
        category_name: 'مأكولات سورية',
        city: req.body.city || 'دمشق',
        district: req.body.district || 'وسط دمشق',
        latitude: 33.5138,
        longitude: 36.2765,
        address_text: req.body.address || 'دمشق، سوريا',
        opening_time: '10:00',
        closing_time: '23:30',
        is_open: true,
        is_busy: false,
        is_approved: true,
        is_active: true,
        min_order_amount: 30000,
        base_delivery_fee: 5000,
        prep_time_minutes: 25,
        rating: 5.0,
        rating_count: 1,
        commission_rate_percentage: 12.0,
        created_at: new Date().toISOString(),
      });
    }

    db.save();

    const token = generateToken(newUser);
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: newUser,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'حدث خطأ أثناء التسجيل' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور' });
    }

    const user = db.users.find(
      u =>
        u.email.toLowerCase() === emailOrPhone.toLowerCase() ||
        u.phone.replace(/\s+/g, '') === emailOrPhone.replace(/\s+/g, '')
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'تم إيقاف هذا الحساب، يرجى التواصل مع الإدارة' });
    }

    const hash = db.user_passwords[user.id];
    if (!hash || !bcrypt.compareSync(password, hash)) {
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'حدث خطأ في تسجيل الدخول' });
  }
});

// Quick Demo Login for instant role switching
router.post('/demo-login', (req, res) => {
  const { role } = req.body as { role: UserRole };
  const targetUser = db.users.find(u => u.role === role);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: `لم يتم العثور على حساب تجريبي لدور: ${role}` });
  }
  const token = generateToken(targetUser);
  return res.json({
    success: true,
    message: `تم الدخول بحساب: ${targetUser.full_name} (${targetUser.role})`,
    token,
    user: targetUser,
  });
});

// Get current profile
router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let roleData: any = null;

  if (user.role === 'restaurant') {
    roleData = db.restaurants.find(r => r.owner_user_id === user.id);
  } else if (user.role === 'driver') {
    roleData = db.drivers.find(d => d.user_id === user.id);
  }

  return res.json({
    success: true,
    user,
    roleData,
  });
});

// Update Profile (Name, Phone, Avatar)
router.put('/profile', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { full_name, phone, avatar_url } = req.body;

  const target = db.users.find(u => u.id === user.id);
  if (!target) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  if (full_name) target.full_name = full_name;
  if (phone) target.phone = phone;
  if (avatar_url) target.avatar_url = avatar_url;
  target.updated_at = new Date().toISOString();

  db.save();
  return res.json({ success: true, message: 'تم تحديث الملف الشخصي بنجاح', user: target });
});

// Register FCM Device Push Token
router.post('/device-token', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'رمز الجهاز مفقود' });
  }

  const target = db.users.find(u => u.id === user.id);
  if (target) {
    if (!target.device_tokens) {
      target.device_tokens = [];
    }
    if (!target.device_tokens.includes(token)) {
      target.device_tokens.push(token);
      db.save();
    }
  }

  return res.json({ success: true, message: 'تم تسجيل إشعارات الجهاز بنجاح' });
});

// Toggle Favorite Restaurant or Menu Item
router.post('/favorites/toggle', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { restaurant_id, menu_item_id } = req.body;

  const target = db.users.find(u => u.id === user.id);
  if (!target) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  if (restaurant_id) {
    if (!target.favorite_restaurant_ids) target.favorite_restaurant_ids = [];
    const idx = target.favorite_restaurant_ids.indexOf(restaurant_id);
    if (idx > -1) {
      target.favorite_restaurant_ids.splice(idx, 1);
    } else {
      target.favorite_restaurant_ids.push(restaurant_id);
    }
  }

  if (menu_item_id) {
    if (!target.favorite_menu_item_ids) target.favorite_menu_item_ids = [];
    const idx = target.favorite_menu_item_ids.indexOf(menu_item_id);
    if (idx > -1) {
      target.favorite_menu_item_ids.splice(idx, 1);
    } else {
      target.favorite_menu_item_ids.push(menu_item_id);
    }
  }

  db.save();
  return res.json({
    success: true,
    favorite_restaurant_ids: target.favorite_restaurant_ids || [],
    favorite_menu_item_ids: target.favorite_menu_item_ids || [],
  });
});

export default router;
