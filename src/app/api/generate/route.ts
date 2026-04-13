import { NextRequest, NextResponse } from 'next/server';
import { buildGenerationPrompt, PrdInput } from '../../../lib/prd';
import { getContextHeader } from '../_lib/datetime';
import { getErrorMessage } from '@/lib/api-messages';
import { createLanguageModel } from '../_lib/provider-factory';
import { generateText } from 'ai';
import type { ProviderConfig } from '@/lib/providers';

function validateInputs(value: unknown): value is PrdInput {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const input = value as Record<keyof PrdInput, unknown>;

  // Check string fields
  const stringFields: Array<keyof PrdInput> = [
    'productName',
    'targetAudience',
    'problemStatement',
    'proposedSolution',
    'coreFeatures',
    'keyFeatures',
    'businessGoals',
    'successMetrics',
    'futureFeatures',
    'techStack',
    'constraints'
  ];

  const stringFieldsValid = stringFields.every(
    (field) => typeof input[field] === 'string'
  );

  // Check productIdeaImages field (optional)
  const imagesValid =
    !input.productIdeaImages || Array.isArray(input.productIdeaImages);

  return stringFieldsValid && imagesValid;
}

export async function POST(request: NextRequest) {
  let locale: string | undefined;
  try {
    const body = (await request.json()) as {
      inputs?: unknown;
      provider?: ProviderConfig;
      locale?: string;
    };
    locale = body.locale;
    const { inputs, provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: getErrorMessage('apiKeyRequired', locale) },
        { status: 400 }
      );
    }

    if (!validateInputs(inputs)) {
      return NextResponse.json(
        { error: getErrorMessage('invalidPrdInputs', locale) },
        { status: 400 }
      );
    }

    const model = createLanguageModel(provider);
    const basePrompt = buildGenerationPrompt(inputs, locale);

    // Add current date/time context to the prompt
    const promptWithContext = getContextHeader() + basePrompt;

    const response = await generateText({
      model,
      prompt: promptWithContext
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error(getErrorMessage('emptyResponseGenerate', locale));
    }

    return NextResponse.json({ data: { prd: text } });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : getErrorMessage('unknownErrorGenerate', locale);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
