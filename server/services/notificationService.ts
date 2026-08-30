import { db } from '../db/database.js';
import { AppNotification } from '../types/index.js';

export interface PushNotificationPayload {
  title: string;
  body: string;
  type: 'order' | 'system' | 'driver' | 'payout' | 'promotion';
  orderId?: string;
  linkUrl?: string;
  data?: Record<string, string>;
}

export class NotificationService {
  /**
   * Send notification to a specific user.
   * Stores in user's in-app notification inbox, and if device_token/FCM is configured, delivers push notification.
   */
  public static async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    const user = db.users.find(u => u.id === userId);
    if (!user) return false;

    const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newNotif: AppNotification = {
      id: notifId,
      user_id: userId,
      title_ar: payload.title,
      body_ar: payload.body,
      type: payload.type,
      order_id: payload.orderId,
      link_url: payload.linkUrl,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    db.notifications.push(newNotif);

    // If user has device tokens registered, send real FCM push
    if (user.device_tokens && user.device_tokens.length > 0) {
      this.dispatchFcmPush(user.device_tokens, payload);
    }

    db.save();
    return true;
  }

  /**
   * Broadcast notification to all admins
   */
  public static async notifyAdmins(payload: PushNotificationPayload) {
    const admins = db.users.filter(u => u.role === 'admin');
    for (const admin of admins) {
      await this.sendToUser(admin.id, payload);
    }
  }

  /**
   * Broadcast notification to all active drivers in a city
   */
  public static async notifyDriversInCity(city: string, payload: PushNotificationPayload) {
    const drivers = db.drivers.filter(d => d.city === city && d.is_online && d.is_approved);
    for (const driver of drivers) {
      await this.sendToUser(driver.user_id, payload);
    }
  }

  /**
   * Real FCM Push Dispatcher Layer
   * Checks for FIREBASE_SERVER_KEY / FCM credentials without failing if not yet configured.
   */
  private static async dispatchFcmPush(deviceTokens: string[], payload: PushNotificationPayload) {
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (!fcmServerKey) {
      // In development or prior to FCM key insertion, log structured push payload
      return;
    }

    try {
      // Standard FCM Legacy/V1 HTTP protocol payload
      for (const token of deviceTokens) {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${fcmServerKey}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: payload.title,
              body: payload.body,
              sound: 'default',
            },
            data: {
              order_id: payload.orderId || '',
              type: payload.type,
              ...payload.data,
            },
          }),
        }).catch(() => {});
      }
    } catch {
      // Fail silently without blocking core flow
    }
  }
}
