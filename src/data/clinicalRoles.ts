/**
 * UK Healthcare Clinical Roles
 *
 * Comprehensive list covering all staff types rostered in
 * NHS trusts, private hospitals, and care settings.
 *
 * Sources: NHS Terms & Conditions (Agenda for Change),
 * NHS Digital Workforce Statistics, Skills for Care
 */

export interface ClinicalRole {
  id: string;
  title: string;
  category: 'medical' | 'nursing' | 'midwifery' | 'allied_health' | 'healthcare_science' | 'support' | 'emergency' | 'pharmacy' | 'dental' | 'admin';
  typicalBands: string[];
  registrationBody: string | null;
  requiresRegistration: boolean;
  canPrescribe: boolean;
  description: string;
}

export const CLINICAL_ROLES: ClinicalRole[] = [
  // ============================
  // MEDICAL (Doctors)
  // ============================
  { id: 'consultant', title: 'Consultant', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Senior doctor — specialist decision-maker' },
  { id: 'associate_specialist', title: 'Associate Specialist / SAS Doctor', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Non-training grade senior doctor' },
  { id: 'registrar', title: 'Specialty Registrar (StR)', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Senior trainee doctor in specialty' },
  { id: 'ct_st', title: 'Core/Specialty Trainee (CT/ST)', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Doctor in core or specialty training' },
  { id: 'sho', title: 'Senior House Officer (SHO)', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Junior doctor — 2-4 years post-qualification' },
  { id: 'fy2', title: 'Foundation Year 2 (FY2)', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Second year foundation trainee' },
  { id: 'fy1', title: 'Foundation Year 1 (FY1)', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'First year foundation trainee (provisionally registered)' },
  { id: 'locum_doctor', title: 'Locum Doctor', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Temporary/agency doctor' },
  { id: 'gp', title: 'General Practitioner (GP)', category: 'medical', typicalBands: ['Medical'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: true, description: 'Primary care doctor (when working in hospital)' },

  // ============================
  // NURSING
  // ============================
  { id: 'matron', title: 'Matron / Head of Nursing', category: 'nursing', typicalBands: ['Band 8a', 'Band 8b'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Senior nursing leader — manages ward teams' },
  { id: 'senior_sister', title: 'Senior Sister / Charge Nurse', category: 'nursing', typicalBands: ['Band 7'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Ward leader — manages day-to-day nursing' },
  { id: 'sister', title: 'Sister / Charge Nurse', category: 'nursing', typicalBands: ['Band 6'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Senior nurse — shift coordinator' },
  { id: 'staff_nurse', title: 'Staff Nurse (RN)', category: 'nursing', typicalBands: ['Band 5'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Registered nurse — core ward nursing' },
  { id: 'newly_qualified_nurse', title: 'Newly Qualified Nurse (Preceptorship)', category: 'nursing', typicalBands: ['Band 5'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Nurse in first year of practice' },
  { id: 'student_nurse', title: 'Student Nurse', category: 'nursing', typicalBands: ['N/A'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Nursing student on placement' },
  { id: 'anp', title: 'Advanced Nurse Practitioner (ANP)', category: 'nursing', typicalBands: ['Band 7', 'Band 8a'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: true, description: 'Advanced practice nurse — can assess, diagnose, prescribe' },
  { id: 'cnp', title: 'Clinical Nurse Specialist (CNS)', category: 'nursing', typicalBands: ['Band 6', 'Band 7'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Specialist nurse (e.g., diabetes, pain, stoma)' },
  { id: 'practice_nurse', title: 'Practice Nurse', category: 'nursing', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Nurse in GP practice or clinic setting' },
  { id: 'district_nurse', title: 'District / Community Nurse', category: 'nursing', typicalBands: ['Band 6', 'Band 7'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Community-based nursing care' },
  { id: 'mental_health_nurse', title: 'Mental Health Nurse (RMN)', category: 'nursing', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Registered mental health nurse' },
  { id: 'learning_disability_nurse', title: 'Learning Disability Nurse (RNLD)', category: 'nursing', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Specialist nurse for learning disabilities' },
  { id: 'childrens_nurse', title: "Children's Nurse (RSCN)", category: 'nursing', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Paediatric registered nurse' },
  { id: 'nurse_associate', title: 'Nursing Associate', category: 'nursing', typicalBands: ['Band 4'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: false, description: 'Bridge between HCA and registered nurse' },

  // ============================
  // MIDWIFERY
  // ============================
  { id: 'midwife', title: 'Midwife', category: 'midwifery', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: true, description: 'Registered midwife — antenatal, birth, postnatal care' },
  { id: 'senior_midwife', title: 'Senior Midwife / Team Leader', category: 'midwifery', typicalBands: ['Band 7'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: true, description: 'Lead midwife — manages midwifery team' },
  { id: 'consultant_midwife', title: 'Consultant Midwife', category: 'midwifery', typicalBands: ['Band 8a', 'Band 8b'], registrationBody: 'NMC', requiresRegistration: true, canPrescribe: true, description: 'Most senior midwifery role' },
  { id: 'maternity_support', title: 'Maternity Support Worker', category: 'support', typicalBands: ['Band 3', 'Band 4'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Assists midwives with patient care' },

  // ============================
  // HEALTHCARE SUPPORT WORKERS
  // ============================
  { id: 'hca', title: 'Healthcare Assistant (HCA)', category: 'support', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Core support worker — observations, personal care, mobility' },
  { id: 'senior_hca', title: 'Senior Healthcare Assistant', category: 'support', typicalBands: ['Band 3', 'Band 4'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Experienced HCA with additional competencies' },
  { id: 'care_worker', title: 'Care Worker / Care Assistant', category: 'support', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Personal care, daily living support (social care/community)' },
  { id: 'senior_care_worker', title: 'Senior Care Worker', category: 'support', typicalBands: ['Band 3', 'Band 4'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Team leader in care settings' },
  { id: 'nursing_assistant', title: 'Nursing Assistant', category: 'support', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Assists registered nurses on the ward' },
  { id: 'therapy_assistant', title: 'Therapy Assistant / Rehab Assistant', category: 'support', typicalBands: ['Band 3', 'Band 4'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Supports physiotherapists and OTs' },
  { id: 'phlebotomist', title: 'Phlebotomist', category: 'support', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Takes blood samples' },
  { id: 'clinical_support', title: 'Clinical Support Worker', category: 'support', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'General clinical support role' },
  { id: 'ward_clerk', title: 'Ward Clerk / Ward Administrator', category: 'admin', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Admin support on the ward' },
  { id: 'porter', title: 'Porter', category: 'support', typicalBands: ['Band 2'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Patient transport, specimen transport, equipment' },
  { id: 'domestic', title: 'Domestic / Housekeeper', category: 'support', typicalBands: ['Band 1', 'Band 2'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Ward cleaning and infection prevention' },

  // ============================
  // ALLIED HEALTH PROFESSIONALS
  // ============================
  { id: 'physiotherapist', title: 'Physiotherapist', category: 'allied_health', typicalBands: ['Band 5', 'Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Movement and rehabilitation specialist' },
  { id: 'occupational_therapist', title: 'Occupational Therapist (OT)', category: 'allied_health', typicalBands: ['Band 5', 'Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Helps patients with daily living activities' },
  { id: 'speech_therapist', title: 'Speech & Language Therapist (SLT)', category: 'allied_health', typicalBands: ['Band 5', 'Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Communication and swallowing specialist' },
  { id: 'dietitian', title: 'Dietitian', category: 'allied_health', typicalBands: ['Band 5', 'Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Nutrition and dietary specialist' },
  { id: 'radiographer', title: 'Radiographer', category: 'allied_health', typicalBands: ['Band 5', 'Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Diagnostic imaging specialist' },
  { id: 'sonographer', title: 'Sonographer', category: 'allied_health', typicalBands: ['Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Ultrasound specialist' },
  { id: 'podiatrist', title: 'Podiatrist', category: 'allied_health', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Foot and lower limb specialist' },
  { id: 'operating_dept_practitioner', title: 'Operating Department Practitioner (ODP)', category: 'allied_health', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Theatre anaesthetic/surgical/recovery care' },
  { id: 'physician_associate', title: 'Physician Associate (PA)', category: 'medical', typicalBands: ['Band 7', 'Band 8a'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: false, description: 'Works alongside doctors — history, examination, diagnosis' },
  { id: 'anaesthetic_associate', title: 'Anaesthesia Associate (AA)', category: 'medical', typicalBands: ['Band 7'], registrationBody: 'GMC', requiresRegistration: true, canPrescribe: false, description: 'Assists anaesthetists in theatre' },

  // ============================
  // PHARMACY
  // ============================
  { id: 'pharmacist', title: 'Pharmacist', category: 'pharmacy', typicalBands: ['Band 6', 'Band 7', 'Band 8a'], registrationBody: 'GPhC', requiresRegistration: true, canPrescribe: true, description: 'Medicines management and prescribing' },
  { id: 'pharmacy_technician', title: 'Pharmacy Technician', category: 'pharmacy', typicalBands: ['Band 4', 'Band 5'], registrationBody: 'GPhC', requiresRegistration: true, canPrescribe: false, description: 'Medicines preparation and dispensing' },
  { id: 'clinical_pharmacist', title: 'Clinical Pharmacist', category: 'pharmacy', typicalBands: ['Band 7', 'Band 8a'], registrationBody: 'GPhC', requiresRegistration: true, canPrescribe: true, description: 'Ward-based medicines optimization' },

  // ============================
  // EMERGENCY SERVICES
  // ============================
  { id: 'paramedic', title: 'Paramedic', category: 'emergency', typicalBands: ['Band 5', 'Band 6'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Pre-hospital emergency care' },
  { id: 'advanced_paramedic', title: 'Advanced Paramedic Practitioner', category: 'emergency', typicalBands: ['Band 7', 'Band 8a'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: true, description: 'Advanced pre-hospital and ED practitioner' },
  { id: 'eca', title: 'Emergency Care Assistant (ECA)', category: 'emergency', typicalBands: ['Band 3', 'Band 4'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Ambulance crew member' },
  { id: 'emergency_dispatcher', title: '999 Call Handler / Dispatcher', category: 'emergency', typicalBands: ['Band 3', 'Band 4'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Emergency call triage and dispatch' },

  // ============================
  // HEALTHCARE SCIENCE
  // ============================
  { id: 'biomedical_scientist', title: 'Biomedical Scientist', category: 'healthcare_science', typicalBands: ['Band 5', 'Band 6', 'Band 7'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Laboratory diagnostics' },
  { id: 'clinical_scientist', title: 'Clinical Scientist', category: 'healthcare_science', typicalBands: ['Band 7', 'Band 8a'], registrationBody: 'HCPC', requiresRegistration: true, canPrescribe: false, description: 'Senior laboratory/diagnostic specialist' },
  { id: 'medical_lab_assistant', title: 'Medical Laboratory Assistant', category: 'healthcare_science', typicalBands: ['Band 2', 'Band 3'], registrationBody: null, requiresRegistration: false, canPrescribe: false, description: 'Lab support worker' },
];

// Category labels and colors for UI
export const ROLE_CATEGORIES = [
  { id: 'medical', label: 'Medical (Doctors)', color: 'text-blue-500', count: 0 },
  { id: 'nursing', label: 'Nursing', color: 'text-emerald-500', count: 0 },
  { id: 'midwifery', label: 'Midwifery', color: 'text-pink-500', count: 0 },
  { id: 'allied_health', label: 'Allied Health Professionals', color: 'text-purple-500', count: 0 },
  { id: 'support', label: 'Support Workers & Care Staff', color: 'text-amber-500', count: 0 },
  { id: 'pharmacy', label: 'Pharmacy', color: 'text-cyan-500', count: 0 },
  { id: 'emergency', label: 'Emergency Services', color: 'text-red-500', count: 0 },
  { id: 'healthcare_science', label: 'Healthcare Science', color: 'text-indigo-500', count: 0 },
  { id: 'admin', label: 'Administrative', color: 'text-slate-500', count: 0 },
];

// NHS Agenda for Change pay bands
export const NHS_BANDS = [
  { band: 'Band 1', range: '£22,383', description: 'Entry level support' },
  { band: 'Band 2', range: '£22,383 - £24,336', description: 'HCA, Porter, Domestic' },
  { band: 'Band 3', range: '£24,071 - £25,674', description: 'Senior HCA, Care Worker' },
  { band: 'Band 4', range: '£26,530 - £29,114', description: 'Nursing Associate, AP' },
  { band: 'Band 5', range: '£29,970 - £36,483', description: 'Staff Nurse, AHP, Paramedic' },
  { band: 'Band 6', range: '£37,338 - £44,962', description: 'Sister, Specialist Nurse' },
  { band: 'Band 7', range: '£46,148 - £52,809', description: 'Ward Manager, ANP, Senior AHP' },
  { band: 'Band 8a', range: '£53,755 - £60,504', description: 'Matron, Consultant AHP' },
  { band: 'Band 8b', range: '£62,215 - £72,293', description: 'Head of Nursing/Service' },
  { band: 'Band 8c', range: '£74,290 - £85,601', description: 'Deputy Director' },
  { band: 'Band 8d', range: '£87,545 - £101,541', description: 'Director level' },
  { band: 'Band 9', range: '£105,385 - £121,271', description: 'Chief Nurse / Director' },
  { band: 'Medical', range: 'Varies by grade', description: 'Doctors (separate pay scale)' },
];

// Registration bodies
export const REGISTRATION_BODIES = [
  { id: 'GMC', name: 'General Medical Council', url: 'https://www.gmc-uk.org', roles: 'Doctors, PAs' },
  { id: 'NMC', name: 'Nursing & Midwifery Council', url: 'https://www.nmc.org.uk', roles: 'Nurses, Midwives, Nursing Associates' },
  { id: 'GPhC', name: 'General Pharmaceutical Council', url: 'https://www.pharmacyregulation.org', roles: 'Pharmacists, Pharmacy Technicians' },
  { id: 'HCPC', name: 'Health & Care Professions Council', url: 'https://www.hcpc-uk.org', roles: 'AHPs, Paramedics, Biomedical Scientists' },
  { id: 'GDC', name: 'General Dental Council', url: 'https://www.gdc-uk.org', roles: 'Dentists, Dental Nurses' },
  { id: 'GOC', name: 'General Optical Council', url: 'https://www.optical.org', roles: 'Optometrists, Dispensing Opticians' },
  { id: 'SWE', name: 'Social Work England', url: 'https://www.socialworkengland.org.uk', roles: 'Social Workers' },
];
