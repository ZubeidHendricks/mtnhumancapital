import Groq from "groq-sdk";
import { z } from "zod";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// CV Data Schema
const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string().optional(),
  location: z.string().optional(),
});

const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  duration: z.string(),
  location: z.string().optional(),
  responsibilities: z.array(z.string()),
});

const CVDataSchema = z.object({
  fullName: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  role: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  skills: z.array(z.string()),
  education: z.array(EducationSchema),
  experience: z.array(ExperienceSchema),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  linkedinUrl: z.string().optional(),
});

export type CVData = z.infer<typeof CVDataSchema>;

export class CVParser {
  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      throw new Error("Failed to extract text from PDF");
    }
  }

  async parseCV(text: string): Promise<CVData> {
    const prompt = `Extract structured information from this CV/Resume. Return ONLY valid JSON matching this exact schema:

{
  "fullName": "candidate full name",
  "email": "email address or null",
  "phone": "phone number or null",
  "location": "city/country or null",
  "summary": "professional summary/bio or null",
  "role": "current or target job title or null",
  "yearsOfExperience": number or null,
  "skills": ["skill1", "skill2", ...],
  "education": [
    {
      "degree": "degree name",
      "institution": "university/school",
      "year": "graduation year or null",
      "location": "city/country or null"
    }
  ],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "dates worked",
      "location": "city/country or null",
      "responsibilities": ["responsibility 1", "responsibility 2", ...]
    }
  ],
  "languages": ["language1", "language2", ...] or null,
  "certifications": ["cert1", "cert2", ...] or null,
  "linkedinUrl": "LinkedIn profile URL or null"
}

CV Text:
${text}

Return ONLY the JSON object, no explanations.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert CV/Resume parser. Extract structured data from resumes and return ONLY valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content || "";
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validate against schema
      const validated = CVDataSchema.parse(parsedData);
      
      return validated;
    } catch (error) {
      console.error("Error parsing CV with LLM:", error);
      throw new Error(`Failed to parse CV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parsePDFCV(buffer: Buffer): Promise<CVData> {
    console.log("Extracting text from PDF...");
    const text = await this.extractTextFromPDF(buffer);
    
    console.log("Parsing CV with AI...");
    const cvData = await this.parseCV(text);
    
    return cvData;
  }
}

export const cvParser = new CVParser();
