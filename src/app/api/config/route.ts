import { NextResponse } from 'next/server';
import type { ProviderConfig } from '@/lib/providers';

/**
 * GET /api/config
 *
 * Returns the default provider configuration from environment variables.
 * This allows deployment configuration without exposing sensitive API keys.
 *
 * Environment Variables:
 * - DEFAULT_PROVIDER_TYPE: Provider type ('gemini' | 'openai' | 'custom')
 * - DEFAULT_PROVIDER_BASE_URL: Base URL for the API endpoint
 * - DEFAULT_PROVIDER_API_KEY: API key for authentication (NOT exposed in response)
 * - DEFAULT_PROVIDER_MODEL: Model identifier to use
 *
 * Security Note: The full API key is never returned. Only a boolean `hasApiKey`
 * indicates whether the key is configured.
 */
export async function GET() {
  const providerType = process.env.DEFAULT_PROVIDER_TYPE;
  const baseUrl = process.env.DEFAULT_PROVIDER_BASE_URL;
  const apiKey = process.env.DEFAULT_PROVIDER_API_KEY;
  const model = process.env.DEFAULT_PROVIDER_MODEL;

  // If no environment config is set, return empty response
  if (!providerType && !baseUrl && !apiKey && !model) {
    return NextResponse.json({ config: null });
  }

  // Validate provider type
  const validProviderTypes = ['gemini', 'openai', 'custom'];
  const type = validProviderTypes.includes(providerType || '')
    ? (providerType as ProviderConfig['type'])
    : 'gemini'; // Default to gemini if invalid

  const config: Partial<ProviderConfig> & { hasApiKey: boolean } = {
    type,
    baseUrl: baseUrl || '',
    model: model || '',
    // Only indicate presence of API key, not the value itself
    hasApiKey: Boolean(apiKey && apiKey.length > 0)
  };

  return NextResponse.json({ config });
}
