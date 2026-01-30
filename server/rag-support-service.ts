import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const PLATFORM_KNOWLEDGE_BASE = `
# Avatar Human Capital (AHC) Platform Documentation

## Overview
Avatar Human Capital is an AI-powered HR Management platform that automates the entire employee lifecycle from recruitment to ongoing HR management.

## Main Sections and Features

### HR Command Centre
Located in the main navigation, this is your central hub for HR operations:

1. **HR Command** (/hr-dashboard) - The main HR dashboard with tabs for:
   - Recruitment: View and manage active job postings
   - Candidates: Review candidate applications and status
   - Integrity: Background check management
   - Offers: Generate and send offer letters
   - Onboarding: Manage new employee onboarding

2. **Executive Dashboard** (/executive-dashboard-custom) - Customizable analytics dashboard where you can:
   - Add custom charts by clicking "Add Chart" button
   - Select data source (Candidates, Jobs, or Employees)
   - Choose chart type (Bar, Line, Pie, or Area)
   - Select X-axis field to group data by
   - Select Y-axis measure (Count, Sum, or Average)
   - Edit or delete existing charts

3. **Recruitment Setup** (/recruitment-setup) - Configure recruitment workflow settings

4. **Integrity Setup** (/integrity-setup) - Configure background check settings

5. **Offer Setup** (/offer-setup) - Download and upload offer letter templates

6. **Employee Onboarding Setup** (/onboarding-setup) - Download and upload onboarding document templates

7. **Workforce Intelligence** (/workforce-intelligence) - AI-powered workforce analytics

8. **AI Recommendations** (/recommendations) - AI-generated HR recommendations

### Recruitment Section
Manage your talent acquisition:

1. **Recruitment Dashboard** (/recruitment-dashboard) - Overview of recruitment metrics

2. **AI Recruitment** (/recruitment-agent) - AI-powered candidate sourcing and screening

3. **Candidate Pipeline** (/pipeline-board) - Visual pipeline of candidates across stages

4. **Candidate Status** (/candidate-pipeline) - Track candidate progress

5. **Import Candidates** (/external-candidates) - Import candidates from external sources

### Interviews Section
Manage candidate interviews:

1. **Interview Console** (/interview-console) - Central hub for all interviews

2. **Face to Face Interview** (/interview/face-to-face) - Schedule and manage in-person interviews

3. **Voice Interview** (/interview/voice) - AI-powered voice interviews

4. **Video Interview** (/interview/video) - Video interview management

### Performance Management Section
Track and manage employee performance:

1. **HR Performance** (/kpi-hr-dashboard) - HR performance overview dashboard

2. **KPI Management** (/kpi-management) - Create and manage KPIs

3. **My KPI Review** (/kpi-review) - Employee self-review

4. **Manager Review** (/kpi-manager-review) - Manager reviews for direct reports

5. **Time & Attendance** - External link to attendance system

### Documents Section
Manage HR documents:

1. **Document Automation** (/document-automation) - AI-powered document generation

2. **Document Library** (/document-library) - Central document repository

### Training Section
Learning and development resources:

1. **LMS Dashboard** - External link to Learning Management System

2. **Attendance** - External link to attendance tracking

## Common Tasks

### Creating a New Job
1. Go to HR Command (/hr-dashboard)
2. Click on the "Recruitment" tab
3. Click "Create New Job" or use the AI chat to describe the role
4. Fill in job details or let AI generate them
5. Assign a recruitment agent if needed
6. Publish the job

### Adding Charts to Executive Dashboard
1. Go to Executive Dashboard (/executive-dashboard-custom)
2. Click "Add Chart" button
3. Enter a title for your chart
4. Select chart type (Bar, Line, Pie, or Area)
5. Choose data source (Candidates, Jobs, or Employees)
6. Select X-axis field to group data
7. Select Y-axis measure (Count, Sum, Average)
8. Click "Add Chart"

### Scheduling a Face-to-Face Interview
1. Go to Interviews > Face to Face Interview
2. Click "Schedule Interview"
3. Select a candidate
4. Choose date and time
5. Enter location
6. Select interviewer
7. Add any notes
8. Click "Schedule Interview"

### Generating Offer Letters
1. Go to HR Command (/hr-dashboard)
2. Click the "Offer" tab
3. Select a candidate
4. Choose offer template
5. Fill in compensation details
6. Generate and send the offer

### Downloading Templates
1. Go to Offer Setup or Employee Onboarding Setup
2. Browse available templates
3. Click "Download Template" on any template
4. Edit the template as needed
5. Upload your customized version if desired

### Running Background Checks
1. Go to HR Command (/hr-dashboard)
2. Click the "Integrity" tab
3. Select a candidate
4. Choose check types (Criminal, Credit, Reference, etc.)
5. Initiate the background check
6. Review results when complete

## Tips and Best Practices

- Use the Executive Dashboard to track key metrics
- Set up automated workflows for routine tasks
- Keep templates updated in the Setup pages
- Regularly review AI recommendations for insights
- Use the Interview Console for a unified view of all interviews

## Getting Help

If you need assistance:
- Use this AI Support chat for platform guidance
- Check the Platform Docs for detailed documentation
- Contact your system administrator for access issues
`;

interface SupportMessage {
  role: "user" | "assistant";
  content: string;
}

interface SupportResponse {
  answer: string;
  relatedTopics?: string[];
  suggestedActions?: string[];
}

export class RAGSupportService {
  private conversationHistory: Map<string, SupportMessage[]> = new Map();

  constructor() {
    if (!process.env.GROQ_API_KEY) {
      console.warn("⚠ GROQ_API_KEY not set - RAG Support will fail");
    }
  }

  async getAnswer(question: string, sessionId: string = "default"): Promise<SupportResponse> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured - cannot use AI support. Please add GROQ_API_KEY to your environment secrets.");
    }

    const history = this.conversationHistory.get(sessionId) || [];
    history.push({ role: "user", content: question });

    try {
      const messages = [
        {
          role: "system" as const,
          content: `You are an AI support assistant for Avatar Human Capital (AHC), an AI-powered HR Management platform. 
          
Your job is to help users understand how to use the platform, navigate to features, and accomplish tasks.

Use the following knowledge base to answer questions:

${PLATFORM_KNOWLEDGE_BASE}

Guidelines:
- Be concise and helpful
- Provide step-by-step instructions when applicable
- Reference specific page paths when directing users
- If you don't know something, say so honestly
- Suggest related topics the user might find helpful
- Always be professional and friendly

Format your response as JSON:
{
  "answer": "<your helpful response>",
  "relatedTopics": ["<topic1>", "<topic2>"],
  "suggestedActions": ["<action1>", "<action2>"]
}`
        },
        ...history.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })),
      ];

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      
      let response: SupportResponse;
      try {
        response = JSON.parse(responseText);
      } catch {
        response = {
          answer: responseText,
          relatedTopics: [],
          suggestedActions: []
        };
      }

      history.push({ role: "assistant", content: response.answer });
      this.conversationHistory.set(sessionId, history.slice(-10));

      return response;
    } catch (error) {
      console.error("RAG Support API error:", error);
      throw new Error(`Failed to get AI support response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  clearHistory(sessionId: string = "default"): void {
    this.conversationHistory.delete(sessionId);
  }
}

export const ragSupportService = new RAGSupportService();
