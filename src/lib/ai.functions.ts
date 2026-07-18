import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export const askAiAboutProduct = createServerFn({ method: "POST" })
  .validator((data: { question: string; productDetails: any }) => data)
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
You are an expert shopping assistant. The user is asking a question about a product.
Product Details:
${JSON.stringify(data.productDetails, null, 2)}

User Question: ${data.question}

Please provide a helpful, concise answer to the user's question based on the product details.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          },
        },
      });

      return { answer: response.text };
    } catch (error: any) {
      console.error("AI Error:", error);
      throw new Error(error.message || "Failed to ask AI");
    }
  });
