import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to convert base64 to standard clean base64 if needed (stripping headers)
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

// Text to Image Generation (using gemini-2.5-flash-image which supports generation via prompt)
export const generateImageFromText = async (prompt: string): Promise<string> => {
  try {
    const ai = getAIClient();
    // Using gemini-2.5-flash-image for generation/editing
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    // Check for inline data (image) or text logic
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Generate Image Error:", error);
    throw error;
  }
};

// Image Editing (Nano Banana feature)
export const editImageWithPrompt = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const cleanData = cleanBase64(base64Image);
    
    // According to Gemini guidelines, we can send image + text to edit/generate
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG from canvas/upload, adjust if needed
              data: cleanData
            }
          },
          { text: prompt }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No edited image returned.");
  } catch (error) {
    console.error("Edit Image Error:", error);
    throw error;
  }
};

// Translation
export const translateDescription = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following archaeological description into ${targetLanguage}. Keep the tone academic and precise.\n\n"${text}"`
    });
    return response.text || "Translation failed.";
  } catch (error) {
    console.error("Translation Error:", error);
    return "Error during translation.";
  }
};

// Analyze Voice Command
export const analyzeVoiceCommand = async (transcript: string): Promise<{ action: string, details: string }> => {
  try {
    const ai = getAIClient();
    const prompt = `
      Analyze this voice command from an archaeological app user: "${transcript}".
      Map it to one of these actions: 'NAVIGATE_MAP', 'NAVIGATE_PLAN', 'NAVIGATE_ARTIFACT', 'NAVIGATE_AI', 'NAVIGATE_TRANSLATE', 'UNKNOWN'.
      Return ONLY a JSON object: {"action": "...", "details": "optional context"}
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    return { action: 'UNKNOWN', details: '' };
  } catch (error) {
    console.error("Voice Analysis Error:", error);
    return { action: 'UNKNOWN', details: '' };
  }
};

// Chat with Assistant
export const chatWithAssistant = async (message: string, base64Image?: string, currentMode?: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const parts: any[] = [{ text: message }];

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64(base64Image)
        }
      });
    }

    const systemPrompt = `You are "Hatice Ceylan's Archaeological Assistant". 
    You are an expert in archaeology, find identification, site mapping, excavation planning, and technical illustration.
    Help the user with their queries about artifacts, historical periods, drawing techniques, or site analysis.
    
    Current Application Context: ${currentMode || 'General Dashboard'}
    
    Keep the tone professional, scholarly, yet supportive. 
    If an image is provided, analyze it as an archaeological finding or map and provide insights.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: parts }
      ]
    });

    return response.text || "Üzgünüm, şu an yanıt veremiyorum.";
  } catch (error) {
    console.error("Chat Assistant Error:", error);
    throw error;
  }
};

// Text to Speech
export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mp3;base64,${base64Audio}`;
    }
    throw new Error("No audio generated.");
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};
