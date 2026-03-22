/**
 * FHIR R4 Test Harness
 *
 * Mock FHIR server endpoints that simulate Epic/Cerner responses.
 * Used for integration testing without a real EHR connection.
 *
 * Test from the Integrations page by sending FHIR resources to the integration API
 * while this harness generates test data.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/fhir-test/Encounter — returns mock encounters
router.get('/Encounter', (req: Request, res: Response) => {
  const count = parseInt(req.query._count as string) || 10;
  const entries = Array.from({ length: count }, (_, i) => ({
    resource: {
      resourceType: 'Encounter',
      id: `test-enc-${i + 1}`,
      status: i % 3 === 0 ? 'finished' : 'in-progress',
      class: { code: 'IMP', display: 'inpatient encounter' },
      subject: { reference: `Patient/P${1000 + i}`, display: `Test Patient ${i + 1}` },
      location: [{
        location: {
          reference: `Location/${['ae', 'icu', 'ward-a', 'ward-b', 'maternity'][i % 5]}`,
          display: ['A&E Resus', 'ICU', 'Ward A', 'Ward B', 'Maternity'][i % 5],
        },
        status: 'active',
      }],
      period: { start: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000).toISOString() },
      serviceType: { coding: [{ code: 'EM', display: 'Emergency Medicine' }] },
    },
    fullUrl: `urn:uuid:test-enc-${i + 1}`,
  }));

  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: count,
    entry: entries,
  });
});

// GET /api/fhir-test/Location — returns mock ward locations
router.get('/Location', (_req: Request, res: Response) => {
  const locations = [
    { id: 'ae', name: 'A&E Resus', type: 'Emergency' },
    { id: 'icu', name: 'Intensive Care Unit', type: 'ICU' },
    { id: 'ward-a', name: 'Acute Medical Ward', type: 'Ward' },
    { id: 'ward-b', name: 'Surgical Ward', type: 'Ward' },
    { id: 'maternity', name: 'Maternity Unit', type: 'Ward' },
    { id: 'paeds', name: 'Paediatric Ward', type: 'Ward' },
    { id: 'theatre-1', name: 'Operating Theatre 1', type: 'Theatre' },
    { id: 'cath-lab', name: 'Cardiac Catheter Lab', type: 'Lab' },
  ];

  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: locations.length,
    entry: locations.map(l => ({
      resource: {
        resourceType: 'Location',
        id: l.id,
        name: l.name,
        status: 'active',
        mode: 'instance',
        type: [{ coding: [{ code: l.type, display: l.type }] }],
        physicalType: { coding: [{ code: 'wa', display: 'Ward' }] },
      },
    })),
  });
});

// GET /api/fhir-test/Practitioner — returns mock practitioners
router.get('/Practitioner', (req: Request, res: Response) => {
  const gmcSearch = req.query.identifier as string;

  const practitioners = [
    { id: 'p1', gmc: 'GMC1234567', name: { family: 'Smith', given: ['Sarah'], prefix: ['Dr'] }, qualification: 'Consultant' },
    { id: 'p2', gmc: 'GMC2345678', name: { family: 'Jones', given: ['James'], prefix: ['Dr'] }, qualification: 'Registrar' },
    { id: 'p3', gmc: 'GMC3456789', name: { family: 'Chen', given: ['Emily'], prefix: ['Dr'] }, qualification: 'SHO' },
  ];

  let filtered = practitioners;
  if (gmcSearch) {
    const gmcNum = gmcSearch.split('|').pop();
    filtered = practitioners.filter(p => p.gmc === gmcNum);
  }

  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: filtered.length,
    entry: filtered.map(p => ({
      resource: {
        resourceType: 'Practitioner',
        id: p.id,
        identifier: [{ system: 'https://fhir.nhs.uk/Id/gmc-number', value: p.gmc }],
        name: [p.name],
        qualification: [{ code: { coding: [{ display: p.qualification }] } }],
        active: true,
      },
    })),
  });
});

// POST /api/fhir-test/generate-adt — generate a sample HL7v2 ADT message
router.post('/generate-adt', (req: Request, res: Response) => {
  const { type = 'A01', patientId, wardId, doctorId } = req.body;

  const pid = patientId || `P${Math.floor(Math.random() * 99999)}`;
  const ward = wardId || 'ae';
  const doc = doctorId || 'DOC00001';
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const msgId = `MSG${Date.now()}`;

  const message = [
    `MSH|^~\\&|EPIC|MFT|ROTAAI|MFT|${timestamp}||ADT^${type}|${msgId}|P|2.4`,
    `PID|||${pid}^^^MRN||TestPatient^Test||19900101|M`,
    `PV1||I|${ward}^${ward.toUpperCase()}^BED01||||${doc}^Test^Doctor^^^Dr`,
  ].join('\n');

  res.json({
    success: true,
    data: {
      message,
      type: `ADT^${type}`,
      instructions: 'POST this message to /api/integration/hl7v2 with X-API-Key header',
    },
  });
});

// GET /api/fhir-test/scenarios — list available test scenarios
router.get('/scenarios', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        name: 'Patient Admission',
        description: 'Simulate a patient being admitted to A&E',
        method: 'POST',
        endpoint: '/api/integration/fhir/Encounter',
        body: {
          resourceType: 'Encounter',
          id: 'test-admit-001',
          status: 'in-progress',
          class: { code: 'EMER' },
          subject: { reference: 'Patient/P001', display: 'John Smith' },
          location: [{ location: { reference: 'Location/ae', display: 'A&E' }, status: 'active' }],
        },
      },
      {
        name: 'Patient Discharge',
        description: 'Simulate a patient being discharged',
        method: 'POST',
        endpoint: '/api/integration/fhir/Encounter',
        body: {
          resourceType: 'Encounter',
          id: 'test-discharge-001',
          status: 'finished',
          class: { code: 'IMP' },
          subject: { reference: 'Patient/P002' },
          location: [{ location: { reference: 'Location/ward-a' } }],
        },
      },
      {
        name: 'Staff Badge Check-In',
        description: 'Doctor checks into a ward',
        method: 'POST',
        endpoint: '/api/integration/staff-location',
        body: { doctorId: 'DOC00001', wardId: 'ae', action: 'check-in' },
      },
      {
        name: 'NEWS2 Observation',
        description: 'Submit patient vital signs for acuity scoring',
        method: 'POST',
        endpoint: '/api/integration/news2',
        body: {
          wardId: 'ae',
          patientId: 'P001',
          observations: {
            respirationRate: 22,
            spO2: 93,
            isOnSupplementalO2: true,
            temperature: 38.5,
            systolicBP: 95,
            heartRate: 115,
            consciousness: 'alert',
          },
        },
      },
    ],
  });
});

export default router;
