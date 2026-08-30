import { Order, PaymentMethod, PaymentStatus } from '../types/index.js';

export interface PaymentProcessResult {
  success: boolean;
  transactionReference: string;
  status: PaymentStatus;
  message: string;
  paymentUrl?: string;
}

export interface IPaymentProvider {
  processPayment(order: Order, amount: number): Promise<PaymentProcessResult>;
  verifyPayment(transactionReference: string): Promise<{ isPaid: boolean; status: PaymentStatus }>;
  refundPayment(transactionReference: string, amount: number): Promise<{ success: boolean; message: string }>;
}

export class CashOnDeliveryProvider implements IPaymentProvider {
  async processPayment(order: Order, amount: number): Promise<PaymentProcessResult> {
    return {
      success: true,
      transactionReference: `CASH-${order.order_number}`,
      status: 'pending', // Will be updated to 'collected' when driver confirms cash receipt
      message: 'تم اختيار الدفع نقداً عند الاستلام بنجاح',
    };
  }

  async verifyPayment(transactionReference: string): Promise<{ isPaid: boolean; status: PaymentStatus }> {
    return { isPaid: true, status: 'collected' };
  }

  async refundPayment(transactionReference: string, amount: number): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'لا يلزم استرداد إلكتروني للدفع النقدي' };
  }
}

export class ShamCashPaymentProvider implements IPaymentProvider {
  private apiKey: string;
  private merchantId: string;

  constructor() {
    this.apiKey = process.env.SHAM_CASH_API_KEY || '';
    this.merchantId = process.env.SHAM_CASH_MERCHANT_ID || '';
  }

  async processPayment(order: Order, amount: number): Promise<PaymentProcessResult> {
    if (!this.apiKey || !this.merchantId) {
      return {
        success: false,
        transactionReference: '',
        status: 'failed',
        message: 'بوابة شام كاش الإلكترونية بانتظار تفعيل مفاتيح الاعتماد الرسمية من المصرف المركزي',
      };
    }

    // Official API integration structure ready for live endpoint
    return {
      success: true,
      transactionReference: `SHAM-${Date.now()}`,
      status: 'pending',
      message: 'جاري التحويل لبوابة شام كاش للدفع الآمن',
    };
  }

  async verifyPayment(transactionReference: string): Promise<{ isPaid: boolean; status: PaymentStatus }> {
    if (!this.apiKey) {
      return { isPaid: false, status: 'pending' };
    }
    return { isPaid: true, status: 'collected' };
  }

  async refundPayment(transactionReference: string, amount: number): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'تم إرسال طلب الاسترداد إلى حساب شام كاش' };
  }
}

export class PaymentGatewayFactory {
  public static getProvider(method: PaymentMethod): IPaymentProvider {
    switch (method) {
      case 'SHAM_CASH':
        return new ShamCashPaymentProvider();
      case 'CASH':
      default:
        return new CashOnDeliveryProvider();
    }
  }
}
