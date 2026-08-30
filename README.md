# منصة وصّلني (Wassalni) - منظومة توصيل الطعام الموحدة في سوريا
## Production-Ready Syrian Food Delivery Platform

منصة تجارية متكاملة ومصممة خصيصاً لسوق توصيل الطعام في سوريا (دمشق، حلب، حمص، اللاذقية، طرطوس، حماة)، تربط العميل والمطعم والمندوب والإدارة بنظام محاسبي مالي دقيق بالليرة السورية (SYP)، مع محرك توزيع ذكي للمناديب وتتبع مباشر للطلبات على الخرائط.

---

### 🏛️ 1. البنية التحتية والتقنية (Architecture)

- **الواجهة الأمامية (Frontend):** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Leaflet OpenStreetMap Engine, Motion Animations.
- **الخلفية (Backend):** Node.js, Express, TypeScript, Esbuild, JWT Authentication, Bcrypt Password Hashing.
- **قاعدة البيانات (Database & Persistence):** محرك بيانات علائقي مستمر وحقيقي على القرص (Persistent Relational JSON/DB Storage with Atomic Writes) متوافق تماماً مع بنية SQL/PostgreSQL Schema.
- **الأمان والتحكم بالوصول:** Role-Based Access Control (RBAC) صارم عبر جميع المسارات API مع التحقق من الهوية والملكية (Ownership Verification) وإلغاء الثقة بحسابات العميل المالية من الـ Frontend.
- **النظام المالي (Financial Engine):** تسوية أرباح المطاعم، عمولات المنصة القابلة للتخصيص، مستحقات المناديب، ونظام تحصيل الدفع نقداً عند الاستلام (Cash On Delivery) مع جهوزية معمارية كاملة لبوابة شام كاش (Sham Cash Provider Architecture).
- **نظام الإشعارات الفورية (Push Notifications):** طبقة `NotificationService` المدمجة مع Firebase Cloud Messaging (FCM) وصندوق الإشعارات الداخلي باللغة العربية.

---

### 👥 2. أدوار المستخدمين والصلاحيات (RBAC Roles)

1. **العميل (CUSTOMER):**
   - تصفح وتحديد المواقع في المدن السورية وأحيائها مع خريطة تفاعلية لاختيار موقع التوصيل بدقة.
   - البحث وتصفية المطاعم (المفتوحة، القريبة، الأعلى تقييماً) وتفضيل المطاعم والأطباق المفضلة.
   - تخصيص الوجبات، السلة المتطورة، إدارة العناوين الجغرافية المحفوظة مع إحداثيات GPS.
   - إتمام الطلب وتتبع الطلب لحظياً على الخريطة عبر دورة الحالات العشر.
   - تقييم المطعم والمندوب بعد الاستلام وفتح تذاكر الدعم الفني وتطبيق كوبونات الخصم.

2. **المطعم (RESTAURANT):**
   - لوحة تحكم فورية لاستقبال الطلبات مع تنبيهات صوتية ومرئية.
   - قبول / رفض الطلب مع تحديد وقت التحضير أو كتابة سبب الرفض.
   - إدارة قائمة المأكولات (الأقسام، الأصناف، الإضافات الاختيارية والإلزامية، الأسعار).
   - إدارة ساعات العمل ومفتاح فتح / إغلاق المطعم وحالة الضغط.
   - تقديم طلبات العروض الترويجية والخصومات (Promotions) لإدارة التطبيق.
   - السجل المالي ومطالبات التسوية الدورية (Settlements).

3. **المندوب (DRIVER):**
   - بوابة الكابتن مع مفتاح الاتصال (Online / Offline / Busy) ومشاركة الـ GPS التلقائي.
   - استقبال عروض التوصيل القريبة وتأكيد الاستلام والتسليم.
   - مسار الخريطة المتكامل (المطعم ← العميل) مع خط السير التوجيهي.
   - محفظة تحصيل الكاش ومستحقات أجور التوصيل وجدول الأرباح.

4. **الإدارة المركزية (ADMIN):**
   - لوحة قيادة مؤشرات الأداء الحية (GMV, إيرادات المنصة, العمولات, والكاش المتداول).
   - خريطة الأسطول الحية للمناديب والطلبات النشطة.
   - لوحة تحصيل ومطابقة الكاش المحصل بين المناديب وخزينة المنصة (Cash Collection & Reconciliation).
   - إدارة وتنفيذ التسويات المالية والمصرفية (Settlements Execution).
   - اعتماد المطاعم والمناديب وتدقيق الوثائق الرسمية والسيارات.
   - الموافقة على الحملات الترويجية (Promotions Approval) وتخصيص نسب العمولات وسجل التدقيق الأمني (Audit Logs).

---

### 🔄 3. دورة حياة الطلب (10 Order States Machine)

```
[PENDING] (بانتظار قبول المطعم)
   ↓
[ACCEPTED] (تم القبول وتحديد وقت التحضير)
   ↓
[PREPARING] (جاري تحضير الوجبة)
   ↓
[READY] (الوجبة جاهزة → إطلاق محرك التوزيع التلقائي للأقرب)
   ↓
[DRIVER_ASSIGNED] (تم إسناد الطلب للمندوب وقبوله)
   ↓
[PICKED_UP] (استلام الوجبة من المطعم)
   ↓
[ON_THE_WAY] (الكابتن في الطريق للعميل مع تتبع GPS مباشر)
   ↓
[DELIVERED] (تم التسليم بنجاح وتحصيل المبلغ نقداً وتسجيل القيد المالي)
```
*(حالات الاستثناء: `REJECTED` عند رفض المطعم مع ذكر السبب، أو `CANCELLED` عند الإلغاء المصرح به).*

---

### 💳 4. المحرك المالي والمحاسبي (Financial Ledger)

- **حساب الفاتورة:**
  $$\text{Grand Total} = \text{Subtotal} + \text{Delivery Fee} + \text{Service Fee} - \text{Discount}$$
- **توزيع العوائد:**
  $$\text{Platform Commission} = \text{Subtotal} \times \text{Commission Rate \%}$$
  $$\text{Restaurant Net} = \text{Subtotal} - \text{Platform Commission}$$
  $$\text{Driver Earnings} = \text{Delivery Fee} + \text{Tips}$$
- **التسجيل المزدوج:** يتم توليد قيد مالي في `financial_transactions` لكل حركة بيع أو عمولة أو تسوية لتفادي أي فروقات محاسبية.

---

### 🔌 5. واجهات برمجة التطبيقات (Complete API Reference)

#### 🔑 المصادقة والحسابات (Auth & Profiles)
- `POST /api/auth/register` - تسجيل مستخدم جديد (عميل / مطعم / مندوب)
- `POST /api/auth/login` - تسجيل الدخول والحصول على JWT Bearer Token
- `POST /api/auth/demo-login` - تبديل الأدوار الفوري للاختبار التجاري
- `GET /api/auth/me` - استرجاع الملف الشخصي وبيانات الدور
- `PUT /api/auth/profile` - تحديث بيانات المستخدم (الاسم، الهاتف، الصورة)
- `POST /api/auth/device-token` - تسجيل رمز جهاز FCM للإشعارات الفورية
- `POST /api/auth/favorites/toggle` - إضافة/إزالة مطعم أو وجبة من المفضلة

#### 🍔 المطاعم والقوائم (Restaurants & Menu)
- `GET /api/restaurants/categories` - تصفح أصناف المطاعم
- `GET /api/restaurants` - تصفح والبحث المتقدم في المطاعم (تصنيف، مدينة، فلترة، تقييم)
- `GET /api/restaurants/:id` - استرجاع بيانات المطعم وقائمة المأكولات
- `GET /api/restaurants/deals/promotions` - استرجاع العروض الترويجية والخصومات المعتمدة
- `GET /api/restaurants/my/dashboard` - لوحة تحكم صاحب المطعم والإحصائيات
- `PUT /api/restaurants/my/status` - تحديث حالة المطعم (مفتوح / مغلق / مشغول)
- `POST /api/restaurants/my/menu-items` - إضافة صنف جديد لقائمة المأكولات
- `PUT /api/restaurants/my/menu-items/:itemId` - تعديل بيانات الصنف والخيارات والأسعار
- `DELETE /api/restaurants/my/menu-items/:itemId` - حذف صنف من القائمة
- `POST /api/restaurants/my/categories` - إضافة تصنيف جديد في منيو المطعم
- `POST /api/restaurants/my/promotions` - إنشاء حملة ترويجية لطلب موافقة الإدارة

#### 📦 الطلبات (Orders & State Machine)
- `POST /api/orders/create` - إنشاء طلب جديد مع تدقيق وحساب الأسعار سيرفر-سايد
- `GET /api/orders/my-orders` - استرجاع سجل طلبات العميل الحالي
- `GET /api/orders/restaurant/all` - استرجاع كافة طلبات المطعم النشطة والسابقة
- `GET /api/orders/:id` - استرجاع تفاصيل الطلب وتاريخ الحالات
- `POST /api/orders/:id/accept` - قبول الطلب وتحديد وقت التحضير (المطعم)
- `POST /api/orders/:id/reject` - رفض الطلب مع تبرير السبب (المطعم)
- `POST /api/orders/:id/ready` - إعلان جاهزية الطلب وبدء إسناد المندوب (المطعم)
- `POST /api/orders/:id/pickup` - تأكيد استلام الوجبة من المطعم (المندوب)
- `POST /api/orders/:id/deliver` - تأكيد تسليم الوجبة للعميل وتحصيل الكاش (المندوب)
- `POST /api/orders/:id/cancel` - إلغاء الطلب المصرح به

#### 🛵 المناديب والأسطول (Drivers & Dispatching)
- `GET /api/drivers/me` - ملف المندوب، المهمة النشطة، وجدول الأرباح
- `PUT /api/drivers/status` - تبديل حالة الاتصال وتحديث إحداثيات GPS
- `GET /api/drivers/offers` - استرجاع عروض التوصيل المعروضة على المندوب
- `POST /api/drivers/offers/:assignmentId/accept` - قبول عرض التوصيل
- `POST /api/drivers/offers/:assignmentId/decline` - رفض عرض التوصيل وإحالته لغيره
- `GET /api/drivers/earnings` - سجل أرباح التوصيل المفصل

#### 🗺️ الخرائط والمواقع (Geo & Delivery Estimates)
- `GET /api/geo/cities` - قائمة المدن السورية وأحيائها وإحداثياتها
- `POST /api/geo/estimate-delivery` - احتساب مسافة التوصيل وأجر التوصيل والوقت المتوقع بدقة
- `GET /api/addresses` - استرجاع عناوين العميل المحفوظة
- `POST /api/addresses` - حفظ عنوان جديد مع الإحداثيات الجغرافية
- `PUT /api/addresses/:id` - تعديل بيانات العنوان
- `DELETE /api/addresses/:id` - حذف العنوان المحفوظ

#### 🎟️ الكوبونات والتقييمات والدعم (Coupons, Reviews & Support)
- `POST /api/orders/validate-coupon` - التحقق سيرفر-سايد من صلاحية كود الخصم وشروطه
- `POST /api/reviews` - تقييم المطعم والمندوب بعد اكتمال الطلب
- `GET /api/reviews/restaurant/:restaurantId` - تقييمات وتعليقات العملاء لمطعم
- `GET /api/support` - تذاكر الدعم الفني للمستخدم
- `POST /api/support` - فتح تذكرة دعم فني جديدة
- `POST /api/support/:id/messages` - إرسال رد في تذكرة الدعم
- `GET /api/notifications` - استرجاع الإشعارات الفورية
- `PUT /api/notifications/:id/read` - تعيين إشعار كمقروء
- `PUT /api/notifications/mark-all-read` - تعيين كافة الإشعارات كمقروءة

#### 👑 الإدارة المركزية والمالية (Admin & Settlements)
- `GET /api/admin/kpis` - مؤشرات الأداء الحية والأرباح والطلبات
- `GET /api/admin/live-map` - رادار العمليات المباشر (المطاعم، المناديب، والطلبات)
- `GET /api/admin/cash-collections` - لوحة تحصيل ومطابقة الكاش المتداول مع المناديب
- `GET /api/admin/settlements` - استعراض طلبات وسجلات التسويات المالية
- `POST /api/admin/settlements` - تنفيذ واعتماد تسوية مالية للمطاعم والمناديب
- `GET /api/admin/promotions` - إدارة ومراجعة العروض الترويجية
- `PUT /api/admin/promotions/:id/approve` - الموافقة على العرض الترويجي وتفعيله
- `GET /api/admin/restaurants` / `POST` / `PUT` - إدارة المطاعم واعتمادها
- `GET /api/admin/drivers` / `PUT /api/admin/drivers/:id/approve` - اعتماد المناديب وتدقيق المركبات
- `GET /api/admin/commissions` / `PUT` - تعديل نسب عمولات المنصة وأجور الكيلومتر
- `GET /api/admin/coupons` / `POST` / `DELETE` - إدارة حملات أكواد الخصم
- `GET /api/admin/financial-ledger` - دفتر القيود المحاسبية وسجل المعاملات
- `GET /api/admin/audit-logs` - سجل التدقيق الأمني لجميع العمليات الحساسة

---

### 🛡️ 6. المتغيرات البيئية (Environment Variables)

راجع ملف `.env.example` لضبط المفاتيح الخاصة بالإنتاج:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=wassalni_syria_production_jwt_secret_key_2026

# Sham Cash Payment Gateway (Architecture Ready)
SHAM_CASH_API_KEY=
SHAM_CASH_MERCHANT_ID=
SHAM_CASH_API_URL=https://api.shamcash.sy/v1
SHAM_CASH_WEBHOOK_SECRET=

# Firebase Cloud Messaging Push Notifications
FCM_SERVER_KEY=
```
