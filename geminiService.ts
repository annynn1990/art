/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse, InlineDataPart } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("未設定 API_KEY 環境變數");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Generates a watercolour painting from a satellite image.
 * @param imageDataUrl A data URL string of the source image (e.g., 'data:image/png;base64,...').
 * @returns A promise that resolves to a base64-encoded image data URL of the generated painting.
 */
export async function generateWatercolourPainting(imageDataUrl: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("無效的圖片數據 URL 格式。預期格式為 'data:image/...;base64,...'");
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const imagePart: InlineDataPart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  // Keep the prompt in English to ensure consistent artistic style, 
  // but the result is visual so language doesn't matter for the output.
  const prompt = `Create a traditional watercolor painting from the front of this building. Add a tiny signature that says "Gemini"`;
  
  const textPart = {
    text: prompt,
  };

  const maxRetries = 3;
  const initialDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
      });
      
      const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

      if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`收到圖片數據 (${mimeType}), 長度:`, data.length);
        return `data:${mimeType};base64,${data}`;
      }

      const textResponse = response.text;
      console.error("API 未回傳圖片。回應內容:", textResponse);
      throw new Error(`AI 模型回傳了文字而非圖片: "${textResponse || '未收到文字回應。'}"`);

    } catch (error) {
      console.error(`Gemini API 生成圖片錯誤 (嘗試 ${attempt}/${maxRetries}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

      if (isInternalError && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`偵測到內部錯誤。將於 ${delay}ms 後重試...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Go to the next iteration of the loop
      }

      if (error instanceof Error) {
          throw new Error(`AI 模型在嘗試 ${attempt} 次後無法生成圖片。詳細資訊: ${error.message}`);
      }
      throw new Error(`AI 模型在嘗試 ${attempt} 次後無法生成圖片。請查看控制台以獲取更多詳細資訊。`);
    }
  }

  // This part should be unreachable if the loop logic is correct, but it's good practice for type safety.
  throw new Error("AI 模型在所有重試後未能生成圖片。");
}