import { Router } from 'express';
import { prisma } from '../config/db.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

// Global search across doctors, shifts, rules
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q as string || '').trim().toLowerCase();
    if (!q) {
      return res.json({ success: true, data: { doctors: [], rules: [], shifts: [] } });
    }

    const [doctors, rules] = await Promise.all([
      prisma.doctor.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { grade: { contains: q } },
            { department: { contains: q } },
          ],
        },
        take: 10,
      }),
      prisma.rule.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
        take: 10,
      }),
    ]);

    res.json({ success: true, data: { doctors, rules } });
  } catch (error) {
    next(error);
  }
});

export default router;
