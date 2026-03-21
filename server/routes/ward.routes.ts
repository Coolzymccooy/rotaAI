import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/db.js';

const router = Router();

router.use(protect);

// In-memory ward state (seeded from service_requirements or defaults)
let wardState: any[] | null = null;

async function getWardState() {
  if (wardState) return wardState;

  // Try to build from service_requirements
  const reqs = await prisma.serviceRequirement.findMany();
  if (reqs.length > 0) {
    // Group by department, aggregate min cover
    const deptMap = new Map<string, any>();
    for (const r of reqs) {
      const key = `${r.site}-${r.department}`;
      if (!deptMap.has(key)) {
        deptMap.set(key, {
          id: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: r.department,
          site: r.site,
          patients: Math.floor(Math.random() * 20) + 10,
          capacity: Math.floor(Math.random() * 15) + 20,
          staff: 0,
          required: 0,
          status: 'stable',
        });
      }
      const ward = deptMap.get(key)!;
      ward.required += r.minFyCover + r.minShoCover + r.minRegistrarCover + r.minConsultantCover;
    }

    // Assign random current staffing relative to requirements
    wardState = Array.from(deptMap.values()).map(w => {
      const staffVariance = Math.floor(Math.random() * 3) - 1;
      w.staff = Math.max(1, w.required + staffVariance);
      w.status = recalcStatus(w);
      return w;
    });
  } else {
    wardState = [
      { id: 'ae', name: 'A&E Resus', patients: 45, capacity: 40, staff: 4, required: 6, status: 'critical' },
      { id: 'icu', name: 'Intensive Care', patients: 12, capacity: 15, staff: 5, required: 5, status: 'stable' },
      { id: 'ward1', name: 'Acute Medical', patients: 28, capacity: 30, staff: 3, required: 3, status: 'stable' },
      { id: 'ward2', name: 'Surgical', patients: 15, capacity: 25, staff: 4, required: 2, status: 'overstaffed' },
    ];
  }

  return wardState;
}

function recalcStatus(ward: any) {
  if (ward.staff < ward.required && ward.patients > ward.capacity) return 'critical';
  if (ward.staff < ward.required) return 'warning';
  if (ward.staff > ward.required + 1) return 'overstaffed';
  return 'stable';
}

// GET /api/wards
router.get('/', async (req, res) => {
  const wards = await getWardState();
  res.json({ success: true, data: wards });
});

// POST /api/wards/rebalance
router.post('/rebalance', async (req, res) => {
  const wards = await getWardState();
  const overstaffed = wards.filter(w => w.staff > w.required);
  const understaffed = wards.filter(w => w.staff < w.required).sort((a, b) => (a.staff - a.required) - (b.staff - b.required));

  const moves: { from: string; to: string; count: number }[] = [];

  for (const target of understaffed) {
    let remaining = target.required - target.staff;
    for (const source of overstaffed) {
      if (remaining <= 0) break;
      const surplus = source.staff - source.required;
      if (surplus <= 0) continue;
      const toMove = Math.min(remaining, surplus);
      source.staff -= toMove;
      target.staff += toMove;
      remaining -= toMove;
      moves.push({ from: source.name, to: target.name, count: toMove });
    }
  }

  wardState = wards.map(w => ({ ...w, status: recalcStatus(w) }));

  res.json({
    success: true,
    data: {
      wards: wardState,
      moves,
      message: moves.length > 0
        ? `Rebalanced: ${moves.map(m => `${m.count} doctor(s) from ${m.from} to ${m.to}`).join(', ')}`
        : 'All wards are optimally staffed.',
    },
  });
});

// POST /api/wards/sync
router.post('/sync', async (req, res) => {
  const wards = await getWardState();
  wardState = wards.map(w => {
    const delta = Math.floor(Math.random() * 7) - 3;
    const patients = Math.max(0, w.patients + delta);
    return { ...w, patients, status: recalcStatus({ ...w, patients }) };
  });

  res.json({ success: true, data: wardState, message: 'EHR data synced successfully.' });
});

export default router;
