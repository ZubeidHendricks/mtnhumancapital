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
  linkedinAgentStatus: AgentStatus;
  instagramAgentStatus: AgentStatus;
  startedAt: Date;
  completedAt?: Date;
  logs: Array<{ timestamp: Date; agent: string; message: string; level: 'info' | 'warn' | 'error' }>;
}

const activeRuns = new Map<string, ScreeningRun>();

// Shared analysis JSON schema for all platform agents
const ANALYSIS_SCHEMA = `{
  "cultureFitScore": 0-100,
  "professionalismScore": 0-100,
  "communicationScore": 0-100,
  "sentimentAnalysis": {"positive": 0-100, "negative": 0-100, "neutral": 0-100},
  "topicsIdentified": ["array of topics found"],
  "redFlags": [{"type": "string", "description": "string", "severity": "low|medium|high", "evidence": "string"}],
  "positiveIndicators": [{"type": "string", "description": "string", "evidence": "string"}],
  "culturalAlignmentFactors": {"values": [], "interests": [], "behavior": []},
  "aiConfidence": 0-100
}`;

/**
 * Attempt to fetch public content from a social media profile URL.
 * Returns extracted text content or null if fetch fails.
 */
async function fetchPublicProfile(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MTNHumanCapital/1.0; Social Screening)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      maxRedirects: 3,
      validateStatus: (status) => status < 400,
    });

    if (typeof response.data === 'string') {
      // Strip HTML tags and extract text content
      const text = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // Limit to first 3000 chars to stay within token limits
      return text.slice(0, 3000) || null;
    }
    return null;
  } catch {
    return null;
  }
}

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
        currentStep: 'Awaiting dispatch...'
      },
      xAgentStatus: {
        agentName: 'X (Twitter) Agent',
        status: 'idle',
        progress: 0,
        currentStep: 'Awaiting dispatch...'
      },
      linkedinAgentStatus: {
        agentName: 'LinkedIn Agent',
        status: 'idle',
        progress: 0,
        currentStep: 'Awaiting dispatch...'
      },
      instagramAgentStatus: {
        agentName: 'Instagram Agent',
        status: 'idle',
        progress: 0,
        currentStep: 'Awaiting dispatch...'
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

  private updateStatus(runId: string, agentType: 'orchestrator' | 'facebook' | 'x' | 'linkedin' | 'instagram', updates: Partial<AgentStatus>) {
    const run = activeRuns.get(runId);
    if (run) {
      const statusKeyMap: Record<string, keyof ScreeningRun> = {
        orchestrator: 'orchestratorStatus',
        facebook: 'facebookAgentStatus',
        x: 'xAgentStatus',
        linkedin: 'linkedinAgentStatus',
        instagram: 'instagramAgentStatus',
      };
      const statusKey = statusKeyMap[agentType] as keyof ScreeningRun;
      Object.assign(run[statusKey] as AgentStatus, updates);
    }
  }

  private async runScreeningWorkflow(runId: string, tenantId: string, candidateId: string): Promise<void> {
    const run = activeRuns.get(runId);
    if (!run) return;

    try {
      // Step 1: Validate candidate
      this.updateStatus(runId, 'orchestrator', {
        progress: 10,
        currentStep: 'Validating candidate...'
      });
      this.addLog(runId, 'Orchestrator', 'Looking up candidate record', 'info');

      const candidate = await this.storage.getCandidate(tenantId, candidateId);
      if (!candidate) {
        throw new Error('Candidate not found');
      }

      this.addLog(runId, 'Orchestrator', `Candidate: ${candidate.fullName}`, 'info');

      // Step 2: Verify POPIA consent
      this.updateStatus(runId, 'orchestrator', {
        progress: 20,
        currentStep: 'Verifying POPIA consent...'
      });
      this.addLog(runId, 'Orchestrator', 'Checking POPIA consent status', 'info');

      const consent = await this.storage.getSocialConsentByCandidate(tenantId, candidateId);

      if (!consent || consent.consentStatus !== 'granted') {
        this.addLog(runId, 'Orchestrator', 'Consent not granted - cannot proceed with screening', 'error');
        throw new Error('POPIA consent not granted. Please request and obtain consent before screening.');
      }

      // Check consent expiration
      if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
        this.addLog(runId, 'Orchestrator', 'Consent has expired - requires renewal', 'error');
        throw new Error('Consent has expired. Please request renewed consent from the candidate.');
      }

      run.status = 'consent_received';
      this.updateStatus(runId, 'orchestrator', {
        progress: 30,
        currentStep: 'Consent verified. Loading social profiles...'
      });
      this.addLog(runId, 'Orchestrator', `Consent verified (granted: ${consent.grantedAt ? new Date(consent.grantedAt).toLocaleDateString() : 'N/A'})`, 'info');

      // Step 3: Load linked social profiles
      const profiles = await this.storage.getSocialProfilesByCandidate(tenantId, candidateId);
      const linkedPlatforms = profiles.map(p => p.platform);

      if (profiles.length === 0) {
        this.addLog(runId, 'Orchestrator', 'No social profiles linked for this candidate', 'warn');
        throw new Error('No social media profiles linked. Please add at least one profile URL before screening.');
      }

      this.addLog(runId, 'Orchestrator', `Found ${profiles.length} linked profile(s): ${linkedPlatforms.join(', ')}`, 'info');

      // Step 4: Dispatch platform agents (only for linked profiles)
      run.status = 'analyzing';
      this.updateStatus(runId, 'orchestrator', {
        progress: 40,
        currentStep: 'Dispatching platform agents...'
      });

      const agentPromises: Promise<any>[] = [];
      const platformConfigs: { key: 'facebook' | 'x' | 'linkedin' | 'instagram'; dbPlatform: string; label: string }[] = [
        { key: 'linkedin', dbPlatform: 'linkedin', label: 'LinkedIn' },
        { key: 'facebook', dbPlatform: 'facebook', label: 'Facebook' },
        { key: 'x', dbPlatform: 'twitter', label: 'X (Twitter)' },
        { key: 'instagram', dbPlatform: 'instagram', label: 'Instagram' },
      ];

      for (const config of platformConfigs) {
        const profile = profiles.find(p => p.platform === config.dbPlatform);
        if (profile) {
          this.updateStatus(runId, config.key, { status: 'running', startedAt: new Date() });
          this.addLog(runId, `${config.label} Agent`, `Starting analysis for @${profile.profileUsername || profile.profileUrl || 'unknown'}`, 'info');

          agentPromises.push(
            this.runPlatformAgent(runId, config.key, config.label, config.dbPlatform, candidate.fullName, profile)
          );
        } else {
          this.updateStatus(runId, config.key, {
            status: 'completed',
            progress: 100,
            currentStep: 'No profile linked - skipped'
          });
          this.addLog(runId, `${config.label} Agent`, 'No profile linked for this platform - skipped', 'info');
        }
      }

      const results = await Promise.all(agentPromises);

      // Step 5: Aggregate results
      this.updateStatus(runId, 'orchestrator', {
        progress: 90,
        currentStep: 'Aggregating results from all agents...'
      });
      this.addLog(runId, 'Orchestrator', 'All agents completed. Aggregating results...', 'info');

      const aggregatedResult = this.aggregateResults(results);

      // Step 6: Save findings to database
      let existingFindings = await this.storage.getSocialScreeningFindingsByCandidate(tenantId, candidateId);
      if (existingFindings.length > 0) {
        await this.storage.updateSocialScreeningFinding(tenantId, existingFindings[0].id, {
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
    }
  }

  /**
   * Generic platform agent runner - fetches real profile data and sends to AI
   */
  private async runPlatformAgent(
    runId: string,
    agentKey: 'facebook' | 'x' | 'linkedin' | 'instagram',
    agentLabel: string,
    dbPlatform: string,
    candidateName: string,
    profile: any
  ): Promise<any> {
    const startTime = Date.now();
    try {
      // Step 1: Attempt to fetch public profile
      this.updateStatus(runId, agentKey, {
        progress: 20,
        currentStep: `Fetching public ${agentLabel} profile...`
      });

      let publicContent: string | null = null;
      if (profile.profileUrl) {
        this.addLog(runId, `${agentLabel} Agent`, `Fetching public data from ${profile.profileUrl}`, 'info');
        publicContent = await fetchPublicProfile(profile.profileUrl);

        if (publicContent) {
          this.addLog(runId, `${agentLabel} Agent`, `Retrieved ${publicContent.length} characters of public content`, 'info');
        } else {
          this.addLog(runId, `${agentLabel} Agent`, 'Could not retrieve public page content (may be private or blocked)', 'warn');
        }
      }

      // Step 2: Build analysis context from real data
      this.updateStatus(runId, agentKey, {
        progress: 40,
        currentStep: 'Building analysis context from profile data...'
      });

      const profileContext = this.buildProfileContext(profile, publicContent, dbPlatform);

      if (!profileContext) {
        this.updateStatus(runId, agentKey, {
          status: 'completed',
          progress: 100,
          currentStep: 'Insufficient data for analysis',
          completedAt: new Date(),
          results: { skipped: true, reason: 'No analyzable data available' }
        });
        this.addLog(runId, `${agentLabel} Agent`, 'No analyzable data available for this profile', 'warn');
        return { platform: dbPlatform, skipped: true };
      }

      // Step 3: AI Analysis
      this.updateStatus(runId, agentKey, {
        progress: 60,
        currentStep: 'Running AI culture fit analysis...'
      });
      this.addLog(runId, `${agentLabel} Agent`, 'Sending profile data to AI for analysis', 'info');

      const result = await this.analyzeWithAI(candidateName, dbPlatform, agentLabel, profileContext);

      // Step 4: Finalize
      this.updateStatus(runId, agentKey, {
        status: 'completed',
        progress: 100,
        currentStep: 'Analysis complete',
        completedAt: new Date(),
        results: result
      });

      const processingTime = Date.now() - startTime;
      this.addLog(runId, `${agentLabel} Agent`, `Analysis complete. Culture fit: ${result.cultureFitScore}% (${processingTime}ms)`, 'info');

      return { platform: dbPlatform, ...result, processingTimeMs: processingTime };

    } catch (error) {
      this.updateStatus(runId, agentKey, {
        status: 'error',
        currentStep: `Error: ${(error as Error).message}`,
        error: (error as Error).message
      });
      this.addLog(runId, `${agentLabel} Agent`, `Analysis failed: ${(error as Error).message}`, 'error');
      return { platform: dbPlatform, error: (error as Error).message };
    }
  }

  /**
   * Build a context string from available profile data for AI analysis
   */
  private buildProfileContext(profile: any, publicContent: string | null, platform: string): string | null {
    const parts: string[] = [];

    if (profile.profileUsername) {
      parts.push(`Username/Handle: @${profile.profileUsername}`);
    }
    if (profile.profileName) {
      parts.push(`Display Name: ${profile.profileName}`);
    }
    if (profile.profileUrl) {
      parts.push(`Profile URL: ${profile.profileUrl}`);
    }

    // Include any stored profile data (e.g. from previous scrapes)
    if (profile.profileData && typeof profile.profileData === 'object') {
      const data = profile.profileData as Record<string, any>;
      if (data.bio) parts.push(`Bio: ${data.bio}`);
      if (data.headline) parts.push(`Headline: ${data.headline}`);
      if (data.location) parts.push(`Location: ${data.location}`);
      if (data.connections) parts.push(`Connections/Followers: ${data.connections}`);
      if (data.posts && Array.isArray(data.posts)) {
        parts.push(`Recent Posts (${data.posts.length}):`);
        data.posts.forEach((post: any, i: number) => {
          parts.push(`  ${i + 1}. ${typeof post === 'string' ? post : post.content || JSON.stringify(post)}`);
        });
      }
    }

    // Include fetched public content
    if (publicContent) {
      parts.push(`\nPublic Page Content (extracted text):\n${publicContent}`);
    }

    // Need at least some meaningful data to analyze
    if (parts.length <= 1) return null;

    return parts.join('\n');
  }

  /**
   * Send profile data to Groq AI for culture fit analysis
   */
  private async analyzeWithAI(
    candidateName: string,
    platform: string,
    platformLabel: string,
    profileContext: string
  ): Promise<any> {
    const systemPrompt = `You are an expert HR analyst conducting a POPIA-compliant social media screening for culture fit assessment.

IMPORTANT RULES:
- Only analyze information actually provided to you. Do NOT invent, fabricate, or hallucinate any posts, content, or data.
- If limited information is available, clearly state this and provide conservative, honest scores with low confidence.
- Focus on: professional behavior, communication style, values alignment, red flags for workplace conduct.
- Avoid bias based on protected characteristics (race, gender, religion, age, disability, sexual orientation).
- Score conservatively - do not inflate scores when data is limited.

Provide your analysis as JSON matching this schema:
${ANALYSIS_SCHEMA}

If data is very limited, set aiConfidence to a low value (10-30) and note this in the topics.`;

    const userPrompt = `Analyze the following ${platformLabel} profile for candidate "${candidateName}":

${profileContext}

Provide a factual culture fit assessment based ONLY on the data above. Do not invent any information.`;

    const response = await this.groq.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from AI analysis');
    }

    const result = JSON.parse(content);

    return {
      cultureFitScore: Math.max(0, Math.min(100, result.cultureFitScore || 0)),
      professionalismScore: Math.max(0, Math.min(100, result.professionalismScore || 0)),
      communicationScore: Math.max(0, Math.min(100, result.communicationScore || 0)),
      sentimentAnalysis: result.sentimentAnalysis || { positive: 0, negative: 0, neutral: 100 },
      topicsIdentified: result.topicsIdentified || [],
      redFlags: result.redFlags || [],
      positiveIndicators: result.positiveIndicators || [],
      culturalAlignmentFactors: result.culturalAlignmentFactors || { values: [], interests: [], behavior: [] },
      aiConfidence: Math.max(0, Math.min(100, result.aiConfidence || 0)),
      postsAnalyzed: 0, // Real count would come from actual API data
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }

  private aggregateResults(platformResults: any[]): any {
    const validResults = platformResults.filter(r => r && !r.error && !r.skipped);

    if (validResults.length === 0) {
      return {
        platformsAnalyzed: [],
        totalPostsAnalyzed: 0,
        overallScore: 0,
        riskLevel: 'medium',
        cultureFitScore: 0,
        professionalismScore: 0,
        communicationScore: 0,
        sentimentAnalysis: { positive: 0, negative: 0, neutral: 100 },
        topicsIdentified: [],
        redFlags: [],
        positiveIndicators: [],
        culturalAlignmentFactors: { values: [], interests: [], behavior: [] },
        aiSummary: 'Unable to complete analysis - no platform data could be analyzed. Ensure social media profiles are linked and accessible.',
        aiRecommendation: 'review',
        aiConfidence: 0,
        analysisVersion: this.model,
        processingTimeMs: 0,
        tokensUsed: 0
      };
    }

    const platforms = validResults.map(r => r.platform);
    const avgCultureFit = Math.round(validResults.reduce((sum, r) => sum + (r.cultureFitScore || 0), 0) / validResults.length);
    const avgProfessionalism = Math.round(validResults.reduce((sum, r) => sum + (r.professionalismScore || 0), 0) / validResults.length);
    const avgCommunication = Math.round(validResults.reduce((sum, r) => sum + (r.communicationScore || 0), 0) / validResults.length);
    const overallScore = Math.round((avgCultureFit + avgProfessionalism + avgCommunication) / 3);

    const allTopics = Array.from(new Set(validResults.flatMap(r => r.topicsIdentified || [])));
    const allRedFlags = validResults.flatMap(r => r.redFlags || []);
    const allPositives = validResults.flatMap(r => r.positiveIndicators || []);

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (allRedFlags.length > 0) {
      const criticalFlags = allRedFlags.filter((f: any) => f.severity === 'high' || f.severity === 'critical');
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
      positive: Math.round(validResults.reduce((sum, r) => sum + (r.sentimentAnalysis?.positive || 0), 0) / validResults.length),
      negative: Math.round(validResults.reduce((sum, r) => sum + (r.sentimentAnalysis?.negative || 0), 0) / validResults.length),
      neutral: Math.round(validResults.reduce((sum, r) => sum + (r.sentimentAnalysis?.neutral || 0), 0) / validResults.length)
    };

    const avgConfidence = Math.round(validResults.reduce((sum, r) => sum + (r.aiConfidence || 0), 0) / validResults.length);

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
      culturalAlignmentFactors: this.mergeCulturalFactors(validResults),
      aiSummary: this.generateSummary(validResults, overallScore, riskLevel, avgConfidence),
      aiRecommendation: recommendation,
      aiConfidence: avgConfidence,
      analysisVersion: this.model,
      processingTimeMs: validResults.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0),
      tokensUsed: validResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0)
    };
  }

  private mergeCulturalFactors(results: any[]): { values: string[]; interests: string[]; behavior: string[] } {
    return {
      values: Array.from(new Set(results.flatMap(r => r.culturalAlignmentFactors?.values || []))),
      interests: Array.from(new Set(results.flatMap(r => r.culturalAlignmentFactors?.interests || []))),
      behavior: Array.from(new Set(results.flatMap(r => r.culturalAlignmentFactors?.behavior || []))),
    };
  }

  private generateSummary(results: any[], overallScore: number, riskLevel: string, confidence: number): string {
    const platforms = results.map(r => r.platform).join(', ');
    const confidenceNote = confidence < 40 ? ' Note: Limited data was available, so confidence in this assessment is low.' : '';
    return `Multi-platform analysis completed across ${platforms}. Overall culture fit score: ${overallScore}%. Risk assessment: ${riskLevel}. The candidate demonstrates ${overallScore > 70 ? 'strong' : overallScore > 50 ? 'moderate' : 'limited'} alignment with organizational values based on their public social media presence.${confidenceNote}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const createOrchestrator = (storage: IStorage) => new SocialScreeningOrchestrator(storage);
