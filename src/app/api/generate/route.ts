import { NextRequest, NextResponse } from 'next/server';
import { buildGenerationPrompt, PrdInput } from '../../../lib/prd';
import { GoogleGenAI } from '@google/genai';
import { getContextHeader } from '../_lib/datetime';
import { getErrorMessage } from '@/lib/api-messages';

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
      apiKey?: string;
      model?: string;
      locale?: string;
    };
    locale = body.locale;
    const { inputs, apiKey, model } = body;

    if (!apiKey || typeof apiKey !== 'string') {
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

    const client = new GoogleGenAI({ apiKey });
    const basePrompt = buildGenerationPrompt(inputs, locale);

    // Add current date/time context to the prompt
    const promptWithContext = getContextHeader() + basePrompt;

    const response = await client.models.generateContent({
      model: model || 'gemini-flash-latest',
      contents: promptWithContext
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
