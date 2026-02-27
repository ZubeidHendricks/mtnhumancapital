import Groq from "groq-sdk";
import { IStorage } from "./storage";
import axios from "axios";

interface SocialMediaAnalysis {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  cultureFitScore: number;
  professionalismScore: number;
  communicationScore: number;
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topicsIdentified: string[];
  redFlags: Array<{
    type: string;
    description: string;
    severity: string;
    evidence: string;
  }>;
  positiveIndicators: Array<{
    type: string;
    description: string;
    evidence: string;
  }>;
  culturalAlignmentFactors: {
    values: string[];
    interests: string[];
    behavior: string[];
  };
  aiSummary: string;
  aiRecommendation: 'proceed' | 'review' | 'caution' | 'reject';
  aiConfidence: number;
}

/**
 * Attempt to fetch public text content from a profile URL
 */
async function fetchPublicContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MTNHumanCapital/1.0)',
        'Accept': 'text/html',
      },
      maxRedirects: 3,
      validateStatus: (status) => status < 400,
    });

    if (typeof response.data === 'string') {
      return response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000) || null;
    }
    return null;
  } catch {
    return null;
  }
}

export class SocialScreeningAgent {
  private groq: Groq;
  private storage: IStorage;
  private model = "llama-3.3-70b-versatile";

  constructor(storage: IStorage) {
    this.storage = storage;
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  async runScreening(
    tenantId: string,
    findingId: string,
    platforms: string[],
    socialHandles: Record<string, string>
  ): Promise<void> {
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      const finding = await this.storage.getSocialScreeningFinding(tenantId, findingId);
      if (!finding) {
        throw new Error("Finding not found");
      }

      const candidate = await this.storage.getCandidate(tenantId, finding.candidateId);
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      // Get real profiles from DB
      const profiles = await this.storage.getSocialProfilesByCandidate(tenantId, finding.candidateId);

      // Build real profile data from DB records and public fetches
      const realProfileData = await this.buildRealProfileData(profiles, platforms, socialHandles);

      if (Object.keys(realProfileData).length === 0) {
        throw new Error("No social media profiles linked for analysis. Please add profile URLs first.");
      }

      const analysis = await this.analyzeProfiles(
        candidate.fullName,
        Object.keys(realProfileData),
        realProfileData
      );

      tokensUsed = analysis.tokensUsed || 0;

      const humanReviewRequired =
        analysis.result.riskLevel === 'high' ||
        analysis.result.riskLevel === 'critical' ||
        analysis.result.aiRecommendation === 'review' ||
        analysis.result.aiRecommendation === 'caution';

      await this.storage.updateSocialScreeningFinding(tenantId, findingId, {
        overallScore: analysis.result.overallScore,
        riskLevel: analysis.result.riskLevel,
        cultureFitScore: analysis.result.cultureFitScore,
        professionalismScore: analysis.result.professionalismScore,
        communicationScore: analysis.result.communicationScore,
        sentimentAnalysis: analysis.result.sentimentAnalysis,
        topicsIdentified: analysis.result.topicsIdentified,
        redFlags: analysis.result.redFlags,
        positiveIndicators: analysis.result.positiveIndicators,
        culturalAlignmentFactors: analysis.result.culturalAlignmentFactors,
        aiSummary: analysis.result.aiSummary,
        aiRecommendation: analysis.result.aiRecommendation,
        aiConfidence: analysis.result.aiConfidence,
        humanReviewStatus: humanReviewRequired ? 'pending' : 'approved',
        analysisVersion: this.model,
        processingTimeMs: Date.now() - startTime,
        tokensUsed
      });

      if (finding.integrityCheckId) {
        await this.storage.updateIntegrityCheck(tenantId, finding.integrityCheckId, {
          status: humanReviewRequired ? 'pending_review' :
                 (analysis.result.aiRecommendation === 'reject' ? 'failed' : 'passed'),
          completedAt: humanReviewRequired ? undefined : new Date(),
          result: JSON.stringify({
            socialScreeningResult: analysis.result.aiRecommendation,
            riskLevel: analysis.result.riskLevel,
            cultureFitScore: analysis.result.cultureFitScore
          })
        });
      }

      console.log(`Social screening completed for finding ${findingId}`, {
        riskLevel: analysis.result.riskLevel,
        recommendation: analysis.result.aiRecommendation,
        humanReviewRequired,
        processingTimeMs: Date.now() - startTime
      });

    } catch (error) {
      console.error("Social screening failed:", error);

      await this.storage.updateSocialScreeningFinding(tenantId, findingId, {
        humanReviewStatus: 'pending',
        aiSummary: `Analysis failed: ${(error as Error).message}`,
        processingTimeMs: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Build real profile data from DB records and attempt to fetch public content
   */
  private async buildRealProfileData(
    profiles: any[],
    platforms: string[],
    socialHandles: Record<string, string>
  ): Promise<Record<string, any>> {
    const profileData: Record<string, any> = {};

    for (const profile of profiles) {
      if (!platforms.includes(profile.platform) && !platforms.includes('all')) continue;

      const data: any = {
        username: profile.profileUsername || socialHandles[profile.platform] || null,
        profileUrl: profile.profileUrl || null,
        displayName: profile.profileName || null,
      };

      // Include stored profile data
      if (profile.profileData && typeof profile.profileData === 'object') {
        Object.assign(data, profile.profileData);
      }

      // Attempt to fetch public page content
      if (profile.profileUrl) {
        const publicContent = await fetchPublicContent(profile.profileUrl);
        if (publicContent) {
          data.publicPageContent = publicContent;
        }
      }

      // Only include if we have meaningful data
      if (data.username || data.profileUrl || data.publicPageContent) {
        profileData[profile.platform] = data;
      }
    }

    return profileData;
  }

  private async analyzeProfiles(
    candidateName: string,
    platforms: string[],
    profileData: Record<string, any>
  ): Promise<{ result: SocialMediaAnalysis; tokensUsed: number }> {

    const systemPrompt = `You are an expert HR analyst specializing in social media screening for culture fit assessment.
Your task is to analyze social media profiles and provide an objective, fair assessment while being mindful of:
- POPIA (Protection of Personal Information Act) compliance
- GDPR principles
- Avoiding bias based on protected characteristics
- Focusing only on job-relevant behavior and communication style

IMPORTANT: Only analyze information actually provided. Do NOT fabricate or hallucinate any posts, content, or data.
If limited data is available, clearly state this and score conservatively with low confidence.

You must provide a JSON response with the following structure:
{
  "overallScore": 0-100,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "cultureFitScore": 0-100,
  "professionalismScore": 0-100,
  "communicationScore": 0-100,
  "sentimentAnalysis": { "positive": 0-100, "negative": 0-100, "neutral": 0-100 },
  "topicsIdentified": ["topic1", "topic2"],
  "redFlags": [{ "type": "string", "description": "string", "severity": "low|medium|high", "evidence": "string" }],
  "positiveIndicators": [{ "type": "string", "description": "string", "evidence": "string" }],
  "culturalAlignmentFactors": { "values": [], "interests": [], "behavior": [] },
  "aiSummary": "Brief executive summary",
  "aiRecommendation": "proceed" | "review" | "caution" | "reject",
  "aiConfidence": 0-100
}`;

    const userPrompt = `Analyze the following social media presence for candidate: ${candidateName}

Platforms analyzed: ${platforms.join(', ')}

Profile Data:
${JSON.stringify(profileData, null, 2)}

Provide a factual, comprehensive analysis based ONLY on the data above. Do not invent any information.`;

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from AI");
      }

      const analysis = JSON.parse(content) as SocialMediaAnalysis;

      return {
        result: {
          overallScore: Math.max(0, Math.min(100, analysis.overallScore || 0)),
          riskLevel: ['low', 'medium', 'high', 'critical'].includes(analysis.riskLevel)
            ? analysis.riskLevel : 'medium',
          cultureFitScore: Math.max(0, Math.min(100, analysis.cultureFitScore || 0)),
          professionalismScore: Math.max(0, Math.min(100, analysis.professionalismScore || 0)),
          communicationScore: Math.max(0, Math.min(100, analysis.communicationScore || 0)),
          sentimentAnalysis: analysis.sentimentAnalysis || { positive: 0, negative: 0, neutral: 100 },
          topicsIdentified: analysis.topicsIdentified || [],
          redFlags: analysis.redFlags || [],
          positiveIndicators: analysis.positiveIndicators || [],
          culturalAlignmentFactors: analysis.culturalAlignmentFactors || { values: [], interests: [], behavior: [] },
          aiSummary: analysis.aiSummary || "Analysis completed based on available data",
          aiRecommendation: ['proceed', 'review', 'caution', 'reject'].includes(analysis.aiRecommendation)
            ? analysis.aiRecommendation : 'review',
          aiConfidence: Math.max(0, Math.min(100, analysis.aiConfidence || 0))
        },
        tokensUsed: response.usage?.total_tokens || 0
      };

    } catch (error) {
      console.error("AI analysis failed:", error);
      throw new Error(`AI analysis failed: ${(error as Error).message}`);
    }
  }
}
