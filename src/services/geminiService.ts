import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ConversionOutput, Unit, StoryScene } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function generateImage(prompt: string): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A vibrant, high-quality illustration for an ESL learning storybook. Style: clean, modern, friendly. Scene: ${prompt}` }],
      },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed:", error);
  }
  return undefined;
}

async function generateAudio(text: string): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this naturally as a B1 English speaker: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Audio generation failed:", error);
  }
  return undefined;
}

export async function generateSceneImage(prompt: string): Promise<string | undefined> {
  return generateImage(prompt);
}

export async function generateSceneAudio(text: string): Promise<string | undefined> {
  return generateAudio(text);
}

export async function processESLContent(
  rawInput: string,
  format: 'Dialogue' | 'Monologue',
  unit: Unit
): Promise<ConversionOutput> {
  const prompt = `
    You are an ESL Content Conversion Specialist (B1 Level).
    Your goal is to transform the following raw input into a multi-scene STORYBOOK experience.

    CURRICULUM CONTEXT:
    Course: ${unit.course}
    Unit: ${unit.number} - ${unit.title}
    Target Grammar: ${unit.targetGrammar}
    Target Vocabulary: ${unit.vocabulary.join(', ')}

    RAW INPUT:
    ${rawInput}

    FORMAT REQUESTED: ${format}

    INSTRUCTIONS:
    1. Break the content into 3 logical "scenes" or "pages".
    2. Style: STRICT NATURAL SPOKEN ENGLISH. Use fillers (well, actually, you know, I mean).
    3. Force the integration of the Target Grammar and as many Vocabulary words as possible.
    4. For each scene, identify specific words or phrases to highlight (grammar or vocabulary) and provide a brief B1-level explanation.
    5. Provide the following in JSON format:
       - scenes: Array of objects with:
         - text: The spoken text for this scene.
         - visualPrompt: A descriptive prompt for image generation.
         - highlights: Array of { text, type: 'grammar'|'vocabulary', explanation }.
       - learningReport: 
         - grammarHighlights: List of sentences using the target grammar.
         - vocabularyMatch: List of target vocabulary words successfully used.
       - mentoring:
         - missingTopics: Which topics/grammar points of the unit were missing in the original input.
         - improvements: Specific suggestions for cohesion and speaking skills.
       - structureMap: A Markdown table representing the narrative structure.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
                highlights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["grammar", "vocabulary"] },
                      explanation: { type: Type.STRING }
                    },
                    required: ["text", "type", "explanation"]
                  }
                }
              },
              required: ["text", "visualPrompt", "highlights"]
            },
            minItems: 3,
            maxItems: 3
          },
          learningReport: {
            type: Type.OBJECT,
            properties: {
              grammarHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
              vocabularyMatch: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["grammarHighlights", "vocabularyMatch"]
          },
          mentoring: {
            type: Type.OBJECT,
            properties: {
              missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["missingTopics", "improvements"]
          },
          structureMap: { type: Type.STRING }
        },
        required: ["scenes", "learningReport", "mentoring", "structureMap"]
      }
    }
  });

  const result = JSON.parse(response.text);
  
  return {
    ...result,
    learningReport: {
      grammarHighlights: result.learningReport.grammarHighlights,
      vocabularyMatches: result.learningReport.vocabularyMatch
    }
  };
}
