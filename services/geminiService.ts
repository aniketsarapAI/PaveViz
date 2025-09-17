import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT = `You are an AI specializing in photorealistic architectural visualization. Your task is to replace the ground surface in an image with a new paving texture.

**Instructions:**
1.  **Input:** You will receive two images. The first is the scene (e.g., a garden or patio). The second is a texture swatch of the paving material.
2.  **Action:** In the first image, identify and replace ONLY the primary ground surface (like grass, old pavers, or dirt) with the texture from the second image.
3.  **Preservation:** All other elements in the scene—such as furniture, plants, walls, doors, etc.—must remain completely untouched and unmodified.
4.  **Realism:** The new paving must seamlessly integrate into the scene, matching the original image's perspective, scale, lighting, and shadows.
5.  **Framing:** The output image MUST have the exact same dimensions as the original scene image. Do not crop, zoom, or alter the camera angle.
6.  **Output:** Return only a single, high-quality, photorealistic image of the result. Do not return any text.`;

const REFINEMENT_PROMPT = `You are an expert AI photo editor. A user has provided an image they want to modify. Your task is to apply their requested change directly to the image while maintaining photorealism and preserving all other aspects of the image.

**User's Request:**`;


const handleApiError = (error: unknown): Error => {
  console.error("Error calling Gemini API:", error);

  let apiMessage = "An unknown error occurred while communicating with the AI.";
  if (typeof error === 'object' && error !== null) {
    const apiError = error as any;
    if (apiError.error && apiError.error.message) {
      apiMessage = apiError.error.message; // Standard Google API error
    } else if (apiError.message) {
      apiMessage = apiError.message; // Generic Error object
    } else {
      try {
        apiMessage = JSON.stringify(error);
      } catch {
        apiMessage = 'Could not stringify error object.';
      }
    }
  } else if (typeof error === 'string') {
    apiMessage = error;
  }

  let userFriendlyMessage = apiMessage;

  if (apiMessage.toLowerCase().includes('internal error')) {
    userFriendlyMessage = "The AI service encountered an internal error. This is usually temporary. Please try again in a few moments."
  } else if (apiMessage.includes('400') || apiMessage.toLowerCase().includes('request is invalid')) {
    userFriendlyMessage = "The AI model rejected the request. This can be due to low-quality images or an unsupported prompt. Please try again with a clearer photo.";
  } else if (apiMessage.includes('429')) {
    userFriendlyMessage = "API rate limit exceeded. Please wait a moment and try again.";
  } else if (apiMessage.toLowerCase().includes('api key')) {
    userFriendlyMessage = "The API Key is invalid or missing. Please ensure it is configured correctly.";
  }

  return new Error(`Failed to generate image: ${userFriendlyMessage}`);
}

const processApiResponse = async (response: any): Promise<ImageFile | null> => {
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      const result = await processDataUrlToImageFile(dataUrl);
      return result;
    }
  }
  return null; // If no image part is found
}


export const generateInitialVisualization = async (siteImage: ImageFile, pavingImage: ImageFile): Promise<ImageFile | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: siteImage.base64,
              mimeType: siteImage.mimeType,
            },
          },
          {
            inlineData: {
              data: pavingImage.base64,
              mimeType: pavingImage.mimeType,
            },
          },
          {
            text: INITIAL_GENERATION_PROMPT,
          },
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    return await processApiResponse(response);

  } catch (error) {
    throw handleApiError(error);
  }
};


export const refineVisualization = async (baseImage: ImageFile, refinementPrompt: string): Promise<ImageFile | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: baseImage.base64,
              mimeType: baseImage.mimeType,
            },
          },
          {
            text: `${REFINEMENT_PROMPT} "${refinementPrompt}"`,
          },
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    return await processApiResponse(response);

  } catch (error) {
    throw handleApiError(error);
  }
};

const SUMMARY_PROMPT = `You are an expert copywriter. A user provided a short, imperative instruction to an AI photo editor. Your task is to convert this instruction into a short, elegant, past-tense description of the change that was made. This description will be used as a bullet point in a PDF report.

Rules:
- Keep it concise (2-5 words).
- Start with a verb.
- Do not use punctuation.

Examples:
- User Input: "make the paving stones a bit larger" -> Your Output: "Increased paving stone size"
- User Input: "Don't cover the flower pot on the left" -> Your Output: "Preserved flower pot"
- User Input: "add more sunlight" -> Your Output: "Enhanced sunlight and shadows"
- User Input: "change the color to grey" -> Your Output: "Adjusted paving color to grey"

User Input:`;

export const summarizeRefinement = async (refinementPrompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${SUMMARY_PROMPT} "${refinementPrompt}"`,
      // Disable thinking for this simple, low-latency task
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    // Return the trimmed text, or the original prompt as a fallback
    return response.text.trim() || refinementPrompt;
  } catch (error) {
    console.error("Error summarizing refinement:", error);
    // Fallback to the original prompt if summarization fails
    return refinementPrompt;
  }
};