import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT_TEMPLATE = (width: number, height: number) => `You are an AI specializing in photorealistic architectural visualization. Your task is to replace the ground surface in the primary site photo with the texture provided in the paving swatch image.

CRITICAL INSTRUCTIONS:
1.  **Preserve Everything Else:** Do NOT alter any other part of the image. All objects, furniture, plants, walls, buildings, and the sky must remain IDENTICAL to the original site photo in position, scale, lighting, and color.
2.  **Seamless Integration:** The new paving must be perfectly integrated. Match the original photo's perspective, lighting, shadows, and overall atmosphere precisely.
3.  **Photorealism:** The result must look like a real photograph, not a digital rendering.
4.  **Output Dimensions:** The output image MUST have the exact same dimensions as the input site photo: ${width} pixels wide and ${height} pixels high. Do not change the aspect ratio or size.
5.  **Ground Only:** Only replace the existing ground material (e.g., grass, old concrete, dirt). Do not cover objects that are on the ground.`;

const REFINE_VISUALIZATION_PROMPT_TEMPLATE = (width: number, height: number) => `You are an expert AI photo editor. Your task is to apply a specific change to the provided image based on the user's instruction.

CRITICAL INSTRUCTIONS:
1.  **Follow the User's Request:** Apply the user's change precisely.
2.  **Minimal Change:** Only modify what is necessary to fulfill the request. The rest of the image should remain unchanged.
3.  **Maintain Realism:** The final image must remain photorealistic and believable.
4.  **Output Dimensions:** The output image MUST have the exact same dimensions as the input image: ${width} pixels wide and ${height} pixels high. Do not change the aspect ratio or size.`;

const SUMMARIZE_REFINEMENT_PROMPT = `You are a helpful assistant. A user provided a short, imperative instruction to an AI image editor. Your task is to convert this instruction into a clean, past-tense, descriptive sentence fragment that would be suitable for a design report.

Examples:
- User input: "make the stones bigger"
- Your output: "Increased the paving stone size"
- User input: "add a small tree on the left"
- Your output: "Added a small tree on the left"
- User input: "can you make it look like it just rained"
- Your output: "Created a wet look, as if it had just rained"

The user's instruction is:`;


const handleApiError = (error: any): string => {
  console.error("Error calling Gemini API:", error);
  try {
    if (error.message && error.message.includes("{")) {
        const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
        if (errorJson.error) {
            const { code, message, status } = errorJson.error;
            if (status === "RESOURCE_EXHAUSTED" || (message && message.toLowerCase().includes('quota'))) {
                return "Failed to generate image: The daily usage limit for the AI model has been reached. Please try again tomorrow.";
            }
            return `Failed to generate image: ${message} (Code: ${code})`;
        }
    }
  } catch (e) {
      console.error("Could not parse API error message:", e);
  }

  if (error.message) {
    if (error.message.toLowerCase().includes("rate limit")) {
       return "Failed to generate image: API rate limit exceeded. Please wait a moment and try again.";
    }
    return `Failed to generate image: ${error.message}`;
  }
  
  return "An unknown error occurred while communicating with the AI. Please check the console for details.";
};

const processApiResponse = async (response: GenerateContentResponse): Promise<ImageFile | null> => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const { data, mimeType } = part.inlineData;
      const dataUrl = `data:${mimeType};base64,${data}`;
      return await processDataUrlToImageFile(dataUrl);
    }
  }
  return null;
};

export const generateInitialVisualization = async (
  siteImage: ImageFile,
  pavingImage: ImageFile
): Promise<ImageFile | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { text: INITIAL_GENERATION_PROMPT_TEMPLATE(siteImage.width, siteImage.height) },
          {
            inlineData: {
              mimeType: siteImage.mimeType,
              data: siteImage.base64,
            },
          },
          {
            inlineData: {
              mimeType: pavingImage.mimeType,
              data: pavingImage.base64,
            },
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    return await processApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const refineVisualization = async (
  baseImage: ImageFile,
  refinementPrompt: string
): Promise<ImageFile | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { text: `${REFINE_VISUALIZATION_PROMPT_TEMPLATE(baseImage.width, baseImage.height)}\n\nUser's instruction: "${refinementPrompt}"` },
          {
            inlineData: {
              mimeType: baseImage.mimeType,
              data: baseImage.base64,
            },
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    return await processApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const summarizeRefinement = async (refinementPrompt: string): Promise<string> => {
    if (!refinementPrompt.trim()) return "Refinement applied";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${SUMMARIZE_REFINEMENT_PROMPT} "${refinementPrompt}"`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Failed to summarize refinement:", error);
        return `Applied refinement: "${refinementPrompt}"`;
    }
};