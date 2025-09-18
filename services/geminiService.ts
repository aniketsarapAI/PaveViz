import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { ImageFile } from '../types';
import { processDataUrlToImageFile } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT_TEMPLATE = (width: number, height: number) => `You are an expert AI photo editor specializing in photorealistic architectural visualization. Your primary goal is to replace the main ground surface in a site photo with a new paving texture.

**CORE TASK: INTELLIGENT SURFACE REPLACEMENT**

1.  **IDENTIFY THE GROUND PLANE:** First, analyze the primary site photo to identify the main, continuous ground surface that is suitable for paving. This might be a lawn, an existing patio, a dirt patch, or a driveway.
2.  **REPLACE THE ENTIRE PLANE:** Once you have identified this ground plane, you must replace the **ENTIRE** surface with the texture provided in the paving swatch image. The replacement must be complete and cover the whole logical area.
3.  **RESPECT OBJECTS:** Do not alter or cover objects that are *on top of* the ground plane (e.g., furniture, planters, toys, people). The new paving should appear to be underneath these objects.
4.  **PRESERVE EVERYTHING ELSE:** Do NOT alter any other part of the image. All other elements (walls, buildings, plants not on the main ground plane, sky, etc.) must remain IDENTICAL to the original photo.
5.  **SEAMLESS & PHOTOREALISTIC INTEGRATION:** The new paving must perfectly match the original photo's perspective, lighting, shadows, and overall atmosphere. The final result must look like a real photograph.
6.  **OUTPUT DIMENSIONS:** The output image MUST have the exact dimensions: ${width}x${height} pixels.`;

const REFINE_VISUALIZATION_PROMPT = `You are an expert AI photo editor specializing in photorealistic architectural visualization. Your task is to intelligently modify a provided base image according to a user's instructions and supplemental images (mask, paving swatch).

**PRIMARY GOAL: PHOTOREALISM AND CONTEXTUAL AWARENESS**
The final image must look like a real photograph. All changes must be seamlessly integrated, matching the original photo's perspective, lighting, shadows, and overall atmosphere.

**HOW TO INTERPRET THE USER'S MASK:**
- If a black-and-white mask image is provided, it represents a ROUGH HINT from the user pointing to an area of interest.
- **DO NOT** simply fill the white area of the mask.
- Your first step is to IDENTIFY the complete logical surface or object the user is pointing to (e.g., the entire lawn, the entire patio, a specific wall section).
- Apply the user's requested changes to that **ENTIRE identified surface**, not just the masked pixels.
- The black areas of the mask MUST remain completely untouched.

**HOW TO USE THE PAVING SWATCH:**
- If a paving swatch image is provided, it is the **DEFINITIVE TEXTURE REFERENCE** for any changes related to paving.
- You MUST use the texture from this swatch to replace or add paving. The swatch is the source of truth for the texture, overriding any conflicting material descriptions in the user's text instruction.

**EXECUTION HIERARCHY:**
1.  Analyze the user's text instruction to understand their goal.
2.  If a mask is present, use it to identify the target surface in the base image. If no mask, infer the target from the user's text.
3.  If the goal involves paving and a swatch is provided, apply the swatch texture to the target surface.
4.  Apply the change with perfect photorealism, perspective, and lighting.
5.  Leave all other parts of the image unchanged.

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
  refinementPrompt: string,
  maskImage: ImageFile | null,
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

    if (maskImage) {
      parts.push({
        inlineData: {
          mimeType: maskImage.mimeType,
          data: maskImage.base64,
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