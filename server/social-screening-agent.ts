import Groq from "groq-sdk";
import { IStorage } from "./storage";

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
      
      const profiles = await this.storage.getSocialProfilesByCandidate(tenantId, finding.candidateId);
      
      const mockProfileData = this.generateMockProfileData(platforms, socialHandles);
      
      const analysis = await this.analyzeProfiles(
        candidate.fullName,
        platforms,
        mockProfileData
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
  
  private generateMockProfileData(
    platforms: string[],
    socialHandles: Record<string, string>
  ): Record<string, any> {
    const mockData: Record<string, any> = {};
    
    for (const platform of platforms) {
      const handle = socialHandles[platform] || `user_${Math.random().toString(36).slice(2, 8)}`;
      
      mockData[platform] = {
        username: handle,
        posts: [
          {
            content: "Excited about my new role in technology! #career #growth",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            engagement: { likes: 42, comments: 5 }
          },
          {
            content: "Great team meeting today. Collaboration is key to success.",
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            engagement: { likes: 28, comments: 3 }
          },
          {
            content: "Learning new skills every day. Never stop growing!",
            date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
            engagement: { likes: 56, comments: 8 }
          }
        ],
        bio: "Professional with a passion for innovation and teamwork.",
        followerCount: Math.floor(Math.random() * 1000) + 100,
        accountAge: "2+ years"
      };
    }
    
    return mockData;
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

Please provide a comprehensive analysis focusing on:
1. Professional online presence
2. Communication style and tone
3. Values and interests alignment with workplace culture
4. Any concerning patterns or red flags
5. Positive indicators of good workplace behavior

Remember: Focus only on publicly available information and job-relevant factors. Do not make assumptions based on protected characteristics.`;

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
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
          overallScore: Math.max(0, Math.min(100, analysis.overallScore || 50)),
          riskLevel: ['low', 'medium', 'high', 'critical'].includes(analysis.riskLevel) 
            ? analysis.riskLevel : 'medium',
          cultureFitScore: Math.max(0, Math.min(100, analysis.cultureFitScore || 50)),
          professionalismScore: Math.max(0, Math.min(100, analysis.professionalismScore || 50)),
          communicationScore: Math.max(0, Math.min(100, analysis.communicationScore || 50)),
          sentimentAnalysis: analysis.sentimentAnalysis || { positive: 33, negative: 33, neutral: 34 },
          topicsIdentified: analysis.topicsIdentified || [],
          redFlags: analysis.redFlags || [],
          positiveIndicators: analysis.positiveIndicators || [],
          culturalAlignmentFactors: analysis.culturalAlignmentFactors || { values: [], interests: [], behavior: [] },
          aiSummary: analysis.aiSummary || "Analysis completed",
          aiRecommendation: ['proceed', 'review', 'caution', 'reject'].includes(analysis.aiRecommendation)
            ? analysis.aiRecommendation : 'review',
          aiConfidence: Math.max(0, Math.min(100, analysis.aiConfidence || 70))
        },
        tokensUsed: response.usage?.total_tokens || 0
      };
      
    } catch (error) {
      console.error("AI analysis failed:", error);
      
      return {
        result: {
          overallScore: 50,
          riskLevel: 'medium',
          cultureFitScore: 50,
          professionalismScore: 50,
          communicationScore: 50,
          sentimentAnalysis: { positive: 33, negative: 33, neutral: 34 },
          topicsIdentified: platforms,
          redFlags: [],
          positiveIndicators: [],
          culturalAlignmentFactors: { values: [], interests: [], behavior: [] },
          aiSummary: `Manual review required - AI analysis encountered an error: ${(error as Error).message}`,
          aiRecommendation: 'review',
          aiConfidence: 0
        },
        tokensUsed: 0
      };
    }
  }
}
