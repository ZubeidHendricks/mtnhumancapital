/**
 * Transcript Analysis Agent
 * Post-interview re-analysis using LeMUR-style Q&A, auto-tagging,
 * and timeline generation for ViTT system
 */

import Groq from "groq-sdk";
import { storage } from "./storage";
import type {
  InterviewSession,
  InterviewTranscript,
  InterviewTimelineTag,
  LemurAnalysisResult,
} from "@shared/schema";

interface AnalysisConfig {
  sessionId: string;
  tenantId: string;
  userId?: string;
  stage?: string;
}

interface QAResult {
  question: string;
  answer: string;
  confidence: number;
  relevantSegments: { startMs: number; endMs: number; text: string }[];
}

interface AutoTagResult {
  tags: {
    offsetMs: number;
    endOffsetMs?: number;
    tagType: string;
    category: string;
    label: string;
    description: string;
    importance: number;
    confidence: number;
    snippet: string;
  }[];
}

export class TranscriptAnalysisAgent {
  private groq: Groq | null = null;

  constructor() {
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
  }

  /**
   * LeMUR-style Q&A: Ask questions about the interview transcript
   */
  async askQuestion(config: AnalysisConfig, question: string): Promise<QAResult> {
    if (!this.groq) throw new Error("Groq API not configured");

    const transcripts = await storage.getInterviewTranscripts(config.tenantId, config.sessionId, config.stage);
    const session = await storage.getInterviewSession(config.tenantId, config.sessionId);

    if (!transcripts.length) throw new Error("No transcripts found for this session");

    const transcriptText = transcripts
      .map(t => `[${this.formatMs(t.startTime || 0)}] ${(t.speakerRole || '').toUpperCase()}: ${t.text}`)
      .join("\n");

    const response = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert interview analyst. You have the complete transcript of a ${session?.interviewType || 'voice'} interview for the position of "${session?.jobTitle || 'Unknown'}".

Answer the user's question based ONLY on the transcript content. Include specific timestamps [MM:SS] when referencing moments.

Respond in JSON format:
{
  "answer": "your detailed answer",
  "confidence": 0.0-1.0,
  "relevantTimestamps": [{"startMs": number, "endMs": number, "text": "relevant quote"}]
}

Return ONLY valid JSON.`,
        },
        {
          role: "user",
          content: `TRANSCRIPT:\n${transcriptText}\n\nQUESTION: ${question}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let parsed: any = { answer: content, confidence: 0.5, relevantTimestamps: [] };

    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    // Save to DB
    await storage.createLemurAnalysisResult(config.tenantId, {
      sessionId: config.sessionId,
      analysisType: "qa",
      question,
      answer: parsed.answer,
      structuredResult: parsed,
      confidence: parsed.confidence,
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      requestedBy: config.userId,
    });

    return {
      question,
      answer: parsed.answer,
      confidence: parsed.confidence,
      relevantSegments: parsed.relevantTimestamps || [],
    };
  }

  /**
   * Generate a structured summary of the interview
   */
  async generateSummary(config: AnalysisConfig): Promise<string> {
    if (!this.groq) throw new Error("Groq API not configured");

    const transcripts = await storage.getInterviewTranscripts(config.tenantId, config.sessionId, config.stage);
    const session = await storage.getInterviewSession(config.tenantId, config.sessionId);

    const transcriptText = transcripts
      .map(t => `[${this.formatMs(t.startTime || 0)}] ${(t.speakerRole || '').toUpperCase()}: ${t.text}`)
      .join("\n");

    const response = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Summarize this ${session?.interviewType || 'voice'} interview for "${session?.jobTitle || 'a position'}". Include:
1. Key discussion topics with timestamps
2. Candidate's main strengths demonstrated
3. Areas of concern or weakness
4. Notable moments (positive and negative)
5. Overall impression

Be specific and reference timestamps [MM:SS].`,
        },
        { role: "user", content: transcriptText },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const summary = response.choices[0]?.message?.content || "Unable to generate summary.";

    await storage.createLemurAnalysisResult(config.tenantId, {
      sessionId: config.sessionId,
      analysisType: "summary",
      answer: summary,
      confidence: 0.8,
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      requestedBy: config.userId,
    });

    return summary;
  }

  /**
   * Extract action items and follow-up questions from the interview
   */
  async extractActionItems(config: AnalysisConfig): Promise<{ items: string[]; followUpQuestions: string[] }> {
    if (!this.groq) throw new Error("Groq API not configured");

    const transcripts = await storage.getInterviewTranscripts(config.tenantId, config.sessionId, config.stage);

    const transcriptText = transcripts
      .map(t => `${(t.speakerRole || '').toUpperCase()}: ${t.text}`)
      .join("\n");

    const response = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Analyze this interview transcript and extract:
1. Action items (things to verify, follow up on, or investigate)
2. Suggested follow-up questions for the next interview round

Respond in JSON: { "actionItems": ["item1", ...], "followUpQuestions": ["question1", ...] }
Return ONLY valid JSON.`,
        },
        { role: "user", content: transcriptText },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result = { actionItems: [] as string[], followUpQuestions: [] as string[] };

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    await storage.createLemurAnalysisResult(config.tenantId, {
      sessionId: config.sessionId,
      analysisType: "action_items",
      answer: JSON.stringify(result),
      structuredResult: result,
      confidence: 0.75,
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      requestedBy: config.userId,
    });

    return { items: result.actionItems, followUpQuestions: result.followUpQuestions };
  }

  /**
   * Auto-tag key moments in the transcript using AI analysis
   */
  async autoTagTranscript(config: AnalysisConfig): Promise<AutoTagResult> {
    if (!this.groq) throw new Error("Groq API not configured");

    const transcripts = await storage.getInterviewTranscripts(config.tenantId, config.sessionId, config.stage);
    const session = await storage.getInterviewSession(config.tenantId, config.sessionId);

    const transcriptText = transcripts
      .map(t => `[${t.startTime || 0}s] ${(t.speakerRole || '').toUpperCase()}: ${t.text}`)
      .join("\n");

    const response = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are analyzing an interview transcript for "${session?.jobTitle || 'a position'}". Identify key moments that should be tagged on a timeline.

Tag types: question, answer, highlight, concern, topic_shift
Categories: technical, behavioral, communication, emotion, red_flag, positive_signal

For each tag, provide the timestamp (in seconds from the transcript), type, category, and a short label.

Respond in JSON:
{
  "tags": [
    {
      "offsetMs": <number from transcript timestamps>,
      "endOffsetMs": <optional end ms>,
      "tagType": "question|answer|highlight|concern|topic_shift",
      "category": "technical|behavioral|communication|emotion|red_flag|positive_signal",
      "label": "short label",
      "description": "why this moment matters",
      "importance": 1-10,
      "confidence": 0.0-1.0,
      "snippet": "brief quote"
    }
  ]
}

Focus on the most significant 10-15 moments. Return ONLY valid JSON.`,
        },
        { role: "user", content: transcriptText },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result: AutoTagResult = { tags: [] };

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    // Save tags to DB
    const baseTime = new Date();
    for (const tag of result.tags) {
      await storage.createTimelineTag(config.tenantId, {
        sessionId: config.sessionId,
        tagTime: new Date(baseTime.getTime() + (tag.offsetMs || 0)),
        offsetMs: tag.offsetMs || 0,
        endOffsetMs: tag.endOffsetMs,
        duration: tag.endOffsetMs ? tag.endOffsetMs - tag.offsetMs : undefined,
        tagType: tag.tagType,
        tagSource: "ai_reanalysis",
        category: tag.category,
        label: tag.label,
        description: tag.description,
        snippet: tag.snippet,
        confidence: tag.confidence,
        importance: tag.importance,
        aiScore: tag.confidence,
        createdBy: config.userId,
      });
    }

    console.log(`[AnalysisAgent] Generated ${result.tags.length} auto-tags for session ${config.sessionId}`);
    return result;
  }

  /**
   * Generate sentiment timeline from transcript
   */
  async generateSentimentTimeline(config: AnalysisConfig): Promise<{ timeline: { startMs: number; endMs: number; sentiment: string; score: number; text: string }[] }> {
    if (!this.groq) throw new Error("Groq API not configured");

    const transcripts = await storage.getInterviewTranscripts(config.tenantId, config.sessionId, config.stage);

    const transcriptText = transcripts
      .map(t => `[${t.startTime || 0}s-${t.endTime || 0}s] ${(t.speakerRole || '').toUpperCase()}: ${t.text}`)
      .join("\n");

    const response = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Analyze the sentiment of each segment in this interview transcript. Rate each on a scale from -1.0 (very negative) to 1.0 (very positive).

Respond in JSON:
{
  "timeline": [
    { "startMs": number, "endMs": number, "sentiment": "positive|negative|neutral", "score": -1.0 to 1.0, "text": "brief excerpt" }
  ]
}

Return ONLY valid JSON.`,
        },
        { role: "user", content: transcriptText },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result: any = { timeline: [] };

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    await storage.createLemurAnalysisResult(config.tenantId, {
      sessionId: config.sessionId,
      analysisType: "sentiment_timeline",
      answer: JSON.stringify(result),
      structuredResult: result,
      confidence: 0.7,
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      requestedBy: config.userId,
    });

    return result;
  }

  /**
   * Full re-analysis: run all analyses and generate comprehensive tags
   */
  async fullReanalysis(config: AnalysisConfig): Promise<{
    summary: string;
    actionItems: { items: string[]; followUpQuestions: string[] };
    tags: AutoTagResult;
    sentimentTimeline: any;
  }> {
    const [summary, actionItems, tags, sentimentTimeline] = await Promise.all([
      this.generateSummary(config),
      this.extractActionItems(config),
      this.autoTagTranscript(config),
      this.generateSentimentTimeline(config),
    ]);

    return { summary, actionItems, tags, sentimentTimeline };
  }

  /**
   * Get all previous analysis results for a session
   */
  async getAnalysisHistory(tenantId: string, sessionId: string): Promise<LemurAnalysisResult[]> {
    return storage.getLemurAnalysisResults(tenantId, sessionId);
  }

  private formatMs(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  isConfigured(): boolean {
    return !!this.groq;
  }
}

export const transcriptAnalysisAgent = new TranscriptAnalysisAgent();
