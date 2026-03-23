import { prisma } from '../config/db.js';
import { callOptimizationEngine } from './python.service.js';
import { logger } from '../config/logger.js';

interface GenerateOptions {
  startDate: string;
  endDate: string;
  rules?: any;
  organizationId?: string;
  mode?: 'full' | 'partial' | 'repair';
  // For partial mode — only regenerate for these filters
  department?: string;
  grade?: string;
  site?: string;
  // For repair mode — only fill gaps around these
  targetDoctorId?: string;
  targetDayIdx?: number;
  // For scoped regeneration — only affect shifts within this day range
  startDayIdx?: number;
  endDayIdx?: number;
}

/**
 * FULL GENERATION — wipes and rebuilds entire rota
 * Used for: first build, new cycle, major reset
 */
export const generateRota = async (options: GenerateOptions) => {
  const { startDate, endDate, rules, organizationId, mode = 'full' } = options;

  const where: any = {};
  if (organizationId) where.organizationId = organizationId;

  // Fetch availability blocks to respect
  const availabilityBlocks = await prisma.availability.findMany({
    where: { status: 'active' },
  });

  // Fetch doctors with preferences and availability
  const doctorWhere: any = { ...where };
  if (mode === 'partial') {
    if (options.department) doctorWhere.department = options.department;
    if (options.grade) doctorWhere.grade = options.grade;
    if (options.site) doctorWhere.site = options.site;
  }

  const doctors = await prisma.doctor.findMany({
    where: doctorWhere,
    include: { leaves: true, preferences: true },
  });

  const activeRules = await prisma.rule.findMany({ where: { ...where, isActive: true } });

  // Build payload with preferences and availability
  const payload = {
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      grade: d.grade,
      department: d.department,
      contract: d.contract,
      maxHours: d.maxHours,
      canDoNights: d.canDoNights,
      canDoOncall: d.canDoOncall,
      preferredShift: d.preferences?.preferredShift || d.preferredShift,
      unavailableDay: d.preferences?.unavailableDay || d.unavailableDay,
      trainingDay: d.preferences?.trainingDay || d.trainingDay,
      leaves: [
        ...d.leaves.map((l) => ({
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          type: l.type,
        })),
        // Add availability blocks as leave-like constraints
        ...availabilityBlocks
          .filter(a => a.doctorId === d.id && a.type === 'unavailable')
          .map(a => ({
            startDate: a.startDate.toISOString(),
            endDate: a.endDate.toISOString(),
            type: 'unavailable',
          })),
      ],
    })),
    startDate,
    endDate,
    numDays: Math.min(Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)), 366),
    rules: activeRules.map((r) => ({
      name: r.name, severity: r.severity, value: r.value, category: r.category,
    })),
    constraints: rules || {},
  };

  logger.warn(`Rota ${mode}: ${doctors.length} doctors, ${payload.numDays} days (org: ${organizationId || 'all'})`);

  const result = await callOptimizationEngine(payload);

  // Delete strategy depends on mode
  const deleteWhere: any = { ...where };

  // Scope deletion to specific day range if provided
  if (options.startDayIdx !== undefined && options.endDayIdx !== undefined) {
    deleteWhere.dayIdx = { gte: options.startDayIdx, lte: options.endDayIdx };
    logger.warn(`Scoped to days ${options.startDayIdx}-${options.endDayIdx}`);
  }

  if (mode === 'full') {
    await prisma.shift.deleteMany({ where: deleteWhere });
  } else if (mode === 'partial') {
    const doctorIds = doctors.map(d => d.id);
    await prisma.shift.deleteMany({
      where: { ...deleteWhere, doctorId: { in: doctorIds } },
    });
  }
  // Repair mode: don't delete anything — only add new shifts for gaps

  const assignments = result.assignments || [];
  const createdShifts = [];

  if (mode === 'repair') {
    // Only create shifts for uncovered slots (no existing shift)
    const existingShifts = await prisma.shift.findMany({ where });
    const existingKeys = new Set(existingShifts.map(s => `${s.doctorId}-${s.dayIdx}`));

    for (const shift of assignments) {
      const key = `${shift.doctorId}-${shift.dayIdx}`;
      if (!existingKeys.has(key)) {
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
    }
  } else {
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
  }

  const totalShifts = mode === 'repair'
    ? (await prisma.shift.count({ where }))
    : createdShifts.length;

  logger.warn(`Rota ${mode} complete: ${createdShifts.length} shifts ${mode === 'repair' ? 'added' : 'created'} (total: ${totalShifts})`);

  return {
    shifts: createdShifts,
    totalShifts,
    mode,
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
