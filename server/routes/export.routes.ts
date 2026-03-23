/**
 * Export Routes — PDF, CSV, iCal
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(protect);

// GET /api/export/rota-csv — export current rota as CSV
router.get('/rota-csv', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user?.organizationId) where.organizationId = req.user.organizationId;

    const shifts = await prisma.shift.findMany({
      where,
      include: { doctor: { select: { name: true, grade: true, department: true, site: true } } },
      orderBy: [{ dayIdx: 'asc' }],
    });

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const headers = ['Doctor', 'Grade', 'Department', 'Site', 'Day', 'Day Number', 'Shift Type', 'Time'];
    const rows = shifts.map(s => [
      s.doctor.name,
      s.doctor.grade,
      s.doctor.department,
      s.doctor.site || '',
      DAYS[s.dayIdx % 7] || s.dayIdx.toString(),
      s.dayIdx.toString(),
      s.type,
      s.time,
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rota-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
});

// GET /api/export/rota-json — export rota as structured JSON (for PDF generation on frontend)
router.get('/rota-json', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if (req.user?.organizationId) where.organizationId = req.user.organizationId;

    const [shifts, org] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: { doctor: { select: { name: true, grade: true, department: true, site: true } } },
        orderBy: [{ doctor: { name: 'asc' } }, { dayIdx: 'asc' }],
      }),
      req.user?.organizationId
        ? prisma.organization.findUnique({ where: { id: req.user.organizationId }, select: { name: true, slug: true } })
        : null,
    ]);

    // Group by doctor
    const doctorMap = new Map<string, any>();
    for (const s of shifts) {
      if (!doctorMap.has(s.doctorId)) {
        doctorMap.set(s.doctorId, {
          name: s.doctor.name,
          grade: s.doctor.grade,
          department: s.doctor.department,
          shifts: [],
        });
      }
      doctorMap.get(s.doctorId).shifts.push({
        dayIdx: s.dayIdx,
        type: s.type,
        time: s.time,
      });
    }

    res.json({
      success: true,
      data: {
        organization: org?.name || 'RotaAI',
        generatedAt: new Date().toISOString(),
        totalShifts: shifts.length,
        totalDoctors: doctorMap.size,
        doctors: Array.from(doctorMap.values()),
      },
    });
  } catch (error) { next(error); }
});

// ==========================================
// iCal FEED (#3)
// ==========================================

// GET /api/export/ical/:doctorId — personal iCal feed for a doctor
router.get('/ical/:doctorId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctorId } = req.params;
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { name: true } });
    if (!doctor) return res.status(404).send('Doctor not found');

    const shifts = await prisma.shift.findMany({
      where: { doctorId },
      orderBy: { dayIdx: 'asc' },
    });

    // Generate iCal content
    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RotaAI//Shift Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${doctor.name} - RotaAI Shifts`,
    ];

    for (const shift of shifts) {
      const shiftDate = new Date(now);
      // Calculate actual date based on dayIdx relative to current week start
      const currentMonday = new Date(now);
      currentMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      shiftDate.setTime(currentMonday.getTime() + shift.dayIdx * 24 * 60 * 60 * 1000);

      const [startTime, endTime] = shift.time.split(' - ').map(t => t.trim());
      const [startH, startM] = (startTime || '08:00').split(':');
      const [endH, endM] = (endTime || '20:00').split(':');

      const dtStart = formatICalDate(shiftDate, parseInt(startH), parseInt(startM));
      const dtEnd = shift.type === 'Night'
        ? formatICalDate(new Date(shiftDate.getTime() + 24 * 60 * 60 * 1000), parseInt(endH), parseInt(endM))
        : formatICalDate(shiftDate, parseInt(endH), parseInt(endM));

      lines.push(
        'BEGIN:VEVENT',
        `UID:rotaai-${shift.id}@rotaai.com`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${shift.type} Shift`,
        `DESCRIPTION:${shift.type} shift (${shift.time})`,
        `CATEGORIES:${shift.type}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${doctor.name.replace(/\s/g, '_')}_shifts.ics"`);
    res.send(lines.join('\r\n'));
  } catch (error) { next(error); }
});

// GET /api/export/ical-url — get personal iCal feed URL
router.get('/ical-url', async (req: Request, res: Response) => {
  if (!req.user?.doctorId) {
    return res.json({ success: true, data: { url: null, message: 'No doctor profile linked' } });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    data: {
      url: `${baseUrl}/api/export/ical/${req.user.doctorId}`,
      instructions: 'Add this URL to Google Calendar, Outlook, or Apple Calendar as a subscribed calendar.',
    },
  });
});

function formatICalDate(date: Date, hours: number, minutes: number): string {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export default router;
