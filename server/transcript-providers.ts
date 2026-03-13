/**
 * Multi-Provider Transcript Engine
 * Supports AssemblyAI, Deepgram, Whisper (via Groq), and enhanced Hume
 * Each provider transcribes interview recordings and returns timestamped segments
 */

import Groq from "groq-sdk";
import axios from "axios";
import { storage } from "./storage";
import type { TranscriptJob, InterviewTimelineTag } from "@shared/schema";

// Unified transcript segment format across all providers
export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  speaker: string; // 'candidate', 'interviewer', 'ai', 'speaker_0', etc.
  confidence: number;
  words?: { text: string; startMs: number; endMs: number; confidence: number }[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  emotionScores?: Record<string, number>;
  topics?: string[];
  keywords?: string[];
}

export interface TranscriptResult {
  provider: string;
  segments: TranscriptSegment[];
  summary?: string;
  topics?: string[];
  highlights?: { text: string; startMs: number; endMs: number; rank: number }[];
  sentimentTimeline?: { startMs: number; endMs: number; sentiment: string; score: number }[];
  wordCount: number;
  speakerCount: number;
  totalDurationMs: number;
  averageConfidence: number;
  rawResponse?: any;
}

// Base interface all providers implement
interface TranscriptProvider {
  name: string;
  transcribe(audioUrl: string, config: TranscriptJobConfig): Promise<TranscriptResult>;
  checkStatus?(jobId: string): Promise<{ status: string; progress: number }>;
}

interface TranscriptJobConfig {
  language?: string;
  speakerDiarization?: boolean;
  sentimentAnalysis?: boolean;
  entityDetection?: boolean;
  topicDetection?: boolean;
  autoHighlights?: boolean;
  customVocabulary?: string[];
}

// ==================== AssemblyAI Provider ====================
class AssemblyAIProvider implements TranscriptProvider {
  name = "assemblyai";
  private apiKey: string;
  private baseUrl = "https://api.assemblyai.com/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioUrl: string, config: TranscriptJobConfig): Promise<TranscriptResult> {
    // Submit transcription job
    const submitResponse = await axios.post(
      `${this.baseUrl}/transcript`,
      {
        audio_url: audioUrl,
        language_code: config.language || "en",
        speaker_labels: config.speakerDiarization !== false,
        sentiment_analysis: config.sentimentAnalysis !== false,
        entity_detection: config.entityDetection || false,
        iab_categories: config.topicDetection !== false,
        auto_highlights: config.autoHighlights !== false,
        word_boost: config.customVocabulary || [],
      },
      { headers: { authorization: this.apiKey } }
    );

    const transcriptId = submitResponse.data.id;

    // Poll for completion
    let result: any;
    while (true) {
      const pollResponse = await axios.get(
        `${this.baseUrl}/transcript/${transcriptId}`,
        { headers: { authorization: this.apiKey } }
      );
      result = pollResponse.data;

      if (result.status === "completed") break;
      if (result.status === "error") throw new Error(`AssemblyAI error: ${result.error}`);

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Map utterances to segments
    const segments: TranscriptSegment[] = (result.utterances || []).map((u: any) => ({
      text: u.text,
      startMs: u.start,
      endMs: u.end,
      speaker: this.mapSpeaker(u.speaker),
      confidence: u.confidence,
      words: (u.words || []).map((w: any) => ({
        text: w.text,
        startMs: w.start,
        endMs: w.end,
        confidence: w.confidence,
      })),
    }));

    // Add sentiment if available
    if (result.sentiment_analysis_results) {
      for (const s of result.sentiment_analysis_results) {
        const seg = segments.find(seg => seg.startMs <= s.start && seg.endMs >= s.end);
        if (seg) seg.sentiment = s.sentiment.toLowerCase() as any;
      }
    }

    // Extract topics
    const topics = result.iab_categories_result?.summary
      ? Object.keys(result.iab_categories_result.summary).slice(0, 10)
      : [];

    // Extract highlights
    const highlights = (result.auto_highlights_result?.results || []).map((h: any) => ({
      text: h.text,
      startMs: h.timestamps?.[0]?.start || 0,
      endMs: h.timestamps?.[0]?.end || 0,
      rank: h.rank,
    }));

    const totalDuration = segments.length > 0 ? segments[segments.length - 1].endMs : 0;

    return {
      provider: this.name,
      segments,
      topics,
      highlights,
      summary: result.summary || undefined,
      wordCount: result.words?.length || 0,
      speakerCount: new Set(segments.map(s => s.speaker)).size,
      totalDurationMs: totalDuration,
      averageConfidence: result.confidence || 0,
      rawResponse: result,
    };
  }

  async checkStatus(jobId: string): Promise<{ status: string; progress: number }> {
    const response = await axios.get(
      `${this.baseUrl}/transcript/${jobId}`,
      { headers: { authorization: this.apiKey } }
    );
    const statusMap: Record<string, number> = {
      queued: 10, processing: 50, completed: 100, error: 0,
    };
    return {
      status: response.data.status,
      progress: statusMap[response.data.status] || 0,
    };
  }

  private mapSpeaker(speaker: string): string {
    // AssemblyAI uses 'A', 'B', etc.
    const map: Record<string, string> = { A: "candidate", B: "interviewer" };
    return map[speaker] || `speaker_${speaker.toLowerCase()}`;
  }
}

// ==================== Deepgram Provider ====================
class DeepgramProvider implements TranscriptProvider {
  name = "deepgram";
  private apiKey: string;
  private baseUrl = "https://api.deepgram.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioUrl: string, config: TranscriptJobConfig): Promise<TranscriptResult> {
    const params = new URLSearchParams({
      model: "nova-2",
      language: config.language || "en",
      smart_format: "true",
      diarize: String(config.speakerDiarization !== false),
      detect_topics: String(config.topicDetection !== false),
      sentiment: String(config.sentimentAnalysis !== false),
      utterances: "true",
      punctuate: "true",
    });

    if (config.customVocabulary?.length) {
      params.set("keywords", config.customVocabulary.join(","));
    }

    const response = await axios.post(
      `${this.baseUrl}/listen?${params.toString()}`,
      { url: audioUrl },
      {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data.results;
    const utterances = result.utterances || [];

    const segments: TranscriptSegment[] = utterances.map((u: any) => ({
      text: u.transcript,
      startMs: Math.round(u.start * 1000),
      endMs: Math.round(u.end * 1000),
      speaker: this.mapSpeaker(u.speaker),
      confidence: u.confidence,
      words: (u.words || []).map((w: any) => ({
        text: w.punctuated_word || w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
        confidence: w.confidence,
      })),
    }));

    // Extract topics from channel results
    const topics: string[] = [];
    if (result.channels?.[0]?.alternatives?.[0]?.topics) {
      for (const topicGroup of result.channels[0].alternatives[0].topics) {
        topics.push(...topicGroup.topics.map((t: any) => t.topic));
      }
    }

    const totalDuration = segments.length > 0 ? segments[segments.length - 1].endMs : 0;
    const avgConfidence =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
        : 0;

    return {
      provider: this.name,
      segments,
      topics: [...new Set(topics)].slice(0, 10),
      wordCount: result.channels?.[0]?.alternatives?.[0]?.words?.length || 0,
      speakerCount: new Set(segments.map(s => s.speaker)).size,
      totalDurationMs: totalDuration,
      averageConfidence: avgConfidence,
      rawResponse: response.data,
    };
  }

  private mapSpeaker(speaker: number): string {
    return speaker === 0 ? "candidate" : speaker === 1 ? "interviewer" : `speaker_${speaker}`;
  }
}

// ==================== Whisper Provider (via Groq) ====================
class WhisperProvider implements TranscriptProvider {
  name = "whisper";
  private groq: Groq;

  constructor(apiKey: string) {
    this.groq = new Groq({ apiKey });
  }

  async transcribe(audioUrl: string, config: TranscriptJobConfig): Promise<TranscriptResult> {
    // Download audio to buffer for Groq Whisper API
    const audioResponse = await axios.get(audioUrl, { responseType: "arraybuffer" });
    const audioBuffer = Buffer.from(audioResponse.data);

    // Create a File-like object for the Groq SDK
    const file = new File([audioBuffer], "interview.webm", { type: "audio/webm" });

    const transcription = await this.groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: config.language || "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"],
    });

    const result = transcription as any;
    const whisperSegments = result.segments || [];

    const segments: TranscriptSegment[] = whisperSegments.map((s: any, i: number) => ({
      text: s.text.trim(),
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      speaker: i % 2 === 0 ? "candidate" : "interviewer", // Simple alternation (no diarization in Whisper)
      confidence: s.avg_logprob ? Math.exp(s.avg_logprob) : 0.85,
      words: (s.words || []).map((w: any) => ({
        text: w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
        confidence: 0.85,
      })),
    }));

    const totalDuration = segments.length > 0 ? segments[segments.length - 1].endMs : 0;
    const wordCount = segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);

    return {
      provider: this.name,
      segments,
      wordCount,
      speakerCount: 2, // Whisper doesn't do diarization natively
      totalDurationMs: totalDuration,
      averageConfidence: 0.85,
      rawResponse: result,
    };
  }
}

// ==================== Enhanced Hume Provider ====================
class HumeProvider implements TranscriptProvider {
  name = "hume";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioUrl: string, config: TranscriptJobConfig): Promise<TranscriptResult> {
    // Submit to Hume batch API for prosody + language analysis
    const submitResponse = await axios.post(
      "https://api.hume.ai/v0/batch/jobs",
      {
        urls: [audioUrl],
        models: {
          prosody: {
            granularity: "utterance",
            identify_speakers: config.speakerDiarization !== false,
          },
          language: {
            granularity: "sentence",
            identify_speakers: config.speakerDiarization !== false,
          },
        },
      },
      {
        headers: {
          "X-Hume-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const jobId = submitResponse.data.job_id;

    // Poll for completion
    let result: any;
    while (true) {
      const pollResponse = await axios.get(
        `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
        { headers: { "X-Hume-Api-Key": this.apiKey } }
      );

      if (pollResponse.status === 200) {
        result = pollResponse.data;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Parse Hume predictions into segments
    const predictions = result?.[0]?.results?.predictions?.[0]?.models || {};
    const prosodyResults = predictions.prosody?.grouped_predictions || [];
    const languageResults = predictions.language?.grouped_predictions || [];

    const segments: TranscriptSegment[] = [];
    let offsetMs = 0;

    for (const group of prosodyResults) {
      for (const pred of group.predictions || []) {
        const emotionScores: Record<string, number> = {};
        let dominantEmotion = "";
        let maxScore = 0;

        for (const emotion of pred.emotions || []) {
          emotionScores[emotion.name] = emotion.score;
          if (emotion.score > maxScore) {
            maxScore = emotion.score;
            dominantEmotion = emotion.name;
          }
        }

        const durationMs = Math.round((pred.time?.end || 0) * 1000 - (pred.time?.begin || 0) * 1000);
        const startMs = Math.round((pred.time?.begin || 0) * 1000);
        const endMs = Math.round((pred.time?.end || 0) * 1000);

        segments.push({
          text: pred.text || "",
          startMs,
          endMs,
          speaker: pred.speaker_id ? `speaker_${pred.speaker_id}` : "candidate",
          confidence: maxScore,
          emotionScores,
          sentiment: this.emotionToSentiment(dominantEmotion),
        });

        offsetMs = endMs;
      }
    }

    // Merge language results for topic extraction
    const allText = segments.map(s => s.text).join(" ");
    const keywords = this.extractKeywords(allText);

    return {
      provider: this.name,
      segments,
      topics: keywords.slice(0, 5),
      wordCount: allText.split(/\s+/).length,
      speakerCount: new Set(segments.map(s => s.speaker)).size,
      totalDurationMs: offsetMs,
      averageConfidence: segments.length > 0
        ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
        : 0,
      rawResponse: result,
    };
  }

  private emotionToSentiment(emotion: string): 'positive' | 'negative' | 'neutral' {
    const positive = ['joy', 'amusement', 'excitement', 'interest', 'admiration', 'gratitude', 'love', 'pride', 'satisfaction', 'triumph'];
    const negative = ['anger', 'contempt', 'disgust', 'fear', 'sadness', 'shame', 'distress', 'anxiety', 'guilt', 'horror'];
    if (positive.includes(emotion.toLowerCase())) return 'positive';
    if (negative.includes(emotion.toLowerCase())) return 'negative';
    return 'neutral';
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove stop words, find frequent terms
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'and', 'but', 'or', 'not', 'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'up', 'out', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from']);
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 10);
  }
}

// ==================== Provider Manager ====================
export class TranscriptProviderManager {
  private providers: Map<string, TranscriptProvider> = new Map();

  constructor() {
    this.initProviders();
  }

  private initProviders() {
    if (process.env.ASSEMBLYAI_API_KEY) {
      this.providers.set("assemblyai", new AssemblyAIProvider(process.env.ASSEMBLYAI_API_KEY));
      console.log("[TranscriptProviders] AssemblyAI configured");
    }
    if (process.env.DEEPGRAM_API_KEY) {
      this.providers.set("deepgram", new DeepgramProvider(process.env.DEEPGRAM_API_KEY));
      console.log("[TranscriptProviders] Deepgram configured");
    }
    if (process.env.GROQ_API_KEY) {
      this.providers.set("whisper", new WhisperProvider(process.env.GROQ_API_KEY));
      console.log("[TranscriptProviders] Whisper (Groq) configured");
    }
    if (process.env.HUME_API_KEY) {
      this.providers.set("hume", new HumeProvider(process.env.HUME_API_KEY));
      console.log("[TranscriptProviders] Hume configured");
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isProviderAvailable(provider: string): boolean {
    return this.providers.has(provider);
  }

  /**
   * Run transcription with a specific provider, save results to DB
   */
  async transcribeWithProvider(
    tenantId: string,
    jobId: string,
    audioUrl: string,
    provider: string,
    config: TranscriptJobConfig = {}
  ): Promise<TranscriptResult> {
    const transcriptProvider = this.providers.get(provider);
    if (!transcriptProvider) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    // Update job status to processing
    await storage.updateTranscriptJob(tenantId, jobId, {
      status: "processing",
      startedAt: new Date(),
    });

    try {
      const result = await transcriptProvider.transcribe(audioUrl, config);

      // Save transcript segments to DB
      const job = await storage.getTranscriptJob(tenantId, jobId);
      if (job) {
        const segments = result.segments.map((seg, index) => ({
          sessionId: job.sessionId,
          recordingId: job.recordingId || undefined,
          segmentIndex: index,
          speakerRole: seg.speaker,
          text: seg.text,
          startTime: seg.startMs,
          endTime: seg.endMs,
          confidence: Math.round(seg.confidence * 100),
          sentiment: seg.sentiment,
          emotionScores: seg.emotionScores,
          keywords: seg.keywords,
          language: config.language || "en",
        }));

        await storage.createInterviewTranscriptsBatch(tenantId, segments);
      }

      // Update job with results
      await storage.updateTranscriptJob(tenantId, jobId, {
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        wordCount: result.wordCount,
        segmentCount: result.segments.length,
        speakerCount: result.speakerCount,
        totalDurationMs: result.totalDurationMs,
        averageConfidence: result.averageConfidence,
      });

      return result;
    } catch (error: any) {
      await storage.updateTranscriptJob(tenantId, jobId, {
        status: "failed",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Run transcription across all configured providers in parallel
   */
  async transcribeWithAllProviders(
    tenantId: string,
    sessionId: string,
    audioUrl: string,
    config: TranscriptJobConfig = {}
  ): Promise<{ provider: string; jobId: string; result?: TranscriptResult; error?: string }[]> {
    const results: { provider: string; jobId: string; result?: TranscriptResult; error?: string }[] = [];

    const providers = this.getAvailableProviders();

    // Create jobs for each provider
    const jobs = await Promise.all(
      providers.map(async (provider) => {
        const job = await storage.createTranscriptJob(tenantId, {
          sessionId,
          provider,
          status: "pending",
          language: config.language || "en",
          enableSpeakerDiarization: config.speakerDiarization !== false ? 1 : 0,
          enableSentimentAnalysis: config.sentimentAnalysis !== false ? 1 : 0,
          enableTopicDetection: config.topicDetection !== false ? 1 : 0,
          enableAutoHighlights: config.autoHighlights !== false ? 1 : 0,
          customVocabulary: config.customVocabulary,
          submittedAt: new Date(),
        });
        return { provider, jobId: job.id };
      })
    );

    // Run transcriptions in parallel
    await Promise.allSettled(
      jobs.map(async ({ provider, jobId }) => {
        try {
          const result = await this.transcribeWithProvider(tenantId, jobId, audioUrl, provider, config);
          results.push({ provider, jobId, result });
        } catch (error: any) {
          results.push({ provider, jobId, error: error.message });
        }
      })
    );

    return results;
  }

  /**
   * Generate timeline tags from transcript results
   */
  async generateTimelineTags(
    tenantId: string,
    sessionId: string,
    result: TranscriptResult,
    recordingId?: string,
    interviewStage?: string
  ): Promise<void> {
    const tags: any[] = [];
    const baseTime = new Date();

    // Tag emotions (from Hume)
    for (const seg of result.segments) {
      if (seg.emotionScores) {
        const dominant = Object.entries(seg.emotionScores).sort(([, a], [, b]) => b - a)[0];
        if (dominant && dominant[1] > 0.5) {
          tags.push({
            sessionId,
            recordingId,
            tagTime: new Date(baseTime.getTime() + seg.startMs),
            offsetMs: seg.startMs,
            endOffsetMs: seg.endMs,
            duration: seg.endMs - seg.startMs,
            tagType: "auto_emotion",
            tagSource: result.provider,
            category: "emotion",
            label: dominant[0],
            snippet: seg.text.slice(0, 200),
            confidence: dominant[1],
            emotionScores: seg.emotionScores,
            dominantEmotion: dominant[0],
            speakerRole: seg.speaker,
            importance: dominant[1] > 0.8 ? 8 : dominant[1] > 0.6 ? 6 : 4,
            aiScore: dominant[1],
          });
        }
      }

      // Tag sentiment shifts
      if (seg.sentiment && seg.sentiment !== "neutral") {
        tags.push({
          sessionId,
          recordingId,
          tagTime: new Date(baseTime.getTime() + seg.startMs),
          offsetMs: seg.startMs,
          endOffsetMs: seg.endMs,
          duration: seg.endMs - seg.startMs,
          tagType: "auto_sentiment",
          tagSource: result.provider,
          category: seg.sentiment === "negative" ? "red_flag" : "positive_signal",
          label: `${seg.sentiment} sentiment`,
          snippet: seg.text.slice(0, 200),
          confidence: seg.confidence,
          sentimentScore: seg.sentiment === "positive" ? 0.7 : -0.7,
          speakerRole: seg.speaker,
          importance: seg.sentiment === "negative" ? 7 : 5,
        });
      }
    }

    // Tag highlights
    if (result.highlights) {
      for (const h of result.highlights) {
        tags.push({
          sessionId,
          recordingId,
          tagTime: new Date(baseTime.getTime() + h.startMs),
          offsetMs: h.startMs,
          endOffsetMs: h.endMs,
          duration: h.endMs - h.startMs,
          tagType: "auto_keyword",
          tagSource: result.provider,
          category: "topic_shift",
          label: h.text.slice(0, 50),
          snippet: h.text,
          confidence: h.rank,
          importance: Math.min(10, Math.round(h.rank * 10)),
          aiScore: h.rank,
        });
      }
    }

    // Tag topic changes
    if (result.topics) {
      for (const topic of result.topics.slice(0, 5)) {
        tags.push({
          sessionId,
          recordingId,
          tagTime: baseTime,
          offsetMs: 0,
          tagType: "auto_topic",
          tagSource: result.provider,
          category: "technical",
          label: topic,
          topics: [topic],
          importance: 5,
        });
      }
    }

    // Batch create tags
    for (const tag of tags) {
      await storage.createTimelineTag(tenantId, { ...tag, interviewStage });
    }

    console.log(`[TranscriptProviders] Generated ${tags.length} timeline tags for session ${sessionId}`);
  }

  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const name of ["assemblyai", "deepgram", "whisper", "hume"]) {
      status[name] = this.providers.has(name);
    }
    return status;
  }
}

export const transcriptProviderManager = new TranscriptProviderManager();
