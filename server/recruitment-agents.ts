import { groqResearchService } from "./groq-service";
import Groq from "groq-sdk";
import type { Job, Candidate, InsertCandidate } from "@shared/schema";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface JobRequirements {
  title: string;
  skills: string[];
  experience: string;
  location: string;
  keywords: string[];
  searchQuery: string;
}

export interface CandidateProfile {
  name: string;
  currentRole: string;
  company?: string;
  location?: string;
  skills: string[];
  experience?: string;
  match: number;
  source: string;
  email?: string;
  phone?: string;
  rawData: Record<string, any>;
}

export class RecruitmentAgents {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      console.warn("⚠ GROQ_API_KEY not set - recruitment agents will fail");
    }
  }

  async analyzeJobRequirements(job: Job): Promise<JobRequirements> {
    console.log(`Analyzing job requirements for: ${job.title}`);

    const prompt = `Analyze this job posting and extract structured recruitment search criteria:

Job Title: ${job.title}
Department: ${job.department}
Location: ${job.location || 'Not specified'}
Description: ${job.description || 'Not provided'}

Extract and return JSON with:
{
  "title": "<normalized job title>",
  "skills": ["<key skill 1>", "<key skill 2>", ...],
  "experience": "<experience level required>",
  "location": "<location>",
  "keywords": ["<search keyword 1>", "<search keyword 2>", ...],
  "searchQuery": "<optimized LinkedIn/job board search query>"
}

Focus on South African market. Include relevant synonyms and variations.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert recruitment analyst. Extract precise search criteria from job postings for candidate sourcing."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || "";
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || job.title,
          skills: parsed.skills || [],
          experience: parsed.experience || "Any",
          location: parsed.location || job.location || "South Africa",
          keywords: parsed.keywords || [],
          searchQuery: parsed.searchQuery || job.title,
        };
      }
    } catch (error) {
      console.error("Error analyzing job:", error);
    }

    // Fallback
    return {
      title: job.title,
      skills: [],
      experience: "Any",
      location: job.location || "South Africa",
      keywords: [job.title, job.department],
      searchQuery: `${job.title} ${job.location || 'South Africa'}`,
    };
  }

  async searchCandidates(requirements: JobRequirements, limit: number = 20): Promise<CandidateProfile[]> {
    console.log(`Searching for candidates: ${requirements.searchQuery}`);

    const prompt = `You are a recruitment sourcing AI agent. Generate a list of realistic South African candidate profiles matching these requirements:

Job Requirements:
- Title: ${requirements.title}
- Skills: ${requirements.skills.join(', ')}
- Experience: ${requirements.experience}
- Location: ${requirements.location}
- Keywords: ${requirements.keywords.join(', ')}

Generate ${limit} realistic candidate profiles. For each candidate, provide:
{
  "name": "<realistic South African name>",
  "currentRole": "<current job title>",
  "company": "<realistic SA company>",
  "location": "<SA location>",
  "skills": ["<skill1>", "<skill2>", ...],
  "experience": "<years and details>",
  "match": <0-100 match score>,
  "email": "<realistic professional email>",
  "phone": "<realistic South African mobile number starting with +27 or 0>",
  "linkedInProfile": "<simulated profile summary>"
}

Return as JSON array. Make profiles diverse and realistic for South African job market.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an AI recruitment sourcing agent that generates realistic candidate profiles based on job requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content || "";
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((candidate: any) => ({
          name: candidate.name,
          currentRole: candidate.currentRole,
          company: candidate.company,
          location: candidate.location,
          skills: candidate.skills || [],
          experience: candidate.experience,
          match: candidate.match || 50,
          source: "AI Sourced - LinkedIn Simulation",
          email: candidate.email || undefined,
          phone: candidate.phone || undefined,
          rawData: candidate,
        }));
      }
    } catch (error) {
      console.error("Error searching candidates:", error);
    }

    return [];
  }

  async rankCandidate(candidate: CandidateProfile, job: Job, requirements: JobRequirements): Promise<{ match: number; reasoning: string }> {
    const prompt = `Score this candidate against the job requirements:

Candidate:
- Name: ${candidate.name}
- Role: ${candidate.currentRole}
- Company: ${candidate.company || 'N/A'}
- Location: ${candidate.location || 'N/A'}
- Skills: ${candidate.skills.join(', ')}
- Experience: ${candidate.experience || 'N/A'}

Job Requirements:
- Title: ${requirements.title}
- Required Skills: ${requirements.skills.join(', ')}
- Experience: ${requirements.experience}
- Location: ${requirements.location}

Provide:
{
  "match": <0-100 score>,
  "reasoning": "<brief explanation of match score>"
}`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert recruiter. Score candidates objectively against job requirements."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || "";
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          match: Math.min(100, Math.max(0, parsed.match || 50)),
          reasoning: parsed.reasoning || "AI-based match score",
        };
      }
    } catch (error) {
      console.error("Error ranking candidate:", error);
    }

    return { match: candidate.match || 50, reasoning: "Default scoring" };
  }
}

export const recruitmentAgents = new RecruitmentAgents();
