import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async summarizeChat(messages: Message[]): Promise<string> {
    if (!this.ai) return "AI services are not configured (Missing API Key).";

    try {
      // Prepare transcript
      const transcript = messages
        .slice(-50) // Last 50 messages
        .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderId}: ${m.content}`)
        .join('\n');

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a professional team assistant. Summarize the following team chat conversation concisely in bullet points. Focus on key decisions and action items.\n\nTranscript:\n${transcript}`,
      });

      return response.text || "Could not generate summary.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Failed to connect to AI service.";
    }
  }
}

export const geminiService = new GeminiService();
