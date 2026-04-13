import { NextRequest, NextResponse } from 'next/server';
import { PrdInput, SECTION_FIELD_MAPPING } from '../../../lib/prd';
import { getContextHeader } from '../_lib/datetime';
import { getErrorMessage } from '@/lib/api-messages';
import { createLanguageModel } from '../_lib/provider-factory';
import { generateText } from 'ai';
import type { ProviderConfig } from '@/lib/providers';

function isPrdInput(value: unknown): value is PrdInput {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const input = value as Record<keyof PrdInput, unknown>;
  const stringFields: Array<keyof PrdInput> = [
    'productName',
    'targetAudience',
    'problemStatement',
    'proposedSolution',
    'coreFeatures',
    'businessGoals',
    'futureFeatures',
    'techStack',
    'constraints'
  ];

  const arrayFields: Array<keyof PrdInput> = ['productIdeaImages'];

  const stringFieldsValid = stringFields.every(
    (field) => typeof input[field] === 'string'
  );

  const arrayFieldsValid = arrayFields.every(
    (field) => !input[field] || Array.isArray(input[field])
  );

  return stringFieldsValid && arrayFieldsValid;
}

export async function POST(request: NextRequest) {
  let locale: string | undefined;
  try {
    const body = (await request.json()) as {
      currentInputs?: unknown;
      sectionTitle?: string;
      userFeedback?: string;
      provider?: ProviderConfig;
      locale?: string;
    };
    locale = body.locale;
    const { currentInputs, sectionTitle, userFeedback, provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: getErrorMessage('apiKeyRequired', locale) },
        { status: 400 }
      );
    }

    if (!sectionTitle || !SECTION_FIELD_MAPPING[sectionTitle]) {
      return NextResponse.json(
        { error: getErrorMessage('invalidSectionTitle', locale) },
        { status: 400 }
      );
    }

    if (!userFeedback || !userFeedback.trim()) {
      return NextResponse.json(
        { error: getErrorMessage('feedbackRequired', locale) },
        { status: 400 }
      );
    }

    if (!isPrdInput(currentInputs)) {
      return NextResponse.json(
        { error: getErrorMessage('invalidPrdInputs', locale) },
        { status: 400 }
      );
    }

    const fieldsToRefine = SECTION_FIELD_MAPPING[sectionTitle];
    const currentSectionData: Record<string, unknown> = {};
    fieldsToRefine.forEach((key) => {
      currentSectionData[key] = currentInputs[key];
    });

    // Build JSON schema for the specific section
    const schemaProperties = fieldsToRefine.map((field) => `    "${field}": { "type": "string" }`).join('\n');
    const jsonSchema = `{
  "type": "object",
  "properties": {\n${schemaProperties}\n  },
  "required": [${fieldsToRefine.map((f) => `"${f}"`).join(', ')}]
}`;

    const basePrompt = `You are an expert product management assistant. A user wants to refine a specific section of their Product Requirements Document based on their feedback.

Current document state (for context only):
${JSON.stringify(currentInputs, null, 2)}

Section to Refine: "${sectionTitle}"
Current values in this section:
${JSON.stringify(currentSectionData, null, 2)}

User's Feedback for refinement: "${userFeedback}"

Your task is to update the values for the fields in the "${sectionTitle}" section based on the user's feedback. Maintain the existing tone and style.

IMPORTANT: You must respond with a valid JSON object that strictly adheres to this schema:
${jsonSchema}

Return ONLY the JSON object, no additional text or explanations.`;

    // Add current date/time context to the prompt
    let promptWithContext = getContextHeader() + basePrompt;

    // Add locale instruction for non-English languages
    if (locale === 'zh') {
      promptWithContext +=
        '\n\nPlease respond in Simplified Chinese (简体中文).';
    }

    const model = createLanguageModel(provider);
    const response = await generateText({
      model,
      prompt: promptWithContext
    });

    const jsonString = response.text?.trim();
    if (!jsonString) {
      throw new Error(getErrorMessage('emptyResponseRefine', locale));
    }

    // Parse JSON, handling potential markdown code blocks
    let cleanedJson = jsonString;
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.slice(7);
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.slice(3);
    }
    if (cleanedJson.endsWith('```')) {
      cleanedJson = cleanedJson.slice(0, -3);
    }
    cleanedJson = cleanedJson.trim();

    const parsed = JSON.parse(cleanedJson);
    const validatedResult: Partial<PrdInput> = {};
    fieldsToRefine.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(parsed, field) &&
        typeof parsed[field] === 'string'
      ) {
        // Type assertion to satisfy TypeScript
        (validatedResult as Record<string, unknown>)[field] = parsed[field];
      }
    });

    return NextResponse.json({ data: validatedResult });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : getErrorMessage('unknownErrorRefine', locale);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
