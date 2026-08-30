import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { SupportTicket } from '../types/index.js';

const router = Router();

// 1. Get user's support tickets (or all for admin)
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  let tickets = db.support_tickets;

  if (user.role !== 'admin') {
    tickets = tickets.filter(t => t.user_id === user.id);
  }

  return res.json({
    success: true,
    count: tickets.length,
    tickets: [...tickets].reverse(),
  });
});

// 2. Create Support Ticket
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { subject, category, message, order_id } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'يرجى كتابة عنوان المشكلة وتفاصيل الرسالة' });
  }

  const newTicket: SupportTicket = {
    id: `tick-${Date.now()}`,
    ticket_number: `TCK-2026-${Math.floor(100 + Math.random() * 900)}`,
    user_id: user.id,
    user_name: user.full_name,
    user_phone: user.phone,
    user_role: user.role,
    order_id,
    subject,
    category: category || 'technical',
    priority: 'medium',
    status: 'open',
    messages: [
      {
        sender_id: user.id,
        sender_name: user.full_name,
        sender_role: user.role,
        text: message,
        sent_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.support_tickets.push(newTicket);
  db.save();

  return res.status(201).json({
    success: true,
    message: 'تم إرسال تذكرة الدعم بنجاح، وسيقوم فريق خدمة العملاء بالرد عليك قريباً',
    ticket: newTicket,
  });
});

// 3. Reply to Ticket
router.post('/:id/messages', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, message: 'الرسالة فارغة' });
  }

  const ticket = db.support_tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
  }

  ticket.messages.push({
    sender_id: user.id,
    sender_name: user.full_name,
    sender_role: user.role,
    text,
    sent_at: new Date().toISOString(),
  });
  ticket.updated_at = new Date().toISOString();

  if (user.role === 'admin') {
    ticket.status = 'in_progress';
  }

  db.save();
  return res.json({
    success: true,
    message: 'تم إرسال الرد',
    ticket,
  });
});

export default router;
