import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get current user's notifications
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifs = db.notifications
    .filter(n => n.user_id === user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return res.json({
    success: true,
    count: notifs.length,
    unreadCount,
    notifications: notifs,
  });
});

// 2. Mark notification as read
router.put('/:id/read', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const { id } = req.params;

  const notif = db.notifications.find(n => n.id === id && n.user_id === user.id);
  if (notif) {
    notif.is_read = true;
    db.save();
  }

  return res.json({ success: true });
});

// 3. Mark all as read
router.put('/mark-all-read', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  db.notifications.forEach(n => {
    if (n.user_id === user.id) {
      n.is_read = true;
    }
  });
  db.save();
  return res.json({ success: true, message: 'تم تعيين جميع الإشعارات كمقروءة' });
});

export default router;
