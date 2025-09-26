

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import type { ImageFile, GenerationResult } from '../types';
import { processDataUrlToImageFile, resizeImageToMatch } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const INITIAL_GENERATION_PROMPT_TEMPLATE = (width: number, height: number) => `OUTPUT: Return exactly one image (${width}x${height}). No text. Do not crop/pad/resize.

You are an AI specializing in photorealistic architectural visualization. You will receive two images after this text: first the site photo, then the paving swatch. Your task is to replace the ground surface in the first image (the site photo) with the texture from the second image (the paving swatch).

CRITICAL INSTRUCTIONS:
1.  **Output Image Only:** Your entire response must be ONLY the final image. Do not include any text, explanation, or markdown.
2.  **Preserve Everything Else:** Do NOT alter any other part of the site photo. All objects, furniture, plants, walls, buildings, and the sky must remain IDENTICAL to the original.
3.  **Seamless Integration:** The new paving must be perfectly integrated. Match the original photo's perspective, lighting, shadows, and overall atmosphere.
4.  **Photorealism:** The result must look like a real photograph.
5.  **Exact Dimensions:** The output image must be exactly ${width}x${height} pixels.
6.  **Ground Only:** Only replace the existing ground material (e.g., pavers, porcelain paving, planks). Do not cover objects that are on the ground.`;


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