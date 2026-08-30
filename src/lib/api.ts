// HTTP API Client for Wassalni Backend

const API_BASE = '/api';

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('wassalni_token');
  }

  private static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `خطأ في الاتصال بالسيرفر (${response.status})`);
    }

    return data;
  }

  // Auth endpoints
  static async login(emailOrPhone: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    });
  }

  static async register(payload: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async demoLogin(role: string) {
    return this.request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  static async getMe() {
    return this.request('/auth/me');
  }

  // Restaurants
  static async getCategories() {
    return this.request('/restaurants/categories');
  }

  static async getRestaurants(params?: { category?: string; search?: string; city?: string; open_only?: boolean; high_rated?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.city) query.append('city', params.city);
    if (params?.open_only) query.append('open_only', 'true');
    if (params?.high_rated) query.append('high_rated', 'true');
    return this.request(`/restaurants?${query.toString()}`);
  }

  static async getRestaurantDetail(id: string) {
    return this.request(`/restaurants/${id}`);
  }

  static async getRestaurantDashboard() {
    return this.request('/restaurants/my/dashboard');
  }

  static async updateRestaurantStatus(status: { is_open?: boolean; is_busy?: boolean; prep_time_minutes?: number }) {
    return this.request('/restaurants/my/status', {
      method: 'PUT',
      body: JSON.stringify(status),
    });
  }

  static async addMenuItem(item: any) {
    return this.request('/restaurants/my/menu-items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  static async updateMenuItem(itemId: string, item: any) {
    return this.request(`/restaurants/my/menu-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  static async deleteMenuItem(itemId: string) {
    return this.request(`/restaurants/my/menu-items/${itemId}`, {
      method: 'DELETE',
    });
  }

  static async addMenuCategory(category: { name_ar: string }) {
    return this.request('/restaurants/my/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  // Orders
  static async createOrder(orderPayload: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload),
    });
  }

  static async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  static async getMyOrders() {
    return this.request('/orders/my/all');
  }

  static async getRestaurantOrders() {
    return this.request('/orders/restaurant/all');
  }

  static async acceptOrder(orderId: string, prepTime?: number) {
    return this.request(`/orders/${orderId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ prep_time: prepTime }),
    });
  }

  static async rejectOrder(orderId: string, reason?: string) {
    return this.request(`/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async markOrderPreparing(orderId: string) {
    return this.request(`/orders/${orderId}/preparing`, {
      method: 'POST',
    });
  }

  static async markOrderReady(orderId: string) {
    return this.request(`/orders/${orderId}/ready`, {
      method: 'POST',
    });
  }

  static async pickupOrder(orderId: string) {
    return this.request(`/orders/${orderId}/pickup`, {
      method: 'POST',
    });
  }

  static async deliverOrder(orderId: string) {
    return this.request(`/orders/${orderId}/deliver`, {
      method: 'POST',
    });
  }

  static async cancelOrder(orderId: string, reason?: string) {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  static async updateDriverLocation(orderId: string, latitude: number, longitude: number) {
    return this.request(`/orders/${orderId}/update-driver-location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  // Driver
  static async getDriverMe() {
    return this.request('/drivers/me');
  }

  static async updateDriverStatus(status: { is_online: boolean; latitude?: number; longitude?: number }) {
    return this.request('/drivers/status', {
      method: 'PUT',
      body: JSON.stringify(status),
    });
  }

  static async getDriverOffers() {
    return this.request('/drivers/offers');
  }

  static async respondToOffer(assignmentId: string, action: 'accept' | 'decline') {
    return this.request(`/drivers/offers/${assignmentId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  static async uploadDriverDoc(docType: string, docUrl: string) {
    return this.request('/drivers/documents', {
      method: 'POST',
      body: JSON.stringify({ doc_type: docType, doc_url: docUrl }),
    });
  }

  // Admin
  static async getAdminKpis() {
    return this.request('/admin/kpis');
  }

  static async getAdminLiveMap() {
    return this.request('/admin/live-map');
  }

  static async getAdminRestaurants() {
    return this.request('/admin/restaurants');
  }

  static async updateAdminRestaurant(id: string, payload: any) {
    return this.request(`/admin/restaurants/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  static async getAdminDrivers() {
    return this.request('/admin/drivers');
  }

  static async updateAdminDriver(id: string, payload: any) {
    return this.request(`/admin/drivers/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  static async getAdminCommissions() {
    return this.request('/admin/commissions');
  }

  static async updateAdminCommissions(payload: any) {
    return this.request('/admin/commissions', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  static async getAdminCoupons() {
    return this.request('/admin/coupons');
  }

  static async createAdminCoupon(payload: any) {
    return this.request('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async deleteAdminCoupon(id: string) {
    return this.request(`/admin/coupons/${id}`, {
      method: 'DELETE',
    });
  }

  static async getAdminFinancialLedger() {
    return this.request('/admin/financial-ledger');
  }

  static async getAdminAuditLogs() {
    return this.request('/admin/audit-logs');
  }

  static async getAdminOrders() {
    return this.request('/admin/orders');
  }

  // Reviews
  static async submitReview(reviewPayload: {
    order_id: string;
    restaurant_rating: number;
    driver_rating?: number;
    comment?: string;
  }) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewPayload),
    });
  }

  // Notifications
  static async getNotifications() {
    return this.request('/notifications');
  }

  static async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  static async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // Support
  static async getSupportTickets() {
    return this.request('/support');
  }

  static async createSupportTicket(ticket: { subject: string; message: string; category?: string; order_id?: string }) {
    return this.request('/support', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  static async replySupportTicket(ticketId: string, text: string) {
    return this.request(`/support/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Geo
  static async getCities() {
    return this.request('/geo/cities');
  }

  static async estimateDelivery(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) {
    return this.request('/geo/estimate-delivery', {
      method: 'POST',
      body: JSON.stringify({
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: dest.lat,
        destLng: dest.lng,
      }),
    });
  }
}
