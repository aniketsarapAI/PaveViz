import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT_TEMPLATE = (width: number, height: number) => `You are an expert AI specializing in photorealistic paving visualization. Your task is to replace only the existing man-made paving in the SITE PHOTO with the new PAVING SWATCH.

**MANDATORY TASK: FOCUSED PAVING REPLACEMENT**

1.  **IDENTIFY MAN-MADE SURFACES:** Look at the SITE PHOTO and identify ONLY existing, hard-paved, ground-level surfaces. This includes areas with concrete, existing pavers (stone, clay, porcelain), tiles, setts, and asphalt.
2.  **EXCLUDE NATURAL SURFACES:** You MUST ignore and preserve all natural ground surfaces. DO NOT replace grass, soil, dirt, decorative gravel, pebbles, wood chips, or flower beds.
3.  **COMBINE & REPLACE:** Mentally combine all the identified *man-made paved areas* into a single "replacement zone". Your ONLY task is to completely replace this entire "replacement zone" with the texture from the PAVING SWATCH.

**CRITICAL RULES:**
- **ONLY REPLACE PAVING:** Only man-made paved surfaces should be changed. If a paved patio is next to a lawn, ONLY the patio should be replaced with the new swatch. The lawn MUST remain untouched.
- **PRESERVE EVERYTHING ELSE:** Do NOT alter walls, steps, furniture, plants, buildings, or any vertical surfaces. These elements should remain untouched, with the new paving appearing naturally underneath or around them.
- **PHOTOREALISM IS ESSENTIAL:** The result must be hyper-realistic. The new paving must perfectly match the original photo's perspective, lighting, and shadows.
- **OUTPUT:** Generate ONLY ONE image with the exact dimensions: ${width}x${height} pixels.`;


const SMART_DESIGN_PROMPT_TEMPLATE = (width: number, height: number) => `You are an expert AI photo editor. Your task is to identify distinct paveable ground surfaces in the SITE PHOTO and generate alternative designs using the PAVING SWATCH.

1.  **Analyze the SITE PHOTO:** Identify up to 3 distinct, separate ground-level surfaces that can be paved (e.g., a lawn, a separate gravel path, an old concrete patio). Do NOT count different parts of the same continuous surface.
2.  **Generate Images:** For EACH distinct surface you identified, generate one image where ONLY that single surface is replaced with the PAVING SWATCH. Leave all other surfaces as they were in the original SITE PHOTO.
3.  **Output Rules:**
    *   If you find multiple distinct surfaces, return one image for each.
    *   If you find only one continuous surface, DO NOT generate any image.
    *   Each output image MUST have the exact dimensions: ${width}x${height} pixels.
    *   Maintain absolute photorealism, matching lighting, shadows, and perspective.
    *   Do not modify anything other than the single target surface for each respective image.`;


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

const processMultipleImageApiResponse = async (response: GenerateContentResponse): Promise<ImageFile[]> => {
  const images: ImageFile[] = [];
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const { data, mimeType } = part.inlineData;
      const dataUrl = `data:${mimeType};base64,${data}`;
      const imageFile = await processDataUrlToImageFile(dataUrl);
      images.push(imageFile);
    }
  }
  return images;
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
          { text: "SITE PHOTO:" },
          {
            inlineData: {
              mimeType: siteImage.mimeType,
              data: siteImage.base64,
            },
          },
          { text: "PAVING SWATCH:" },
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

export const generateSmartDesigns = async (
  siteImage: ImageFile,
  pavingImage: ImageFile
): Promise<ImageFile[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { text: SMART_DESIGN_PROMPT_TEMPLATE(siteImage.width, siteImage.height) },
          { text: "SITE PHOTO:" },
          {
            inlineData: {
              mimeType: siteImage.mimeType,
              data: siteImage.base64,
            },
          },
          { text: "PAVING SWATCH:" },
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
    return await processMultipleImageApiResponse(response);
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
      { text: "BASE IMAGE:" },
      {
        inlineData: {
          mimeType: baseImage.mimeType,
          data: baseImage.base64,
        },
      },
    ];
    
    if (pavingImage) {
      parts.push({ text: "PAVING SWATCH:" });
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