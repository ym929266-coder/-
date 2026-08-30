// Shared Frontend Types
export type UserRole = 'customer' | 'restaurant' | 'driver' | 'admin';

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

export interface User {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: UserRole;
  status: string;
  avatar_url?: string;
}

export interface MenuItemOption {
  id: string;
  group_name_ar: string;
  name_ar: string;
  price_modifier: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name_ar: string;
  description_ar: string;
  price: number;
  image_url: string;
  is_available: boolean;
  preparation_time_mins: number;
  calories?: number;
  options: MenuItemOption[];
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

export interface RestaurantCategory {
  id: string;
  name_ar: string;
  icon_slug: string;
  image_url: string;
  sort_order: number;
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
  opening_time: string;
  closing_time: string;
  is_open: boolean;
  is_busy: boolean;
  is_approved: boolean;
  is_active: boolean;
  min_order_amount: number;
  base_delivery_fee: number;
  prep_time_minutes: number;
  rating: number;
  rating_count: number;
  commission_rate_percentage: number;
}

export interface CartItemOption {
  group_name_ar: string;
  name_ar: string;
  price_modifier: number;
}

export interface CartItem {
  cart_item_id: string;
  menu_item_id: string;
  restaurant_id: string;
  restaurant_name: string;
  name_ar: string;
  unit_price: number;
  total_unit_price: number;
  quantity: number;
  image_url: string;
  selected_options: CartItemOption[];
  special_instructions?: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  selected_options: CartItemOption[];
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
  order_number: string;
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
  prep_time_estimate?: number;
  driver_latitude?: number;
  driver_longitude?: number;
  
  created_at: string;
  accepted_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  updated_at: string;
  
  items?: OrderItem[];
  status_history?: OrderStatusHistory[];
  live_driver?: {
    name: string;
    phone: string;
    vehicle: string;
    plate: string;
    rating: number;
    latitude: number;
    longitude: number;
  };
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
  status: 'offline' | 'online' | 'busy' | 'suspended';
  is_approved: boolean;
  rating: number;
  total_deliveries: number;
  active_order_id?: string;
  documents?: any[];
}

export interface AppNotification {
  id: string;
  title_ar: string;
  body_ar: string;
  type: string;
  is_read: boolean;
  order_id?: string;
  created_at: string;
}
