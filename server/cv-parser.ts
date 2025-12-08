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

  // Helper to extract LinkedIn URL from text using regex
  extractLinkedInUrl(text: string): string | null {
    const linkedinPatterns = [
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/gi,
      /linkedin\.com\/in\/[\w-]+/gi,
    ];
    
    for (const pattern of linkedinPatterns) {
      const match = text.match(pattern);
      if (match && match[0]) {
        let url = match[0];
        if (!url.startsWith('http')) {
          url = 'https://' + (url.startsWith('www.') ? '' : 'www.') + url;
        }
        return url;
      }
    }
    return null;
  }

  async parseCV(text: string): Promise<CVData> {
    // Pre-extract LinkedIn URL as fallback
    const fallbackLinkedIn = this.extractLinkedInUrl(text);

    // Truncate text if too long to avoid token limits (Groq has 12000 TPM limit)
    // Average ~4 chars per token, so 8000 chars leaves room for prompt + response
    const MAX_CV_CHARS = 8000;
    let processedText = text;
    if (text.length > MAX_CV_CHARS) {
      console.log(`CV text too long (${text.length} chars), truncating to ${MAX_CV_CHARS} chars`);
      // Try to keep the most important parts: beginning (contact info) and structure
      // Split at a sensible point to avoid cutting mid-word
      processedText = text.substring(0, MAX_CV_CHARS);
      const lastSpace = processedText.lastIndexOf(' ');
      if (lastSpace > MAX_CV_CHARS - 200) {
        processedText = processedText.substring(0, lastSpace);
      }
      processedText += "\n\n[CV truncated due to length - extract what information is available]";
    }

    const prompt = `Extract structured information from this CV/Resume. This may be a LinkedIn profile export. Return ONLY valid JSON matching this exact schema:

{
  "fullName": "candidate full name",
  "email": "email address or null",
  "phone": "phone number with country code or null",
  "location": "city/country or null",
  "summary": "professional summary/bio or null",
  "role": "current or target job title (look for text after name) or null",
  "yearsOfExperience": number or null,
  "skills": ["skill1", "skill2", ...] - look for "Top Skills" or "Skills" sections,
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
      "duration": "dates worked (e.g., 'January 2020 - Present')",
      "location": "city/country or null",
      "responsibilities": ["responsibility 1", "responsibility 2", ...]
    }
  ],
  "languages": ["language1", "language2", ...] or null,
  "certifications": ["cert1", "cert2", ...] or null,
  "linkedinUrl": "extract any linkedin.com/in/... URL found in the text, or null"
}

IMPORTANT: 
- For LinkedIn profiles, the role/title is usually shown right after the person's name
- Look for "linkedin.com/in/" URLs in the Contact section
- Extract ALL skills from "Top Skills" section
- Duration should be the actual date range shown

CV Text:
${processedText}

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
      
      // Use fallback LinkedIn URL if AI didn't extract one
      if (!validated.linkedinUrl && fallbackLinkedIn) {
        validated.linkedinUrl = fallbackLinkedIn;
        console.log("Using fallback LinkedIn URL:", fallbackLinkedIn);
      }
      
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
