import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import * as auditService from '../services/audit.service.js';
import { logger } from '../config/logger.js';

const router = Router();

router.use(protect);
router.use(authorize('admin'));

// POST /api/import/bulk - Import all CSV datasets
router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctors, leaveRequests, doctorPreferences, historicalLoad, shiftTemplates, serviceRequirements } = req.body;
    const orgId = req.user?.organizationId || null;
    const results: Record<string, { imported: number; skipped: number; errors: string[] }> = {};

    // 1. Import doctors first (other tables reference doctor IDs)
    if (doctors && Array.isArray(doctors) && doctors.length > 0) {
      results.doctors = { imported: 0, skipped: 0, errors: [] };

      for (const doc of doctors) {
        try {
          const name = [doc.title, doc.first_name, doc.last_name].filter(Boolean).join(' ').trim() || doc.name;
          if (!name) { results.doctors.skipped++; continue; }

          const docData = {
            organizationId: orgId,
            gmcNumber: doc.gmc_number || null,
            title: doc.title || null,
            name,
            firstName: doc.first_name || null,
            lastName: doc.last_name || null,
            email: doc.nhs_email || doc.email || null,
            grade: doc.grade || 'SHO',
            specialty: doc.specialty || null,
            department: doc.department || 'A&E',
            site: doc.site || null,
            contract: doc.contract_hours ? `${doc.contract_hours}h` : (doc.contract || '100%'),
            contractHours: parseFloat(doc.contract_hours) || null,
            fte: doc.fte || '1.0',
            status: doc.employment_status || doc.status || 'Active',
            maxHours: parseFloat(doc.max_weekly_hours) || 48.0,
            rotaPattern: doc.rota_pattern || null,
            skills: doc.skills || null,
            canDoNights: doc.can_do_nights === '1' || doc.can_do_nights === 'true' || doc.can_do_nights === true,
            canDoOncall: doc.can_do_oncall === '1' || doc.can_do_oncall === 'true' || doc.can_do_oncall === true,
            trainingDay: doc.training_day || null,
            preferredShift: doc.preferred_shift || null,
            unavailableDay: doc.unavailable_day || null,
            annualLeaveDays: parseInt(doc.annual_leave_days_remaining) || null,
            studyLeaveDays: parseInt(doc.study_leave_days_remaining) || null,
            employmentStart: doc.employment_start_date ? new Date(doc.employment_start_date) : null,
            employmentEnd: doc.employment_end_date ? new Date(doc.employment_end_date) : null,
          };

          const code = doc.doctor_id || null;
          if (code) {
            // Upsert: update if doctorCode exists, create if not
            await prisma.doctor.upsert({
              where: { doctorCode: code },
              update: docData,
              create: { doctorCode: code, ...docData },
            });
          } else {
            await prisma.doctor.create({ data: docData });
          }
          results.doctors.imported++;
        } catch (err: any) {
          results.doctors.errors.push(`${doc.doctor_id || doc.name}: ${err.message}`);
          results.doctors.skipped++;
        }
      }
      logger.info(`Imported ${results.doctors.imported} doctors`);
    }

    // Build a lookup map: CSV doctor_id → DB doctor.id
    const allDoctors = await prisma.doctor.findMany({ select: { id: true, doctorCode: true } });
    const docMap = new Map<string, string>();
    allDoctors.forEach(d => { if (d.doctorCode) docMap.set(d.doctorCode, d.id); });

    // 2. Import leave requests
    if (leaveRequests && Array.isArray(leaveRequests) && leaveRequests.length > 0) {
      results.leaveRequests = { imported: 0, skipped: 0, errors: [] };

      for (const lr of leaveRequests) {
        try {
          const doctorId = docMap.get(lr.doctor_id);
          if (!doctorId) { results.leaveRequests.skipped++; continue; }

          const lrData = {
            doctorId,
            type: (lr.leave_type || 'annual').toLowerCase(),
            startDate: new Date(lr.start_date),
            endDate: new Date(lr.end_date),
            duration: parseInt(lr.duration_days) || null,
            status: (lr.approval_status || 'pending').toLowerCase(),
            requestedVia: lr.requested_via || null,
          };

          const code = lr.leave_id || null;
          if (code) {
            await prisma.leaveRequest.upsert({
              where: { leaveCode: code },
              update: lrData,
              create: { leaveCode: code, ...lrData },
            });
          } else {
            await prisma.leaveRequest.create({ data: lrData });
          }
          results.leaveRequests.imported++;
        } catch (err: any) {
          results.leaveRequests.skipped++;
        }
      }
      logger.info(`Imported ${results.leaveRequests.imported} leave requests`);
    }

    // 3. Import doctor preferences
    if (doctorPreferences && Array.isArray(doctorPreferences) && doctorPreferences.length > 0) {
      results.doctorPreferences = { imported: 0, skipped: 0, errors: [] };

      for (const dp of doctorPreferences) {
        try {
          const doctorId = docMap.get(dp.doctor_id);
          if (!doctorId) { results.doctorPreferences.skipped++; continue; }

          const prefData = {
            preferredShift: dp.preferred_shift || null,
            unavailableDay: dp.unavailable_day || null,
            trainingDay: dp.protected_training_day || null,
            priorityFocus: dp.priority_focus || null,
            notes: dp.preference_notes || null,
            fairnessWeight: parseInt(dp.fairness_weight) || 3,
            preferenceWeight: parseInt(dp.preference_weight) || 1,
            continuityWeight: parseInt(dp.continuity_weight) || 2,
          };

          await prisma.doctorPreference.upsert({
            where: { doctorId },
            update: prefData,
            create: { doctorId, ...prefData },
          });
          results.doctorPreferences.imported++;
        } catch (err: any) {
          results.doctorPreferences.skipped++;
        }
      }
      logger.info(`Imported ${results.doctorPreferences.imported} preferences`);
    }

    // 4. Import historical load
    if (historicalLoad && Array.isArray(historicalLoad) && historicalLoad.length > 0) {
      results.historicalLoad = { imported: 0, skipped: 0, errors: [] };

      for (const hl of historicalLoad) {
        try {
          const doctorId = docMap.get(hl.doctor_id);
          if (!doctorId) { results.historicalLoad.skipped++; continue; }

          const hlData = {
            weekendsYtd: parseInt(hl.weekends_ytd) || 0,
            nightsYtd: parseInt(hl.nights_ytd) || 0,
            oncallsYtd: parseInt(hl.oncalls_ytd) || 0,
            hoursWorkedLast7: parseFloat(hl.hours_worked_last_7_days) || 0,
            complianceScore: parseFloat(hl.compliance_score) || 1.0,
            warningFlagsOpen: parseInt(hl.warning_flags_open) || 0,
          };

          await prisma.historicalLoad.upsert({
            where: { doctorId },
            update: hlData,
            create: { doctorId, ...hlData },
          });
          results.historicalLoad.imported++;
        } catch (err: any) {
          results.historicalLoad.skipped++;
        }
      }
      logger.info(`Imported ${results.historicalLoad.imported} historical load records`);
    }

    // 5. Import shift templates
    if (shiftTemplates && Array.isArray(shiftTemplates) && shiftTemplates.length > 0) {
      results.shiftTemplates = { imported: 0, skipped: 0, errors: [] };

      for (const st of shiftTemplates) {
        try {
          const stData = {
            organizationId: orgId,
            shiftType: st.shift_type,
            startTime: st.start_time,
            endTime: st.end_time,
            paidHours: parseFloat(st.paid_hours) || 0,
            countsTowardLimit: st.counts_toward_weekly_limit === '1',
            residentShift: st.resident_shift === '1',
            weekendShift: st.weekend_shift === '1',
            oncallShift: st.oncall_shift === '1',
            notes: st.notes || null,
          };

          await prisma.shiftTemplate.upsert({
            where: { templateCode: st.shift_template_id },
            update: stData,
            create: { templateCode: st.shift_template_id, ...stData },
          });
          results.shiftTemplates.imported++;
        } catch (err: any) {
          results.shiftTemplates.skipped++;
        }
      }
      logger.info(`Imported ${results.shiftTemplates.imported} shift templates`);
    }

    // 6. Import service requirements
    if (serviceRequirements && Array.isArray(serviceRequirements) && serviceRequirements.length > 0) {
      results.serviceRequirements = { imported: 0, skipped: 0, errors: [] };

      for (const sr of serviceRequirements) {
        try {
          await prisma.serviceRequirement.create({
            data: {
              organizationId: orgId,
              site: sr.site,
              specialty: sr.specialty,
              department: sr.department,
              shiftType: sr.shift_type,
              minFyCover: parseInt(sr.min_fy_cover) || 0,
              minShoCover: parseInt(sr.min_sho_ct_st_cover) || 0,
              minRegistrarCover: parseInt(sr.min_registrar_cover) || 0,
              minConsultantCover: parseInt(sr.min_consultant_cover) || 0,
            },
          });
          results.serviceRequirements.imported++;
        } catch (err: any) {
          results.serviceRequirements.skipped++;
        }
      }
      logger.info(`Imported ${results.serviceRequirements.imported} service requirements`);
    }

    await auditService.log({
      userId: req.user?.id,
      action: 'BULK_IMPORT',
      entity: 'System',
      details: results,
    });

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// GET /api/import/doctors/export
router.get('/doctors/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await prisma.doctor.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
});

// POST /api/import/doctors (simple single-file import - kept for backward compat)
router.post('/doctors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctors } = req.body;
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({ success: false, message: 'doctors array is required' });
    }

    const results = { imported: 0, skipped: 0, errors: [] as string[] };
    for (const doc of doctors) {
      try {
        if (!doc.name && !doc.first_name) { results.skipped++; continue; }
        const name = doc.name || [doc.title, doc.first_name, doc.last_name].filter(Boolean).join(' ');
        await prisma.doctor.create({
          data: {
            doctorCode: doc.doctor_id || null,
            name,
            grade: doc.grade || 'SHO',
            department: doc.department || 'A&E',
            contract: doc.contract || '100%',
            fte: doc.fte || '1.0',
            status: doc.status || doc.employment_status || 'Active',
            maxHours: parseFloat(doc.maxHours || doc.max_weekly_hours) || 48.0,
          },
        });
        results.imported++;
      } catch (err: any) {
        results.errors.push(`${doc.name}: ${err.message}`);
        results.skipped++;
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
