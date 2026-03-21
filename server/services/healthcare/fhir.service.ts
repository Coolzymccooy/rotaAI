/**
 * FHIR R4 Resource Parser & Client
 *
 * Handles inbound FHIR resources from EHR systems (Epic, Cerner)
 * and can query FHIR-compliant servers for patient/encounter data.
 *
 * Supported FHIR Resources:
 * - Encounter (patient admission/discharge/transfer → ward census)
 * - Location (ward/bed mapping)
 * - Practitioner (doctor verification)
 * - Schedule (shift planning)
 */

import { logger } from '../../config/logger.js';

// FHIR R4 Resource Types
export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'finished' | 'cancelled';
  class: { code: string; display?: string };
  subject: { reference: string; display?: string };
  location?: Array<{
    location: { reference: string; display?: string };
    status?: 'planned' | 'active' | 'completed';
    period?: { start?: string; end?: string };
  }>;
  period?: { start?: string; end?: string };
  serviceType?: { coding?: Array<{ code: string; display?: string }> };
  priority?: { coding?: Array<{ code: string; display?: string }> };
}

export interface FhirLocation {
  resourceType: 'Location';
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'inactive';
  mode?: 'instance' | 'kind';
  type?: Array<{ coding?: Array<{ code: string; display?: string }> }>;
  physicalType?: { coding?: Array<{ code: string; display?: string }> };
  managingOrganization?: { reference: string; display?: string };
  partOf?: { reference: string; display?: string };
}

export interface FhirPractitioner {
  resourceType: 'Practitioner';
  id: string;
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{ family?: string; given?: string[]; prefix?: string[] }>;
  qualification?: Array<{
    code: { coding?: Array<{ system?: string; code?: string; display?: string }> };
    period?: { start?: string; end?: string };
  }>;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'searchset' | 'transaction' | 'message' | 'batch';
  total?: number;
  entry?: Array<{ resource: any; fullUrl?: string }>;
}

// Parse FHIR Encounter → internal ward event
export function parseEncounter(encounter: FhirEncounter): {
  wardId: string | null;
  wardName: string | null;
  patientId: string | null;
  action: 'admit' | 'discharge' | 'transfer' | 'unknown';
  priority: string;
} {
  const location = encounter.location?.[0]?.location;
  const wardId = location?.reference?.replace('Location/', '') || null;
  const wardName = location?.display || null;
  const patientId = encounter.subject?.reference?.replace('Patient/', '') || null;

  let action: 'admit' | 'discharge' | 'transfer' | 'unknown' = 'unknown';
  switch (encounter.status) {
    case 'arrived':
    case 'triaged':
    case 'in-progress':
      action = 'admit';
      break;
    case 'finished':
    case 'cancelled':
      action = 'discharge';
      break;
    case 'planned':
      action = 'admit';
      break;
  }

  const priority = encounter.priority?.coding?.[0]?.code || 'routine';

  return { wardId, wardName, patientId, action, priority };
}

// Parse FHIR Practitioner → doctor code
export function parsePractitioner(practitioner: FhirPractitioner): {
  gmcNumber: string | null;
  name: string;
  grade: string | null;
} {
  const gmcId = practitioner.identifier?.find(
    id => id.system === 'https://fhir.nhs.uk/Id/gmc-number' || id.system?.includes('gmc')
  );
  const gmcNumber = gmcId?.value || null;

  const nameObj = practitioner.name?.[0];
  const name = [
    ...(nameObj?.prefix || []),
    ...(nameObj?.given || []),
    nameObj?.family || '',
  ].filter(Boolean).join(' ');

  const qualification = practitioner.qualification?.[0]?.code?.coding?.[0]?.display || null;

  return { gmcNumber, name, grade: qualification };
}

// FHIR REST Client for querying external EHR
export class FhirClient {
  private baseUrl: string;
  private authToken: string | null;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authToken = authToken || null;
  }

  private async request(path: string): Promise<any> {
    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`FHIR request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      logger.error('FHIR client error', { path, error: error.message });
      throw error;
    }
  }

  async getEncountersByLocation(locationId: string): Promise<FhirEncounter[]> {
    const bundle: FhirBundle = await this.request(
      `/Encounter?location=${locationId}&status=in-progress&_count=100`
    );
    return (bundle.entry || []).map(e => e.resource as FhirEncounter);
  }

  async getLocations(): Promise<FhirLocation[]> {
    const bundle: FhirBundle = await this.request(
      `/Location?status=active&_count=200`
    );
    return (bundle.entry || []).map(e => e.resource as FhirLocation);
  }

  async getPractitioner(gmcNumber: string): Promise<FhirPractitioner | null> {
    const bundle: FhirBundle = await this.request(
      `/Practitioner?identifier=https://fhir.nhs.uk/Id/gmc-number|${gmcNumber}`
    );
    return (bundle.entry?.[0]?.resource as FhirPractitioner) || null;
  }

  async getActiveEncounterCount(locationId: string): Promise<number> {
    const bundle: FhirBundle = await this.request(
      `/Encounter?location=${locationId}&status=in-progress&_summary=count`
    );
    return bundle.total || 0;
  }
}
