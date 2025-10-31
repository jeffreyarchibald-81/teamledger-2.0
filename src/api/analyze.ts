import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * @description A Vercel serverless function that acts as a secure backend endpoint
 * to interact with the Google Gemini API. It receives organizational data from the client,
 * constructs a detailed prompt, and requests an analysis from the AI model, returning
 * the structured JSON response.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Security: Only allow POST requests to this endpoint.
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { dataForAnalysis } = req.body;

        // Input validation: Ensure the request body contains the necessary data.
        if (!dataForAnalysis) {
            return res.status(400).json({ error: 'Missing dataForAnalysis in request body' });
        }
        
        // Securely access the API key from environment variables configured on the Vercel server.
        // This key is NOT exposed to the client-side.
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
             return res.status(500).json({ error: 'API key not configured on server' });
        }
        
        const ai = new GoogleGenAI({ apiKey });

        // --- NEW: Calculate overall profitability ---
        let totalOverallRevenue = 0;
        let totalOverallProfit = 0;

        // Ensure dataForAnalysis.positions exists and is an array
        if (dataForAnalysis && Array.isArray(dataForAnalysis.positions)) {
            for (const position of dataForAnalysis.positions) {
                totalOverallRevenue += position.revenue || 0;
                totalOverallProfit += position.profit || 0;
            }
        }

        const overallProfitMargin = totalOverallRevenue > 0 ? (totalOverallProfit / totalOverallRevenue) * 100 : 0;

        let profitabilityRatingDescription = "";
        if (overallProfitMargin >= 25) {
            profitabilityRatingDescription = "outstanding";
        } else if (overallProfitMargin >= 20) {
            profitabilityRatingDescription = "very good";
        } else if (overallProfitMargin >= 15) {
            profitabilityRatingDescription = "good";
        } else if (overallProfitMargin > 0) {
            profitabilityRatingDescription = "poor (below 10% is generally considered poor)";
        } else { // overallProfitMargin <= 0
            profitabilityRatingDescription = "negative or zero, indicating a significant area for review";
        }

        // --- Prompt Engineering ---
        // This prompt is carefully crafted to guide the AI model's response.
        // It provides context, rules, and a desired output format (JSON schema).
        const prompt = `
            You are an expert business consultant specializing in organizational structure for service-based businesses.
            Analyze the following organizational structure and financial data.
            Your tone should be casual and direct. Get straight to the point.
            Provide a concise analysis covering three key areas: Strengths, Potential Risks/Opportunities, and Key Observations.
            
            **Important Context & Rules:**
            - This data represents a forward-looking plan or model, not necessarily the current state of the business. Utilization targets are aspirational goals.
            - The 'benefitsPercent' setting creates a total salary multiplier to estimate the true cost of an employee (including benefits, payroll taxes, etc.). The 30% default is a common industry standard.
            - The 'overheadPercent' accounts for operational costs (rent, software, etc.). The 15% default is a standard baseline but can be adjusted for leaner organizations.
            - **Crucially, do not comment on the negative profit margins of C-suite or executive roles (like CEO, COO).** These positions are strategic and not expected to be billable. It is normal and acceptable for them to show a loss on paper; their value is in leading the company, not in billable work.
            
            **Current Overall Financial Performance Summary for the Entire Organization:**
            - Total Estimated Revenue: $${totalOverallRevenue.toFixed(0)}
            - Total Estimated Profit: $${totalOverallProfit.toFixed(0)}
            - Overall Profit Margin: ${overallProfitMargin.toFixed(2)}%
            - Based on industry benchmarks, an overall profit margin of ${overallProfitMargin.toFixed(0)}% is considered **${profitabilityRatingDescription}**. (Benchmarks: Below 10% is poor, 15% is good, 20% is very good, 25%+ is outstanding).

            **Guidelines for your analysis:**
            - **Overall Profitability:** You MUST include one specific observation about the overall profit margin in the 'Key Observations' section, explicitly referencing the calculated margin and its interpretation based on the provided benchmarks (e.g., "The overall profit margin of X% is considered Y, which is a [strength/risk/observation depending on Y].").
            - **Span of Control (Rule of 7):** Pay close attention to the number of direct reports for each manager ('directReports' property). A manager can most effectively supervise around seven direct reports; the "sweet spot" is generally between 5 and 7. This concept is known as "span of control."
              - **Too many reports (> 7):** Exceeding this number can lead to decreased efficiency, as the manager struggles to provide adequate feedback, monitor performance, and maintain strong relationships. Flag managers with more than 7-8 reports as being over-extended and a potential bottleneck.
              - **Too few reports (< 3-4):** Especially in a service business, having too few direct reports can lead to top-heavy management and a lower-margin business. Flag this as a potential inefficiency or risk.
            - **Manager Utilization:** A manager with 2 or more direct reports should have their utilization scrutinized. If their utilization target is high (e.g., over 50-60%), this is a major risk. Their management duties will conflict with their billable work, leading to burnout or underperformance. As a team grows, a manager's utilization *must* decrease. Flag any situation that violates this principle as a significant risk.
            - **Actionable Insights:** Focus on high-impact insights about profitability, team balance, and growth. For "Risks & Opportunities," suggest concrete actions.
            - **Clarity:** Each bullet point should be a single, clear sentence.
            - **Specificity:** Refer to specific roles or departments where relevant.

            Here is the data:
            ${JSON.stringify(dataForAnalysis, null, 2)}
        `;

        // Make the API call to the Gemini model.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // Enforce a JSON response that matches the defined schema.
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        strengths: {
                            type: Type.ARRAY,
                            description: "Positive aspects of the org structure, team balance, or financial health. 2-4 points.",
                            items: { type: Type.STRING }
                        },
                        risks_opportunities: {
                            type: Type.ARRAY,
                            description: "Potential issues, bottlenecks, financial risks, or opportunities for improvement/growth. 2-4 points.",
                            items: { type: Type.STRING }
                        },
                        key_observations: {
                            type: Type.ARRAY,
                            description: "Neutral, interesting, or noteworthy financial or structural observations. 2-4 points.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['strengths', 'risks_opportunities', 'key_observations']
                }
            }
        });
        
        // The AI returns a JSON string. Parse it before sending.
        const analysisResult = JSON.parse(response.text);

        // Use res.json() to ensure proper headers and stringification. This is more robust
        // and fixes the hanging issue in the Vercel development environment.
        return res.status(200).json(analysisResult);

    } catch (error) {
        // Graceful error handling for API failures or other issues.
        console.error("AI analysis failed in serverless function:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
    }
}