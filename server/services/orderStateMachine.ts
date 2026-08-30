import { db } from '../db/database.js';
import { Order, OrderStatus, OrderStatusHistory, UserRole } from '../types/index.js';
import { FinancialEngine } from './financialEngine.js';
import { DriverDispatcher } from './driverDispatcher.js';
import { NotificationService } from './notificationService.js';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  rejected: [],
  preparing: ['ready', 'cancelled'],
  ready: ['driver_assigned', 'picked_up', 'cancelled'],
  driver_assigned: ['picked_up', 'ready', 'cancelled'], // can revert to ready if driver cancels
  picked_up: ['on_the_way', 'delivered'],
  on_the_way: ['delivered'],
  delivered: [],
  cancelled: [],
};

export class OrderStateMachine {
  public static canTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  public static updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedByUserId: string,
    role: UserRole,
    notes?: string,
    metadata?: {
      driverId?: string;
      rejectReason?: string;
      prepTime?: number;
    }
  ): { success: boolean; message: string; order?: Order } {
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
      return { success: false, message: 'الطلب غير موجود' };
    }

    if (!this.canTransition(order.status, newStatus)) {
      return {
        success: false,
        message: `لا يمكن نقل حالة الطلب من [${order.status}] إلى [${newStatus}]`,
      };
    }

    const prevStatus = order.status;
    order.status = newStatus;
    order.updated_at = new Date().toISOString();

    if (metadata?.rejectReason) {
      order.reject_reason = metadata.rejectReason;
    }
    if (metadata?.prepTime) {
      order.prep_time_estimate = metadata.prepTime;
    }

    // Role-specific assignment and timestamps
    if (newStatus === 'accepted') {
      order.accepted_at = new Date().toISOString();
      NotificationService.sendToUser(order.customer_id, {
        title: 'تم قبول طلبك بنجاح ✅',
        body: `مطعم ${order.restaurant_name} بدأ بتجهيز طلبك ومدة التحضير المتوقعة ${order.prep_time_estimate || 20} دقيقة`,
        type: 'order',
        orderId: order.id,
      });
    } else if (newStatus === 'rejected') {
      NotificationService.sendToUser(order.customer_id, {
        title: 'تعذر قبول الطلب ❌',
        body: `نعتذر منك، تم رفض الطلب بسبب: ${order.reject_reason || 'ضغط كبير في المطعم'}`,
        type: 'order',
        orderId: order.id,
      });
    } else if (newStatus === 'preparing') {
      NotificationService.sendToUser(order.customer_id, {
        title: 'جاري تحضير طعامك 🍳',
        body: `الشيف يقوم الآن بتحضير الوجبات الساخنة بعناية`,
        type: 'order',
        orderId: order.id,
      });
    } else if (newStatus === 'ready') {
      order.ready_at = new Date().toISOString();
      NotificationService.sendToUser(order.customer_id, {
        title: 'طلبك جاهز للاستلام 📦',
        body: `وجبتك جاهزة وتم إرسال إشعار للمندوب لاستلامها فوراً`,
        type: 'order',
        orderId: order.id,
      });
      // Auto-dispatch nearest driver if not already assigned
      if (!order.driver_id) {
        DriverDispatcher.dispatchOrder(order.id);
      }
    } else if (newStatus === 'driver_assigned' && metadata?.driverId) {
      const driver = db.drivers.find(d => d.id === metadata.driverId);
      if (driver) {
        order.driver_id = driver.id;
        order.driver_name = driver.full_name;
        order.driver_phone = driver.phone;
        order.driver_latitude = driver.current_latitude;
        order.driver_longitude = driver.current_longitude;
        driver.active_order_id = order.id;
        driver.status = 'busy';

        NotificationService.sendToUser(order.customer_id, {
          title: 'تم تعيين المندوب 🛵',
          body: `الكابتن ${driver.full_name} سيتولى توصيل طلبك`,
          type: 'order',
          orderId: order.id,
        });

        NotificationService.sendToUser(driver.user_id, {
          title: 'تم إسناد الطلب إليك 🎯',
          body: `تم تأكيد إسناد طلب رقم ${order.order_number} إليك، يرجى التوجه لمطعم ${order.restaurant_name}`,
          type: 'driver',
          orderId: order.id,
        });
      }
    } else if (newStatus === 'picked_up') {
      order.picked_up_at = new Date().toISOString();
      order.status = 'on_the_way'; // Directly transition to on the way for seamless UX
      NotificationService.sendToUser(order.customer_id, {
        title: 'الكابتن في الطريق إليك 🚀',
        body: `تم استلام الطلب من المطعم والمندوب متوجه لعنوانك الآن`,
        type: 'order',
        orderId: order.id,
      });
    } else if (newStatus === 'delivered') {
      order.delivered_at = new Date().toISOString();
      order.payment_status = 'collected'; // Mark cash collected
      const nowIso = new Date().toISOString();

      // Record cash collection details for strict financial audit
      if (order.payment_method === 'CASH') {
        order.cash_collection_details = {
          amount: order.total_amount,
          collector_id: order.driver_id || changedByUserId,
          collector_name: order.driver_name || 'الكابتن المستلم',
          collected_at: nowIso,
          order_id: order.id,
          order_number: order.order_number,
        };
      }

      // Release driver
      if (order.driver_id) {
        const driver = db.drivers.find(d => d.id === order.driver_id);
        if (driver) {
          driver.active_order_id = undefined;
          driver.status = 'online';
          driver.total_deliveries += 1;
        }
      }

      // Record financial settlement in ledger
      FinancialEngine.recordOrderSettlementTransactions(order);

      NotificationService.sendToUser(order.customer_id, {
        title: 'تم تسليم الطلب بنجاح 🌟',
        body: `صحتين وعافية! نتمنى أن تنال الوجبة إعجابك، يرجى تقييم تجربتك`,
        type: 'order',
        orderId: order.id,
      });
    } else if (newStatus === 'cancelled') {
      if (order.driver_id) {
        const driver = db.drivers.find(d => d.id === order.driver_id);
        if (driver) {
          driver.active_order_id = undefined;
          driver.status = 'online';
        }
      }
      NotificationService.sendToUser(order.customer_id, {
        title: 'تم إلغاء الطلب ⚠️',
        body: notes || 'تم إلغاء الطلب من قبل النظام أو الإدارة',
        type: 'order',
        orderId: order.id,
      });
    }

    // Append to status history
    const historyEntry: OrderStatusHistory = {
      id: `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      order_id: order.id,
      previous_status: prevStatus,
      new_status: order.status,
      changed_by_user_id: changedByUserId,
      role: role,
      notes: notes || metadata?.rejectReason,
      timestamp: new Date().toISOString(),
    };
    if (!order.status_history) {
      order.status_history = [];
    }
    order.status_history.push(historyEntry);
    db.order_status_history.push(historyEntry);

    // Audit log
    db.audit_logs.push({
      id: `aud-${Date.now()}`,
      action_type: 'ORDER_STATUS_CHANGED',
      entity_type: 'ORDER',
      entity_id: order.id,
      user_id: changedByUserId,
      user_name: role,
      user_role: role,
      ip_address: '127.0.0.1',
      old_values: { status: prevStatus },
      new_values: { status: order.status, notes },
      created_at: new Date().toISOString(),
    });

    db.save();
    return { success: true, message: 'تم تحديث حالة الطلب بنجاح', order };
  }
}
