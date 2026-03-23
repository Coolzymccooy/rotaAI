import { Router, Request, Response, NextFunction } from 'express';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import { buildWorkforceState } from '../services/workforceState.service.js';
import { validateBatch, validateDoctor, validateLeaveRequest, checkDuplicates } from '../services/validation.service.js';

const router = Router();
router.use(protect);

// GET /api/workforce-state — unified current state snapshot
router.get('/', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = await buildWorkforceState(req.user?.organizationId);
    res.json({ success: true, data: state });
  } catch (error) { next(error); }
});

// POST /api/workforce-state/validate — validate import data before committing
router.post('/validate', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'records must be an array' });
    }

    let result;
    switch (type) {
      case 'doctors':
        result = validateBatch(records, validateDoctor);
        break;
      case 'leaveRequests':
        result = validateBatch(records, validateLeaveRequest);
        break;
      default:
        result = { validRecords: records, invalidRecords: [], warnings: [], summary: { total: records.length, valid: records.length, invalid: 0, warnings: 0 } };
    }

    // Check for duplicates
    const duplicates = await checkDuplicates(req.user?.organizationId || null, records);

    res.json({
      success: true,
      data: {
        ...result,
        duplicates: duplicates.duplicates,
      },
    });
  } catch (error) { next(error); }
});

export default router;
