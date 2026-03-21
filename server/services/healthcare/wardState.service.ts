/**
 * Ward State Manager
 *
 * Manages persistent ward state in the database.
 * Updates are triggered by FHIR/HL7/integration events.
 */

import { prisma } from '../../config/db.js';
import { emitAcuityAlert } from '../../config/socket.js';
import { logger } from '../../config/logger.js';

function computeStatus(ward: { patients: number; capacity: number; staffPresent: number; staffRequired: number }): string {
  if (ward.staffPresent < ward.staffRequired && ward.patients > ward.capacity) return 'critical';
  if (ward.staffPresent < ward.staffRequired) return 'warning';
  if (ward.staffPresent > ward.staffRequired + 1) return 'overstaffed';
  return 'stable';
}

export async function getOrCreateWard(wardCode: string, defaults?: { wardName?: string; site?: string; department?: string; capacity?: number; staffRequired?: number }) {
  let ward = await prisma.wardState.findUnique({ where: { wardCode } });

  if (!ward) {
    ward = await prisma.wardState.create({
      data: {
        wardCode,
        wardName: defaults?.wardName || wardCode,
        site: defaults?.site,
        department: defaults?.department,
        capacity: defaults?.capacity || 30,
        staffRequired: defaults?.staffRequired || 3,
        status: 'stable',
      },
    });
  }

  return ward;
}

export async function getAllWards() {
  const dbWards = await prisma.wardState.findMany({ orderBy: { wardName: 'asc' } });

  // If no persisted wards, bootstrap from service requirements
  if (dbWards.length === 0) {
    const reqs = await prisma.serviceRequirement.findMany();
    if (reqs.length > 0) {
      const deptMap = new Map<string, any>();
      for (const r of reqs) {
        const key = `${r.department}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!deptMap.has(key)) {
          const required = r.minFyCover + r.minShoCover + r.minRegistrarCover + r.minConsultantCover;
          deptMap.set(key, {
            wardCode: key,
            wardName: r.department,
            site: r.site,
            department: r.department,
            patients: Math.floor(Math.random() * 20) + 10,
            capacity: Math.floor(Math.random() * 15) + 20,
            staffPresent: Math.max(1, required + Math.floor(Math.random() * 3) - 1),
            staffRequired: required,
            status: 'stable',
          });
        }
      }

      for (const w of deptMap.values()) {
        w.status = computeStatus(w);
        await prisma.wardState.create({ data: w });
      }

      return prisma.wardState.findMany({ orderBy: { wardName: 'asc' } });
    }
  }

  return dbWards;
}

export async function updatePatientCount(wardCode: string, change: number, wardName?: string) {
  const ward = await getOrCreateWard(wardCode, { wardName });

  const updated = await prisma.wardState.update({
    where: { wardCode },
    data: {
      patients: Math.max(0, ward.patients + change),
      lastEhrSync: new Date(),
      status: computeStatus({
        ...ward,
        patients: Math.max(0, ward.patients + change),
      }),
    },
  });

  // Alert if over capacity
  if (updated.patients > updated.capacity) {
    emitAcuityAlert(wardCode, {
      wardName: updated.wardName,
      patients: updated.patients,
      capacity: updated.capacity,
      message: `${updated.wardName} over capacity: ${updated.patients}/${updated.capacity}`,
    });
  }

  return updated;
}

export async function updateStaffCount(wardCode: string, change: number) {
  const ward = await getOrCreateWard(wardCode);

  return prisma.wardState.update({
    where: { wardCode },
    data: {
      staffPresent: Math.max(0, ward.staffPresent + change),
      lastStaffSync: new Date(),
      status: computeStatus({
        ...ward,
        staffPresent: Math.max(0, ward.staffPresent + change),
      }),
    },
  });
}

export async function setWardCensus(wardCode: string, data: {
  wardName?: string;
  patients?: number;
  capacity?: number;
  staffPresent?: number;
  acuityScore?: number;
  pendingAdmits?: number;
  pendingDischarges?: number;
}) {
  const ward = await getOrCreateWard(wardCode, { wardName: data.wardName });

  const updateData: any = { lastEhrSync: new Date() };
  if (data.patients !== undefined) updateData.patients = data.patients;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.staffPresent !== undefined) updateData.staffPresent = data.staffPresent;
  if (data.acuityScore !== undefined) updateData.acuityScore = data.acuityScore;
  if (data.pendingAdmits !== undefined) updateData.pendingAdmits = data.pendingAdmits;
  if (data.pendingDischarges !== undefined) updateData.pendingDischarges = data.pendingDischarges;
  if (data.wardName) updateData.wardName = data.wardName;

  const merged = { ...ward, ...updateData };
  updateData.status = computeStatus(merged);

  const updated = await prisma.wardState.update({ where: { wardCode }, data: updateData });

  if (updated.patients > updated.capacity) {
    emitAcuityAlert(wardCode, {
      wardName: updated.wardName,
      patients: updated.patients,
      capacity: updated.capacity,
    });
  }

  return updated;
}

export async function rebalanceStaff() {
  const wards = await prisma.wardState.findMany();
  const overstaffed = wards.filter(w => w.staffPresent > w.staffRequired);
  const understaffed = wards.filter(w => w.staffPresent < w.staffRequired).sort((a, b) =>
    (a.staffPresent - a.staffRequired) - (b.staffPresent - b.staffRequired)
  );

  const moves: { from: string; to: string; count: number }[] = [];

  for (const target of understaffed) {
    let remaining = target.staffRequired - target.staffPresent;
    for (const source of overstaffed) {
      if (remaining <= 0) break;
      const surplus = source.staffPresent - source.staffRequired;
      if (surplus <= 0) continue;
      const toMove = Math.min(remaining, surplus);
      source.staffPresent -= toMove;
      target.staffPresent += toMove;
      remaining -= toMove;
      moves.push({ from: source.wardName, to: target.wardName, count: toMove });
    }
  }

  // Persist changes
  for (const ward of wards) {
    await prisma.wardState.update({
      where: { wardCode: ward.wardCode },
      data: {
        staffPresent: ward.staffPresent,
        status: computeStatus(ward),
      },
    });
  }

  const updatedWards = await prisma.wardState.findMany({ orderBy: { wardName: 'asc' } });

  return { wards: updatedWards, moves };
}
