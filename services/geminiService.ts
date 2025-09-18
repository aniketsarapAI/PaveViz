
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT_TEMPLATE = (width: number, height: number) => `You are an expert AI photo editor. Follow these instructions with absolute precision.

**PRIMARY GOAL:**
Replace all identifiable ground surfaces (e.g., lawn, existing patio, dirt path, driveway) in the provided SITE PHOTO with the texture from the provided PAVING SWATCH.

**CRITICAL QUALITY REQUIREMENTS:**
- **Photorealism is Key:** The new paving must perfectly match the original photo's perspective, lighting, shadows, and atmosphere. The result must look like a real photograph, not an artificial rendering.
- **Respect Objects:** Do not alter or cover objects on top of the ground (e.g., furniture, planters, people, toys). The paving must appear naturally underneath them.
- **Preserve Everything Else:** Do not alter any other part of the image (e.g., walls, buildings, sky, fences, trees). Your only task is to replace the ground surface.
- **Output ONE Image:** Generate only one image as the result.
- **Output Dimensions:** The output image MUST have the exact dimensions: ${width}x${height} pixels.`;


const REFINE_VISUALIZATION_PROMPT = `You are an expert AI photo editor. Follow these instructions with absolute precision.

**PRIMARY GOAL:**
Modify the provided BASE IMAGE according to the user's TEXT INSTRUCTION.

**CONTEXT & ASSETS:**
- **BASE IMAGE:** The starting image to be modified. This is your canvas.
- **TEXT INSTRUCTION:** The user's specific request for a change.
- **PAVING SWATCH (if provided):** If the instruction involves adding or changing paving, you MUST use this texture.

**CRITICAL QUALITY REQUIREMENTS:**
- **Follow Instructions:** Execute the user's TEXT INSTRUCTION intelligently and accurately.
- **Photorealism is Key:** All changes must be seamlessly integrated, matching the base image's perspective, lighting, shadows, and atmosphere.
- **Output ONE Image:** Generate only one image as the result.

The user's specific instruction is below.`;


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

const processSingleImageApiResponse = async (response: GenerateContentResponse): Promise<ImageFile | null> => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const { data, mimeType } = part.inlineData;
      const dataUrl = `data:${mimeType};base64,${data}`;
      return await processDataUrlToImageFile(dataUrl); // Return the first image found
    }
  }
  return null; // Return null if no image is found
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
    return await processSingleImageApiResponse(response);
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

export const refineVisualization = async (
  baseImage: ImageFile,
  refinementPrompt: string,
  pavingImage: ImageFile | null
): Promise<ImageFile | null> => {
  try {
    let fullPrompt = REFINE_VISUALIZATION_PROMPT;
    
    const parts: any[] = [
      { // The primary image to be edited
        inlineData: {
          mimeType: baseImage.mimeType,
          data: baseImage.base64,
        },
      },
    ];
    
    if (pavingImage) {
      parts.push({
        inlineData: {
          mimeType: pavingImage.mimeType,
          data: pavingImage.base64,
        },
      });
    }

    fullPrompt += `\n\nUser's instruction: "${refinementPrompt}"`;
    parts.unshift({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    return await processSingleImageApiResponse(response);
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
