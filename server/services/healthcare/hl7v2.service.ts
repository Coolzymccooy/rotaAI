/**
 * HL7 v2.x ADT Message Parser
 *
 * Parses raw HL7v2 pipe-delimited messages commonly sent by
 * hospital Patient Administration Systems (PAS) for:
 * - ADT^A01: Patient Admission
 * - ADT^A02: Patient Transfer
 * - ADT^A03: Patient Discharge
 * - ADT^A08: Patient Information Update
 *
 * These messages drive real-time patient counts on the Live Acuity Map.
 */

import { logger } from '../../config/logger.js';

export interface Hl7Segment {
  name: string;
  fields: string[];
}

export interface Hl7Message {
  segments: Hl7Segment[];
  messageType: string;
  triggerEvent: string;
  messageId: string;
  timestamp: string;
}

export interface AdtEvent {
  messageType: string;      // e.g., "ADT^A01"
  triggerEvent: string;     // e.g., "A01"
  action: 'admit' | 'discharge' | 'transfer' | 'update' | 'unknown';
  patientId: string | null;
  patientName: string | null;
  wardId: string | null;
  wardName: string | null;
  bedId: string | null;
  previousWardId: string | null;
  attendingDoctorId: string | null;
  attendingDoctorName: string | null;
  admitDateTime: string | null;
  messageId: string;
  rawTimestamp: string;
}

/**
 * Parse a raw HL7v2 message string into segments.
 *
 * HL7v2 format:
 * MSH|^~\&|EPIC|MFT|ROTAAI|MFT|20260321150000||ADT^A01|MSG001|P|2.4
 * PID|||123456^^^MRN||Smith^John||19850315|M
 * PV1||I|AE^AE-RESUS^BED01||||DOC00001^Smith^Sarah^^^Dr
 */
export function parseHl7Message(raw: string): Hl7Message {
  const lines = raw.trim().split(/\r?\n|\r/);
  const segments: Hl7Segment[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = line.split('|');
    const name = fields[0];
    segments.push({ name, fields });
  }

  // Extract from MSH segment
  const msh = segments.find(s => s.name === 'MSH');
  const messageTypeField = msh?.fields[9] || '';  // MSH.9
  const [messageType, triggerEvent] = messageTypeField.split('^');
  const messageId = msh?.fields[10] || '';         // MSH.10
  const timestamp = msh?.fields[7] || '';          // MSH.7

  return {
    segments,
    messageType: messageTypeField,
    triggerEvent: triggerEvent || '',
    messageId,
    timestamp,
  };
}

/**
 * Extract ADT event data from a parsed HL7v2 message.
 */
export function extractAdtEvent(msg: Hl7Message): AdtEvent {
  const pid = msg.segments.find(s => s.name === 'PID');
  const pv1 = msg.segments.find(s => s.name === 'PV1');

  // PID.3 = Patient ID, PID.5 = Patient Name
  const patientId = pid?.fields[3]?.split('^')[0] || null;
  const patientNameRaw = pid?.fields[5] || '';
  const patientNameParts = patientNameRaw.split('^');
  const patientName = [patientNameParts[1], patientNameParts[0]].filter(Boolean).join(' ') || null;

  // PV1.3 = Assigned Location (Ward^Room^Bed)
  const locationField = pv1?.fields[3] || '';
  const locationParts = locationField.split('^');
  const wardId = locationParts[0] || null;
  const wardName = locationParts[1] || wardId;
  const bedId = locationParts[2] || null;

  // PV1.6 = Prior Location (for transfers)
  const priorLocation = pv1?.fields[6] || '';
  const previousWardId = priorLocation.split('^')[0] || null;

  // PV1.7 = Attending Doctor
  const attendingField = pv1?.fields[7] || '';
  const attendingParts = attendingField.split('^');
  const attendingDoctorId = attendingParts[0] || null;
  const attendingDoctorName = [attendingParts[2], attendingParts[1]].filter(Boolean).join(' ') || null;

  // PV1.44 = Admit DateTime
  const admitDateTime = pv1?.fields[44] || msg.timestamp || null;

  // Map trigger event to action
  let action: AdtEvent['action'] = 'unknown';
  switch (msg.triggerEvent) {
    case 'A01': action = 'admit'; break;
    case 'A02': action = 'transfer'; break;
    case 'A03': action = 'discharge'; break;
    case 'A04': action = 'admit'; break;     // Register (ED)
    case 'A05': action = 'admit'; break;     // Pre-admit
    case 'A08': action = 'update'; break;
    case 'A11': action = 'discharge'; break; // Cancel admit
    case 'A12': action = 'transfer'; break;  // Cancel transfer
  }

  return {
    messageType: msg.messageType,
    triggerEvent: msg.triggerEvent,
    action,
    patientId,
    patientName,
    wardId,
    wardName,
    bedId,
    previousWardId,
    attendingDoctorId,
    attendingDoctorName,
    admitDateTime,
    messageId: msg.messageId,
    rawTimestamp: msg.timestamp,
  };
}

/**
 * Validate an HL7v2 message has required segments.
 */
export function validateAdtMessage(raw: string): { valid: boolean; error?: string } {
  if (!raw || !raw.trim()) {
    return { valid: false, error: 'Empty message' };
  }

  if (!raw.startsWith('MSH|')) {
    return { valid: false, error: 'Message must start with MSH segment' };
  }

  const msg = parseHl7Message(raw);

  if (!msg.segments.find(s => s.name === 'MSH')) {
    return { valid: false, error: 'Missing MSH segment' };
  }

  if (!msg.triggerEvent) {
    return { valid: false, error: 'Missing message type/trigger event in MSH.9' };
  }

  return { valid: true };
}
