-- ==============================================================================
-- WASSALNI PRODUCTION DATABASE SCHEMA (PostgreSQL / Supabase Compatible)
-- Migration: 001_initial_schema.sql
-- Description: Complete production schema with Tables, Enums, Foreign Keys,
--              Indexes, Constraints, Timestamps, and Row Level Security (RLS).
-- ==============================================================================

-- 1. ENUMS
CREATE TYPE user_role_type AS ENUM ('customer', 'restaurant', 'driver', 'admin');
CREATE TYPE order_status_type AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'preparing',
    'ready',
    'driver_assigned',
    'picked_up',
    'on_the_way',
    'delivered',
    'cancelled'
);
CREATE TYPE payment_method_type AS ENUM ('cash_on_delivery', 'sham_cash', 'wallet');
CREATE TYPE payment_status_type AS ENUM ('pending', 'collected', 'failed', 'refunded');
CREATE TYPE driver_status_type AS ENUM ('offline', 'online', 'busy', 'suspended');
CREATE TYPE ticket_status_type AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE settlement_status_type AS ENUM ('pending', 'processing', 'paid', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('order_payment', 'commission_deduction', 'driver_payout', 'settlement', 'refund');

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    role user_role_type NOT NULL DEFAULT 'customer',
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- 4. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    area VARCHAR(100) NOT NULL,
    street_details TEXT NOT NULL,
    building VARCHAR(50),
    floor VARCHAR(20),
    notes TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- 5. RESTAURANT CATEGORIES
CREATE TABLE IF NOT EXISTS restaurant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    slug VARCHAR(100) NOT NULL UNIQUE,
    image_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES restaurant_categories(id) ON DELETE SET NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    phone VARCHAR(30) NOT NULL,
    city VARCHAR(50) NOT NULL,
    area VARCHAR(100) NOT NULL,
    address_details TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    is_busy BOOLEAN NOT NULL DEFAULT FALSE,
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    avg_prep_time_minutes INT NOT NULL DEFAULT 25,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 1.0 AND rating <= 5.0),
    review_count INT NOT NULL DEFAULT 0,
    opening_time VARCHAR(10) NOT NULL DEFAULT '10:00',
    closing_time VARCHAR(10) NOT NULL DEFAULT '00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_restaurants_owner ON restaurants(owner_user_id);
CREATE INDEX idx_restaurants_city_area ON restaurants(city, area);
CREATE INDEX idx_restaurants_is_open ON restaurants(is_open, is_active);

-- 7. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name_ar VARCHAR(100) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id);

-- 8. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    name_ar VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    prep_time_minutes INT NOT NULL DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

-- 9. MENU ITEM OPTIONS / ADDONS
CREATE TABLE IF NOT EXISTS menu_item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    name_ar VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    max_select INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_menu_item_options_item ON menu_item_options(menu_item_id);

-- 10. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'motorcycle',
    vehicle_number VARCHAR(50) NOT NULL,
    national_id VARCHAR(50) NOT NULL,
    driving_license_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    status driver_status_type NOT NULL DEFAULT 'offline',
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    total_deliveries INT NOT NULL DEFAULT 0,
    cash_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(is_online, is_approved, status);

-- 11. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_discount_amount NUMERIC(12, 2),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    max_usage_total INT,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_coupons_code ON coupons(code);

-- 12. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    delivery_address JSONB NOT NULL,
    status order_status_type NOT NULL DEFAULT 'pending',
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    grand_total NUMERIC(12, 2) NOT NULL CHECK (grand_total >= 0),
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    restaurant_net NUMERIC(12, 2) NOT NULL DEFAULT 0,
    driver_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    platform_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method payment_method_type NOT NULL DEFAULT 'cash_on_delivery',
    payment_status payment_status_type NOT NULL DEFAULT 'pending',
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    notes TEXT,
    cancel_reason TEXT,
    reject_reason TEXT,
    estimated_prep_minutes INT NOT NULL DEFAULT 25,
    driver_latitude DOUBLE PRECISION,
    driver_longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 13. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name_ar VARCHAR(150) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    selected_options JSONB,
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- 14. ORDER STATUS HISTORY (State Machine Audit)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status order_status_type NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_role VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- 15. DRIVER ASSIGNMENTS (Dispatch Engine Records)
CREATE TABLE IF NOT EXISTS driver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'rejected', 'timeout')),
    offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    distance_km NUMERIC(6, 2)
);
CREATE INDEX idx_driver_assignments_order ON driver_assignments(order_id);
CREATE INDEX idx_driver_assignments_driver ON driver_assignments(driver_id);

-- 16. FINANCIAL TRANSACTIONS (Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    description TEXT,
    reference_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_financial_transactions_order ON financial_transactions(order_id);

-- 17. RESTAURANT SETTLEMENTS
CREATE TABLE IF NOT EXISTS restaurant_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status settlement_status_type NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(100),
    notes TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. DRIVER EARNINGS
CREATE TABLE IF NOT EXISTS driver_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_fee_earned NUMERIC(12, 2) NOT NULL,
    tip_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cash_collected NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_earnings NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_driver_earnings_driver ON driver_earnings(driver_id);

-- 19. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    restaurant_rating INT NOT NULL CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
    restaurant_comment TEXT,
    driver_rating INT CHECK (driver_rating >= 1 AND driver_rating <= 5),
    driver_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);

-- 20. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status_type NOT NULL DEFAULT 'open',
    admin_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);

-- 21. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- 22. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
