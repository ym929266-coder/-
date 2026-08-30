import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  User,
  Restaurant,
  RestaurantCategory,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  DriverProfile,
  DriverAssignment,
  DriverEarningRecord,
  FinancialTransaction,
  CommissionConfig,
  DeliveryZone,
  Coupon,
  Review,
  AppNotification,
  SupportTicket,
  AuditLog,
  Address,
  Settlement,
  Promotion,
} from '../types/index.js';

interface DatabaseSchema {
  users: User[];
  user_passwords: Record<string, string>; // user_id -> password_hash
  addresses: Address[];
  restaurant_categories: RestaurantCategory[];
  restaurants: Restaurant[];
  menu_categories: MenuCategory[];
  menu_items: MenuItem[];
  orders: Order[];
  order_items: OrderItem[];
  order_status_history: OrderStatusHistory[];
  drivers: DriverProfile[];
  driver_assignments: DriverAssignment[];
  driver_earnings: DriverEarningRecord[];
  financial_transactions: FinancialTransaction[];
  commissions: CommissionConfig[];
  delivery_zones: DeliveryZone[];
  coupons: Coupon[];
  reviews: Review[];
  notifications: AppNotification[];
  support_tickets: SupportTicket[];
  audit_logs: AuditLog[];
  settlements: Settlement[];
  promotions: Promotion[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'wassalni_db.json');

class DatabaseManager {
  private data: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.addresses) {
          parsed.addresses = this.getInitialAddresses();
        }
        if (!parsed.settlements) {
          parsed.settlements = [];
        }
        if (!parsed.promotions) {
          parsed.promotions = [];
        }
        // Ensure restaurants have status
        if (parsed.restaurants) {
          parsed.restaurants.forEach((r: any) => {
            if (!r.status) {
              r.status = r.is_busy ? 'BUSY' : (r.is_open ? 'OPEN' : 'CLOSED');
            }
          });
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading database file, re-initializing fresh database:', err);
    }
    const fresh = this.getInitialSeedData();
    this.persistSync(fresh);
    return fresh;
  }

  public save() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to save database to disk:', err);
    } finally {
      this.isSaving = false;
    }
  }

  private persistSync(data: DatabaseSchema) {
    this.ensureDataDirectory();
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  }

  private getInitialAddresses(): Address[] {
    return [
      {
        id: 'addr-1',
        user_id: 'usr-cust-1',
        title: 'المنزل',
        city: 'دمشق',
        district: 'كفرسوسة',
        street_details: 'جانب جامع الهدى، دخلة صيدلية السلام',
        building: 'بناء الياسمين 14',
        floor: 'الطابق الثاني - شقة 5',
        notes: 'يرجى رن الجرس بهدوء لوجود أطفال',
        latitude: 33.4912,
        longitude: 36.2785,
        is_default: true,
        phone_contact: '+963933999000',
        created_at: new Date().toISOString(),
      },
      {
        id: 'addr-2',
        user_id: 'usr-cust-1',
        title: 'العمل / المكتب',
        city: 'دمشق',
        district: 'الشعلان',
        street_details: 'شارع حافظ إبراهيم، مقابل حديقة السبكي',
        building: 'برج الشعلان التجاري',
        floor: 'الطابق الرابع - شركة التقنية السورية',
        notes: 'التسليم لموظف الاستقبال',
        latitude: 33.5185,
        longitude: 36.2910,
        is_default: false,
        phone_contact: '+963933999000',
        created_at: new Date().toISOString(),
      },
    ];
  }

  // Getters for table collections
  public get users() { return this.data.users; }
  public get user_passwords() { return this.data.user_passwords; }
  public get addresses() { return this.data.addresses; }
  public get restaurant_categories() { return this.data.restaurant_categories; }
  public get restaurants() { return this.data.restaurants; }
  public get menu_categories() { return this.data.menu_categories; }
  public get menu_items() { return this.data.menu_items; }
  public get orders() { return this.data.orders; }
  public get order_items() { return this.data.order_items; }
  public get order_status_history() { return this.data.order_status_history; }
  public get drivers() { return this.data.drivers; }
  public get driver_assignments() { return this.data.driver_assignments; }
  public get driver_earnings() { return this.data.driver_earnings; }
  public get financial_transactions() { return this.data.financial_transactions; }
  public get commissions() { return this.data.commissions; }
  public get delivery_zones() { return this.data.delivery_zones; }
  public get coupons() { return this.data.coupons; }
  public get reviews() { return this.data.reviews; }
  public get notifications() { return this.data.notifications; }
  public get support_tickets() { return this.data.support_tickets; }
  public get audit_logs() { return this.data.audit_logs; }
  public get settlements() { return this.data.settlements; }
  public get promotions() { return this.data.promotions; }

  // Initial Seed Data with Syrian Market context
  private getInitialSeedData(): DatabaseSchema {
    const passwordHash = bcrypt.hashSync('123456', 10);

    const users: User[] = [
      {
        id: 'usr-admin-1',
        email: 'admin@wassalni.sy',
        phone: '+963944111222',
        full_name: 'مدير منصة وصّلني',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-rest-1',
        email: 'shami@wassalni.sy',
        phone: '+963933222333',
        full_name: 'شاورما الشام - كفرسوسة',
        role: 'restaurant',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-rest-2',
        email: 'abo_ali@wassalni.sy',
        phone: '+963955333444',
        full_name: 'مشاوي أبو علي الدمشقي',
        role: 'restaurant',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-rest-3',
        email: 'damas_burger@wassalni.sy',
        phone: '+963966444555',
        full_name: 'داماس برغر أند كريسبي',
        role: 'restaurant',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-rest-4',
        email: 'sweets@wassalni.sy',
        phone: '+963977555666',
        full_name: 'حلويات النبلاء الشامية',
        role: 'restaurant',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-driver-1',
        email: 'ahmad.driver@wassalni.sy',
        phone: '+963988666777',
        full_name: 'أحمد السعيد (كابتن دمشق)',
        role: 'driver',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-driver-2',
        email: 'tarek.driver@wassalni.sy',
        phone: '+963999777888',
        full_name: 'طارق المصري (كابتن المزة)',
        role: 'driver',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'usr-cust-1',
        email: 'samer.customer@gmail.com',
        phone: '+963933999000',
        full_name: 'سامر الخالدي',
        role: 'customer',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const user_passwords: Record<string, string> = {};
    users.forEach(u => {
      user_passwords[u.id] = passwordHash;
    });

    const restaurant_categories: RestaurantCategory[] = [
      { id: 'cat-shawarma', name_ar: 'شاورما وسندويش', icon_slug: 'flame', image_url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=500&auto=format&fit=crop&q=60', sort_order: 1, is_active: true },
      { id: 'cat-grills', name_ar: 'مشاوي ومأكولات شرقية', icon_slug: 'utensils', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60', sort_order: 2, is_active: true },
      { id: 'cat-burger', name_ar: 'برغر وكريسبي', icon_slug: 'sandwich', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60', sort_order: 3, is_active: true },
      { id: 'cat-pizza', name_ar: 'بيتزا وفطائر', icon_slug: 'pizza', image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60', sort_order: 4, is_active: true },
      { id: 'cat-sweets', name_ar: 'حلويات دمشقية وبوظة', icon_slug: 'cake', image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60', sort_order: 5, is_active: true },
      { id: 'cat-breakfast', name_ar: 'فطور وفتات وفول', icon_slug: 'coffee', image_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&auto=format&fit=crop&q=60', sort_order: 6, is_active: true },
      { id: 'cat-drinks', name_ar: 'عصائر وكوكتيلات', icon_slug: 'cup-soda', image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60', sort_order: 7, is_active: true },
    ];

    const restaurants: Restaurant[] = [
      {
        id: 'rest-1',
        owner_user_id: 'usr-rest-1',
        name_ar: 'شاورما الشام الأصيلة',
        name_en: 'Authentic Sham Shawarma',
        description_ar: 'أطيب شاورما دجاج ولحم على الفحم مع الثومية الأصلية والمخلل الشامي الفاخر',
        logo_url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=200&auto=format&fit=crop&q=60',
        banner_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1000&auto=format&fit=crop&q=80',
        phone: '+963933222333',
        category_id: 'cat-shawarma',
        category_name: 'شاورما وسندويش',
        city: 'دمشق',
        district: 'كفرسوسة',
        latitude: 33.4975,
        longitude: 36.2750,
        address_text: 'دمشق - كفرسوسة، مقابل الشام سيتي سنتر',
        opening_time: '11:00',
        closing_time: '02:00',
        is_open: true,
        is_busy: false,
        is_approved: true,
        is_active: true,
        min_order_amount: 30000,
        base_delivery_fee: 6000,
        prep_time_minutes: 20,
        rating: 4.9,
        rating_count: 342,
        commission_rate_percentage: 12.0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'rest-2',
        owner_user_id: 'usr-rest-2',
        name_ar: 'مشاوي أبو علي الدمشقي',
        name_en: 'Abo Ali Damascene Grills',
        description_ar: 'كباب حلبي وشقف وشيش طاووق على أصوله بلحم بلدي طازج يومياً',
        logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop&q=60',
        banner_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80',
        phone: '+963955333444',
        category_id: 'cat-grills',
        category_name: 'مشاوي ومأكولات شرقية',
        city: 'دمشق',
        district: 'الميدان',
        latitude: 33.4880,
        longitude: 36.2920,
        address_text: 'دمشق - الميدان، جزماتية بالقرب من جامع منجك',
        opening_time: '12:00',
        closing_time: '01:00',
        is_open: true,
        is_busy: false,
        is_approved: true,
        is_active: true,
        min_order_amount: 50000,
        base_delivery_fee: 7000,
        prep_time_minutes: 30,
        rating: 4.8,
        rating_count: 215,
        commission_rate_percentage: 14.0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'rest-3',
        owner_user_id: 'usr-rest-3',
        name_ar: 'داماس برغر أند كريسبي',
        name_en: 'Damas Burger & Crispy',
        description_ar: 'برغر لحم أنجوس ووجبات كريسبي الدجاج المقرمشة مع خلطات صوص سرية',
        logo_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=60',
        banner_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&auto=format&fit=crop&q=80',
        phone: '+963966444555',
        category_id: 'cat-burger',
        category_name: 'برغر وكريسبي',
        city: 'دمشق',
        district: 'الشعلان',
        latitude: 33.5180,
        longitude: 36.2910,
        address_text: 'دمشق - الشعلان، تقاطع حديقة السبكي',
        opening_time: '12:30',
        closing_time: '02:30',
        is_open: true,
        is_busy: false,
        is_approved: true,
        is_active: true,
        min_order_amount: 40000,
        base_delivery_fee: 5000,
        prep_time_minutes: 25,
        rating: 4.7,
        rating_count: 189,
        commission_rate_percentage: 12.0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'rest-4',
        owner_user_id: 'usr-rest-4',
        name_ar: 'حلويات النبلاء الشامية',
        name_en: 'Al-Nubalaa Damascene Sweets',
        description_ar: 'بقلاوة بالفستق الحلبي، وربات بالقشطة البلدية، وكنافة نابلسية على الفحم',
        logo_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&auto=format&fit=crop&q=60',
        banner_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1000&auto=format&fit=crop&q=80',
        phone: '+963977555666',
        category_id: 'cat-sweets',
        category_name: 'حلويات دمشقية وبوظة',
        city: 'دمشق',
        district: 'أبو رمانة',
        latitude: 33.5220,
        longitude: 36.2840,
        address_text: 'دمشق - أبو رمانة، ساحة النجمة',
        opening_time: '09:00',
        closing_time: '23:30',
        is_open: true,
        is_busy: false,
        is_approved: true,
        is_active: true,
        min_order_amount: 35000,
        base_delivery_fee: 5000,
        prep_time_minutes: 15,
        rating: 4.95,
        rating_count: 450,
        commission_rate_percentage: 10.0,
        created_at: new Date().toISOString(),
      },
    ];

    const menu_categories: MenuCategory[] = [
      { id: 'mcat-1-1', restaurant_id: 'rest-1', name_ar: 'وجبات الشاورما العربي', sort_order: 1, is_active: true },
      { id: 'mcat-1-2', restaurant_id: 'rest-1', name_ar: 'سندويش شاورما فردي', sort_order: 2, is_active: true },
      { id: 'mcat-1-3', restaurant_id: 'rest-1', name_ar: 'مقبلات ومشروبات', sort_order: 3, is_active: true },
      
      { id: 'mcat-2-1', restaurant_id: 'rest-2', name_ar: 'مشاوي مشكلة بالكيلو', sort_order: 1, is_active: true },
      { id: 'mcat-2-2', restaurant_id: 'rest-2', name_ar: 'وجبات فردية', sort_order: 2, is_active: true },
      { id: 'mcat-2-3', restaurant_id: 'rest-2', name_ar: 'مقبلات شامية', sort_order: 3, is_active: true },

      { id: 'mcat-3-1', restaurant_id: 'rest-3', name_ar: 'برغر اللحم المشوي', sort_order: 1, is_active: true },
      { id: 'mcat-3-2', restaurant_id: 'rest-3', name_ar: 'وجبات كريسبي وزنجر', sort_order: 2, is_active: true },

      { id: 'mcat-4-1', restaurant_id: 'rest-4', name_ar: 'حلويات دمشقية بالسمن العربي', sort_order: 1, is_active: true },
      { id: 'mcat-4-2', restaurant_id: 'rest-4', name_ar: 'كنافة وقشطة طازجة', sort_order: 2, is_active: true },
    ];

    const menu_items: MenuItem[] = [
      // Restaurant 1: Shawarma
      {
        id: 'item-101',
        restaurant_id: 'rest-1',
        category_id: 'mcat-1-1',
        name_ar: 'وجبة شاورما دجاج عربي دبل',
        description_ar: 'سندويشتين شاورما دجاج بخبز الصاج مقطعة مع بطاطا مقلية، كريم ثوم، مخلل، وصوص حار',
        price: 48000,
        image_url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 15,
        calories: 850,
        sort_order: 1,
        options: [
          { id: 'opt-1', group_name_ar: 'إضافات الصوص', name_ar: 'ثومية إضافية', price_modifier: 3000 },
          { id: 'opt-2', group_name_ar: 'إضافات الصوص', name_ar: 'دبس رمان حامض', price_modifier: 2500 },
          { id: 'opt-3', group_name_ar: 'إضافات الجبن', name_ar: 'جبنة قشقوان سائحة', price_modifier: 6000 },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'item-102',
        restaurant_id: 'rest-1',
        category_id: 'mcat-1-1',
        name_ar: 'وجبة شاورما لحم عربي إكسترا',
        description_ar: 'شاورما لحم عجل بلدي متبل مع صوص الطحينة والبقدونس والبصل المشوي والبطاطا',
        price: 65000,
        image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 20,
        calories: 920,
        sort_order: 2,
        options: [
          { id: 'opt-4', group_name_ar: 'الخبز', name_ar: 'خبز صاج سياحي', price_modifier: 0 },
          { id: 'opt-5', group_name_ar: 'إضافات', name_ar: 'طحينة زيادة', price_modifier: 3000 },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'item-103',
        restaurant_id: 'rest-1',
        category_id: 'mcat-1-2',
        name_ar: 'سندويش شاورما دجاج صاروخ',
        description_ar: 'سندويش شاورما كبير بخبز الصاج مع الثوم والمخلل ودبس الرمان',
        price: 26000,
        image_url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 10,
        calories: 550,
        sort_order: 3,
        options: [
          { id: 'opt-6', group_name_ar: 'الجبنة', name_ar: 'إضافة جبنة موزاريلا', price_modifier: 4500 },
        ],
        created_at: new Date().toISOString(),
      },
      // Restaurant 2: Grills
      {
        id: 'item-201',
        restaurant_id: 'rest-2',
        category_id: 'mcat-2-1',
        name_ar: 'كيلو مشاوي مشكلة فاخرة',
        description_ar: 'كباب حلبي، شقف لحم بلدي، شيش طاووق مع الخضار المشوية، البيواز، رغيف محمرة، وسرفيس مقبلات',
        price: 195000,
        image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 30,
        calories: 1800,
        sort_order: 1,
        options: [
          { id: 'opt-7', group_name_ar: 'المقبلات', name_ar: 'صحن حمص بيروتي', price_modifier: 8000 },
          { id: 'opt-8', group_name_ar: 'المقبلات', name_ar: 'صحن متبل باذنجان', price_modifier: 8000 },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'item-202',
        restaurant_id: 'rest-2',
        category_id: 'mcat-2-2',
        name_ar: 'وجبة كباب باذنجان دمشقي',
        description_ar: 'أسياخ كباب لحم غنم مشوية مع قطع الباذنجان والصلصة الخاصة مع الأرز أو الخبز',
        price: 75000,
        image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 25,
        calories: 900,
        sort_order: 2,
        options: [],
        created_at: new Date().toISOString(),
      },
      // Restaurant 3: Burger
      {
        id: 'item-301',
        restaurant_id: 'rest-3',
        category_id: 'mcat-3-1',
        name_ar: 'داماس تشيز برغر سوبريم',
        description_ar: 'شريحة لحم بقر بلدي 200غ مشوية مع جبنة تشيدر أمريكية، خس مقرمش، مخلل، وبطاطا مقلية',
        price: 52000,
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 20,
        calories: 780,
        sort_order: 1,
        options: [
          { id: 'opt-9', group_name_ar: 'حجم الوجبة', name_ar: 'وجبة كومبو مع كولا وبطاطا', price_modifier: 12000 },
          { id: 'opt-10', group_name_ar: 'لحم إضافي', name_ar: 'شريحة لحم إضافية 150غ', price_modifier: 18000 },
        ],
        created_at: new Date().toISOString(),
      },
      // Restaurant 4: Sweets
      {
        id: 'item-401',
        restaurant_id: 'rest-4',
        category_id: 'mcat-4-1',
        name_ar: 'علبة بقلاوة مشكلة بالفستق الحلبي 1 كغ',
        description_ar: 'تشكيلة فاخرة من أصابع الفستق، كول وشكور، بورمة، مبرومة معمولة بالسمن الحيواني الشامي الممتاز',
        price: 180000,
        image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 10,
        calories: 1400,
        sort_order: 1,
        options: [
          { id: 'opt-11', group_name_ar: 'التغليف', name_ar: 'تغليف هدايا ملكي', price_modifier: 5000 },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'item-402',
        restaurant_id: 'rest-4',
        category_id: 'mcat-4-2',
        name_ar: 'كنافة نابلسية خشنة على الفحم (صحن عائلي)',
        description_ar: 'كنافة بالجبنة البلدية العكاوية المذوبة مع الفستق الحلبي والقطر العطري الساخن',
        price: 65000,
        image_url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=60',
        is_available: true,
        preparation_time_mins: 15,
        calories: 950,
        sort_order: 2,
        options: [],
        created_at: new Date().toISOString(),
      },
    ];

    const drivers: DriverProfile[] = [
      {
        id: 'drv-1',
        user_id: 'usr-driver-1',
        full_name: 'أحمد السعيد (كابتن دمشق)',
        phone: '+963988666777',
        vehicle_type: 'motorcycle',
        vehicle_plate: 'دمشق 48921',
        city: 'دمشق',
        current_latitude: 33.5020,
        current_longitude: 36.2800,
        is_online: true,
        status: 'online',
        is_approved: true,
        national_id: '01029384756',
        rating: 4.9,
        total_deliveries: 420,
        documents: [
          { id: 'doc-1', driver_id: 'drv-1', doc_type: 'driving_license', doc_url: 'https://placehold.co/600x400/png?text=Driving+License', status: 'verified', verified_at: new Date().toISOString() },
          { id: 'doc-2', driver_id: 'drv-1', doc_type: 'national_id_front', doc_url: 'https://placehold.co/600x400/png?text=National+ID', status: 'verified', verified_at: new Date().toISOString() },
        ],
        created_at: new Date().toISOString(),
      },
      {
        id: 'drv-2',
        user_id: 'usr-driver-2',
        full_name: 'طارق المصري (كابتن المزة)',
        phone: '+963999777888',
        vehicle_type: 'motorcycle',
        vehicle_plate: 'دمشق 93812',
        city: 'دمشق',
        current_latitude: 33.4950,
        current_longitude: 36.2620,
        is_online: true,
        status: 'online',
        is_approved: true,
        national_id: '01098473625',
        rating: 4.85,
        total_deliveries: 310,
        documents: [
          { id: 'doc-3', driver_id: 'drv-2', doc_type: 'driving_license', doc_url: 'https://placehold.co/600x400/png?text=Driving+License', status: 'verified', verified_at: new Date().toISOString() },
        ],
        created_at: new Date().toISOString(),
      },
    ];

    const commissions: CommissionConfig[] = [
      {
        id: 'comm-default',
        name: 'الإعدادات المالية الافتراضية لمنصة وصّلني',
        default_restaurant_commission_pct: 12.0, // 12%
        default_service_fee: 2500, // 2,500 SYP
        base_delivery_fee_per_km: 1500, // 1,500 SYP / km
        min_delivery_fee: 5000, // 5,000 SYP
        updated_at: new Date().toISOString(),
        updated_by: 'usr-admin-1',
      },
    ];

    const delivery_zones: DeliveryZone[] = [
      { id: 'zone-1', city: 'دمشق', name_ar: 'وسط دمشق والشعلان والمزرعة', base_fee: 5000, min_order: 30000, is_active: true, center_lat: 33.5138, center_lng: 36.2765 },
      { id: 'zone-2', city: 'دمشق', name_ar: 'المزة وكفرسوسة واللوان', base_fee: 6000, min_order: 30000, is_active: true, center_lat: 33.4975, center_lng: 36.2550 },
      { id: 'zone-3', city: 'دمشق', name_ar: 'أبو رمانة والمالكي والروضة', base_fee: 5500, min_order: 35000, is_active: true, center_lat: 33.5220, center_lng: 36.2840 },
      { id: 'zone-4', city: 'دمشق', name_ar: 'القصاع وباب توما ودمشق القديمة', base_fee: 6000, min_order: 30000, is_active: true, center_lat: 33.5120, center_lng: 36.3150 },
      { id: 'zone-5', city: 'دمشق', name_ar: 'الميدان والزاهرة وبستان الدور', base_fee: 6500, min_order: 30000, is_active: true, center_lat: 33.4880, center_lng: 36.2920 },
      { id: 'zone-6', city: 'حلب', name_ar: 'حلب - الفرقان والشهباء والجميلية', base_fee: 6000, min_order: 35000, is_active: true, center_lat: 36.2021, center_lng: 37.1343 },
      { id: 'zone-7', city: 'حمص', name_ar: 'حمص - الحمرا والإنشاءات والدبلان', base_fee: 5000, min_order: 30000, is_active: true, center_lat: 34.7324, center_lng: 36.7137 },
      { id: 'zone-8', city: 'اللاذقية', name_ar: 'اللاذقية - الصليبة والزراعة ومشروع الصليبة', base_fee: 5500, min_order: 30000, is_active: true, center_lat: 35.5317, center_lng: 35.7915 },
    ];

    const coupons: Coupon[] = [
      {
        id: 'coup-1',
        code: 'WASSALNI10',
        discount_type: 'percentage',
        discount_value: 10, // 10%
        min_order_amount: 40000,
        max_discount: 15000,
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-12-31T23:59:59Z',
        max_usage_total: 1000,
        usage_count: 42,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'coup-2',
        code: 'SHAM5000',
        discount_type: 'fixed',
        discount_value: 5000, // 5000 SYP
        min_order_amount: 50000,
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-12-31T23:59:59Z',
        max_usage_total: 500,
        usage_count: 18,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];

    // Seed an initial active order to test live tracking out of the box
    const initialOrder: Order = {
      id: 'ord-demo-101',
      order_number: 'WS-2026-1048',
      customer_id: 'usr-cust-1',
      customer_name: 'سامر الخالدي',
      customer_phone: '+963933999000',
      restaurant_id: 'rest-1',
      restaurant_name: 'شاورما الشام الأصيلة',
      restaurant_phone: '+963933222333',
      restaurant_latitude: 33.4975,
      restaurant_longitude: 36.2750,
      driver_id: 'drv-1',
      driver_name: 'أحمد السعيد (كابتن دمشق)',
      driver_phone: '+963988666777',
      status: 'on_the_way',
      subtotal: 48000,
      delivery_fee: 6000,
      service_fee: 2500,
      discount_amount: 0,
      total_amount: 56500,
      restaurant_net: 42240, // 48000 - 12% (5760)
      platform_commission: 5760,
      driver_earning: 6000,
      payment_method: 'CASH',
      payment_status: 'pending',
      delivery_address: {
        city: 'دمشق',
        district: 'كفرسوسة',
        street_details: 'شارع الزهور، جانب جامع الفردوس',
        building: 'بناء الياسمين 4',
        floor: 'الطابق الثالث',
        notes: 'يرجى الاتصال عند الوصول أمام المدخل',
        phone: '+963933999000',
      },
      delivery_latitude: 33.5040,
      delivery_longitude: 36.2820,
      driver_latitude: 33.5010,
      driver_longitude: 36.2785,
      prep_time_estimate: 20,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      accepted_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      ready_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      picked_up_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'oitem-1',
          order_id: 'ord-demo-101',
          menu_item_id: 'item-101',
          item_name: 'وجبة شاورما دجاج عربي دبل',
          unit_price: 48000,
          quantity: 1,
          subtotal: 48000,
          selected_options: [{ group_name_ar: 'إضافات الصوص', name_ar: 'ثومية إضافية', price_modifier: 0 }],
        },
      ],
      status_history: [
        { id: 'sh-1', order_id: 'ord-demo-101', new_status: 'pending', changed_by_user_id: 'usr-cust-1', role: 'customer', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
        { id: 'sh-2', order_id: 'ord-demo-101', previous_status: 'pending', new_status: 'accepted', changed_by_user_id: 'usr-rest-1', role: 'restaurant', timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
        { id: 'sh-3', order_id: 'ord-demo-101', previous_status: 'accepted', new_status: 'preparing', changed_by_user_id: 'usr-rest-1', role: 'restaurant', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
        { id: 'sh-4', order_id: 'ord-demo-101', previous_status: 'preparing', new_status: 'ready', changed_by_user_id: 'usr-rest-1', role: 'restaurant', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
        { id: 'sh-5', order_id: 'ord-demo-101', previous_status: 'ready', new_status: 'driver_assigned', changed_by_user_id: 'usr-driver-1', role: 'driver', timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString() },
        { id: 'sh-6', order_id: 'ord-demo-101', previous_status: 'driver_assigned', new_status: 'picked_up', changed_by_user_id: 'usr-driver-1', role: 'driver', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
        { id: 'sh-7', order_id: 'ord-demo-101', previous_status: 'picked_up', new_status: 'on_the_way', changed_by_user_id: 'usr-driver-1', role: 'driver', timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
      ],
    };

    const initialTransactions: FinancialTransaction[] = [
      {
        id: 'tx-101',
        transaction_number: 'TXN-2026-001',
        order_id: 'ord-demo-101',
        entity_type: 'platform',
        entity_id: 'platform-main',
        entity_name: 'منصة وصّلني',
        amount: 8260, // commission (5760) + service fee (2500)
        direction: 'credit',
        transaction_type: 'platform_commission',
        balance_after: 8260,
        status: 'completed',
        notes: 'عمولة ورسوم خدمة الطلب WS-2026-1048',
        created_at: new Date().toISOString(),
      },
    ];

    const audit_logs: AuditLog[] = [
      {
        id: 'aud-1',
        action_type: 'SYSTEM_BOOTSTRAP',
        entity_type: 'SYSTEM',
        entity_id: 'WASSALNI_CORE',
        user_id: 'usr-admin-1',
        user_name: 'مدير منصة وصّلني',
        user_role: 'admin',
        ip_address: '127.0.0.1',
        new_values: { platform: 'Wassalni Syrian Food Delivery', initialized: true },
        created_at: new Date().toISOString(),
      },
    ];

    return {
      users,
      user_passwords,
      addresses: this.getInitialAddresses(),
      restaurant_categories,
      restaurants,
      menu_categories,
      menu_items,
      orders: [initialOrder],
      order_items: initialOrder.items || [],
      order_status_history: initialOrder.status_history || [],
      drivers,
      driver_assignments: [
        { id: 'da-1', order_id: 'ord-demo-101', driver_id: 'drv-1', status: 'accepted', offered_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), responded_at: new Date(Date.now() - 7 * 60 * 1000).toISOString() }
      ],
      driver_earnings: [],
      financial_transactions: initialTransactions,
      commissions,
      delivery_zones,
      coupons,
      reviews: [],
      notifications: [
        {
          id: 'notif-1',
          user_id: 'usr-cust-1',
          title_ar: 'الطلب في الطريق إليك 🛵',
          body_ar: 'الكابتن أحمد السعيد في طريقه لتسليم طلبك من شاورما الشام الأصيلة',
          type: 'driver',
          is_read: false,
          order_id: 'ord-demo-101',
          created_at: new Date().toISOString(),
        },
      ],
      support_tickets: [
        {
          id: 'tick-1',
          ticket_number: 'TCK-2026-01',
          user_id: 'usr-cust-1',
          user_name: 'سامر الخالدي',
          user_phone: '+963933999000',
          user_role: 'customer',
          order_id: 'ord-demo-101',
          subject: 'استفسار عن وقت وصول المندوب',
          category: 'delivery',
          priority: 'medium',
          status: 'in_progress',
          messages: [
            { sender_id: 'usr-cust-1', sender_name: 'سامر الخالدي', sender_role: 'customer', text: 'مرحباً، كم تبقى من الوقت لوصول المندوب إلى كفرسوسة؟', sent_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
            { sender_id: 'usr-admin-1', sender_name: 'خدمة عملاء وصّلني', sender_role: 'admin', text: 'أهلاً بك أستاذ سامر، المندوب استلم الطلب وهو على بعد 5 دقائق من موقعك.', sent_at: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
          ],
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      audit_logs,
      settlements: [
        {
          id: 'stl-demo-1',
          settlement_number: 'SET-2026-001',
          entity_type: 'restaurant',
          entity_id: 'rest-1',
          entity_name: 'شاورما الشام الأصيلة',
          amount: 126720,
          status: 'PENDING',
          period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          period_end: new Date().toISOString(),
          order_ids: ['ord-demo-101'],
          notes: 'تسوية أسبوعية لمستحقات طلبات التوصيل',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      promotions: [
        {
          id: 'prom-1',
          restaurant_id: 'rest-1',
          restaurant_name: 'شاورما الشام الأصيلة',
          title_ar: 'عرض وجبة العائلة الكبرى',
          description_ar: 'خصم 20% على وجبة الشاورما الدبل طيلة عطلة نهاية الأسبوع',
          banner_url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=800&auto=format&fit=crop&q=80',
          discount_percentage: 20,
          featured_item_id: 'item-101',
          is_approved_by_admin: true,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    };
  }
}

export const db = new DatabaseManager();
