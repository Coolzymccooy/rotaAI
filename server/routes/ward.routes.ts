import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import * as wardStateService from '../services/healthcare/wardState.service.js';

const router = Router();

router.use(protect);

// GET /api/wards — all ward states (from database)
router.get('/', async (req, res) => {
  try {
    const wards = await wardStateService.getAllWards();
    // Map to the format the frontend expects
    const mapped = wards.map(w => ({
      id: w.wardCode,
      name: w.wardName,
      site: w.site,
      patients: w.patients,
      capacity: w.capacity,
      staff: w.staffPresent,
      required: w.staffRequired,
      status: w.status,
      acuityScore: w.acuityScore,
      pendingAdmits: w.pendingAdmits,
      pendingDischarges: w.pendingDischarges,
      lastEhrSync: w.lastEhrSync,
    }));
    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/wards/rebalance — AI auto-balance staff
router.post('/rebalance', async (req, res) => {
  try {
    const result = await wardStateService.rebalanceStaff();
    const mapped = result.wards.map(w => ({
      id: w.wardCode,
      name: w.wardName,
      patients: w.patients,
      capacity: w.capacity,
      staff: w.staffPresent,
      required: w.staffRequired,
      status: w.status,
    }));

    res.json({
      success: true,
      data: {
        wards: mapped,
        moves: result.moves,
        message: result.moves.length > 0
          ? `Rebalanced: ${result.moves.map(m => `${m.count} doctor(s) from ${m.from} to ${m.to}`).join(', ')}`
          : 'All wards are optimally staffed.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/wards/sync — simulate EHR sync (randomize patient counts slightly)
router.post('/sync', async (req, res) => {
  try {
    const wards = await wardStateService.getAllWards();
    for (const w of wards) {
      const delta = Math.floor(Math.random() * 7) - 3;
      await wardStateService.setWardCensus(w.wardCode, {
        patients: Math.max(0, w.patients + delta),
      });
    }
    const updated = await wardStateService.getAllWards();
    const mapped = updated.map(w => ({
      id: w.wardCode,
      name: w.wardName,
      patients: w.patients,
      capacity: w.capacity,
      staff: w.staffPresent,
      required: w.staffRequired,
      status: w.status,
    }));
    res.json({ success: true, data: mapped, message: 'EHR data synced successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
