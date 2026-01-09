
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ARCHETYPES } from '../constants';

const constructPrompt = (userGoal: string): string => {
  const archetypeGoalStringsList = ARCHETYPES.map(arch => `- "${arch.goal}"`).join("\n");

  return `You are an AI assistant specialized in identifying user archetypes based on their stated goals for using AI.
The user has described their goal as: "${userGoal}"

Your task is to determine which of the following archetype goals BEST matches the user's stated goal.
These are the available archetype goals:
${archetypeGoalStringsList}

Please respond ONLY with the exact text of the chosen archetype's goal description string (e.g., "My goal is to: ..."). Do not add any other text, explanation, preamble, or quotation marks around your final response. Your entire response must be one of the archetype goals provided above.
Example of a perfect response format if the first archetype is chosen: My goal is to: expedite a solution for an immediate, simple task without a significant investment of time or mental energy

Chosen Archetype Goal:`;
};

export const identifyArchetype = async (userGoal: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-preview-04-17';
  
  const prompt = constructPrompt(userGoal);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    
    // The model should return the exact goal string.
    // We trim() to remove any leading/trailing whitespace which might occasionally occur.
    const identifiedGoalText = response.text.trim();
    
    // Validate if the response is one of the known archetype goals
    const isValidArchetypeGoal = ARCHETYPES.some(arch => arch.goal === identifiedGoalText);
    if (!isValidArchetypeGoal) {
        console.error("Gemini response did not match any known archetype goals. Raw response:", response.text);
        throw new Error("AI response was not a recognized archetype goal. Please try rephrasing your goal.");
    }

    return identifiedGoalText;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API_KEY")) {
        throw new Error("Invalid or missing API Key for Gemini. Please check your configuration.");
    }
    throw new Error(`Failed to get response from AI: ${error instanceof Error ? error.message : String(error)}`);
  }
};
