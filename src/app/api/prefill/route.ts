import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_PRD_INPUT, PrdInput } from '../../../lib/prd';
import { getContextHeader } from '../_lib/datetime';
import { getErrorMessage } from '@/lib/api-messages';
import { createLanguageModel } from '../_lib/provider-factory';
import { generateText } from 'ai';
import type { ProviderConfig } from '@/lib/providers';

export async function POST(request: NextRequest) {
  let locale: string | undefined;
  try {
    const body = (await request.json()) as {
      productIdea?: string;
      images?: Array<{
        id: string;
        name: string;
        type: string;
        size: number;
        data: string;
      }>;
      provider?: ProviderConfig;
      locale?: string;
    };
    locale = body.locale;
    const { productIdea, images, provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: getErrorMessage('apiKeyRequired', locale) },
        { status: 400 }
      );
    }

    if (!productIdea || !productIdea.trim()) {
      return NextResponse.json(
        { error: getErrorMessage('productIdeaRequired', locale) },
        { status: 400 }
      );
    }

    const model = createLanguageModel(provider);

    // Build image context if images are provided
    let imageContext = '';
    if (images && images.length > 0) {
      imageContext =
        '\n\nVisual Context: The user has also provided the following images to help illustrate their product idea:\n';
      images.forEach((img, index) => {
        imageContext += `\n${index + 1}. Image: ${img.name} (${img.type}, ${(img.size / 1024 / 1024).toFixed(1)}MB)\n`;
        imageContext += `   [Note: This is a base64 encoded image that provides visual context for the product idea]`;
      });
      imageContext +=
        "\n\nPlease consider these visual materials when analyzing the product idea. They may contain mockups, wireframes, diagrams, or reference photos that provide additional context about the user's vision.";
    }

    // JSON schema for the response
    const jsonSchema = `{
  "type": "object",
  "properties": {
    "productName": { "type": "string" },
    "targetAudience": { "type": "string" },
    "problemStatement": { "type": "string" },
    "proposedSolution": { "type": "string" },
    "coreFeatures": { "type": "string" },
    "keyFeatures": { "type": "string" },
    "businessGoals": { "type": "string" },
    "successMetrics": { "type": "string" },
    "futureFeatures": { "type": "string" },
    "techStack": { "type": "string" },
    "constraints": { "type": "string" }
  },
  "required": ["productName", "targetAudience", "problemStatement", "proposedSolution", "coreFeatures", "keyFeatures", "businessGoals", "successMetrics"]
}`;

    const basePrompt = `You are a brilliant product strategist. A user has provided a high-level product idea. Your task is to analyze this idea and break it down into the foundational components of a Product Requirements Document. Based on the idea, generate a plausible product name, identify a specific target audience, formulate a clear problem statement and a corresponding solution, brainstorm core features for an MVP, identify key differentiating features, suggest business goals and specific success metrics (KPIs), and recommend future features and tech stack.

User's Idea: "${productIdea}"${imageContext}

IMPORTANT: You must respond with a valid JSON object that strictly adheres to this schema:
${jsonSchema}

For features, use bullet points within the string. For success metrics, include specific, measurable KPIs with targets where appropriate. Return ONLY the JSON object, no additional text.`;

    // Add current date/time context to the prompt
    let promptWithContext = getContextHeader() + basePrompt;

    // Add locale instruction for non-English languages
    if (locale === 'zh') {
      promptWithContext +=
        '\n\nPlease respond in Simplified Chinese (简体中文).';
    }

    const response = await generateText({
      model,
      prompt: promptWithContext,
      maxRetries: 0
    });

    const jsonString = response.text?.trim();
    if (!jsonString) {
      throw new Error(getErrorMessage('emptyResponsePrefill', locale));
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
    const result: PrdInput = {
      productName: parsed.productName || DEFAULT_PRD_INPUT.productName,
      targetAudience: parsed.targetAudience || DEFAULT_PRD_INPUT.targetAudience,
      problemStatement:
        parsed.problemStatement || DEFAULT_PRD_INPUT.problemStatement,
      proposedSolution:
        parsed.proposedSolution || DEFAULT_PRD_INPUT.proposedSolution,
      coreFeatures: parsed.coreFeatures || DEFAULT_PRD_INPUT.coreFeatures,
      keyFeatures: parsed.keyFeatures || DEFAULT_PRD_INPUT.keyFeatures,
      businessGoals: parsed.businessGoals || DEFAULT_PRD_INPUT.businessGoals,
      successMetrics: parsed.successMetrics || DEFAULT_PRD_INPUT.successMetrics,
      futureFeatures: parsed.futureFeatures || DEFAULT_PRD_INPUT.futureFeatures,
      techStack: parsed.techStack || DEFAULT_PRD_INPUT.techStack,
      constraints: parsed.constraints || DEFAULT_PRD_INPUT.constraints
    };

    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : getErrorMessage('unknownErrorPrefill', locale);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
