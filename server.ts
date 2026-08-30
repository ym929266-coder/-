import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

// Routes
import authRoutes from './server/routes/auth.js';
import restaurantRoutes from './server/routes/restaurants.js';
import orderRoutes from './server/routes/orders.js';
import driverRoutes from './server/routes/drivers.js';
import adminRoutes from './server/routes/admin.js';
import reviewRoutes from './server/routes/reviews.js';
import notificationRoutes from './server/routes/notifications.js';
import supportRoutes from './server/routes/support.js';
import geoRoutes from './server/routes/geo.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes MUST be mounted FIRST
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Wassalni Syrian Food Delivery Platform Backend',
      version: '1.0.0-production',
      market: 'Syria',
      currency: 'SYP',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/drivers', driverRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/geo', geoRoutes);

  // Vite development middleware or static production fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wassalni Core] Server is running smoothly at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start Wassalni backend server:', err);
});
