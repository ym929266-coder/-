import { Router } from 'express';
import { db } from '../db/database.js';
import { DriverDispatcher } from '../services/driverDispatcher.js';

const router = Router();

const SYRIAN_CITIES = [
  {
    name_ar: 'دمشق',
    center: { lat: 33.5138, lng: 36.2765 },
    districts: ['كفرسوسة', 'المزة', 'الشعلان', 'أبو رمانة', 'القصاع', 'الميدان', 'المزرعة', 'باب توما', 'المالكي', 'دمر'],
  },
  {
    name_ar: 'حلب',
    center: { lat: 36.2021, lng: 37.1343 },
    districts: ['الفرقان', 'الشهباء', 'الجميلية', 'السليمانية', 'الموغامبو', 'حلب الجديدة'],
  },
  {
    name_ar: 'حمص',
    center: { lat: 34.7324, lng: 36.7137 },
    districts: ['الحمرا', 'الإنشاءات', 'الدبلان', 'عكرمة', 'الغوطة', 'الوعر'],
  },
  {
    name_ar: 'اللاذقية',
    center: { lat: 35.5317, lng: 35.7915 },
    districts: ['الصليبة', 'الزراعة', 'مشروع الصليبة', 'الأمريكان', 'الشاطئ الأزرق', 'الكورنيش الجنوبي'],
  },
  {
    name_ar: 'طرطوس',
    center: { lat: 34.8890, lng: 35.8866 },
    districts: ['الكورنيش البحري', 'الحمرات', 'الرادار', 'المينا', 'الإنشاءات'],
  },
];

// 1. Get Syrian Cities and Districts
router.get('/cities', (req, res) => {
  return res.json({
    success: true,
    cities: SYRIAN_CITIES,
  });
});

// 2. Calculate Distance & Delivery Estimate
router.post('/estimate-delivery', (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.body;

  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ success: false, message: 'الإحداثيات غير مكتملة' });
  }

  const distanceKm = DriverDispatcher.calculateDistanceKm(
    Number(originLat),
    Number(originLng),
    Number(destLat),
    Number(destLng)
  );

  const commConfig = db.commissions[0] || {
    base_delivery_fee_per_km: 1500,
    min_delivery_fee: 5000,
  };

  const estimatedFee = Math.max(
    commConfig.min_delivery_fee,
    Math.round(commConfig.min_delivery_fee + distanceKm * commConfig.base_delivery_fee_per_km)
  );

  // Speed approx 25 km/h in city traffic + 10 mins handover
  const estimatedTimeMins = Math.round(10 + (distanceKm / 25) * 60);

  return res.json({
    success: true,
    distanceKm,
    estimatedFee,
    estimatedTimeMins,
  });
});

export default router;
