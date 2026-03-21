import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: 'mft-demo' },
    update: {},
    create: {
      name: 'Manchester Foundation Trust (Demo)',
      slug: 'mft-demo',
      type: 'nhs_trust',
      plan: 'enterprise',
    },
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@rotaai.com' },
    update: {},
    create: {
      email: 'admin@rotaai.com',
      password: adminPassword,
      name: 'Segun Alabi',
      role: 'admin',
      organizationId: org.id,
    },
  });

  // Create doctors
  const doctors = [
    { name: 'Dr. Sarah Smith', grade: 'Consultant', department: 'A&E', contract: '100%', fte: '1.0', status: 'Active', karma: 2450, fatigue: 'Low' },
    { name: 'Dr. James Wilson', grade: 'Registrar', department: 'A&E', contract: '80%', fte: '0.8', status: 'On Leave', karma: 1820, fatigue: 'Medium' },
    { name: 'Dr. Emily Chen', grade: 'SHO', department: 'A&E', contract: '100%', fte: '1.0', status: 'Active', karma: 3100, fatigue: 'High' },
    { name: 'Dr. Michael Brown', grade: 'Consultant', department: 'ICU', contract: '100%', fte: '1.0', status: 'Active', karma: 950, fatigue: 'Low' },
    { name: 'Dr. Lisa Taylor', grade: 'Registrar', department: 'ICU', contract: '60%', fte: '0.6', status: 'Active', karma: 4200, fatigue: 'Critical' },
    { name: 'Dr. David Kim', grade: 'FY2', department: 'A&E', contract: '100%', fte: '1.0', status: 'Training', karma: 1100, fatigue: 'Low' },
  ];

  const createdDoctors = [];
  for (const doc of doctors) {
    const created = await prisma.doctor.create({ data: { ...doc, organizationId: org.id } });
    createdDoctors.push(created);
  }

  // Create doctor user accounts
  const doctorPassword = await bcrypt.hash('doctor123', 10);
  for (const doc of createdDoctors) {
    const email = `${doc.name.toLowerCase().replace(/dr\.\s+/i, '').replace(/\s+/g, '.')}@nhs.net`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: doctorPassword,
        name: doc.name,
        role: 'doctor',
        doctorId: doc.id,
        organizationId: org.id,
      },
    });
  }

  // Create shifts
  const shiftTimes: Record<string, string> = {
    'Day': '08:00 - 20:00', 'Night': '20:00 - 08:00', 'Long Day': '08:00 - 22:00', 'Weekend': '08:00 - 20:00',
  };

  const shifts = [
    { doctorIdx: 0, dayIdx: 0, type: 'Day' }, { doctorIdx: 0, dayIdx: 1, type: 'Day' }, { doctorIdx: 0, dayIdx: 3, type: 'Long Day' },
    { doctorIdx: 1, dayIdx: 2, type: 'Night' }, { doctorIdx: 1, dayIdx: 3, type: 'Night' },
    { doctorIdx: 2, dayIdx: 0, type: 'Night' }, { doctorIdx: 2, dayIdx: 5, type: 'Weekend' },
    { doctorIdx: 3, dayIdx: 1, type: 'Day' }, { doctorIdx: 3, dayIdx: 4, type: 'Day' }, { doctorIdx: 3, dayIdx: 6, type: 'Weekend' },
    { doctorIdx: 4, dayIdx: 4, type: 'Day', violation: true }, { doctorIdx: 4, dayIdx: 5, type: 'Weekend' },
    { doctorIdx: 5, dayIdx: 2, type: 'Day' }, { doctorIdx: 5, dayIdx: 6, type: 'Night' },
  ];

  for (const s of shifts) {
    await prisma.shift.create({
      data: {
        doctorId: createdDoctors[s.doctorIdx].id,
        organizationId: org.id,
        dayIdx: s.dayIdx,
        type: s.type,
        time: shiftTimes[s.type],
        violation: (s as any).violation || false,
      },
    });
  }

  // Create rules
  const rules = [
    { name: 'Max Weekly Hours', severity: 'Hard', value: '48h', description: 'Maximum hours a doctor can work in a 7-day rolling period.', isActive: true, category: 'EWTD' },
    { name: 'Minimum Rest Period', severity: 'Hard', value: '11h', description: 'Minimum rest hours between consecutive shifts.', isActive: true, category: 'EWTD' },
    { name: 'Night Shift Limit', severity: 'Soft', value: '4 max', description: 'Maximum consecutive night shifts before mandatory rest.', isActive: true, category: 'Staffing' },
    { name: 'Weekend Fairness', severity: 'Soft', value: 'Equal', description: 'Distribute weekend shifts equally among staff of same grade.', isActive: true, category: 'Fairness' },
    { name: 'Skill Mix (A&E)', severity: 'Hard', value: '>=1 Cons', description: 'Always have at least one Consultant on shift in A&E.', isActive: true, category: 'Safety' },
  ];

  for (const rule of rules) {
    await prisma.rule.create({ data: { ...rule, organizationId: org.id } });
  }

  console.log('Database seeded successfully!');
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log(`Admin login: admin@rotaai.com / admin123`);
  console.log(`Doctor login: sarah.smith@nhs.net / doctor123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
