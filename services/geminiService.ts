import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const BASE_PROMPT = `You are an expert AI specializing in photorealistic product visualization for a paving company. Your task is to show a customer how a product from our catalog (the second image provided) will look when installed in their space (the first image provided).

**CORE MISSION:**
- Replace ONLY the existing ground surface (paving, grass, deck, etc.) with our product.
- Preserve EVERYTHING else in the original photo.
- The final image MUST be a perfect pixel-for-pixel overlay with the original, with the only change being the new ground surface.

**NON-NEGOTIABLE TECHNICAL REQUIREMENT: PERFECT FRAME ALIGNMENT**
- This is the most important instruction.
- The output image's dimensions, aspect ratio, zoom level, and framing MUST BE IDENTICAL to the original input image.
- IT IS STRICTLY FORBIDDEN to crop, zoom in, zoom out, or alter the composition in any way.
- Any deviation from the original frame makes the result a failure.

**WHAT TO REPLACE:**
- Existing paving, concrete slabs, decking, grass areas, dirt patches, or any ground surface intended for paving.

**WHAT TO PRESERVE:**
- All furniture, planters, decorative items, plants, trees, walls, buildings, people, and pets.
- The original lighting, shadows, and weather conditions must be perfectly matched.
- The exact camera angle and perspective.

**INSTALLATION STANDARDS:**
- Install the paving in a professional, realistic pattern.
- Use appropriate joint spacing and cut stones realistically around obstacles (e.g., furniture legs, drains).
- Perfectly match the scale and perspective of the original photo.

**OUTPUT:**
A single photorealistic image that is a perfect overlay of the original, showing only the new paving installed.`;

export const visualizePaving = async (siteImage: ImageFile, pavingImage: ImageFile, advancedPrompt: string): Promise<ImageFile | null> => {
  try {
    // Dynamically construct the prompt based on user input
    const finalPrompt = advancedPrompt.trim()
      ? `${BASE_PROMPT}\n\nAdditionally, follow this specific user instruction for refinement: "${advancedPrompt}"`
      : BASE_PROMPT;

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
            text: finalPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        const result = await processDataUrlToImageFile(dataUrl);
        return result;
      }
    }
    // If no image part is found in the response
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);

    let detailedMessage = "An unknown error occurred while communicating with the AI.";

    if (error instanceof Error) {
        if (error.message.includes('400')) {
            detailedMessage = "The AI model rejected the request. This can be due to low-quality images or an unsupported prompt. Please try again with a clearer photo.";
        } else if (error.message.includes('429')) {
            detailedMessage = "API rate limit exceeded. Please wait a moment and try again, or check your quota in your Google AI Platform console.";
        } else if (error.message.toLowerCase().includes('api key')) {
             detailedMessage = "The API Key is invalid or missing. Please ensure it is configured correctly.";
        } else {
             detailedMessage = error.message;
        }
    }
    
    throw new Error(`Failed to generate image: ${detailedMessage}`);
  }
};
