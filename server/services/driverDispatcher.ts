import { db } from '../db/database.js';
import { DriverProfile, Order } from '../types/index.js';

export class DriverDispatcher {
  /**
   * Calculates Haversine distance between two GPS coordinates in Kilometers
   */
  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Find and rank available, online, approved drivers for a given order
   */
  public static findCandidates(order: Order): Array<{ driver: DriverProfile; distanceKm: number }> {
    const candidates = db.drivers.filter(
      d => d.is_online && d.status === 'online' && d.is_approved && !d.active_order_id
    );

    const scored = candidates.map(driver => {
      const distance = this.calculateDistanceKm(
        driver.current_latitude,
        driver.current_longitude,
        order.restaurant_latitude,
        order.restaurant_longitude
      );
      return { driver, distanceKm: distance };
    });

    // Sort by shortest distance to restaurant first, then highest rating
    return scored.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return b.driver.rating - a.driver.rating;
    });
  }

  /**
   * Dispatch an order offer to the best candidate driver
   */
  public static dispatchOrder(orderId: string): boolean {
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return false;

    const candidates = this.findCandidates(order);
    if (candidates.length === 0) {
      console.log(`[Dispatcher] No available online drivers found for order ${order.order_number}`);
      return false;
    }

    const bestCandidate = candidates[0].driver;

    // Check if assignment already exists
    let assignment = db.driver_assignments.find(
      a => a.order_id === order.id && a.driver_id === bestCandidate.id
    );

    if (!assignment) {
      assignment = {
        id: `da-${Date.now()}`,
        order_id: order.id,
        driver_id: bestCandidate.id,
        status: 'offered',
        offered_at: new Date().toISOString(),
      };
      db.driver_assignments.push(assignment);
    } else {
      assignment.status = 'offered';
      assignment.offered_at = new Date().toISOString();
    }

    // Create notification for driver
    db.notifications.push({
      id: `notif-drv-${Date.now()}`,
      user_id: bestCandidate.user_id,
      title_ar: 'عرض توصيل طلب جديد 🛵',
      body_ar: `طلب جديد من ${order.restaurant_name} بقيمة أرباح توصيل ${order.driver_earning.toLocaleString()} ل.س`,
      type: 'driver',
      order_id: order.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    db.save();
    return true;
  }
}
