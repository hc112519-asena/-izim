import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";

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
      model: 'gemini-3.5-flash',
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
      Map it to one of these actions: 'NAVIGATE_MAP', 'NAVIGATE_PLAN', 'NAVIGATE_ARTIFACT', 'NAVIGATE_AI', 'NAVIGATE_TRANSLATE', 'NAVIGATE_EPIGRAPHY', 'UNKNOWN'.
      Return ONLY a JSON object: {"action": "...", "details": "optional context"}
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
      model: 'gemini-3.5-flash',
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
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
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

// Inscription / Epigraphy analysis response structure
export interface InscriptionAnalysis {
  language: string;             // Dil
  script: string;               // Yazı Sistemi
  period: string;               // Dönem ve Tarih
  transcription: string;        // Orijinal Yazıt Okuması
  transliteration?: string;     // Transkripsiyon (Harf Çevirisi)
  translationTr: string;        // Türkçe Çeviri
  translationEn: string;        // İngilizce Çeviri
  historicalContext: string;    // Tarihsel Bilgi ve Arkeolojik Önem
  preservationState: string;     // Korunmuşluk Durumu
  drawingTips?: string;         // Teknik Belgeleme ve Çizim Önerileri
}

// Decipher ancient epigraphs or inscriptions using Gemini
export const decipherInscription = async (
  base64Image?: string,
  typedText?: string,
  hintLanguage?: string
): Promise<InscriptionAnalysis> => {
  try {
    const ai = getAIClient();
    const parts: any[] = [];

    let contextPrompt = `You are "Hatice Ceylan's Epigraphical AI Assistant", an elite world-class epigrapher, classicist, and archaeologist specialized in deciphering, transcribing, and translating ancient inscriptions.
    Your task is to analyze the provided ancient inscription (which ${base64Image ? 'is in the uploaded image' : `has been transcribed as: "${typedText}"`}).`;

    if (hintLanguage && hintLanguage !== "auto") {
      contextPrompt += `\nNote: The user suspects the language/script is related to or written in "${hintLanguage}".`;
    }

    contextPrompt += `\n\nPerform a deep archaeological and linguistic analysis and output a structured JSON matching this schema:
    {
      "language": "Detected language (e.g., Ancient Greek, Latin, Ottoman Turkish, Classical Arabic, Luwian, Hittite cuneiform)",
      "script": "Writing system (e.g., Greek Alphabet, Latin Alphabet, Arabic Script, Cuneiform, Hieroglyphs, Runes, Phrygian)",
      "period": "Estimated date range or archaeological epoch (e.g., Hellenistic Period, Roman Imperial Period, MÖ 14. Yüzyıl, 18. Yüzyıl Osmanlı)",
      "transcription": "Cleaned original character transcription (in original unicode characters if possible, e.g. Greek letters like ΔΗΜΟΣ, Ottoman script or clear transcription)",
      "transliteration": "Latin-character transliteration (letter-by-letter representation of phonetics)",
      "translationTr": "High-quality, professional epigraphic translation in Turkish",
      "translationEn": "High-quality, professional epigraphic translation in English",
      "historicalContext": "Explanatory text describing the context, who commissioned it, the type of inscription (grave stele, dedicatory, imperial decree, coin legend), historical events, or geographical insights.",
      "preservationState": "Analysis of the physical condition (e.g., eroded characters, fragment missing, legible, wear and tear on stone)",
      "drawingTips": "Brief advice for a draftsman/archaeologist on how to capture or sketch this inscription's relief details (e.g. highlights, shadows, charcoal squeeze method, lighting directions)"
    }`;

    parts.push({ text: contextPrompt });

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64(base64Image)
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            script: { type: Type.STRING },
            period: { type: Type.STRING },
            transcription: { type: Type.STRING },
            transliteration: { type: Type.STRING },
            translationTr: { type: Type.STRING },
            translationEn: { type: Type.STRING },
            historicalContext: { type: Type.STRING },
            preservationState: { type: Type.STRING },
            drawingTips: { type: Type.STRING }
          },
          required: [
            "language",
            "script",
            "period",
            "transcription",
            "translationTr",
            "translationEn",
            "historicalContext",
            "preservationState"
          ]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Boş YZ yanıtı döndü.");
    }

    return JSON.parse(outputText);
  } catch (error) {
    console.error("Epigraphy Decipherer Error:", error);
    throw error;
  }
};
