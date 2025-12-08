import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ResearchTask {
  candidateName: string;
  candidateRole: string;
  candidateLocation?: string;
  checkType: string;
  context?: Record<string, any>;
}

export interface ResearchResult {
  findings: string;
  riskScore: number;
  details: Record<string, any>;
  sources: string[];
  missingDocuments?: string[];
  requiresFollowUp?: boolean;
  followUpReason?: string;
}

export class GroqResearchService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      console.warn("⚠ GROQ_API_KEY not set - AI research will fail");
    }
  }

  async performResearch(task: ResearchTask): Promise<ResearchResult> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured - cannot perform AI research. Please add GROQ_API_KEY to your environment secrets.");
    }

    const prompt = this.buildPrompt(task);
    
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert HR background check analyst. Analyze candidates thoroughly and provide structured findings with risk scores. When documents are missing, clearly state what is needed for verification."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || "";
      return this.parseResponse(response, task);
    } catch (error) {
      console.error("Groq API error:", error);
      throw new Error(`Failed to perform AI research: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildPrompt(task: ResearchTask): string {
    const { candidateName, candidateRole, candidateLocation, checkType } = task;
    
    const prompts: Record<string, string> = {
      criminal: `Analyze ${candidateName} (${candidateRole}, ${candidateLocation || 'South Africa'}) for criminal record screening.

Research Tasks:
1. Search for any public records of criminal activity
2. Check news archives for any legal issues
3. Verify if there are any outstanding warrants or charges
4. Assess risk level (0-100) based on findings
5. Identify any missing documents needed for full verification (ID copy, police clearance certificate, etc.)

Provide structured output with:
- Risk Score (0-100, where 0 is lowest risk)
- Findings (detailed summary)
- Sources (where information was found or would be found)
- Missing documents required for verification
- Whether HR follow-up is needed

Format your response as JSON:
{
  "riskScore": <number>,
  "findings": "<detailed findings>",
  "sources": ["<source1>", "<source2>"],
  "recommendations": "<any recommendations>",
  "missingDocuments": ["<document1>", "<document2>"],
  "requiresFollowUp": <boolean>,
  "followUpReason": "<why HR needs to follow up>",
  "details": {
    "recordsFound": <boolean>,
    "severity": "<low|medium|high|none>",
    "verificationStatus": "<verified|pending|not_found>"
  }
}`,

      credit: `Perform credit bureau analysis for ${candidateName} (${candidateRole}, ${candidateLocation || 'South Africa'}).

Research Tasks:
1. Analyze credit worthiness indicators
2. Check for bankruptcy filings or debt judgments
3. Assess financial responsibility
4. Calculate risk score (0-100)
5. Identify missing documents (bank statements, credit reports, salary slips, proof of income)

Provide structured output with:
- Risk Score (0-100, where 0 is lowest risk)
- Findings (credit analysis summary)
- Financial red flags (if any)
- Missing documents needed for verification
- Sources

Format as JSON:
{
  "riskScore": <number>,
  "findings": "<credit analysis>",
  "sources": ["<source1>", "<source2>"],
  "missingDocuments": ["<document1>", "<document2>"],
  "requiresFollowUp": <boolean>,
  "followUpReason": "<why HR needs to request financial documents>",
  "details": {
    "creditIndicators": "<description>",
    "bankruptcyRecords": <boolean>,
    "debtJudgments": <boolean>,
    "financialStability": "<low|medium|high>"
  }
}`,

      education: `Verify education credentials for ${candidateName} (${candidateRole}).

Research Tasks:
1. Verify claimed educational qualifications
2. Check institution legitimacy
3. Look for credential fraud indicators
4. Assess verification confidence (0-100)
5. Identify missing documents (degree certificates, transcripts, academic records, institution letters)

Format as JSON:
{
  "riskScore": <number>,
  "findings": "<education verification summary>",
  "sources": ["<source1>", "<source2>"],
  "missingDocuments": ["<document1>", "<document2>"],
  "requiresFollowUp": <boolean>,
  "followUpReason": "<why HR needs to request documents>",
  "details": {
    "credentialsVerified": <boolean>,
    "institutionsVerified": ["<institution1>"],
    "fraudIndicators": <boolean>,
    "verificationConfidence": <number>
  }
}`,

      employment: `Verify employment history for ${candidateName} (${candidateRole}).

Research Tasks:
1. Verify previous employment claims
2. Check LinkedIn and professional profiles
3. Look for employment gaps or discrepancies
4. Assess credibility (0-100)
5. Identify missing documents (employment letters, payslips, tax certificates, reference letters)

Format as JSON:
{
  "riskScore": <number>,
  "findings": "<employment verification summary>",
  "sources": ["<source1>", "<source2>"],
  "missingDocuments": ["<document1>", "<document2>"],
  "requiresFollowUp": <boolean>,
  "followUpReason": "<why HR needs to request employment documents>",
  "details": {
    "employmentVerified": <boolean>,
    "discrepanciesFound": <boolean>,
    "linkedInProfile": "<status>",
    "credibilityScore": <number>
  }
}`,

      biometric: `Perform biometric identity verification for ${candidateName}.

Research Tasks:
1. Check for identity fraud indicators
2. Verify identity documents
3. Cross-reference public records
4. Assess identity confidence (0-100)
5. Identify missing documents (ID copy, passport, proof of address, biometric data)

Format as JSON:
{
  "riskScore": <number>,
  "findings": "<biometric verification summary>",
  "sources": ["<source1>", "<source2>"],
  "missingDocuments": ["<document1>", "<document2>"],
  "requiresFollowUp": <boolean>,
  "followUpReason": "<why HR needs to request documents>",
  "details": {
    "identityVerified": <boolean>,
    "fraudIndicators": <boolean>,
    "documentStatus": "<valid|invalid|pending>",
    "confidenceScore": <number>
  }
}`,

      reference: `Conduct reference check for ${candidateName} (${candidateRole}).

Research Tasks:
1. Analyze professional reputation
2. Check online reviews and mentions
3. Look for professional misconduct
4. Assess professional standing (0-100)
5. Identify missing documents (reference contact details, reference letters, professional recommendations)

Format as JSON:
{
  "riskScore": <number>,
  "findings": "<reference check summary>",
  "sources": ["<source1>", "<source2>"],
  "missingDocuments": ["<document1>", "<document2>"],
  "requiresFollowUp": <boolean>,
  "followUpReason": "<why HR needs to contact references>",
  "details": {
    "reputationStatus": "<excellent|good|fair|poor>",
    "misconductFound": <boolean>,
    "professionalStanding": "<high|medium|low>",
    "recommendationScore": <number>
  }
}`,
    };

    return prompts[checkType] || prompts.criminal;
  }

  private parseResponse(response: string, task: ResearchTask): ResearchResult {
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          findings: parsed.findings || "Analysis completed",
          riskScore: parsed.riskScore || 0,
          details: parsed.details || {},
          sources: parsed.sources || ["AI Analysis"],
          missingDocuments: parsed.missingDocuments || [],
          requiresFollowUp: parsed.requiresFollowUp || false,
          followUpReason: parsed.followUpReason || "",
        };
      }
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
    }

    // Fallback parsing
    return {
      findings: response.substring(0, 500),
      riskScore: this.calculateFallbackRiskScore(response),
      details: { rawResponse: response },
      sources: ["AI Analysis"],
      missingDocuments: [],
      requiresFollowUp: false,
    };
  }

  private calculateFallbackRiskScore(response: string): number {
    const lowercaseResponse = response.toLowerCase();
    
    // Simple heuristic based on keywords
    const riskKeywords = {
      high: ["criminal", "fraud", "warrant", "bankruptcy", "conviction"],
      medium: ["pending", "unverified", "discrepancy", "issue"],
      low: ["verified", "clean", "no records", "cleared"],
    };

    let score = 50; // Default medium risk

    for (const keyword of riskKeywords.high) {
      if (lowercaseResponse.includes(keyword)) {
        score += 10;
      }
    }

    for (const keyword of riskKeywords.low) {
      if (lowercaseResponse.includes(keyword)) {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}

export const groqResearchService = new GroqResearchService();
