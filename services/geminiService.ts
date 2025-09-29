

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { ImageFile, GenerationResult } from '../types';
import { processDataUrlToImageFile, resizeImageToMatch } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT_TEMPLATE = (width: number, height: number) => `You are an AI specializing in photorealistic architectural visualization. You will receive two images: the 'site photo' and the 'paving swatch'.

**PRIMARY OBJECTIVE:** Your task is to replace the ground surfaces in the 'site photo' using the texture provided in the 'paving swatch'.

**CRITICAL RULE #1: USE THE SWATCH TEXTURE EXCLUSIVELY**
The second image ('paving swatch') is the ONLY source for the new paving material. You MUST replicate its appearance exactly.
- **Color:** The color of the new paving must precisely match the swatch.
- **Pattern & Grain:** The pattern, texture, and grain of the new paving must be taken directly from the swatch.
- **Fidelity:** Do not invent a new texture. Do not alter, fade, or recolor the swatch texture. Your job is to apply it realistically to the scene.
- **FAILURE CHECK:** If the new paving does not visibly and accurately match the swatch image, the task is a failure.

**CRITICAL RULE #2: PRESERVE EVERYTHING ELSE**
Do NOT alter any other part of the site photo. All objects, furniture, plants, walls, buildings, and the sky must remain IDENTICAL to the original. Shadows and lighting should be realistically cast onto the NEW paving surface.

**FINAL INSTRUCTIONS:**
1.  **Input Images:** The first image is the 'site photo'. The second image is the 'paving swatch'.
2.  **Ground Surfaces Only:** Only replace existing ground materials (e.g., pavers, concrete, planks). Do not cover objects that are on the ground.
3.  **Output:** Your entire response must be ONLY the final image, with no text or explanation. The output image must be exactly ${width}x${height} pixels.`;


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

  if (error.message) {
    if (error.message.toLowerCase().includes("api key not valid")) {
       return "Failed to generate image: The provided API key is invalid. Please check your configuration.";
    }
    if (error.message.toLowerCase().includes("rate limit")) {
       return "Failed to generate image: API rate limit exceeded. Please wait a moment and try again.";
    }
  }

  try {
    if (error.message && error.message.includes("{")) {
        const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
        if (errorJson.error) {
            const { code, message, status } = errorJson.error;
            
            if (status === "FAILED_PRECONDITION" || code === 412) {
                if (message && message.toLowerCase().includes('not available in your country')) {
                    return "Image generation is not available in your region. We apologize for the inconvenience.";
                }
                return `Image generation failed: A required condition was not met. (Status: ${status})`;
            }
            
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
    return `Failed to generate image: ${error.message}`;
  }
  
  return "An unknown error occurred while communicating with the AI. Please check the console for details.";
};

const processApiResponse = async (response: GenerateContentResponse): Promise<GenerationResult> => {
  const candidate = response.candidates?.[0];
  
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason) {
    return {
      success: false,
      reason: `The request was blocked by the AI for safety reasons: ${blockReason}. Please try a different image or prompt.`
    };
  }
  
  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    return {
      success: false,
      reason: `The AI stopped generating due to: ${candidate.finishReason}. This can happen due to safety settings or if the input is unclear.`
    };
  }

  const parts = candidate?.content?.parts || [];

  // Find the image part
  const imagePart = parts.find(p => p.inlineData);
  if (imagePart && imagePart.inlineData) {
      const { data, mimeType } = imagePart.inlineData;
      const dataUrl = `data:${mimeType};base64,${data}`;
      const image = await processDataUrlToImageFile(dataUrl);
      return { success: true, image };
  }

  // If no image, find a text part to provide a better error
  const textPart = parts.find(p => typeof p.text === 'string');
  if (textPart && textPart.text) {
      return { success: false, reason: `AI returned text instead of an image: "${textPart.text}"` };
  }
  
  // If nothing useful is found, fail clearly.
  console.error("Invalid response from AI:", JSON.stringify(response, null, 2));
  return { success: false, reason: "The AI returned no image or text. This might be due to a safety filter or an issue with the model. Please check the developer console for details." };
};

export const generateInitialVisualization = async (
  siteImage: ImageFile,
  pavingImage: ImageFile
): Promise<GenerationResult> => {
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
    
    const result = await processApiResponse(response);

    if (result.success) {
        let generatedImage = result.image;
        if (generatedImage.width !== siteImage.width || generatedImage.height !== siteImage.height) {
            console.warn(`AI output dimensions (${generatedImage.width}x${generatedImage.height}) mismatch original (${siteImage.width}x${siteImage.height}). Resizing.`);
            generatedImage = await resizeImageToMatch(generatedImage, siteImage.width, siteImage.height);
        }
        return { success: true, image: generatedImage };
    }
    
    return result;
  } catch (error) {
    return { success: false, reason: handleApiError(error) };
  }
};

export const refineVisualization = async (
  baseImage: ImageFile, // This is now the original siteImage
  pavingImage: ImageFile,
  refinementPrompt: string
): Promise<GenerationResult> => {
  try {
    // This prompt instructs the AI to redo the initial visualization from the original photo
    // AND apply the new refinement instruction in a single step. This breaks the "zoom" feedback loop.
    const combinedPrompt = `
${INITIAL_GENERATION_PROMPT_TEMPLATE(baseImage.width, baseImage.height)}

**ADDITIONAL REFINEMENT INSTRUCTION:**
After applying the paving as described above, you must also apply the following user instruction to the image: "${refinementPrompt}".

The final image must incorporate both the paving replacement and this additional refinement.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { text: combinedPrompt },
          {
            inlineData: {
              mimeType: baseImage.mimeType,
              data: baseImage.base64,
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
        // Must include both IMAGE and TEXT for this model.
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result = await processApiResponse(response);
    
    if (result.success) {
        let refinedImage = result.image;
        if (refinedImage.width !== baseImage.width || refinedImage.height !== baseImage.height) {
            console.warn(`AI output dimensions (${refinedImage.width}x${refinedImage.height}) mismatch base image (${baseImage.width}x${baseImage.height}). Resizing.`);
            refinedImage = await resizeImageToMatch(refinedImage, baseImage.width, baseImage.height);
        }
        return { success: true, image: refinedImage };
    }
    
    return result;
  } catch (error) {
    return { success: false, reason: handleApiError(error) };
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
