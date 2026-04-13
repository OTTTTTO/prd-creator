/**
 * Provider configuration types and constants for multi-provider LLM support.
 * This module provides a unified interface for working with different AI providers.
 */

/**
 * Supported AI provider types.
 * - gemini: Google Gemini API (uses @ai-sdk/google)
 * - openai: OpenAI-compatible API (uses @ai-sdk/openai)
 * - custom: Custom OpenAI-compatible endpoint (e.g., Ollama, DeepSeek)
 */
export type ProviderType = 'gemini' | 'openai' | 'custom';

/**
 * Provider configuration interface.
 * Defines the contract for AI provider settings used across API routes and UI components.
 */
export interface ProviderConfig {
  /** Provider type identifier */
  type: ProviderType;
  /** Base URL for the API (not used for gemini, uses fixed endpoint) */
  baseUrl: string;
  /** API key for authentication (optional for local providers like Ollama) */
  apiKey: string;
  /** Model identifier to use (e.g., 'gemini-2.5-flash', 'gpt-4o', 'deepseek-chat') */
  model: string;
  /** Optional display name for UI (defaults to provider type name if not provided) */
  displayName?: string;
}

/**
 * Local storage key for persisting provider configuration.
 */
export const PROVIDER_STORAGE_KEY = 'provider_config';

/**
 * Pre-configured provider presets.
 * These are used in the Settings UI to quickly populate provider configurations.
 */
export const PRESET_PROVIDERS: Record<
  string,
  Omit<ProviderConfig, 'apiKey'>
> = {
  /** Google Gemini (default provider) */
  gemini: {
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com', // Not used, fixed in SDK
    model: 'gemini-2.5-flash',
    displayName: 'Gemini'
  },
  /** OpenAI official API */
  openai: {
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    displayName: 'OpenAI'
  },
  /** DeepSeek (OpenAI-compatible) */
  deepseek: {
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    displayName: 'DeepSeek'
  },
  /** Ollama (local OpenAI-compatible) */
  ollama: {
    type: 'custom',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    displayName: 'Ollama'
  },
  /** Custom OpenAI-compatible endpoint */
  custom: {
    type: 'custom',
    baseUrl: '',
    model: '',
    displayName: 'Custom'
  }
};

/**
 * Default provider configuration.
 * Used as fallback when no provider config is stored.
 */
export const DEFAULT_PROVIDER: ProviderConfig = {
  type: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '',
  model: 'gemini-2.5-flash',
  displayName: 'Gemini'
};

/**
 * Validates a provider configuration.
 * Returns true if the configuration has all required fields with valid values.
 */
export function isValidProviderConfig(
  config: unknown
): config is ProviderConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const c = config as Partial<ProviderConfig>;

  // Check required fields
  if (
    typeof c.type !== 'string' ||
    !['gemini', 'openai', 'custom'].includes(c.type) ||
    typeof c.baseUrl !== 'string' ||
    typeof c.model !== 'string'
  ) {
    return false;
  }

  // API key is optional for custom providers (e.g., Ollama)
  // but required for gemini and openai
  if (c.type !== 'custom' && typeof c.apiKey !== 'string') {
    return false;
  }

  return true;
}

/**
 * Creates a provider config from preset and optional overrides.
 * Useful for initializing from environment variables or user selection.
 */
export function createProviderFromPreset(
  presetKey: string,
  overrides?: Partial<ProviderConfig>
): ProviderConfig {
  const preset = PRESET_PROVIDERS[presetKey];
  if (!preset) {
    return { ...DEFAULT_PROVIDER, ...overrides };
  }

  return {
    ...preset,
    apiKey: overrides?.apiKey ?? '',
    ...overrides
  };
}
