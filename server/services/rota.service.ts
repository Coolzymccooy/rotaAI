import { prisma } from '../config/db.js';
import { callOptimizationEngine } from './python.service.js';
import { logger } from '../config/logger.js';

export const generateRota = async (startDate: string, endDate: string, rules: any, organizationId?: string) => {
  // Scope queries by organization
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;

  // 1. Fetch doctors and existing shifts scoped to org
  const doctors = await prisma.doctor.findMany({ where, include: { leaves: true } });
  const existingShifts = await prisma.shift.findMany({ where });

  // 2. Fetch active rules scoped to org
  const activeRules = await prisma.rule.findMany({ where: { ...where, isActive: true } });

  // 3. Call optimization engine (Python or fallback)
  const payload = {
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      grade: d.grade,
      department: d.department,
      contract: d.contract,
      maxHours: d.maxHours,
      leaves: d.leaves.map((l) => ({
        startDate: l.startDate.toISOString(),
        endDate: l.endDate.toISOString(),
        type: l.type,
      })),
    })),
    shifts: existingShifts,
    startDate,
    endDate,
    numDays: 7,
    rules: activeRules.map((r) => ({
      name: r.name,
      severity: r.severity,
      value: r.value,
      category: r.category,
    })),
    constraints: rules || {},
  };

  logger.info(`Generating rota for ${doctors.length} doctors (org: ${organizationId || 'all'})...`);
  const result = await callOptimizationEngine(payload);

  // 4. Clear existing shifts for this org
  await prisma.shift.deleteMany({ where });

  // 5. Save the new shifts
  const assignments = result.assignments || [];
  const createdShifts = [];

  for (const shift of assignments) {
    const created = await prisma.shift.create({
      data: {
        organizationId: organizationId || null,
        doctorId: shift.doctorId,
        dayIdx: shift.dayIdx,
        type: shift.type,
        time: shift.time,
        isLocum: shift.isLocum || false,
        violation: shift.violation || false,
      },
    });
    createdShifts.push(created);
  }

  logger.info(`Rota generated: ${createdShifts.length} shifts`, {
    fairnessScore: result.fairness_score,
    coverageScore: result.coverage_score,
  });

  return {
    shifts: createdShifts,
    fairnessScore: result.fairness_score,
    coverageScore: result.coverage_score,
    violations: result.violations || [],
  };
};

export const updateRota = async (shifts: any[]) => {
  const results = [];
  for (const shift of shifts) {
    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        doctorId: shift.doctorId,
        type: shift.type,
        time: shift.time,
        dayIdx: shift.dayIdx,
      },
    });
    results.push(updated);
  }
  return results;
};
