import { db } from '../db/database.js';
import { FinancialTransaction, TransactionType, Order } from '../types/index.js';

export interface OrderFinancialSummary {
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  platform_commission: number;
  restaurant_net: number;
  driver_earning: number;
}

export class FinancialEngine {
  /**
   * Calculate precise financial breakdown for an order
   * Critical: All calculations occur server-side based on actual database commission rates.
   */
  public static calculateOrderFinancials(
    restaurantId: string,
    subtotal: number,
    deliveryDistanceKm: number = 3.5,
    discountAmount: number = 0
  ): OrderFinancialSummary {
    const restaurant = db.restaurants.find(r => r.id === restaurantId);
    const commConfig = db.commissions[0] || {
      default_restaurant_commission_pct: 12.0,
      default_service_fee: 2500,
      base_delivery_fee_per_km: 1500,
      min_delivery_fee: 5000,
    };

    // 1. Commission rate for this restaurant (dynamic from DB)
    const commissionPct = restaurant?.commission_rate_percentage ?? commConfig.default_restaurant_commission_pct;
    
    // 2. Service fee
    const serviceFee = commConfig.default_service_fee;

    // 3. Delivery fee based on distance & minimums
    const baseRestaurantDelivery = restaurant?.base_delivery_fee || commConfig.min_delivery_fee;
    const calculatedDeliveryFee = Math.max(
      commConfig.min_delivery_fee,
      baseRestaurantDelivery + Math.round(deliveryDistanceKm * commConfig.base_delivery_fee_per_km)
    );

    // 4. Platform commission in SYP
    const platformCommission = Math.round((subtotal * commissionPct) / 100);

    // 5. Restaurant Net amount
    const restaurantNet = Math.max(0, subtotal - platformCommission);

    // 6. Driver earning (full delivery fee + platform bonus if applicable)
    const driverEarning = calculatedDeliveryFee;

    // 7. Customer Total
    const totalAmount = Math.max(0, subtotal + calculatedDeliveryFee + serviceFee - discountAmount);

    return {
      subtotal,
      delivery_fee: calculatedDeliveryFee,
      service_fee: serviceFee,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      platform_commission: platformCommission,
      restaurant_net: restaurantNet,
      driver_earning: driverEarning,
    };
  }

  /**
   * Records ledger transactions when an order is completed/delivered or updated.
   * Maintains accurate double-entry balance tracking.
   */
  public static recordOrderSettlementTransactions(order: Order) {
    const now = new Date().toISOString();
    const txnNumberBase = `TXN-${Date.now()}`;

    // 1. Platform Commission Ledger Record
    const platformTxn: FinancialTransaction = {
      id: `tx-${Date.now()}-1`,
      transaction_number: `${txnNumberBase}-PLT`,
      order_id: order.id,
      entity_type: 'platform',
      entity_id: 'platform-treasury',
      entity_name: 'إيرادات منصة وصّلني',
      amount: order.platform_commission + order.service_fee,
      direction: 'credit',
      transaction_type: 'platform_commission',
      balance_after: this.getEntityBalance('platform-treasury') + (order.platform_commission + order.service_fee),
      status: 'completed',
      notes: `عمولة المنصة (${order.platform_commission} ل.س) ورسوم الخدمة (${order.service_fee} ل.س) للطلب رقم ${order.order_number}`,
      created_at: now,
    };
    db.financial_transactions.push(platformTxn);

    // 2. Restaurant Credit Ledger Record
    const restTxn: FinancialTransaction = {
      id: `tx-${Date.now()}-2`,
      transaction_number: `${txnNumberBase}-RST`,
      order_id: order.id,
      entity_type: 'restaurant',
      entity_id: order.restaurant_id,
      entity_name: order.restaurant_name,
      amount: order.restaurant_net,
      direction: 'credit',
      transaction_type: 'restaurant_payout',
      balance_after: this.getEntityBalance(order.restaurant_id) + order.restaurant_net,
      status: 'completed',
      notes: `صافي مستحقات المطعم للطلب رقم ${order.order_number} (بعد خصم العمولة)`,
      created_at: now,
    };
    db.financial_transactions.push(restTxn);

    // 3. Driver Earning Record
    if (order.driver_id) {
      const driverTxn: FinancialTransaction = {
        id: `tx-${Date.now()}-3`,
        transaction_number: `${txnNumberBase}-DRV`,
        order_id: order.id,
        entity_type: 'driver',
        entity_id: order.driver_id,
        entity_name: order.driver_name || 'الكابتن المندوب',
        amount: order.driver_earning,
        direction: 'credit',
        transaction_type: 'driver_payout',
        balance_after: this.getEntityBalance(order.driver_id) + order.driver_earning,
        status: 'completed',
        notes: `أجرة توصيل الطلب رقم ${order.order_number}`,
        created_at: now,
      };
      db.financial_transactions.push(driverTxn);

      // Record in driver earnings table
      db.driver_earnings.push({
        id: `drve-${Date.now()}`,
        driver_id: order.driver_id,
        order_id: order.id,
        order_number: order.order_number,
        delivery_fee_earned: order.driver_earning,
        bonus_amount: 0,
        tip_amount: 0,
        total_earned: order.driver_earning,
        paid_status: 'paid',
        created_at: now,
      });
    }

    db.save();
  }

  public static getEntityBalance(entityId: string): number {
    const txns = db.financial_transactions.filter(t => t.entity_id === entityId);
    return txns.reduce((acc, curr) => {
      return curr.direction === 'credit' ? acc + curr.amount : acc - curr.amount;
    }, 0);
  }
}
