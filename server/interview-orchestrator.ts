import Groq from "groq-sdk";
import { Hume, HumeClient } from "hume";
import { storage } from "./storage";
import { recordingStorage } from "./recording-storage";
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

  async addVideoStage(
    tenantId: string,
    sessionId: string,
    prompt?: string
  ): Promise<InterviewSession | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    const videoToken = this.generateToken();
    const videoExpiresAt = new Date();
    videoExpiresAt.setHours(videoExpiresAt.getHours() + 72);

    const updated = await storage.updateInterviewSession(tenantId, sessionId, {
      videoToken,
      videoStatus: 'pending',
      videoPrompt: prompt || this.getTavusPrompt(session.jobTitle || 'the position'),
      videoSentAt: new Date(),
      videoExpiresAt,
      status: 'video_pending',
    } as any);

    console.log(`[Interview] Added video stage to session ${sessionId}, videoToken: ${videoToken}`);
    return updated || null;
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
    duration?: number,
    stage: 'voice' | 'video' = 'voice'
  ): Promise<{ session: InterviewSession; feedback: InterviewFeedback } | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    // Build stage-specific updates
    const sessionUpdates: Record<string, any> = {
      transcripts: transcripts as any,
      emotionAnalysis: emotionAnalysis as any,
    };

    if (stage === 'video') {
      sessionUpdates.videoStatus = 'completed';
      sessionUpdates.videoCompletedAt = new Date();
      sessionUpdates.videoDuration = duration;
      sessionUpdates.status = 'completed';
    } else {
      sessionUpdates.voiceStatus = 'completed';
      sessionUpdates.status = session.videoStatus != null ? 'voice_completed' : 'completed';
      sessionUpdates.completedAt = new Date();
      sessionUpdates.duration = duration;
    }

    const updated = await storage.updateInterviewSession(tenantId, sessionId, sessionUpdates as any);
    if (!updated) return null;

    if (recordingUrl) {
      // Check for existing recording to prevent duplicates
      const existingRecordings = await storage.getInterviewRecordings(tenantId, sessionId, stage);
      if (existingRecordings.length > 0) {
        console.log(`[Interview] Recording already exists for session ${sessionId} stage ${stage}, skipping duplicate`);
      } else {
      let finalMediaUrl = recordingUrl;
      let finalStorageProvider = 'hume';
      let fileSize: number | null = null;

      // Download the recording from the provider and save locally
      // to avoid signed URL expiry issues
      try {
        console.log(`[Interview] Downloading recording from provider for session ${sessionId}...`);
        const response = await fetch(recordingUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = stage === 'video' ? 'mp4' : 'mp4';
          const filename = `${Date.now()}_${stage}.${ext}`;
          const { key, size } = await recordingStorage.uploadRecording(tenantId, sessionId, filename, buffer, `${stage === 'video' ? 'video' : 'audio'}/mp4`);
          finalMediaUrl = `/api/recordings/${key}`;
          finalStorageProvider = 'local';
          fileSize = size;
          console.log(`[Interview] Recording saved locally: ${key} (${size} bytes)`);
        } else {
          console.warn(`[Interview] Failed to download recording (${response.status}), storing signed URL as fallback`);
        }
      } catch (err) {
        console.warn(`[Interview] Error downloading recording, storing signed URL as fallback:`, err);
      }

      await storage.createInterviewRecording(tenantId, {
        sessionId,
        candidateId: session.candidateId || undefined,
        recordingType: stage === 'video' ? 'video' : 'audio',
        mediaUrl: finalMediaUrl,
        duration,
        storageProvider: finalStorageProvider,
        fileSize,
        interviewStage: stage,
      } as any);
      }
    }

    await this.saveTranscriptSegments(tenantId, sessionId, transcripts, stage);

    const analysis = await this.analyzeInterview(session, transcripts);

    const feedbackData = {
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
      interviewStage: stage,
    } as any;

    // Check for existing feedback for this stage to avoid duplicates (e.g. Tavus re-analysis)
    const existingFeedback = await storage.getInterviewFeedback(tenantId, sessionId, stage);
    let feedback;
    if (existingFeedback.length > 0 && existingFeedback[0].evaluatorType === 'ai' && !existingFeedback[0].isFinalized) {
      feedback = await storage.updateInterviewFeedback(tenantId, existingFeedback[0].id, feedbackData) || existingFeedback[0];
    } else {
      feedback = await storage.createInterviewFeedback(tenantId, feedbackData);
    }

    if (stage === 'video') {
      await storage.updateInterviewSession(tenantId, sessionId, {
        videoScore: analysis.overallScore,
      } as any);
    } else {
      await storage.updateInterviewSession(tenantId, sessionId, {
        overallScore: analysis.overallScore,
        feedback: analysis.rationale,
      });
    }

    await this.createTrainingEvent(tenantId, sessionId, session.candidateId, analysis);

    console.log(`[Interview] Session ${sessionId} ${stage} stage completed with score ${analysis.overallScore}`);
    return { session: updated, feedback };
  }

  private async saveTranscriptSegments(
    tenantId: string,
    sessionId: string,
    transcripts: TranscriptSegment[],
    stage: 'voice' | 'video' = 'voice'
  ): Promise<void> {
    const segments = transcripts.map((t, index) => ({
      sessionId,
      segmentIndex: index,
      speakerRole: t.role,
      text: t.text,
      startTime: t.timestamp != null && t.timestamp > 2147483647 ? Math.round(t.timestamp / 1000) : t.timestamp,
      sentiment: t.emotion,
      emotionScores: t.emotionScores,
      interviewStage: stage,
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

    if (!transcriptText.trim()) {
      console.warn('[Interview] No transcript text to analyze — returning default analysis');
      return this.getDefaultAnalysis();
    }

    console.log(`[Interview] Running AI analysis for ${session.jobTitle} (${transcripts.length} segments, ${transcriptText.length} chars)`);

    try {
      const response = await this.groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
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
        const analysis = JSON.parse(jsonMatch[0]) as InterviewAnalysis;
        console.log(`[Interview] AI analysis complete — score: ${analysis.overallScore}, decision: ${analysis.decision}`);
        return analysis;
      }
      console.warn('[Interview] AI response did not contain valid JSON:', content.substring(0, 200));
    } catch (error: any) {
      console.error('[Interview] Analysis error:', error?.message || error, error?.status ? `(HTTP ${error.status})` : '');
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

  async reanalyzeInterview(
    tenantId: string,
    sessionId: string,
    stage?: 'voice' | 'video'
  ): Promise<InterviewAnalysis | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    const transcripts = await storage.getInterviewTranscripts(tenantId, sessionId, stage);
    if (!transcripts || transcripts.length === 0) return null;

    const segments: TranscriptSegment[] = transcripts.map(t => ({
      role: t.speakerRole as 'candidate' | 'ai' | 'interviewer',
      text: t.text,
      timestamp: t.startTime ?? undefined,
      emotion: t.sentiment ?? undefined,
      emotionScores: t.emotionScores as Record<string, number> | undefined,
    }));

    const analysis = await this.analyzeInterview(session, segments);

    // Update existing feedback or create new
    const feedbackData = {
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
      interviewStage: stage,
    } as any;

    const existingFeedback = await storage.getInterviewFeedback(tenantId, sessionId, stage);
    if (existingFeedback.length > 0 && existingFeedback[0].evaluatorType === 'ai' && !existingFeedback[0].isFinalized) {
      await storage.updateInterviewFeedback(tenantId, existingFeedback[0].id, feedbackData);
    } else {
      feedbackData.sessionId = sessionId;
      feedbackData.candidateId = session.candidateId || undefined;
      await storage.createInterviewFeedback(tenantId, feedbackData);
    }

    if (stage === 'video') {
      await storage.updateInterviewSession(tenantId, sessionId, { videoScore: analysis.overallScore } as any);
    } else {
      await storage.updateInterviewSession(tenantId, sessionId, { overallScore: analysis.overallScore, feedback: analysis.rationale });
    }

    console.log(`[Interview] Re-analysis complete for ${sessionId} (${stage || 'all'}) — score: ${analysis.overallScore}`);
    return analysis;
  }

  async getInterviewDetails(tenantId: string, sessionId: string, stage?: 'voice' | 'video'): Promise<{
    session: InterviewSession;
    recordings: InterviewRecording[];
    transcripts: InterviewTranscript[];
    feedback: InterviewFeedback[];
  } | null> {
    const session = await storage.getInterviewSession(tenantId, sessionId);
    if (!session) return null;

    const [recordings, transcripts, feedback] = await Promise.all([
      storage.getInterviewRecordings(tenantId, sessionId, stage),
      storage.getInterviewTranscripts(tenantId, sessionId, stage),
      storage.getInterviewFeedback(tenantId, sessionId, stage),
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
      finalizedBy: userId === 'system' ? null : userId,
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
    const isAIStrategist = jobTitle.toLowerCase().includes('ai strategist') || jobTitle.toLowerCase().includes('ai strategy') || jobTitle.toLowerCase().includes('senior ai strategist');

    if (isAIStrategist) {
      return `You are a senior interviewer for MTN Human Capital conducting an in-depth screening interview for the position of ${jobTitle}.

TIME MANAGEMENT (STRICT — 25 MINUTES TOTAL):
- Your introduction must be under 20 seconds. Say your name, the company, the role, that it will take about 25 minutes, and ask your first question immediately.
- Ask the 5 main questions below with their follow-ups. Spend roughly 5 minutes per question area.
- YOUR responses between questions must be under 10 seconds — one brief acknowledgment sentence, then your next question.
- Do NOT summarize, paraphrase, or repeat what the candidate said. Move straight to the next question.

${this.getAIStrategistPrompt()}

TURN-TAKING RULES (CRITICAL):
- After asking a question, remain completely silent and wait. Do not speak again until the candidate has clearly finished their answer.
- Allow at least 3 seconds of silence before assuming the candidate is done speaking.
- If the candidate pauses mid-thought, wait up to 5 seconds before prompting them to continue or moving on.
- Never interrupt the candidate mid-sentence.

CLOSING THE INTERVIEW (CRITICAL):
- After you have asked all your questions and received answers, you MUST close the interview verbally.
- Say something like: "Thank you so much for your time today. I really enjoyed our conversation. The recruiting team will review your responses and be in touch with next steps soon. Have a great day!"
- After your closing statement, remain silent. Do NOT end the conversation or disconnect.

Start by introducing yourself briefly and warmly, explain the interview will take about 25 minutes, then ask your first question.`;
    }

    return `You are an HR interviewer for MTN Human Capital conducting a screening interview for the position of ${jobTitle}.

TIME MANAGEMENT (STRICT — 12 MINUTES TOTAL):
- Your introduction must be under 20 seconds. Do not ramble. Say your name, the company, the role, that it will take about 12 minutes, and ask your first question immediately.
- You have roughly 90 seconds per question (your question + candidate answer). Track this mentally.
- YOUR responses between questions must be under 10 seconds — one brief acknowledgment sentence, then your next question. Examples: "Great, thanks for sharing that." or "Interesting, that's helpful."
- Do NOT summarize, paraphrase, or repeat what the candidate said. Move straight to the next question.
- Ask 6–8 questions total. After question 5, if you sense time is running out, skip to your most important remaining question and then close.
- If a candidate's answer runs over 90 seconds, wait for a natural pause and gently redirect: "Thanks — let me move us along to the next question."

INTERVIEW GUIDELINES:
- Ask ONE question at a time. Keep questions short and direct (1–2 sentences max).
- Ask follow-up questions only when an answer is too vague to evaluate. Do not ask follow-ups out of curiosity.
- Prioritize high-value questions first so you cover them even if time runs short.
- Maintain a friendly, professional, and conversational tone.
- Keep transitions smooth and natural — avoid sounding scripted.

TURN-TAKING RULES (CRITICAL):
- After asking a question, remain completely silent and wait. Do not speak again until the candidate has clearly finished their answer.
- Allow at least 3 seconds of silence before assuming the candidate is done speaking.
- If the candidate pauses mid-thought, wait up to 5 seconds before prompting them to continue or moving on.
- Never interrupt the candidate mid-sentence.

CLOSING THE INTERVIEW (CRITICAL):
- After you have asked all your questions and received answers, you MUST close the interview verbally.
- Say something like: "Thank you so much for your time today. I really enjoyed our conversation. The recruiting team will review your responses and be in touch with next steps soon. Have a great day!"
- After your closing statement, remain silent. Do NOT end the conversation or disconnect. Wait for the candidate to say goodbye or end the call on their side.
- NEVER abruptly stop talking or disconnect. Always give a proper farewell.

Your objectives:
1. Assess the candidate's relevant experience and skills
2. Evaluate their problem-solving abilities
3. Understand their motivation and career goals
4. Determine cultural fit with the organization
5. Identify any potential concerns or red flags

Start by introducing yourself briefly and warmly, explain the interview will take about 12 minutes, then ask your first question.`;
  }

  private getAIStrategistPrompt(): string {
    return `INTERVIEW STRUCTURE (25-30 minutes, 5 questions with follow-ups):

1) AI SOLUTION ARCHITECTURE
Ask: "Describe your approach to designing an AI solution architecture for aligning technical solutions with business objectives, addressing regulatory constraints such as GDPR and other prevalent regulatory acts, and integrating AI into existing application workflows."
Follow-up I: "How do you balance model accuracy — both analytical models and GenAI models of choice — explainability, and integration with BSS/OSS domain, enterprise apps domain, and third-party integration, while adhering to regulatory requirements?"
Follow-up II: "Have you demonstrated Responsible AI in practice, and how was it achieved?"

2) AI PLATFORM ARCHITECTURE
Ask: "How would you design a scalable AI platform architecture to support diverse use cases — such as NLP chatbots, analytical models, and GenAI use cases — across a group of operating companies? Include considerations for AI landing zones, MLOps, LLMOps pipelines, and real-time data processing."

3) AI INFRASTRUCTURE ARCHITECTURE
Ask: "In a telecom environment with strict latency requirements, what infrastructure components would you prioritize for AI workloads? How do you ensure scalability and security while optimizing costs?"

4) AI PROGRAM GOVERNANCE
Ask: "Walk us through your framework for governing an AI portfolio with 20+ projects. How do you prioritize demands, mitigate risks such as bias, hallucinations, and data quality issues, and enforce ethical AI practices across geographically dispersed teams?"

5) AI VALUE REALIZATION
Ask: "Share an example where you quantified the ROI of an AI initiative in your AI Transformation Program."
Follow-up I: "How did you track metrics like cost savings, revenue uplift, or customer satisfaction, and how did you adjust the strategy post-deployment?"
Follow-up II: "Give your views on the construct of a value realization framework and reporting on the value impact — your approach pre and post AI implementation with a reference use case."`;
  }

  getTavusPrompt(jobTitle: string): string {
    const isAIStrategist = jobTitle.toLowerCase().includes('ai strategist') || jobTitle.toLowerCase().includes('ai strategy') || jobTitle.toLowerCase().includes('senior ai strategist');
    const roleSpecificQuestions = isAIStrategist ? this.getAIStrategistPrompt() : null;

    if (roleSpecificQuestions) {
      return `You are Charles Molapisi, Group Chief Technology and Information Officer (GCTIO) at MTN Group. You are conducting a professional interview for the ${jobTitle} position at MTN.

INTERVIEW STYLE:
- This is a senior strategic role — conduct a rigorous, in-depth interview
- You are personally invested in this hire as the GCTIO who will work closely with this person
- Ask the specific questions provided below — these have been carefully designed for this role
- Use follow-up questions to probe deeper into the candidate's expertise
- Evaluate both strategic thinking and hands-on technical depth

${roleSpecificQuestions}

GUIDELINES:
- Ask ONE question at a time and listen fully before responding
- Use the follow-up questions after the candidate answers the main question — do not skip them
- Keep your responses between questions brief — acknowledge their answer in one sentence, then move to the next question or follow-up
- Be warm but intellectually rigorous — push for specifics and real examples
- Never mention you are an AI — you are Charles Molapisi conducting this interview
- After all questions, close with a proper farewell: thank them for their time and let them know the team will follow up`;
    }

    return `You are Charles Molapisi, Group Chief Technology and Information Officer (GCTIO) at MTN Group. You are conducting a professional interview for the ${jobTitle} position at MTN.

INTERVIEW STYLE:
- Conduct a structured interview appropriate for a ${jobTitle} role
- Ask questions relevant to the specific role and its requirements
- Adapt your questioning level to match the seniority and nature of the position
- For entry-level/retail roles: focus on customer service, teamwork, reliability, and basic role-specific skills
- For technical roles: focus on technical knowledge, problem-solving, and relevant experience
- For management roles: focus on leadership, strategy, team management, and decision-making

INTERVIEW STRUCTURE (20-25 minutes, 5-6 questions):
1) Background & Motivation — Ask about their background and why they are interested in the ${jobTitle} position at MTN
2) Relevant Experience — Ask about their most relevant experience for this specific role
3) Role-Specific Scenario — Present a realistic scenario they would face as a ${jobTitle} and ask how they would handle it
4) Skills & Competencies — Ask about specific skills needed for the ${jobTitle} role
5) Cultural Fit & Values — Ask about teamwork, integrity, or how they align with MTN's values
6) Closing Question — Ask if they have any questions about the role or MTN

GUIDELINES:
- Ask ONE question at a time and listen fully before responding
- Keep your responses between questions brief — acknowledge their answer in one sentence, then move to the next question
- Be warm, professional, and encouraging
- Never mention you are an AI — you are Charles Molapisi conducting this interview
- After all questions, close with a proper farewell: thank them for their time and let them know the team will follow up`;
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
