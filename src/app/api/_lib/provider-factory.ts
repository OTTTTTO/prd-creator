/**
 * Provider factory for multi-provider LLM support using Vercel AI SDK.
 * This module creates language model instances based on provider configuration.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ProviderConfig } from '@/lib/providers';

/**
 * Creates a Vercel AI SDK language model instance from provider configuration.
 *
 * Supports three provider types:
 * - gemini: Uses @ai-sdk/google with the Google Generative AI API
 * - openai: Uses @ai-sdk/openai with official OpenAI API
 * - custom: Uses @ai-sdk/openai with custom OpenAI-compatible endpoint
 *
 * @param config - Provider configuration containing type, baseUrl, apiKey, and model
 * @returns A LanguageModelV3 instance compatible with Vercel AI SDK's generateText()
 * @throws Error if apiKey is missing for non-custom providers
 */
export function createLanguageModel(config: ProviderConfig): LanguageModelV3 {
  const { type, baseUrl, apiKey, model } = config;

  switch (type) {
    case 'gemini': {
      // Gemini uses the Google Generative AI SDK
      // baseUrl is ignored as Google SDK uses fixed endpoints
      if (!apiKey) {
        throw new Error('API key is required for Gemini provider');
      }

      const google = createGoogleGenerativeAI({
        apiKey
      });

      return google(model);
    }

    case 'openai':
    case 'custom': {
      // OpenAI and custom providers use the OpenAI-compatible SDK
      // For 'openai' type, baseUrl defaults to official OpenAI API
      // For 'custom' type, baseUrl is used for the endpoint
      if (!apiKey && type !== 'custom') {
        throw new Error('API key is required for OpenAI provider');
      }

      const openai = createOpenAI({
        baseURL: baseUrl || undefined,
        apiKey: apiKey || undefined
      });

      // Use chat completions API for all OpenAI-compatible providers.
      // Default openai() uses the Responses API which only OpenAI supports.
      return openai.chat(model);
    }

    default:
      // TypeScript exhaustiveness check - should never happen
      const _exhaustive: never = type;
      throw new Error(`Unsupported provider type: ${_exhaustive}`);
  }
}
