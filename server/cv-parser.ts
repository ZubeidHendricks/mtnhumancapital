import Groq from "groq-sdk";
import { z } from "zod";
import { createRequire } from "module";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const { PDFParse } = require('pdf-parse');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// CV Data Schema - use nullish() and coercion to handle AI variations
// Helper to coerce numbers to strings
const stringOrNumber = z.union([z.string(), z.number()]).transform(val => 
  val === null || val === undefined ? null : String(val)
).nullish();

const EducationSchema = z.object({
  degree: z.string().nullish().transform(val => val || "Unknown Degree"),
  institution: z.string().nullish().transform(val => val || "Unknown Institution"),
  year: stringOrNumber,
  location: z.string().nullish(),
});

const ExperienceSchema = z.object({
  title: z.string().nullish().transform(val => val || "Unknown Role"),
  company: z.string().nullish().transform(val => val || "Unknown Company"),
  duration: z.string().nullish().transform(val => val || "Not specified"),
  location: z.string().nullish(),
  responsibilities: z.array(z.string()).nullish().transform(val => val || []),
});

const CVDataSchema = z.object({
  fullName: z.string().nullish().transform(val => val || "Unknown"),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  location: z.string().nullish(),
  summary: z.string().nullish(),
  role: z.string().nullish(),
  yearsOfExperience: z.union([z.number(), z.string()]).nullish().transform(val => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }),
  skills: z.array(z.string()).nullish().transform(val => val || []),
  education: z.array(EducationSchema).nullish().transform(val => val || []),
  experience: z.array(ExperienceSchema).nullish().transform(val => val || []),
  languages: z.array(z.string()).nullish(),
  certifications: z.array(z.string()).nullish(),
  linkedinUrl: z.string().nullish(),
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

      // Clean up common JSON issues from LLM output
      let jsonString = jsonMatch[0];
      // Fix empty values like `: ,` or `: }` or `: ]`
      jsonString = jsonString.replace(/:\s*,/g, ': null,');
      jsonString = jsonString.replace(/:\s*}/g, ': null}');
      jsonString = jsonString.replace(/:\s*]/g, ': null]');
      // Fix trailing commas before } or ]
      jsonString = jsonString.replace(/,\s*}/g, '}');
      jsonString = jsonString.replace(/,\s*]/g, ']');
      
      let parsedData;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON parse error, attempting recovery:", parseError);
        // Try a more aggressive cleanup
        jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
        parsedData = JSON.parse(jsonString);
      }
      
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

  async extractProfilePhoto(buffer: Buffer, candidateId: string): Promise<string | null> {
    try {
      console.log("Attempting to extract profile photo from PDF...");
      
      // Ensure uploads/photos directory exists
      const photosDir = path.join(process.cwd(), "uploads", "photos");
      if (!existsSync(photosDir)) {
        await mkdir(photosDir, { recursive: true });
      }

      // Use PDFParse v2 API for image extraction
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getImage();
      await parser.destroy();

      // Look for images in the first few pages (profile photos are usually at the top)
      for (let pageIdx = 0; pageIdx < Math.min(result.pages?.length || 0, 2); pageIdx++) {
        const page = result.pages[pageIdx];
        if (page?.images && page.images.length > 0) {
          // Get the first image (usually the profile photo)
          const img = page.images[0];
          
          if (img?.data && img.data.length > 1000) { // Minimum size filter to avoid tiny icons
            // Determine file extension based on image type
            const extension = img.type === 'jpeg' || img.type === 'jpg' ? 'jpg' : 'png';
            const filename = `${candidateId}.${extension}`;
            const filepath = path.join(photosDir, filename);
            
            // Save the image
            await writeFile(filepath, img.data);
            console.log(`Profile photo extracted and saved: ${filename}`);
            
            // Return the relative URL for the photo
            return `/uploads/photos/${filename}`;
          }
        }
      }

      console.log("No suitable profile photo found in PDF");
      return null;
    } catch (error) {
      console.error("Error extracting profile photo:", error);
      // Don't throw - profile photo extraction is optional
      return null;
    }
  }
}

export const cvParser = new CVParser();
