// Core data types for Wassalni Syrian Food Delivery Platform

export type UserRole = 'customer' | 'restaurant' | 'driver' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'pending_approval';

export type DriverStatus = 'offline' | 'online' | 'busy' | 'suspended';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready'
  | 'driver_assigned'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'CASH' | 'SHAM_CASH';

export type PaymentStatus = 'pending' | 'collected' | 'failed' | 'refunded';

export type RestaurantStatus = 'OPEN' | 'CLOSED' | 'BUSY' | 'SUSPENDED';

export type DiscountType = 'percentage' | 'fixed';

export type TransactionType =
  | 'order_gross'
  | 'platform_commission'
  | 'delivery_fee'
  | 'service_fee'
  | 'restaurant_payout'
  | 'driver_payout'
  | 'coupon_discount'
  | 'adjustment';

export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  device_tokens?: string[];
  favorite_restaurant_ids?: string[];
  favorite_menu_item_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  default_address_id?: string;
  loyalty_points: number;
  total_orders: number;
}

export interface Address {
  id: string;
  user_id: string;
  title: string; // e.g., "المنزل", "العمل"
  city: string; // دمشق، حلب، حمص، اللاذقية، طرطوس
  district: string; // المزة، الشعلان، كفرسوسة، القصاع، etc.
  street_details: string;
  building: string;
  floor: string;
  notes?: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  phone_contact: string;
  created_at: string;
}

export interface RestaurantCategory {
  id: string;
  name_ar: string;
  icon_slug: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface Restaurant {
  id: string;
  owner_user_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  logo_url: string;
  banner_url: string;
  phone: string;
  category_id: string;
  category_name?: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  address_text: string;
  opening_time: string; // e.g. "10:00"
  closing_time: string; // e.g. "23:30"
  status?: RestaurantStatus;
  is_open: boolean;
  is_busy: boolean;
  is_approved: boolean;
  is_active: boolean;
  min_order_amount: number; // SYP
  base_delivery_fee: number; // SYP
  prep_time_minutes: number; // e.g. 25
  rating: number; // 4.8
  rating_count: number;
  commission_rate_percentage: number; // e.g. 12%
  bank_account_info?: string;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItemOption {
  id: string;
  group_name_ar: string; // e.g. "الحجم" or "إضافات اختيارية"
  name_ar: string; // e.g. "كبير", "جبنة زيادة", "ثوم إضافي"
  price_modifier: number; // SYP (0 or positive)
  is_required?: boolean;
  max_select?: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name_ar: string;
  description_ar: string;
  price: number; // in SYP
  image_url: string;
  is_available: boolean;
  preparation_time_mins: number;
  calories?: number;
  sort_order: number;
  options: MenuItemOption[];
  created_at: string;
}

export interface OrderItemOptionSelection {
  group_name_ar: string;
  name_ar: string;
  price_modifier: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  selected_options: OrderItemOptionSelection[];
  special_instructions?: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus;
  new_status: OrderStatus;
  changed_by_user_id: string;
  role: UserRole;
  notes?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  order_number: string; // e.g., "WS-2026-8942"
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_phone: string;
  restaurant_latitude: number;
  restaurant_longitude: number;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  status: OrderStatus;
  
  // Financial breakdown in SYP (Calculated exclusively server-side)
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  restaurant_net: number;
  platform_commission: number;
  driver_earning: number;
  
  coupon_code?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  
  delivery_address: {
    city: string;
    district: string;
    street_details: string;
    building: string;
    floor: string;
    notes?: string;
    phone: string;
  };
  delivery_latitude: number;
  delivery_longitude: number;
  
  customer_notes?: string;
  reject_reason?: string;
  prep_time_estimate?: number; // in mins
  driver_latitude?: number;
  driver_longitude?: number;
  
  cash_collection_details?: {
    amount: number;
    collector_id: string;
    collector_name: string;
    collected_at: string;
    order_id: string;
    order_number: string;
  };
  
  created_at: string;
  accepted_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  updated_at: string;
  
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
}

export interface DriverAssignment {
  id: string;
  order_id: string;
  driver_id: string;
  status: 'offered' | 'accepted' | 'declined' | 'timeout' | 'cancelled';
  offered_at: string;
  responded_at?: string;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: 'motorcycle' | 'bicycle' | 'car';
  vehicle_plate: string;
  city: string;
  current_latitude: number;
  current_longitude: number;
  is_online: boolean;
  status: DriverStatus;
  is_approved: boolean;
  national_id: string;
  rating: number;
  total_deliveries: number;
  active_order_id?: string;
  documents?: DriverDocument[];
  created_at: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  doc_type: 'national_id_front' | 'driving_license' | 'vehicle_registration';
  doc_url: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
  verified_at?: string;
}

export interface DriverEarningRecord {
  id: string;
  driver_id: string;
  order_id: string;
  order_number: string;
  delivery_fee_earned: number;
  bonus_amount: number;
  tip_amount: number;
  total_earned: number;
  paid_status: 'pending_payout' | 'paid';
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_number: string;
  order_id?: string;
  entity_type: 'platform' | 'restaurant' | 'driver' | 'customer';
  entity_id: string;
  entity_name: string;
  amount: number; // SYP
  direction: 'credit' | 'debit';
  transaction_type: TransactionType;
  balance_after: number;
  status: 'completed' | 'pending' | 'reversed';
  notes: string;
  created_at: string;
}

export interface CommissionConfig {
  id: string;
  name: string;
  default_restaurant_commission_pct: number; // e.g. 12%
  default_service_fee: number; // e.g. 2500 SYP
  base_delivery_fee_per_km: number; // e.g. 1500 SYP/km
  min_delivery_fee: number; // e.g. 5000 SYP
  updated_at: string;
  updated_by: string;
}

export interface DeliveryZone {
  id: string;
  city: string;
  name_ar: string;
  base_fee: number;
  min_order: number;
  is_active: boolean;
  center_lat: number;
  center_lng: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number; // e.g. 15 for 15% or 10000 for 10,000 SYP
  min_order_amount: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
  max_usage_total: number;
  usage_count: number;
  restaurant_id?: string; // empty means all restaurants
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  restaurant_id: string;
  restaurant_name: string;
  driver_id?: string;
  driver_name?: string;
  restaurant_rating: number; // 1-5
  driver_rating?: number; // 1-5
  comment?: string;
  restaurant_reply?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title_ar: string;
  body_ar: string;
  type: 'order' | 'system' | 'driver' | 'payout' | 'promotion';
  link_url?: string;
  is_read: boolean;
  order_id?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_role: UserRole;
  order_id?: string;
  subject: string;
  category: 'delivery' | 'food_quality' | 'payment' | 'account' | 'technical';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: Array<{
    sender_id: string;
    sender_name: string;
    sender_role: UserRole;
    text: string;
    sent_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  ip_address: string;
  old_values?: any;
  new_values?: any;
  created_at: string;
}

export type SettlementStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED';

export interface Settlement {
  id: string;
  settlement_number: string;
  entity_type: 'restaurant' | 'driver';
  entity_id: string;
  entity_name: string;
  amount: number; // SYP
  status: SettlementStatus;
  period_start: string;
  period_end: string;
  order_ids: string[];
  notes?: string;
  processed_by_admin_id?: string;
  processed_at?: string;
  payout_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  title_ar: string;
  description_ar: string;
  banner_url: string;
  discount_percentage: number;
  featured_item_id?: string;
  is_approved_by_admin: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

