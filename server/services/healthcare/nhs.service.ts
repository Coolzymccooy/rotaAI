/**
 * NHS API Client
 *
 * Connects to NHS Digital services:
 * - PDS (Personal Demographics Service) — patient identity
 * - SDS (Spine Directory Service) — staff/organization lookup
 * - e-Referral Service — referral tracking
 *
 * Production endpoints:
 * - PDS FHIR: https://api.service.nhs.uk/personal-demographics/FHIR/R4
 * - SDS FHIR: https://api.service.nhs.uk/spine-directory/FHIR/R4
 *
 * Requires NHS API key from https://digital.nhs.uk/developer
 */

import { logger } from '../../config/logger.js';

const NHS_API_BASE = process.env.NHS_API_BASE || 'https://sandbox.api.service.nhs.uk';
const NHS_API_KEY = process.env.NHS_API_KEY || '';

interface NhsApiConfig {
  baseUrl: string;
  apiKey: string;
}

function getConfig(): NhsApiConfig {
  return {
    baseUrl: NHS_API_BASE,
    apiKey: NHS_API_KEY,
  };
}

async function nhsRequest(path: string): Promise<any> {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error('NHS_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Request-ID': crypto.randomUUID(),
        'Accept': 'application/fhir+json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`NHS API error ${response.status}: ${text.slice(0, 200)}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeout);
    logger.error('NHS API request failed', { path, error: error.message });
    throw error;
  }
}

/**
 * Look up a patient by NHS number via PDS.
 */
export async function lookupPatient(nhsNumber: string): Promise<{
  nhsNumber: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  address: string;
} | null> {
  try {
    const result = await nhsRequest(
      `/personal-demographics/FHIR/R4/Patient/${nhsNumber}`
    );

    if (!result || result.resourceType !== 'Patient') return null;

    const name = result.name?.[0];
    const fullName = [
      ...(name?.prefix || []),
      ...(name?.given || []),
      name?.family || '',
    ].filter(Boolean).join(' ');

    const address = result.address?.[0];
    const fullAddress = [
      ...(address?.line || []),
      address?.city,
      address?.postalCode,
    ].filter(Boolean).join(', ');

    return {
      nhsNumber,
      name: fullName,
      dateOfBirth: result.birthDate || '',
      gender: result.gender || '',
      address: fullAddress,
    };
  } catch (error) {
    logger.warn(`PDS lookup failed for ${nhsNumber}`, { error });
    return null;
  }
}

/**
 * Verify a doctor's GMC registration via SDS.
 */
export async function verifyGmcNumber(gmcNumber: string): Promise<{
  valid: boolean;
  name: string | null;
  status: string | null;
  specialty: string | null;
} | null> {
  try {
    const result = await nhsRequest(
      `/spine-directory/FHIR/R4/Practitioner?identifier=https://fhir.nhs.uk/Id/gmc-number|${gmcNumber}`
    );

    if (!result?.entry?.length) {
      return { valid: false, name: null, status: null, specialty: null };
    }

    const practitioner = result.entry[0].resource;
    const name = practitioner.name?.[0];
    const fullName = [
      ...(name?.prefix || []),
      ...(name?.given || []),
      name?.family || '',
    ].filter(Boolean).join(' ');

    return {
      valid: true,
      name: fullName,
      status: practitioner.active ? 'active' : 'inactive',
      specialty: practitioner.qualification?.[0]?.code?.coding?.[0]?.display || null,
    };
  } catch (error) {
    logger.warn(`SDS lookup failed for GMC ${gmcNumber}`, { error });
    return null;
  }
}

/**
 * Check if NHS API is configured and accessible.
 */
export async function checkNhsApiHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  endpoint: string;
}> {
  const config = getConfig();
  const configured = !!config.apiKey;

  if (!configured) {
    return { configured: false, reachable: false, endpoint: config.baseUrl };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return { configured: true, reachable: res.ok, endpoint: config.baseUrl };
  } catch {
    return { configured: true, reachable: false, endpoint: config.baseUrl };
  }
}
