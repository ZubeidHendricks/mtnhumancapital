import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  convertInchesToTwip,
  PageBreak,
  ImageRun,
  Header,
} from "docx";
import Groq from "groq-sdk";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const CVTemplateDataSchema = z.object({
  personalProfile: z.object({
    jobApplication: z.string().nullish(),
    employmentEquityStatus: z.string().nullish(),
    nationality: z.string().nullish(),
    fullName: z.string(),
    idNumber: z.string().nullish(),
    residentialLocation: z.string().nullish(),
    currentCompany: z.string().nullish(),
    currentPosition: z.string().nullish(),
    currentRemuneration: z.string().nullish(),
    expectedRemuneration: z.string().nullish(),
    noticePeriod: z.string().nullish(),
  }),
  education: z.object({
    secondary: z.object({
      school: z.string().nullish(),
      grade: z.string().nullish(),
      year: z.string().nullish(),
    }).nullish(),
    tertiary: z.array(z.object({
      institution: z.string().nullish(),
      courses: z.string().nullish(),
      yearCompleted: z.string().nullish(),
    })).nullish(),
    otherCourses: z.string().nullish(),
  }).nullish(),
  computerLiteracy: z.string().nullish(),
  attributesAchievementsSkills: z.string().nullish(),
  employmentHistory: z.array(z.object({
    employer: z.string(),
    periodOfService: z.string().nullish(),
    position: z.string().nullish(),
    mainResponsibilities: z.string().nullish(),
    reasonForLeaving: z.string().nullish(),
  })).nullish(),
  otherEmployment: z.array(z.object({
    employment: z.string().nullish(),
    position: z.string().nullish(),
    datesEmployed: z.string().nullish(),
  })).nullish(),
});

export type CVTemplateData = z.infer<typeof CVTemplateDataSchema>;

export class CVTemplateGenerator {
  async extractTemplateData(cvText: string, jobTitle?: string): Promise<CVTemplateData> {
    // Truncate text if too long to avoid token limits (Groq has 12000 TPM limit)
    const MAX_CV_CHARS = 8000;
    let processedText = cvText;
    if (cvText.length > MAX_CV_CHARS) {
      console.log(`CV text too long (${cvText.length} chars), truncating to ${MAX_CV_CHARS} chars`);
      processedText = cvText.substring(0, MAX_CV_CHARS);
      const lastSpace = processedText.lastIndexOf(' ');
      if (lastSpace > MAX_CV_CHARS - 200) {
        processedText = processedText.substring(0, lastSpace);
      }
      processedText += "\n\n[CV truncated due to length - extract what information is available]";
    }

    const prompt = `Extract information from this CV/Resume to fill the Avatar Human Capital CV template. Return ONLY valid JSON matching this exact structure:

{
  "personalProfile": {
    "jobApplication": "${jobTitle || 'Extract the job title/role they are applying for or their current role'}",
    "employmentEquityStatus": "Extract employment equity status if mentioned (e.g., 'African Male', 'White Female', etc.) or null",
    "nationality": "Extract nationality (e.g., 'South African') or null",
    "fullName": "Full name of the candidate",
    "idNumber": "South African ID number if present or null",
    "residentialLocation": "City/Area they live in",
    "currentCompany": "Current or most recent employer",
    "currentPosition": "Current or most recent job title",
    "currentRemuneration": "Current salary if mentioned (include currency) or null",
    "expectedRemuneration": "Expected salary if mentioned (include currency) or null",
    "noticePeriod": "Notice period if mentioned (e.g., '1 month', '2 weeks') or null"
  },
  "education": {
    "secondary": {
      "school": "High school name or null",
      "grade": "Highest grade completed (e.g., 'Grade 12' or 'Matric') or null",
      "year": "Year completed or null"
    },
    "tertiary": [
      {
        "institution": "University/College name",
        "courses": "Degree/Diploma/Certificate name",
        "yearCompleted": "Year completed or null"
      }
    ],
    "otherCourses": "List any other courses, certifications, or training"
  },
  "computerLiteracy": "List computer skills (MS Word, Excel, specific software, etc.)",
  "attributesAchievementsSkills": "Key skills, attributes, and achievements as a paragraph or bullet points",
  "employmentHistory": [
    {
      "employer": "Company name",
      "periodOfService": "Date range (e.g., 'January 2020 - Present')",
      "position": "Job title",
      "mainResponsibilities": "Key responsibilities and duties",
      "reasonForLeaving": "Reason for leaving or 'Currently Employed' if still there"
    }
  ],
  "otherEmployment": [
    {
      "employment": "Company/Organization name",
      "position": "Role/Title",
      "datesEmployed": "Date range"
    }
  ]
}

IMPORTANT:
- Extract ALL employment history, starting with the most recent position
- Include ALL education qualifications found
- For South African CVs, look for ID numbers (13 digits)
- Include any salary/remuneration information found
- Notice period is common in SA CVs

CV Text:
${processedText}

Return ONLY the JSON object, no explanations.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert CV/Resume parser specializing in South African CVs. Extract structured data to fill an HR template and return ONLY valid JSON.",
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
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response");
      }

      let jsonString = jsonMatch[0];
      jsonString = jsonString.replace(/:\s*,/g, ': null,');
      jsonString = jsonString.replace(/:\s*}/g, ': null}');
      jsonString = jsonString.replace(/:\s*]/g, ': null]');
      jsonString = jsonString.replace(/,\s*}/g, '}');
      jsonString = jsonString.replace(/,\s*]/g, ']');
      
      const parsedData = JSON.parse(jsonString);
      const validated = CVTemplateDataSchema.parse(parsedData);
      
      return validated;
    } catch (error) {
      console.error("Error extracting template data:", error);
      throw new Error(`Failed to extract CV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateDocument(data: CVTemplateData): Document {
    // Try to load logo
    let logoBuffer: Buffer | null = null;
    try {
      const logoPath = path.join(process.cwd(), "client", "public", "logos", "main-logo.png");
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
        console.log("Logo loaded successfully for CV template");
      } else {
        console.warn("Logo file not found at:", logoPath);
      }
    } catch (error) {
      console.warn("Could not load logo for CV template:", error);
    }

    const headerChildren: Paragraph[] = [];
    
    // Add logo if available - positioned on the left
    if (logoBuffer) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 180,
                height: 55,
              },
              type: "png",
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    const doc = new Document({
      sections: [{
        properties: {},
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        children: [
          // Add logo in document body - positioned on the left
          ...(logoBuffer ? [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new ImageRun({
                  data: logoBuffer,
                  transformation: {
                    width: 220,
                    height: 65,
                  },
                  type: "png",
                }),
              ],
              spacing: { after: 300 },
            }),
          ] : []),
          
          new Paragraph({
            text: "Curriculum Vitae",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          this.createSectionHeader("Personal Profile"),
          this.createProfileTable(data.personalProfile),
          
          new Paragraph({ spacing: { after: 300 } }),
          
          this.createSectionHeader("Educational Qualifications"),
          this.createSubHeader("Secondary Education"),
          this.createEducationSectionTable([
            ["School", data.education?.secondary?.school || ""],
            ["Grade", data.education?.secondary?.grade || ""],
            ["Year", data.education?.secondary?.year || ""],
          ]),
          
          new Paragraph({ spacing: { after: 200 } }),
          
          this.createSubHeader("Tertiary Education"),
          ...(data.education?.tertiary || []).flatMap((edu, index) => [
            this.createEducationSectionTable([
              ["Institution", edu.institution || ""],
              ["Courses", edu.courses || ""],
              ["Year Completed", edu.yearCompleted || ""],
            ]),
            new Paragraph({ spacing: { after: 150 } }),
          ]),
          
          this.createEducationSectionTable([
            ["Other Courses", data.education?.otherCourses || ""],
          ]),
          
          new Paragraph({ spacing: { after: 200 } }),
          
          this.createSubHeader("Computer Literacy"),
          this.createEducationSectionTable([
            ["Skills", data.computerLiteracy || "Ms Word, Ms Excel, Ms Outlook"],
          ]),
          
          new Paragraph({ spacing: { after: 200 } }),
          
          this.createSubHeader("Attributes, Achievements and Skills"),
          this.createEducationSectionTable([
            ["Skills", data.attributesAchievementsSkills || ""],
          ]),
          
          new Paragraph({ spacing: { after: 300 } }),
          
          this.createSectionHeader("Employment History (Starting with recent position)"),
          ...(data.employmentHistory || []).flatMap((job, index) => this.createEmploymentEntry(job, index)),
          
          ...(data.otherEmployment && data.otherEmployment.length > 0 ? [
            this.createSectionHeader("Other Employment"),
            this.createOtherEmploymentTable(data.otherEmployment),
          ] : []),
        ],
      }],
    });

    return doc;
  }

  private createSectionHeader(text: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          bold: true,
          size: 28,
          color: "2E5A8B",
        }),
      ],
      spacing: { before: 300, after: 200 },
      border: {
        bottom: { color: "2E5A8B", size: 12, style: BorderStyle.SINGLE },
      },
    });
  }

  private createSubHeader(text: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          bold: true,
          size: 24,
          italics: true,
        }),
      ],
      spacing: { before: 200, after: 100 },
    });
  }

  private createProfileTable(profile: CVTemplateData["personalProfile"]): Table {
    const rows = [
      ["Job Application", profile.jobApplication || ""],
      ["Employment Equity Status", profile.employmentEquityStatus || ""],
      ["Nationality", profile.nationality || ""],
      ["Full Name", profile.fullName],
      ["ID Number", profile.idNumber || ""],
      ["Residential Location", profile.residentialLocation || ""],
      ["", ""],
      ["Current Company", profile.currentCompany || ""],
      ["Current Position", profile.currentPosition || ""],
      ["Current Remuneration", profile.currentRemuneration || ""],
      ["Expected Remuneration", profile.expectedRemuneration || ""],
      ["Notice Period", profile.noticePeriod || ""],
    ];

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
      },
      rows: rows.map(([label, value]) => 
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 22 })],
              })],
              shading: label ? { fill: "E8F0F8", type: ShadingType.CLEAR } : undefined,
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: value, size: 22 })],
              })],
            }),
          ],
        })
      ),
    });
  }

  private createEducationSectionTable(rows: [string, string][]): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
      },
      rows: rows.map(([label, value]) => 
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 22 })],
              })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({
                children: [new TextRun({ text: value, size: 22 })],
              })],
            }),
          ],
        })
      ),
    });
  }

  private createEducationRow(label: string, value: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: value, size: 22 }),
      ],
      spacing: { after: 80 },
    });
  }

  private createEmploymentTable(job: NonNullable<CVTemplateData["employmentHistory"]>[0]): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: "Name of Employer", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: job.employer || "", size: 22 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Period of Service", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: job.periodOfService || "", size: 22 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Position", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: job.position || "", size: 22 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Main Responsibilities", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: job.mainResponsibilities || "", size: 22 })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Reason for Leaving", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: job.reasonForLeaving || "", size: 22 })] })],
            }),
          ],
        }),
      ],
    });
  }

  private createEmploymentEntry(job: NonNullable<CVTemplateData["employmentHistory"]>[0], index: number): (Table | Paragraph)[] {
    return [
      this.createEmploymentTable(job),
      new Paragraph({ spacing: { after: 200 } }),
    ];
  }

  private createOtherEmploymentTable(employment: NonNullable<CVTemplateData["otherEmployment"]>): Table {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "2E5A8B" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Employment", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Position", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Dates Employed", bold: true, size: 22 })] })],
              shading: { fill: "E8F0F8", type: ShadingType.CLEAR },
            }),
          ],
        }),
        ...employment.map(emp => 
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.employment || "", size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.position || "", size: 22 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: emp.datesEmployed || "", size: 22 })] })] }),
            ],
          })
        ),
      ],
    });
  }
}

export const cvTemplateGenerator = new CVTemplateGenerator();
