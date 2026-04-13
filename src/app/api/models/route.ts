import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/api-messages';
import type { ProviderConfig } from '@/lib/providers';

interface GoogleModel {
  name: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

interface OpenAIModel {
  id: string;
  created?: number;
  owned_by?: string;
}

interface FormattedModel {
  value: string;
  label: string;
  description: string;
  displayName: string;
  inputTokenLimit: number | null;
  outputTokenLimit: number | null;
  supportedGenerationMethods: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      provider?: ProviderConfig;
      locale?: string;
    };

    const { provider, locale } = body;

    if (!provider) {
      return NextResponse.json(
        { error: getErrorMessage('apiKeyRequired', locale) },
        { status: 400 }
      );
    }

    let models: FormattedModel[] = [];

    if (provider.type === 'gemini') {
      models = await fetchGeminiModels(provider);
    } else if (provider.type === 'openai') {
      models = await fetchOpenAIModels(provider);
    } else if (provider.type === 'custom') {
      models = await fetchCustomModels(provider);
    } else {
      // Unknown provider type, return empty list
      models = [];
    }

    return NextResponse.json({ models });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : getErrorMessage('unknownErrorModels');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchGeminiModels(
  provider: ProviderConfig
): Promise<FormattedModel[]> {
  const { apiKey } = provider;

  if (!apiKey) {
    throw new Error('API key is required for Gemini provider');
  }

  // Use fetch API directly to get models list
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data = (await response.json()) as { models?: GoogleModel[] };

  if (!data.models || !Array.isArray(data.models)) {
    throw new Error('No models available');
  }

  // Filter for text generation models and format them
  return data.models
    .filter((model: GoogleModel) => {
      // Filter for generative models (exclude embedding, etc.)
      return (
        model.supportedGenerationMethods?.includes('generateContent') ||
        model.name.includes('gemini')
      );
    })
    .map(
      (model: GoogleModel): FormattedModel => ({
        value: model.name.replace('models/', ''), // Remove 'models/' prefix
        label: model.displayName || formatGeminiModelName(model.name),
        description: model.description || getGeminiDefaultDescription(model.name),
        displayName: model.displayName || formatGeminiModelName(model.name),
        inputTokenLimit: model.inputTokenLimit || null,
        outputTokenLimit: model.outputTokenLimit || null,
        supportedGenerationMethods: model.supportedGenerationMethods || []
      })
    )
    .sort((a: FormattedModel, b: FormattedModel) => {
      return getGeminiPriority(a.value) - getGeminiPriority(b.value);
    });
}

async function fetchOpenAIModels(
  provider: ProviderConfig
): Promise<FormattedModel[]> {
  const { baseUrl, apiKey } = provider;

  if (!apiKey) {
    throw new Error('API key is required for OpenAI provider');
  }

  const modelsUrl = `${baseUrl || 'https://api.openai.com'}/v1/models`;

  const response = await fetch(modelsUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: OpenAIModel[] };

  if (!data.data || !Array.isArray(data.data)) {
    return [];
  }

  // Filter for chat models and format them
  return data.data
    .filter((model) => {
      // Filter for chat/completion models
      return (
        model.id.includes('gpt') ||
        model.id.includes('chat') ||
        model.id.includes('o1')
      );
    })
    .map(
      (model): FormattedModel => ({
        value: model.id,
        label: formatOpenAIModelName(model.id),
        description: getOpenAIDefaultDescription(model.id),
        displayName: formatOpenAIModelName(model.id),
        inputTokenLimit: null,
        outputTokenLimit: null,
        supportedGenerationMethods: []
      })
    )
    .sort((a, b) => {
      return getOpenAIPriority(a.value) - getOpenAIPriority(b.value);
    });
}

async function fetchCustomModels(
  provider: ProviderConfig
): Promise<FormattedModel[]> {
  const { baseUrl, apiKey } = provider;

  if (!baseUrl) {
    return [];
  }

  const modelsUrl = `${baseUrl}/models`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      // Return empty list on failure for custom providers
      return [];
    }

    const data = (await response.json()) as { data?: OpenAIModel[] } | { models?: OpenAIModel[] };

    const models = 'data' in data ? data.data : (data as { models?: OpenAIModel[] }).models;

    if (!models || !Array.isArray(models)) {
      return [];
    }

    // Format models generically
    return models.map(
      (model): FormattedModel => ({
        value: model.id,
        label: model.id,
        description: 'Custom model',
        displayName: model.id,
        inputTokenLimit: null,
        outputTokenLimit: null,
        supportedGenerationMethods: []
      })
    );
  } catch {
    // Return empty list on any error for custom providers
    return [];
  }
}

// Helper functions for Gemini models
function formatGeminiModelName(modelName: string): string {
  const name = modelName.replace('models/', '');

  // Gemini 2.5 (Latest)
  if (name.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
  if (name.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';

  // Gemini 2.0
  if (name.includes('gemini-2.0-flash-exp'))
    return 'Gemini 2.0 Flash (Experimental)';
  if (name.includes('gemini-2.0-flash-thinking'))
    return 'Gemini 2.0 Flash Thinking';
  if (name.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
  if (name.includes('gemini-2.0-pro')) return 'Gemini 2.0 Pro';

  // Gemini 1.5
  if (name.includes('gemini-1.5-pro-latest')) return 'Gemini 1.5 Pro (Latest)';
  if (name.includes('gemini-1.5-flash-latest'))
    return 'Gemini 1.5 Flash (Latest)';
  if (name.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
  if (name.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';

  // Experimental
  if (name.includes('gemini-exp'))
    return `Gemini Experimental ${name.match(/\d{4}/)?.[0] || ''}`;

  // Default: capitalize and clean up
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getGeminiDefaultDescription(modelName: string): string {
  const name = modelName.toLowerCase();

  // Gemini 2.5 (Latest)
  if (name.includes('2.5') && name.includes('flash')) {
    return 'Latest Gemini model with fast performance and high quality.';
  }
  if (name.includes('2.5') && name.includes('pro')) {
    return 'Latest Gemini Pro with enhanced reasoning and capabilities.';
  }

  // Gemini 2.0
  if (name.includes('2.0') && name.includes('exp')) {
    return 'Experimental model with cutting-edge capabilities.';
  }
  if (name.includes('2.0') && name.includes('thinking')) {
    return 'Advanced reasoning and problem-solving with extended thinking.';
  }
  if (name.includes('2.0') && name.includes('flash')) {
    return 'Fast and efficient model with multimodal capabilities.';
  }
  if (name.includes('2.0') && name.includes('pro')) {
    return 'Enhanced reasoning with improved performance.';
  }

  // Gemini 1.5
  if (name.includes('1.5') && name.includes('pro')) {
    return 'Highest quality with detailed reasoning and analysis.';
  }
  if (name.includes('1.5') && name.includes('flash')) {
    return 'Balanced speed and quality for most tasks.';
  }

  // Experimental
  if (name.includes('exp')) {
    return 'Experimental model with latest features.';
  }

  return 'Generative AI model for text generation.';
}

function getGeminiPriority(name: string): number {
  const lower = name.toLowerCase();

  // Gemini 2.5 - Stable first, then previews
  if (
    lower.includes('2.5') &&
    lower.includes('flash') &&
    !lower.includes('preview') &&
    !lower.includes('lite')
  )
    return 0;
  if (lower.includes('2.5') && lower.includes('flash') && lower.includes('preview'))
    return 1;
  if (lower.includes('2.5') && lower.includes('flash') && lower.includes('lite'))
    return 2;
  if (lower.includes('2.5') && lower.includes('pro') && !lower.includes('preview'))
    return 3;
  if (lower.includes('2.5') && lower.includes('pro') && lower.includes('preview'))
    return 4;

  // Gemini 2.0 - Flash first, then Pro
  if (
    lower.includes('2.0') &&
    lower.includes('flash') &&
    !lower.includes('thinking') &&
    !lower.includes('exp') &&
    !lower.includes('lite')
  )
    return 5;
  if (
    lower.includes('2.0') &&
    lower.includes('flash') &&
    lower.includes('exp') &&
    !lower.includes('thinking')
  )
    return 6;
  if (lower.includes('2.0') && lower.includes('flash') && lower.includes('lite'))
    return 7;
  if (lower.includes('2.0') && lower.includes('pro')) return 8;
  if (lower.includes('2.0') && lower.includes('flash') && lower.includes('thinking'))
    return 9;

  // Generic latest models
  if (lower.includes('flash') && lower.includes('latest') && !lower.includes('lite'))
    return 10;
  if (lower.includes('flash') && lower.includes('lite') && lower.includes('latest'))
    return 11;
  if (lower.includes('pro') && lower.includes('latest')) return 12;

  // Experimental/Others
  if (lower.includes('exp')) return 20;
  if (lower.includes('learnlm')) return 30;
  if (lower.includes('gemma')) return 40;

  return 99; // Others last
}

// Helper functions for OpenAI models
function formatOpenAIModelName(modelId: string): string {
  // GPT-4.1 and later
  if (modelId.includes('gpt-4.1')) return modelId.replace('gpt-', 'GPT-').toUpperCase();
  if (modelId === 'gpt-4o') return 'GPT-4o';
  if (modelId === 'gpt-4o-mini') return 'GPT-4o Mini';
  if (modelId.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
  if (modelId.includes('gpt-4')) return 'GPT-4';

  // GPT-3.5
  if (modelId.includes('gpt-3.5-turbo')) return 'GPT-3.5 Turbo';

  // O1 series
  if (modelId.includes('o1')) return modelId.toUpperCase();

  // Default
  return modelId;
}

function getOpenAIDefaultDescription(modelId: string): string {
  const lower = modelId.toLowerCase();

  if (lower.includes('gpt-4o') || lower.includes('gpt-4.1')) {
    return 'Latest GPT-4 model with advanced multimodal capabilities.';
  }
  if (lower.includes('gpt-4-turbo')) {
    return 'Fast and capable GPT-4 model for most tasks.';
  }
  if (lower.includes('gpt-4')) {
    return 'Advanced reasoning and complex task handling.';
  }
  if (lower.includes('gpt-3.5')) {
    return 'Fast and efficient model for general tasks.';
  }
  if (lower.includes('o1')) {
    return 'Advanced reasoning model for complex problems.';
  }

  return 'OpenAI model for text generation.';
}

function getOpenAIPriority(modelId: string): number {
  const lower = modelId.toLowerCase();

  // GPT-4.1 (latest)
  if (lower.includes('gpt-4.1')) return 0;

  // GPT-4o
  if (lower === 'gpt-4o') return 1;
  if (lower.includes('gpt-4o-mini')) return 2;

  // O1 series
  if (lower.includes('o1-preview')) return 3;
  if (lower.includes('o1-mini')) return 4;

  // GPT-4 Turbo
  if (lower.includes('gpt-4-turbo')) return 5;

  // GPT-4
  if (lower.includes('gpt-4') && !lower.includes('turbo') && !lower.includes('o')) return 6;

  // GPT-3.5
  if (lower.includes('gpt-3.5')) return 10;

  return 99;
}
