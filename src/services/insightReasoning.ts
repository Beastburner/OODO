/**
 * Insight Reasoning Layer (AI-Assisted, Optional)
 * 
 * Converts triggered insights into human-readable explanations using Gemini.
 * 
 * IMPORTANT:
 * - Gemini is used ONLY for reasoning & summarization
 * - NO decisions are made by AI
 * - Output must be explainable and neutral
 */

interface InsightData {
  insight_type: string;
  severity: string;
  title: string;
  summary: string;
  summary_data: Record<string, any>;
}

/**
 * Generate human-readable explanation using Gemini API
 * 
 * @param insightData - Structured insight data from rules engine
 * @returns Explanation text or null if API fails
 */
export async function generateExplanation(insightData: InsightData): Promise<string | null> {
  // Check if Gemini API key is configured
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('Gemini API key not configured. Skipping AI reasoning.');
    return null;
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    // Create a neutral, factual prompt
    const prompt = `You are an HR analytics assistant. Explain the following HR insight in simple, neutral language (2-3 sentences). Focus on what the data shows, not what actions to take. Keep it factual and concise.

Insight Type: ${insightData.insight_type}
Severity: ${insightData.severity}
Summary: ${insightData.summary}
Data: ${JSON.stringify(insightData.summary_data, null, 2)}

Provide a brief explanation of what this pattern indicates. Do not suggest actions or recommendations.`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!explanation) {
      console.error('No explanation generated from Gemini');
      return null;
    }

    // Clean up the explanation (remove markdown, trim)
    return explanation.trim().replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

/**
 * Generate explanation for multiple insights (batch processing)
 */
export async function generateExplanations(insightsData: InsightData[]): Promise<Map<string, string>> {
  const explanations = new Map<string, string>();

  // Process insights one by one to avoid rate limits
  for (const insight of insightsData) {
    const explanation = await generateExplanation(insight);
    if (explanation) {
      explanations.set(insight.insight_type, explanation);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return explanations;
}

