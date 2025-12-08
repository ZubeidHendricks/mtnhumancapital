import Groq from "groq-sdk";
import { Hume, HumeClient } from "hume";
import { storage } from "./storage";
import type { 
  InterviewSession, 
  InsertInterviewSession,
  InterviewRecording,
  InterviewTranscript,
  InterviewFeedback,
  Candidate 
} from "@shared/schema";

interface TranscriptSegment {
  role: 'candidate' | 'ai' | 'interviewer';
  text: string;
  timestamp?: number;
  emotion?: string;
  emotionScores?: Record<string, number>;
}

interface InterviewAnalysis {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  cultureFitScore: number;
  problemSolvingScore: number;
  strengths: string[];
  weaknesses: string[];
  keyInsights: string[];
  decision: 'accepted' | 'rejected' | 'pipeline' | 'needs_review';
  decisionConfidence: number;
  rationale: string;
  recommendations: string;
  flaggedConcerns: string[];
  competencyScores: Record<string, number>;
}

export class InterviewOrchestrator {
  private groq: Groq | null = null;
  private humeApiKey: string | null = null;
  private humeSecretKey: string | null = null;
  private tavusApiKey: string | null = null;

  constructor() {
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    this.humeApiKey = process.env.HUME_API_KEY || null;
    this.humeSecretKey = process.env.HUME_SECRET_KEY || null;
    this.tavusApiKey = process.env.TAVUS_API_KEY || null;
  }

  async createInterviewSession(
    tenantId: string,
    candidateId: string,
    jobTitle: string,
    interviewType: 'voice' | 'video' = 'voice',
    customPrompt?: string
  ): Promise<InterviewSession> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const candidate = await storage.getCandidate(tenantId, candidateId);
    
    const session = await storage.createInterviewSession(tenantId, {
      candidateId,
      candidateName: candidate?.fullName,
      candidatePhone: candidate?.phone || undefined,
      jobTitle,
      token,
      interviewType,
      status: 'pending',
      prompt: customPrompt || this.getDefaultPrompt(jobTitle),
      expiresAt,
    });

    console.log(`[Interview] Created session ${session.id} for candidate ${candidateId}, type: ${interviewType}`);
    return session;
  }

  async startInterview(tenantId: string, sessionId: string): Promise<InterviewSession | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    const updated = await storage.updateInterviewSession(tenantId, sessionId, {
      status: 'started',
      startedAt: new Date(),
    });

    console.log(`[Interview] Session ${sessionId} started`);
    return updated || null;
  }

  async completeInterview(
    tenantId: string,
    sessionId: string,
    transcripts: TranscriptSegment[],
    emotionAnalysis?: Record<string, any>,
    recordingUrl?: string,
    duration?: number
  ): Promise<{ session: InterviewSession; feedback: InterviewFeedback } | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    const updated = await storage.updateInterviewSession(tenantId, sessionId, {
      status: 'completed',
      completedAt: new Date(),
      transcripts: transcripts as any,
      emotionAnalysis: emotionAnalysis as any,
      duration,
    });

    if (!updated) return null;

    if (recordingUrl) {
      await storage.createInterviewRecording(tenantId, {
        sessionId,
        candidateId: session.candidateId || undefined,
        recordingType: session.interviewType === 'video' ? 'video' : 'audio',
        mediaUrl: recordingUrl,
        duration,
        storageProvider: 'hume',
      });
    }

    await this.saveTranscriptSegments(tenantId, sessionId, transcripts);

    const analysis = await this.analyzeInterview(session, transcripts);

    const feedback = await storage.createInterviewFeedback(tenantId, {
      sessionId,
      candidateId: session.candidateId || undefined,
      evaluatorType: 'ai',
      decision: analysis.decision,
      decisionConfidence: analysis.decisionConfidence,
      overallScore: analysis.overallScore,
      technicalScore: analysis.technicalScore,
      communicationScore: analysis.communicationScore,
      cultureFitScore: analysis.cultureFitScore,
      problemSolvingScore: analysis.problemSolvingScore,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      keyInsights: analysis.keyInsights,
      rationale: analysis.rationale,
      recommendations: analysis.recommendations,
      flaggedConcerns: analysis.flaggedConcerns,
      competencyScores: analysis.competencyScores,
    });

    await storage.updateInterviewSession(tenantId, sessionId, {
      overallScore: analysis.overallScore,
      feedback: analysis.rationale,
    });

    await this.createTrainingEvent(tenantId, sessionId, session.candidateId, analysis);

    console.log(`[Interview] Session ${sessionId} completed with score ${analysis.overallScore}`);
    return { session: updated, feedback };
  }

  private async saveTranscriptSegments(
    tenantId: string,
    sessionId: string,
    transcripts: TranscriptSegment[]
  ): Promise<void> {
    const segments = transcripts.map((t, index) => ({
      sessionId,
      segmentIndex: index,
      speakerRole: t.role,
      text: t.text,
      startTime: t.timestamp,
      sentiment: t.emotion,
      emotionScores: t.emotionScores,
    }));

    await storage.createInterviewTranscriptsBatch(tenantId, segments);
  }

  private async analyzeInterview(
    session: InterviewSession,
    transcripts: TranscriptSegment[]
  ): Promise<InterviewAnalysis> {
    if (!this.groq) {
      return this.getDefaultAnalysis();
    }

    const transcriptText = transcripts
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n');

    const emotionSummary = transcripts
      .filter(t => t.emotion)
      .map(t => `${t.role}: ${t.emotion}`)
      .join(', ');

    try {
      const response = await this.groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert HR analyst evaluating job interviews. Analyze the following interview transcript for a ${session.jobTitle} position.

Provide a comprehensive evaluation in JSON format with the following structure:
{
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "cultureFitScore": <0-100>,
  "problemSolvingScore": <0-100>,
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "keyInsights": ["insight1", "insight2", ...],
  "decision": "accepted" | "rejected" | "pipeline" | "needs_review",
  "decisionConfidence": <0-100>,
  "rationale": "detailed reasoning for the decision",
  "recommendations": "next steps or suggestions",
  "flaggedConcerns": ["concern1", "concern2", ...],
  "competencyScores": {"leadership": 0-100, "teamwork": 0-100, "adaptability": 0-100, ...}
}

Consider:
- Technical knowledge and skills demonstrated
- Communication clarity and professionalism
- Problem-solving approach and critical thinking
- Cultural fit and attitude
- Emotional patterns if provided
- Red flags or concerns

Return ONLY valid JSON, no additional text.`
          },
          {
            role: "user",
            content: `Interview Transcript:\n${transcriptText}\n\n${emotionSummary ? `Emotion Analysis: ${emotionSummary}` : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as InterviewAnalysis;
      }
    } catch (error) {
      console.error('[Interview] Analysis error:', error);
    }

    return this.getDefaultAnalysis();
  }

  private getDefaultAnalysis(): InterviewAnalysis {
    return {
      overallScore: 50,
      technicalScore: 50,
      communicationScore: 50,
      cultureFitScore: 50,
      problemSolvingScore: 50,
      strengths: ['Interview completed'],
      weaknesses: ['Unable to perform detailed analysis'],
      keyInsights: ['Manual review recommended'],
      decision: 'needs_review',
      decisionConfidence: 30,
      rationale: 'Automated analysis was not available. Please review manually.',
      recommendations: 'Schedule follow-up interview or manual review',
      flaggedConcerns: [],
      competencyScores: {},
    };
  }

  private async createTrainingEvent(
    tenantId: string,
    sessionId: string,
    candidateId: string | null,
    analysis: InterviewAnalysis
  ): Promise<void> {
    await storage.createModelTrainingEvent(tenantId, {
      sessionId,
      candidateId: candidateId || undefined,
      eventType: 'interview_completed',
      modelVersion: '1.0',
      policyVersion: 'v1',
      features: {
        overallScore: analysis.overallScore,
        technicalScore: analysis.technicalScore,
        communicationScore: analysis.communicationScore,
        cultureFitScore: analysis.cultureFitScore,
        problemSolvingScore: analysis.problemSolvingScore,
        competencyScores: analysis.competencyScores,
      },
      labels: {
        decision: analysis.decision,
        decisionConfidence: analysis.decisionConfidence,
      },
      predictionConfidence: analysis.decisionConfidence,
    });
  }

  async getInterviewDetails(tenantId: string, sessionId: string): Promise<{
    session: InterviewSession;
    recordings: InterviewRecording[];
    transcripts: InterviewTranscript[];
    feedback: InterviewFeedback[];
  } | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    const [recordings, transcripts, feedback] = await Promise.all([
      storage.getInterviewRecordings(tenantId, sessionId),
      storage.getInterviewTranscripts(tenantId, sessionId),
      storage.getInterviewFeedback(tenantId, sessionId),
    ]);

    return { session, recordings, transcripts, feedback };
  }

  async updateDecision(
    tenantId: string,
    feedbackId: string,
    decision: 'accepted' | 'rejected' | 'pipeline',
    userId: string,
    notes?: string
  ): Promise<InterviewFeedback | null> {
    const feedback = await storage.updateInterviewFeedback(tenantId, feedbackId, {
      decision,
      isFinalized: 1,
      finalizedAt: new Date(),
      finalizedBy: userId,
      recommendations: notes,
    });

    if (feedback) {
      await storage.createModelTrainingEvent(tenantId, {
        sessionId: feedback.sessionId,
        candidateId: feedback.candidateId || undefined,
        eventType: 'decision_made',
        labels: {
          decision,
          humanOverride: true,
        },
      });
    }

    return feedback || null;
  }

  async generateRecommendations(tenantId: string, candidateId: string): Promise<void> {
    const feedbackList = await storage.getInterviewFeedbackByCandidate(tenantId, candidateId);
    if (feedbackList.length === 0) return;

    const latestFeedback = feedbackList[0];
    
    if (latestFeedback.decision === 'rejected' && latestFeedback.overallScore && latestFeedback.overallScore >= 60) {
      const session = await storage.getInterviewSession(tenantId, latestFeedback.sessionId);
      
      await storage.createCandidateRecommendation(tenantId, {
        candidateId,
        sessionId: latestFeedback.sessionId,
        recommendationType: 'better_fit',
        score: latestFeedback.overallScore,
        reasoning: `Candidate scored ${latestFeedback.overallScore}% but was rejected for ${session?.jobTitle || 'current role'}. Consider for alternative positions based on demonstrated strengths: ${latestFeedback.strengths?.join(', ')}`,
      });
    }

    if (latestFeedback.decision === 'pipeline') {
      await storage.createCandidateRecommendation(tenantId, {
        candidateId,
        sessionId: latestFeedback.sessionId,
        recommendationType: 'pipeline',
        score: latestFeedback.overallScore || 50,
        reasoning: `Candidate placed in pipeline. Key strengths: ${latestFeedback.strengths?.join(', ')}. Areas for improvement: ${latestFeedback.weaknesses?.join(', ')}`,
      });
    }
  }

  async getAllSessions(tenantId: string): Promise<InterviewSession[]> {
    return storage.getAllInterviewSessions(tenantId);
  }

  async getSessionsByCandidate(tenantId: string, candidateId: string): Promise<InterviewSession[]> {
    return storage.getInterviewSessionsByCandidateId(tenantId, candidateId);
  }

  async getRecommendations(tenantId: string, candidateId?: string): Promise<any[]> {
    return storage.getCandidateRecommendations(tenantId, candidateId);
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private getDefaultPrompt(jobTitle: string): string {
    return `You are conducting an interview for the position of ${jobTitle}. 
    
Your objectives:
1. Assess the candidate's relevant experience and skills
2. Evaluate their problem-solving abilities
3. Understand their motivation and career goals
4. Determine cultural fit with the organization
5. Identify any potential concerns or red flags

Be professional, friendly, and encouraging. Ask follow-up questions based on the candidate's responses.
Start by introducing yourself and explaining the interview process.`;
  }

  isConfigured(): boolean {
    return !!(this.groq && (this.humeApiKey || this.tavusApiKey));
  }

  getStatus(): { groq: boolean; hume: boolean; tavus: boolean } {
    return {
      groq: !!this.groq,
      hume: !!(this.humeApiKey && this.humeSecretKey),
      tavus: !!this.tavusApiKey,
    };
  }

  /**
   * Generate Hume AI access token for voice interviews
   * Returns an ephemeral access token for the Hume EVI API
   */
  async getHumeAccessToken(sessionId: string): Promise<string | null> {
    if (!this.humeApiKey || !this.humeSecretKey) {
      console.warn("⚠️  Hume API credentials not configured");
      return null;
    }

    try {
      const hume = new HumeClient({
        apiKey: this.humeApiKey,
        secretKey: this.humeSecretKey,
      });

      // Fetch access token from Hume
      const response = await hume.empathicVoice.chat.createChatAccessToken({
        configId: undefined, // Use default config
        // Add session metadata if needed
      });

      if (!response.accessToken) {
        throw new Error("No access token returned from Hume");
      }

      console.log(`✅ Generated Hume access token for session ${sessionId}`);
      return response.accessToken;
    } catch (error: any) {
      console.error("Error generating Hume access token:", error.message);
      return null;
    }
  }
}

export const interviewOrchestrator = new InterviewOrchestrator();
