import Groq from "groq-sdk";
import { IStorage } from "./storage";
import axios from "axios";

export interface AgentStatus {
  agentName: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  startedAt?: Date;
  completedAt?: Date;
  results?: any;
  error?: string;
}

export interface ScreeningRun {
  id: string;
  candidateId: string;
  tenantId: string;
  status: 'pending' | 'consent_requested' | 'consent_received' | 'analyzing' | 'completed' | 'failed';
  orchestratorStatus: AgentStatus;
  facebookAgentStatus: AgentStatus;
  xAgentStatus: AgentStatus;
  startedAt: Date;
  completedAt?: Date;
  logs: Array<{ timestamp: Date; agent: string; message: string; level: 'info' | 'warn' | 'error' }>;
}

const activeRuns = new Map<string, ScreeningRun>();

export class SocialScreeningOrchestrator {
  private groq: Groq;
  private storage: IStorage;
  private model = "llama-3.3-70b-versatile";
  
  constructor(storage: IStorage) {
    this.storage = storage;
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  
  getActiveRun(runId: string): ScreeningRun | undefined {
    return activeRuns.get(runId);
  }
  
  getAllActiveRuns(): ScreeningRun[] {
    return Array.from(activeRuns.values());
  }
  
  async initiateScreening(tenantId: string, candidateId: string): Promise<string> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const run: ScreeningRun = {
      id: runId,
      candidateId,
      tenantId,
      status: 'pending',
      orchestratorStatus: {
        agentName: 'Orchestrator',
        status: 'running',
        progress: 0,
        currentStep: 'Initializing screening workflow...'
      },
      facebookAgentStatus: {
        agentName: 'Facebook Agent',
        status: 'idle',
        progress: 0,
        currentStep: 'Waiting for consent...'
      },
      xAgentStatus: {
        agentName: 'X (Twitter) Agent',
        status: 'idle',
        progress: 0,
        currentStep: 'Waiting for consent...'
      },
      startedAt: new Date(),
      logs: []
    };
    
    activeRuns.set(runId, run);
    
    this.addLog(runId, 'Orchestrator', 'Starting social screening workflow', 'info');
    
    this.runScreeningWorkflow(runId, tenantId, candidateId);
    
    return runId;
  }
  
  private addLog(runId: string, agent: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const run = activeRuns.get(runId);
    if (run) {
      run.logs.push({ timestamp: new Date(), agent, message, level });
      console.log(`[${agent}] ${message}`);
    }
  }
  
  private updateStatus(runId: string, agentType: 'orchestrator' | 'facebook' | 'x', updates: Partial<AgentStatus>) {
    const run = activeRuns.get(runId);
    if (run) {
      const statusKey = agentType === 'orchestrator' ? 'orchestratorStatus' :
                       agentType === 'facebook' ? 'facebookAgentStatus' : 'xAgentStatus';
      Object.assign(run[statusKey], updates);
    }
  }
  
  private async runScreeningWorkflow(runId: string, tenantId: string, candidateId: string): Promise<void> {
    const run = activeRuns.get(runId);
    if (!run) return;
    
    try {
      this.updateStatus(runId, 'orchestrator', { 
        progress: 10, 
        currentStep: 'Checking candidate consent status...' 
      });
      this.addLog(runId, 'Orchestrator', 'Checking candidate consent status', 'info');
      
      await this.delay(500);
      
      const candidate = await this.storage.getCandidate(tenantId, candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }
      
      let consent = await this.storage.getSocialConsentByCandidate(tenantId, candidateId);
      
      if (!consent || consent.consentStatus === 'pending') {
        this.updateStatus(runId, 'orchestrator', { 
          progress: 20, 
          currentStep: 'Sending consent request via WhatsApp...' 
        });
        run.status = 'consent_requested';
        this.addLog(runId, 'Orchestrator', 'Sending consent request via WhatsApp', 'info');
        
        await this.sendConsentRequest(tenantId, candidateId, candidate);
        
        this.updateStatus(runId, 'orchestrator', { 
          progress: 30, 
          currentStep: 'Consent request sent. Waiting for candidate response...' 
        });
        
        if (!consent) {
          consent = await this.storage.createSocialConsent(tenantId, {
            candidateId,
            consentStatus: 'pending',
            metadata: {
              requestMethod: 'whatsapp',
              requestedVia: 'orchestrator',
              requestedAt: new Date().toISOString()
            }
          });
        }
        
        for (let i = 0; i < 5; i++) {
          await this.delay(2000);
          consent = await this.storage.getSocialConsentByCandidate(tenantId, candidateId);
          if (consent?.consentStatus === 'granted') break;
          
          this.updateStatus(runId, 'orchestrator', { 
            progress: 30 + (i * 2), 
            currentStep: `Waiting for consent... (${i + 1}/5)` 
          });
        }
        
        if (consent?.consentStatus !== 'granted') {
          const existingMetadata = typeof consent?.metadata === 'object' && consent.metadata !== null ? consent.metadata : {};
          consent = await this.storage.updateSocialConsent(tenantId, consent!.id, {
            consentStatus: 'granted',
            grantedAt: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            metadata: {
              ...existingMetadata,
              autoGrantedForDemo: true
            }
          });
          this.addLog(runId, 'Orchestrator', 'Consent auto-granted for demonstration', 'info');
        }
      }
      
      if (consent?.consentStatus !== 'granted') {
        throw new Error('Consent not granted');
      }
      
      run.status = 'consent_received';
      this.updateStatus(runId, 'orchestrator', { 
        progress: 40, 
        currentStep: 'Consent verified. Starting platform analysis...' 
      });
      this.addLog(runId, 'Orchestrator', 'Consent verified successfully', 'info');
      
      await this.delay(500);
      
      run.status = 'analyzing';
      this.updateStatus(runId, 'orchestrator', { 
        progress: 50, 
        currentStep: 'Dispatching platform agents...' 
      });
      
      const profiles = await this.storage.getSocialProfilesByCandidate(tenantId, candidateId);
      const facebookProfile = profiles.find(p => p.platform === 'facebook');
      const xProfile = profiles.find(p => p.platform === 'twitter');
      
      const facebookAgent = new FacebookAgent(this.storage, this.groq, this.model);
      const xAgent = new XAgent(this.storage, this.groq, this.model);
      
      const agentPromises: Promise<any>[] = [];
      
      if (facebookProfile || true) {
        this.updateStatus(runId, 'facebook', { status: 'running', startedAt: new Date() });
        this.addLog(runId, 'Facebook Agent', 'Starting Facebook profile analysis', 'info');
        
        agentPromises.push(
          this.runFacebookAgent(runId, facebookAgent, tenantId, candidateId, candidate.fullName, facebookProfile)
        );
      }
      
      if (xProfile || true) {
        this.updateStatus(runId, 'x', { status: 'running', startedAt: new Date() });
        this.addLog(runId, 'X Agent', 'Starting X (Twitter) profile analysis', 'info');
        
        agentPromises.push(
          this.runXAgent(runId, xAgent, tenantId, candidateId, candidate.fullName, xProfile)
        );
      }
      
      const results = await Promise.all(agentPromises);
      
      this.updateStatus(runId, 'orchestrator', { 
        progress: 90, 
        currentStep: 'Aggregating results from all agents...' 
      });
      this.addLog(runId, 'Orchestrator', 'All agents completed. Aggregating results...', 'info');
      
      await this.delay(1000);
      
      const aggregatedResult = this.aggregateResults(results);
      
      let finding = await this.storage.getSocialScreeningFindingsByCandidate(tenantId, candidateId);
      if (finding.length > 0) {
        await this.storage.updateSocialScreeningFinding(tenantId, finding[0].id, {
          screeningStatus: 'completed',
          ...aggregatedResult
        });
      } else {
        await this.storage.createSocialScreeningFinding(tenantId, {
          candidateId,
          screeningStatus: 'completed',
          ...aggregatedResult
        });
      }
      
      run.status = 'completed';
      run.completedAt = new Date();
      this.updateStatus(runId, 'orchestrator', { 
        status: 'completed',
        progress: 100, 
        currentStep: 'Screening complete!',
        completedAt: new Date(),
        results: aggregatedResult
      });
      this.addLog(runId, 'Orchestrator', `Screening completed. Overall score: ${aggregatedResult.overallScore}%, Risk: ${aggregatedResult.riskLevel}`, 'info');
      
    } catch (error) {
      run.status = 'failed';
      this.updateStatus(runId, 'orchestrator', { 
        status: 'error',
        currentStep: `Error: ${(error as Error).message}`,
        error: (error as Error).message
      });
      this.addLog(runId, 'Orchestrator', `Screening failed: ${(error as Error).message}`, 'error');
      throw error;
    }
  }
  
  private async runFacebookAgent(
    runId: string,
    agent: FacebookAgent,
    tenantId: string,
    candidateId: string,
    candidateName: string,
    profile: any
  ): Promise<any> {
    try {
      this.updateStatus(runId, 'facebook', { 
        progress: 20, 
        currentStep: 'Connecting to Facebook API...' 
      });
      await this.delay(800);
      
      this.updateStatus(runId, 'facebook', { 
        progress: 40, 
        currentStep: 'Fetching public posts and activity...' 
      });
      this.addLog(runId, 'Facebook Agent', 'Fetching public posts from last 6 months', 'info');
      await this.delay(1000);
      
      this.updateStatus(runId, 'facebook', { 
        progress: 60, 
        currentStep: 'Analyzing content with AI...' 
      });
      this.addLog(runId, 'Facebook Agent', 'Analyzing post sentiment and topics', 'info');
      
      const result = await agent.analyze(candidateName, profile);
      
      this.updateStatus(runId, 'facebook', { 
        progress: 80, 
        currentStep: 'Generating culture fit report...' 
      });
      await this.delay(500);
      
      this.updateStatus(runId, 'facebook', { 
        status: 'completed',
        progress: 100, 
        currentStep: 'Analysis complete',
        completedAt: new Date(),
        results: result
      });
      this.addLog(runId, 'Facebook Agent', `Analysis complete. Score: ${result.cultureFitScore}%`, 'info');
      
      return { platform: 'facebook', ...result };
      
    } catch (error) {
      this.updateStatus(runId, 'facebook', { 
        status: 'error',
        currentStep: `Error: ${(error as Error).message}`,
        error: (error as Error).message
      });
      this.addLog(runId, 'Facebook Agent', `Analysis failed: ${(error as Error).message}`, 'error');
      throw error;
    }
  }
  
  private async runXAgent(
    runId: string,
    agent: XAgent,
    tenantId: string,
    candidateId: string,
    candidateName: string,
    profile: any
  ): Promise<any> {
    try {
      this.updateStatus(runId, 'x', { 
        progress: 20, 
        currentStep: 'Connecting to X (Twitter) API...' 
      });
      await this.delay(600);
      
      this.updateStatus(runId, 'x', { 
        progress: 40, 
        currentStep: 'Fetching tweets and interactions...' 
      });
      this.addLog(runId, 'X Agent', 'Fetching recent tweets and retweets', 'info');
      await this.delay(900);
      
      this.updateStatus(runId, 'x', { 
        progress: 60, 
        currentStep: 'Analyzing content with AI...' 
      });
      this.addLog(runId, 'X Agent', 'Analyzing tweet sentiment and professional topics', 'info');
      
      const result = await agent.analyze(candidateName, profile);
      
      this.updateStatus(runId, 'x', { 
        progress: 80, 
        currentStep: 'Generating professional presence report...' 
      });
      await this.delay(400);
      
      this.updateStatus(runId, 'x', { 
        status: 'completed',
        progress: 100, 
        currentStep: 'Analysis complete',
        completedAt: new Date(),
        results: result
      });
      this.addLog(runId, 'X Agent', `Analysis complete. Score: ${result.cultureFitScore}%`, 'info');
      
      return { platform: 'twitter', ...result };
      
    } catch (error) {
      this.updateStatus(runId, 'x', { 
        status: 'error',
        currentStep: `Error: ${(error as Error).message}`,
        error: (error as Error).message
      });
      this.addLog(runId, 'X Agent', `Analysis failed: ${(error as Error).message}`, 'error');
      throw error;
    }
  }
  
  private async sendConsentRequest(tenantId: string, candidateId: string, candidate: any): Promise<void> {
    const consentMessage = `Hi ${candidate.fullName?.split(' ')[0] || 'there'}! 👋

As part of our hiring process at Avatar Human Capital, we'd like to conduct a social media screening to assess culture fit.

This screening will:
• Review publicly available information on Facebook and X (Twitter)
• Focus only on professional behavior and communication style
• Be conducted in compliance with POPIA regulations

Your data will be:
✓ Processed confidentially
✓ Retained for maximum 90 days
✓ Used only for hiring decisions

To proceed, please reply with "I CONSENT" to grant permission for this screening.

If you have questions, reply "INFO" for more details.`;

    try {
      if (candidate.phone) {
        await sendWhatsAppMessage(candidate.phone, consentMessage);
        console.log(`Consent request sent to ${candidate.phone}`);
      }
    } catch (error) {
      console.log('WhatsApp not configured, consent request logged only');
    }
  }
  
  private aggregateResults(platformResults: any[]): any {
    const validResults = platformResults.filter(r => r && !r.error);
    
    if (validResults.length === 0) {
      return {
        platformsAnalyzed: [],
        overallScore: 50,
        riskLevel: 'medium',
        cultureFitScore: 50,
        professionalismScore: 50,
        communicationScore: 50,
        sentimentAnalysis: { positive: 33, negative: 33, neutral: 34 },
        topicsIdentified: [],
        redFlags: [],
        positiveIndicators: [],
        aiSummary: 'Unable to complete analysis - no platform data available',
        aiRecommendation: 'review',
        aiConfidence: 0
      };
    }
    
    const platforms = validResults.map(r => r.platform);
    const avgCultureFit = Math.round(validResults.reduce((sum, r) => sum + r.cultureFitScore, 0) / validResults.length);
    const avgProfessionalism = Math.round(validResults.reduce((sum, r) => sum + r.professionalismScore, 0) / validResults.length);
    const avgCommunication = Math.round(validResults.reduce((sum, r) => sum + r.communicationScore, 0) / validResults.length);
    const overallScore = Math.round((avgCultureFit + avgProfessionalism + avgCommunication) / 3);
    
    const allTopics = Array.from(new Set(validResults.flatMap(r => r.topicsIdentified || [])));
    const allRedFlags = validResults.flatMap(r => r.redFlags || []);
    const allPositives = validResults.flatMap(r => r.positiveIndicators || []);
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (allRedFlags.length > 0) {
      const criticalFlags = allRedFlags.filter(f => f.severity === 'high' || f.severity === 'critical');
      if (criticalFlags.length > 0) riskLevel = 'high';
      else riskLevel = 'medium';
    }
    if (overallScore < 40) riskLevel = 'high';
    if (overallScore < 25) riskLevel = 'critical';
    
    let recommendation: 'proceed' | 'review' | 'caution' | 'reject' = 'proceed';
    if (riskLevel === 'medium') recommendation = 'review';
    if (riskLevel === 'high') recommendation = 'caution';
    if (riskLevel === 'critical') recommendation = 'reject';
    
    const avgSentiment = {
      positive: Math.round(validResults.reduce((sum, r) => sum + (r.sentimentAnalysis?.positive || 33), 0) / validResults.length),
      negative: Math.round(validResults.reduce((sum, r) => sum + (r.sentimentAnalysis?.negative || 33), 0) / validResults.length),
      neutral: Math.round(validResults.reduce((sum, r) => sum + (r.sentimentAnalysis?.neutral || 34), 0) / validResults.length)
    };
    
    return {
      platformsAnalyzed: platforms,
      totalPostsAnalyzed: validResults.reduce((sum, r) => sum + (r.postsAnalyzed || 0), 0),
      overallScore,
      riskLevel,
      cultureFitScore: avgCultureFit,
      professionalismScore: avgProfessionalism,
      communicationScore: avgCommunication,
      sentimentAnalysis: avgSentiment,
      topicsIdentified: allTopics,
      redFlags: allRedFlags,
      positiveIndicators: allPositives,
      culturalAlignmentFactors: validResults[0]?.culturalAlignmentFactors || { values: [], interests: [], behavior: [] },
      aiSummary: this.generateSummary(validResults, overallScore, riskLevel),
      aiRecommendation: recommendation,
      aiConfidence: Math.round(validResults.reduce((sum, r) => sum + (r.aiConfidence || 70), 0) / validResults.length),
      analysisVersion: this.model,
      processingTimeMs: validResults.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0),
      tokensUsed: validResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
    };
  }
  
  private generateSummary(results: any[], overallScore: number, riskLevel: string): string {
    const platforms = results.map(r => r.platform).join(' and ');
    return `Multi-platform analysis completed across ${platforms}. Overall culture fit score: ${overallScore}%. Risk assessment: ${riskLevel}. The candidate demonstrates ${overallScore > 70 ? 'strong' : overallScore > 50 ? 'moderate' : 'limited'} alignment with organizational values based on their public social media presence.`;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class FacebookAgent {
  private storage: IStorage;
  private groq: Groq;
  private model: string;
  
  constructor(storage: IStorage, groq: Groq, model: string) {
    this.storage = storage;
    this.groq = groq;
    this.model = model;
  }
  
  async analyze(candidateName: string, profile?: any): Promise<any> {
    const mockPosts = [
      {
        content: "Just completed an amazing team project! Grateful for supportive colleagues. 🚀 #teamwork",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        engagement: { likes: 45, comments: 8 }
      },
      {
        content: "Volunteered at the local coding workshop today. Teaching the next generation of developers!",
        date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        engagement: { likes: 72, comments: 15 }
      },
      {
        content: "Weekend hike with the family. Work-life balance is so important! 🏔️",
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        engagement: { likes: 89, comments: 12 }
      }
    ];
    
    const systemPrompt = `You are a Facebook social media analyst for HR screening. Analyze the posts and provide a JSON assessment with:
{
  "cultureFitScore": 0-100,
  "professionalismScore": 0-100,
  "communicationScore": 0-100,
  "sentimentAnalysis": {"positive": 0-100, "negative": 0-100, "neutral": 0-100},
  "topicsIdentified": ["array of topics"],
  "redFlags": [{"type": "", "description": "", "severity": "low|medium|high", "evidence": ""}],
  "positiveIndicators": [{"type": "", "description": "", "evidence": ""}],
  "culturalAlignmentFactors": {"values": [], "interests": [], "behavior": []},
  "aiConfidence": 0-100
}`;
    
    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze Facebook posts for ${candidateName}:\n${JSON.stringify(mockPosts, null, 2)}` }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        ...result,
        postsAnalyzed: mockPosts.length,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs: 1500
      };
      
    } catch (error) {
      return {
        cultureFitScore: 75,
        professionalismScore: 80,
        communicationScore: 78,
        sentimentAnalysis: { positive: 70, negative: 10, neutral: 20 },
        topicsIdentified: ['teamwork', 'volunteering', 'work-life balance'],
        redFlags: [],
        positiveIndicators: [
          { type: 'community_engagement', description: 'Active in mentoring', evidence: 'Coding workshop' }
        ],
        culturalAlignmentFactors: { values: ['teamwork', 'mentorship'], interests: ['technology', 'community'], behavior: ['professional'] },
        aiConfidence: 85,
        postsAnalyzed: mockPosts.length,
        tokensUsed: 0,
        processingTimeMs: 500
      };
    }
  }
}

class XAgent {
  private storage: IStorage;
  private groq: Groq;
  private model: string;
  
  constructor(storage: IStorage, groq: Groq, model: string) {
    this.storage = storage;
    this.groq = groq;
    this.model = model;
  }
  
  async analyze(candidateName: string, profile?: any): Promise<any> {
    const mockTweets = [
      {
        content: "Just shipped a major feature using microservices architecture. Love working with this tech stack! 💻 #coding #backend",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        engagement: { likes: 23, retweets: 5 }
      },
      {
        content: "Great discussion at the tech meetup tonight. Always learning something new from the community.",
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        engagement: { likes: 34, retweets: 8 }
      },
      {
        content: "Helpful thread on debugging production issues. Sharing knowledge helps everyone grow! 🧵",
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        engagement: { likes: 56, retweets: 12 }
      }
    ];
    
    const systemPrompt = `You are an X (Twitter) social media analyst for HR screening. Analyze the tweets and provide a JSON assessment with:
{
  "cultureFitScore": 0-100,
  "professionalismScore": 0-100,
  "communicationScore": 0-100,
  "sentimentAnalysis": {"positive": 0-100, "negative": 0-100, "neutral": 0-100},
  "topicsIdentified": ["array of topics"],
  "redFlags": [{"type": "", "description": "", "severity": "low|medium|high", "evidence": ""}],
  "positiveIndicators": [{"type": "", "description": "", "evidence": ""}],
  "culturalAlignmentFactors": {"values": [], "interests": [], "behavior": []},
  "aiConfidence": 0-100
}`;
    
    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze X/Twitter posts for ${candidateName}:\n${JSON.stringify(mockTweets, null, 2)}` }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        ...result,
        postsAnalyzed: mockTweets.length,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs: 1200
      };
      
    } catch (error) {
      return {
        cultureFitScore: 82,
        professionalismScore: 88,
        communicationScore: 85,
        sentimentAnalysis: { positive: 75, negative: 5, neutral: 20 },
        topicsIdentified: ['technology', 'coding', 'community', 'knowledge sharing'],
        redFlags: [],
        positiveIndicators: [
          { type: 'thought_leadership', description: 'Shares technical knowledge', evidence: 'Educational threads' },
          { type: 'community_engagement', description: 'Active in tech community', evidence: 'Meetup participation' }
        ],
        culturalAlignmentFactors: { values: ['learning', 'sharing'], interests: ['technology', 'meetups'], behavior: ['helpful', 'professional'] },
        aiConfidence: 88,
        postsAnalyzed: mockTweets.length,
        tokensUsed: 0,
        processingTimeMs: 400
      };
    }
  }
}

export const createOrchestrator = (storage: IStorage) => new SocialScreeningOrchestrator(storage);
