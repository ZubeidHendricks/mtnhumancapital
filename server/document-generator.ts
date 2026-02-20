import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  Header,
  Footer,
  convertInchesToTwip,
  BorderStyle,
} from "docx";
import Groq from "groq-sdk";
import { z } from "zod";
import { IStorage } from "./storage";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export type DocumentType = 'offer_letter' | 'welcome_letter' | 'employee_handbook' | 'nda' | 'employment_contract';

export interface EmployeeData {
  fullName: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  address?: string;
  jobTitle: string;
  department?: string;
  startDate: string;
  salary?: string;
  currency?: string;
  manager?: string;
  probationPeriod?: string;
  workingHours?: string;
  leaveEntitlement?: string;
  benefits?: string[];
  companyName: string;
  companyAddress?: string;
}

export interface GeneratedDocumentResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const OfferLetterContentSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  openingParagraph: z.string(),
  positionDetails: z.string(),
  compensationDetails: z.string(),
  benefitsOverview: z.string(),
  startDateInfo: z.string(),
  conditionsOfEmployment: z.string(),
  closingParagraph: z.string(),
  signature: z.string(),
});

const WelcomeLetterContentSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  welcomeMessage: z.string(),
  firstDayInfo: z.string(),
  teamIntroduction: z.string(),
  resourcesAndSupport: z.string(),
  companyValueHighlights: z.string(),
  closingMessage: z.string(),
  signature: z.string(),
});

const NDAContentSchema = z.object({
  title: z.string(),
  parties: z.string(),
  recitals: z.string(),
  definitionOfConfidentialInfo: z.string(),
  obligationsOfReceivingParty: z.string(),
  exclusions: z.string(),
  termAndTermination: z.string(),
  returnOfMaterials: z.string(),
  remedies: z.string(),
  generalProvisions: z.string(),
  signatureBlock: z.string(),
});

const EmploymentContractContentSchema = z.object({
  title: z.string(),
  partiesClause: z.string(),
  appointmentAndDuties: z.string(),
  commencementAndProbation: z.string(),
  remunerationAndBenefits: z.string(),
  workingHoursAndLeave: z.string(),
  confidentialityClause: z.string(),
  terminationClause: z.string(),
  generalProvisions: z.string(),
  governingLaw: z.string(),
  signatureBlock: z.string(),
});

const HandbookSectionSchema = z.object({
  title: z.string(),
  introduction: z.string(),
  companyOverview: z.string(),
  employmentPolicies: z.string(),
  codeOfConduct: z.string(),
  workplaceGuidelines: z.string(),
  leaveAndBenefits: z.string(),
  healthAndSafety: z.string(),
  disciplinaryProcedures: z.string(),
  acknowledgment: z.string(),
});

export class DocumentTemplateGenerator {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async generateDocument(
    tenantId: string,
    documentType: DocumentType,
    employeeData: EmployeeData
  ): Promise<GeneratedDocumentResult> {
    const template = await this.storage.getActiveDocumentTemplate(tenantId, documentType);
    const templateText = template?.rawText || '';

    switch (documentType) {
      case 'offer_letter':
        return this.generateOfferLetter(employeeData, templateText);
      case 'welcome_letter':
        return this.generateWelcomeLetter(employeeData, templateText);
      case 'nda':
        return this.generateNDA(employeeData, templateText);
      case 'employment_contract':
        return this.generateEmploymentContract(employeeData, templateText);
      case 'employee_handbook':
        return this.generateEmployeeHandbook(employeeData, templateText);
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }

  private async generateOfferLetter(data: EmployeeData, templateText: string): Promise<GeneratedDocumentResult> {
    const content = await this.generateContentWithAI('offer_letter', data, templateText);
    const parsed = OfferLetterContentSchema.parse(content);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: data.companyName, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `To: ${data.fullName}` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Subject: ${parsed.subject}`, bold: true })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.greeting })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.openingParagraph })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Position Details", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.positionDetails })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Compensation", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.compensationDetails })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Benefits", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.benefitsOverview })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Start Date", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.startDateInfo })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Conditions of Employment", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.conditionsOfEmployment })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.closingParagraph })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.signature })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "___________________________" })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Authorized Signature" })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "ACCEPTANCE" , bold: true })],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `I, ${data.fullName}, accept this offer of employment.` })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature: ___________________________    Date: _______________" })],
          }),
        ],
      }],
    });

    const buffer = await this.generateDocxBuffer(doc);
    return {
      buffer,
      filename: `Offer_Letter_${data.fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async generateWelcomeLetter(data: EmployeeData, templateText: string): Promise<GeneratedDocumentResult> {
    const content = await this.generateContentWithAI('welcome_letter', data, templateText);
    const parsed = WelcomeLetterContentSchema.parse(content);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: data.companyName, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Welcome to ${data.companyName}!`, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.greeting })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.welcomeMessage })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Your First Day", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.firstDayInfo })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Meet Your Team", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.teamIntroduction })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Resources & Support", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.resourcesAndSupport })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Our Values", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.companyValueHighlights })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.closingMessage })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.signature })],
          }),
        ],
      }],
    });

    const buffer = await this.generateDocxBuffer(doc);
    return {
      buffer,
      filename: `Welcome_Letter_${data.fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async generateNDA(data: EmployeeData, templateText: string): Promise<GeneratedDocumentResult> {
    const content = await this.generateContentWithAI('nda', data, templateText);
    const parsed = NDAContentSchema.parse(content);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: parsed.title, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "PARTIES", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.parties })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "RECITALS", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.recitals })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "1. DEFINITION OF CONFIDENTIAL INFORMATION", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.definitionOfConfidentialInfo })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "2. OBLIGATIONS OF RECEIVING PARTY", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.obligationsOfReceivingParty })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "3. EXCLUSIONS", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.exclusions })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "4. TERM AND TERMINATION", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.termAndTermination })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "5. RETURN OF MATERIALS", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.returnOfMaterials })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "6. REMEDIES", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.remedies })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "7. GENERAL PROVISIONS", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.generalProvisions })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "SIGNATURES", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.signatureBlock })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `\n\nFor ${data.companyName}:` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature: ___________________________    Date: _______________" })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Name: ___________________________    Title: _______________" })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `\n\nEmployee (${data.fullName}):` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature: ___________________________    Date: _______________" })],
          }),
        ],
      }],
    });

    const buffer = await this.generateDocxBuffer(doc);
    return {
      buffer,
      filename: `NDA_${data.fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async generateEmploymentContract(data: EmployeeData, templateText: string): Promise<GeneratedDocumentResult> {
    const content = await this.generateContentWithAI('employment_contract', data, templateText);
    const parsed = EmploymentContractContentSchema.parse(content);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: parsed.title, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "PARTIES", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.partiesClause })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "1. APPOINTMENT AND DUTIES", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.appointmentAndDuties })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "2. COMMENCEMENT AND PROBATION", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.commencementAndProbation })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "3. REMUNERATION AND BENEFITS", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.remunerationAndBenefits })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "4. WORKING HOURS AND LEAVE", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.workingHoursAndLeave })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "5. CONFIDENTIALITY", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.confidentialityClause })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "6. TERMINATION", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.terminationClause })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "7. GENERAL PROVISIONS", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.generalProvisions })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "8. GOVERNING LAW", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.governingLaw })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "SIGNATURES", bold: true })],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `\n\nFor ${data.companyName} (Employer):` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature: ___________________________    Date: _______________" })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Name: ___________________________    Title: _______________" })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `\n\nEmployee (${data.fullName}):` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature: ___________________________    Date: _______________" })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `ID Number: ${data.idNumber || '___________________________'}` })],
          }),
        ],
      }],
    });

    const buffer = await this.generateDocxBuffer(doc);
    return {
      buffer,
      filename: `Employment_Contract_${data.fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async generateEmployeeHandbook(data: EmployeeData, templateText: string): Promise<GeneratedDocumentResult> {
    const content = await this.generateContentWithAI('employee_handbook', data, templateText);
    const parsed = HandbookSectionSchema.parse(content);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: data.companyName, bold: true, size: 36 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.title, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Prepared for: ${data.fullName}`, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Position: ${data.jobTitle}`, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Start Date: ${data.startDate}`, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            children: [new TextRun({ text: "INTRODUCTION", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.introduction })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "COMPANY OVERVIEW", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.companyOverview })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "EMPLOYMENT POLICIES", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.employmentPolicies })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "CODE OF CONDUCT", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.codeOfConduct })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "WORKPLACE GUIDELINES", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.workplaceGuidelines })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "LEAVE AND BENEFITS", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.leaveAndBenefits })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "HEALTH AND SAFETY", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.healthAndSafety })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "DISCIPLINARY PROCEDURES", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.disciplinaryProcedures })],
            spacing: { after: 400 },
          }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            children: [new TextRun({ text: "ACKNOWLEDGMENT", bold: true })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: parsed.acknowledgment })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `\n\nEmployee Name: ${data.fullName}` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Signature: ___________________________    Date: _______________" })],
          }),
        ],
      }],
    });

    const buffer = await this.generateDocxBuffer(doc);
    return {
      buffer,
      filename: `Employee_Handbook_${data.fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private async generateContentWithAI(documentType: DocumentType, data: EmployeeData, templateText: string): Promise<Record<string, string>> {
    const prompts: Record<DocumentType, string> = {
      offer_letter: this.getOfferLetterPrompt(data, templateText),
      welcome_letter: this.getWelcomeLetterPrompt(data, templateText),
      nda: this.getNDAPrompt(data, templateText),
      employment_contract: this.getEmploymentContractPrompt(data, templateText),
      employee_handbook: this.getHandbookPrompt(data, templateText),
    };

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an HR document specialist. Generate professional, legally appropriate content for HR documents. Return ONLY valid JSON matching the requested structure. Be professional but warm in tone."
          },
          {
            role: "user",
            content: prompts[documentType]
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error(`Error generating ${documentType} content:`, error);
      return this.getDefaultContent(documentType, data);
    }
  }

  private formatSalary(data: EmployeeData): string {
    if (!data.salary) return 'To be discussed';
    const prefix = data.currency || 'R';
    const sal = data.salary.replace(/^R\s*/, '');
    return `${prefix}${sal}`;
  }

  private getOfferLetterPrompt(data: EmployeeData, templateText: string): string {
    return `Generate content for a job offer letter with these details:
- Employee: ${data.fullName}
- Position: ${data.jobTitle}
- Department: ${data.department || 'Not specified'}
- Start Date: ${data.startDate}
- Salary: ${this.formatSalary(data)}
- Company: ${data.companyName}
- Manager: ${data.manager || 'Not specified'}
- Probation Period: ${data.probationPeriod || '3 months'}
- Benefits: ${data.benefits?.join(', ') || 'Standard company benefits'}

${templateText ? `Reference template style:\n${templateText.substring(0, 2000)}` : ''}

Return JSON with these fields:
{
  "subject": "Offer of Employment - [Position]",
  "greeting": "Dear [Name]",
  "openingParagraph": "We are pleased to offer you...",
  "positionDetails": "Details about the role...",
  "compensationDetails": "Your compensation package...",
  "benefitsOverview": "Benefits included...",
  "startDateInfo": "Your start date...",
  "conditionsOfEmployment": "This offer is conditional upon...",
  "closingParagraph": "We look forward to...",
  "signature": "Best regards, HR Department"
}`;
  }

  private getWelcomeLetterPrompt(data: EmployeeData, templateText: string): string {
    return `Generate content for a welcome letter with these details:
- Employee: ${data.fullName}
- Position: ${data.jobTitle}
- Department: ${data.department || 'Not specified'}
- Start Date: ${data.startDate}
- Company: ${data.companyName}
- Manager: ${data.manager || 'Not specified'}

${templateText ? `Reference template style:\n${templateText.substring(0, 2000)}` : ''}

Return JSON with these fields:
{
  "subject": "Welcome to [Company]!",
  "greeting": "Dear [Name]",
  "welcomeMessage": "On behalf of everyone at...",
  "firstDayInfo": "On your first day...",
  "teamIntroduction": "You'll be working with...",
  "resourcesAndSupport": "You'll have access to...",
  "companyValueHighlights": "At our company, we value...",
  "closingMessage": "Once again, welcome...",
  "signature": "Warm regards, HR Team"
}`;
  }

  private getNDAPrompt(data: EmployeeData, templateText: string): string {
    return `Generate content for a Non-Disclosure Agreement with these details:
- Employee: ${data.fullName}
- Position: ${data.jobTitle}
- Company: ${data.companyName}
- Company Address: ${data.companyAddress || 'Company registered address'}
- Employee ID: ${data.idNumber || 'To be provided'}

${templateText ? `Reference template style:\n${templateText.substring(0, 2000)}` : ''}

Return JSON with these fields (use formal legal language):
{
  "title": "NON-DISCLOSURE AGREEMENT",
  "parties": "This Agreement is entered into between [Company] and [Employee]...",
  "recitals": "WHEREAS the Company wishes to disclose...",
  "definitionOfConfidentialInfo": "Confidential Information means...",
  "obligationsOfReceivingParty": "The Employee agrees to...",
  "exclusions": "Confidential Information does not include...",
  "termAndTermination": "This Agreement shall remain in effect...",
  "returnOfMaterials": "Upon termination, the Employee shall...",
  "remedies": "The Employee acknowledges that breach...",
  "generalProvisions": "This Agreement constitutes the entire...",
  "signatureBlock": "IN WITNESS WHEREOF, the parties have executed..."
}`;
  }

  private getEmploymentContractPrompt(data: EmployeeData, templateText: string): string {
    return `Generate content for an Employment Contract with these details:
- Employee: ${data.fullName}
- Position: ${data.jobTitle}
- Department: ${data.department || 'Not specified'}
- Start Date: ${data.startDate}
- Salary: ${this.formatSalary(data)}
- Company: ${data.companyName}
- Working Hours: ${data.workingHours || 'Standard business hours (08:00-17:00)'}
- Leave Entitlement: ${data.leaveEntitlement || '15 days annual leave'}
- Probation Period: ${data.probationPeriod || '3 months'}

${templateText ? `Reference template style:\n${templateText.substring(0, 2000)}` : ''}

Return JSON with these fields (use formal contractual language):
{
  "title": "EMPLOYMENT CONTRACT",
  "partiesClause": "This contract is entered into between [Company] (Employer) and [Employee] (Employee)...",
  "appointmentAndDuties": "The Employer hereby appoints the Employee as...",
  "commencementAndProbation": "Employment shall commence on...",
  "remunerationAndBenefits": "The Employee shall receive a monthly salary of...",
  "workingHoursAndLeave": "Normal working hours shall be...",
  "confidentialityClause": "The Employee undertakes to maintain confidentiality...",
  "terminationClause": "Either party may terminate this agreement by giving...",
  "generalProvisions": "This contract constitutes the entire agreement...",
  "governingLaw": "This contract shall be governed by the laws of South Africa...",
  "signatureBlock": "The parties have signed this contract on the date first written above."
}`;
  }

  private getHandbookPrompt(data: EmployeeData, templateText: string): string {
    return `Generate content for an Employee Handbook with these details:
- Employee: ${data.fullName}
- Position: ${data.jobTitle}
- Start Date: ${data.startDate}
- Company: ${data.companyName}
- Leave Entitlement: ${data.leaveEntitlement || '15 days annual leave'}

${templateText ? `Reference template style:\n${templateText.substring(0, 2000)}` : ''}

Return JSON with these fields:
{
  "title": "EMPLOYEE HANDBOOK",
  "introduction": "Welcome to [Company]. This handbook provides...",
  "companyOverview": "About our company, mission, and values...",
  "employmentPolicies": "Equal opportunity, anti-discrimination policies...",
  "codeOfConduct": "Expected behavior and professional standards...",
  "workplaceGuidelines": "Dress code, attendance, communication...",
  "leaveAndBenefits": "Annual leave, sick leave, benefits overview...",
  "healthAndSafety": "Workplace safety policies and procedures...",
  "disciplinaryProcedures": "Warnings, hearings, and disciplinary process...",
  "acknowledgment": "I acknowledge that I have received and read this handbook..."
}`;
  }

  private getDefaultContent(documentType: DocumentType, data: EmployeeData): Record<string, string> {
    const defaults: Record<DocumentType, Record<string, string>> = {
      offer_letter: {
        subject: `Offer of Employment - ${data.jobTitle}`,
        greeting: `Dear ${data.fullName},`,
        openingParagraph: `We are pleased to offer you the position of ${data.jobTitle} at ${data.companyName}.`,
        positionDetails: `You will be joining us as ${data.jobTitle}${data.department ? ` in the ${data.department} department` : ''}.`,
        compensationDetails: `Your compensation package will be ${this.formatSalary(data)} per month.`,
        benefitsOverview: `You will be entitled to our standard employee benefits package.`,
        startDateInfo: `Your start date will be ${data.startDate}.`,
        conditionsOfEmployment: `This offer is conditional upon successful background verification and completion of required documentation.`,
        closingParagraph: `We look forward to welcoming you to our team. Please confirm your acceptance by signing and returning this letter.`,
        signature: `Best regards,\nHuman Resources Department\n${data.companyName}`,
      },
      welcome_letter: {
        subject: `Welcome to ${data.companyName}!`,
        greeting: `Dear ${data.fullName},`,
        welcomeMessage: `On behalf of everyone at ${data.companyName}, we are thrilled to welcome you to our team!`,
        firstDayInfo: `On your first day (${data.startDate}), please arrive at our office by 9:00 AM. You will be met by HR for orientation.`,
        teamIntroduction: `You will be working with our dedicated ${data.department || ''} team. Your manager${data.manager ? `, ${data.manager},` : ''} will introduce you to your colleagues.`,
        resourcesAndSupport: `You will receive access to all necessary systems and resources. Our IT team will set up your workstation and accounts.`,
        companyValueHighlights: `At ${data.companyName}, we value integrity, collaboration, and continuous improvement. We believe in supporting our employees' growth.`,
        closingMessage: `Once again, welcome to the team! We're excited to have you on board and look forward to the contributions you'll make.`,
        signature: `Warm regards,\nThe HR Team\n${data.companyName}`,
      },
      nda: {
        title: "NON-DISCLOSURE AGREEMENT",
        parties: `This Non-Disclosure Agreement ("Agreement") is entered into as of ${new Date().toLocaleDateString()} between ${data.companyName} ("Company") and ${data.fullName} ("Employee").`,
        recitals: `WHEREAS the Company wishes to disclose certain confidential and proprietary information to the Employee for purposes related to the Employee's employment, the parties agree as follows:`,
        definitionOfConfidentialInfo: `"Confidential Information" means all non-public information disclosed by the Company to the Employee, including but not limited to business plans, financial data, customer lists, trade secrets, and proprietary technology.`,
        obligationsOfReceivingParty: `The Employee agrees to: (a) maintain the confidentiality of all Confidential Information; (b) use such information solely for the purposes of their employment; (c) not disclose such information to any third party without prior written consent.`,
        exclusions: `Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Employee; (b) was known to the Employee prior to disclosure; (c) is independently developed by the Employee without use of Confidential Information.`,
        termAndTermination: `This Agreement shall remain in effect for the duration of employment and for a period of two (2) years following termination of employment.`,
        returnOfMaterials: `Upon termination of employment or upon request by the Company, the Employee shall promptly return all materials containing Confidential Information.`,
        remedies: `The Employee acknowledges that breach of this Agreement may cause irreparable harm to the Company, entitling the Company to seek injunctive relief in addition to other remedies.`,
        generalProvisions: `This Agreement constitutes the entire agreement between the parties regarding confidentiality. Any amendments must be in writing and signed by both parties.`,
        signatureBlock: `IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.`,
      },
      employment_contract: {
        title: "EMPLOYMENT CONTRACT",
        partiesClause: `This Employment Contract is entered into between ${data.companyName} ("the Employer") and ${data.fullName} ("the Employee").`,
        appointmentAndDuties: `The Employer hereby appoints the Employee as ${data.jobTitle}. The Employee shall perform duties as reasonably assigned by the Employer and as outlined in the job description.`,
        commencementAndProbation: `Employment shall commence on ${data.startDate}. The Employee will be subject to a probationary period of ${data.probationPeriod || '3 months'}.`,
        remunerationAndBenefits: `The Employee shall receive a monthly salary of ${this.formatSalary(data)}. Salary will be paid on the last working day of each month. Additional benefits include those specified in the company benefits policy.`,
        workingHoursAndLeave: `Normal working hours shall be ${data.workingHours || '08:00 to 17:00, Monday to Friday'}. The Employee is entitled to ${data.leaveEntitlement || '15 days'} annual leave per year.`,
        confidentialityClause: `The Employee undertakes to maintain confidentiality regarding all proprietary information and trade secrets of the Employer, both during and after employment.`,
        terminationClause: `Either party may terminate this agreement by giving one month's written notice, or payment in lieu thereof. The Employer may terminate employment immediately for gross misconduct.`,
        generalProvisions: `This contract constitutes the entire agreement between the parties. Any amendments must be in writing and signed by both parties. The Employee confirms they have no other employment that conflicts with this position.`,
        governingLaw: `This contract shall be governed by the laws of South Africa, and the parties submit to the jurisdiction of South African courts.`,
        signatureBlock: `The parties have signed this contract on the date first written above.`,
      },
      employee_handbook: {
        title: "EMPLOYEE HANDBOOK",
        introduction: `Welcome to ${data.companyName}. This handbook provides important information about our policies, procedures, and your rights and responsibilities as an employee. Please read it carefully and keep it for reference.`,
        companyOverview: `${data.companyName} is committed to excellence in our field. Our mission is to deliver exceptional value to our clients while maintaining a positive and supportive work environment for all employees.`,
        employmentPolicies: `We are an equal opportunity employer committed to diversity and inclusion. Discrimination, harassment, and retaliation are strictly prohibited. All employees are expected to treat colleagues, clients, and partners with respect and professionalism.`,
        codeOfConduct: `Employees are expected to maintain high standards of professional conduct. This includes honesty, integrity, respect for others, and compliance with all company policies and applicable laws. Conflicts of interest must be disclosed promptly.`,
        workplaceGuidelines: `Professional business attire is required unless otherwise specified. Employees should maintain regular attendance and punctuality. Personal use of company equipment and internet should be minimal and appropriate.`,
        leaveAndBenefits: `Employees are entitled to ${data.leaveEntitlement || '15 days'} annual leave per year. Sick leave is provided as per statutory requirements. Additional benefits include medical aid contributions, pension fund, and other benefits as outlined in your employment contract.`,
        healthAndSafety: `The safety of our employees is paramount. Report any hazards or accidents immediately. Emergency procedures are posted in common areas. First aid kits and fire extinguishers are located throughout the premises.`,
        disciplinaryProcedures: `Disciplinary action may be taken for misconduct or poor performance. The progressive discipline process includes verbal warning, written warning, final warning, and dismissal. Serious misconduct may result in immediate dismissal.`,
        acknowledgment: `I acknowledge that I have received, read, and understood this Employee Handbook. I agree to comply with all policies and procedures outlined herein. I understand that this handbook does not constitute a contract of employment.`,
      },
    };

    return defaults[documentType];
  }

  private async generateDocxBuffer(doc: Document): Promise<Buffer> {
    const { Packer } = await import("docx");
    return await Packer.toBuffer(doc);
  }
}

export function createDocumentGenerator(storage: IStorage): DocumentTemplateGenerator {
  return new DocumentTemplateGenerator(storage);
}
