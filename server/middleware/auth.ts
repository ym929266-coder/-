import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { User, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wassalni_production_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Check if token in query for websocket or download if needed
    return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };
    const user = db.users.find(u => u.id === decoded.id && u.status !== 'suspended');

    if (!user) {
      return res.status(401).json({ success: false, message: 'الحساب غير موجود أو تم إيقافه' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'جلسة تسجيل الدخول منتهية الصلاحية' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح: يرجى تسجيل الدخول' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `غير مصرح لك بالوصول لهذا القسم (مخصص لـ: ${allowedRoles.join(', ')})`,
      });
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = db.users.find(u => u.id === decoded.id && u.status !== 'suspended');
      if (user) {
        req.user = user;
      }
    } catch {
      // ignore
    }
  }
  next();
}
