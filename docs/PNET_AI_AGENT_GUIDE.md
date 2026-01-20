# PNET AI Agent Integration Guide

## 🎯 Overview

Your AI agents can now automatically apply candidates to PNET jobs using the official PNET ATSi Apply API V4.

## 🔧 Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# PNET API Configuration
PNET_API_BASE_URL=https://your-ats-domain.com/pnet-api
PNET_API_KEY=your-pnet-api-key-here
```

**How to get these:**
- Contact PNET to get your API credentials
- `PNET_API_BASE_URL` is the endpoint URL they provide
- `PNET_API_KEY` is your authentication key

### 2. Restart Server

```bash
npm run dev
```

## 📡 API Endpoints for AI Agents

### 1. Check Job Status

Before applying, check if a job is active on PNET:

```bash
POST /api/pnet/inquiry
```

**Request:**
```json
{
  "jobUrl": "https://pnet.co.za/jobs/12345",
  "atsJobId": "optional-internal-job-id"
}
```

**Response:**
```json
{
  "Header": {
    "Status": "OK"
  },
  "Body": {
    "JobStatus": "ACTIVE",
    "Questions": [...], // Screening questions
    "Consents": {
      "Mandatory": [...] // Required consents
    }
  }
}
```

### 2. Apply Single Candidate (AI-Powered)

Let AI automatically answer screening questions and apply a candidate:

```bash
POST /api/pnet/apply-candidate
```

**Request:**
```json
{
  "candidateId": "candidate-uuid",
  "jobUrl": "https://pnet.co.za/jobs/12345",
  "jobTitle": "Senior Software Engineer",
  "jobDescription": "We are looking for..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully to PNET",
  "pnetApplicationId": "uuid-from-pnet"
}
```

### 3. Bulk Apply Multiple Candidates

Apply multiple candidates at once:

```bash
POST /api/pnet/bulk-apply
```

**Request:**
```json
{
  "candidateIds": ["uuid-1", "uuid-2", "uuid-3"],
  "jobUrl": "https://pnet.co.za/jobs/12345",
  "jobTitle": "Software Engineer",
  "jobDescription": "Job details..."
}
```

**Response:**
```json
{
  "total": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "candidateId": "uuid-1",
      "candidateName": "John Doe",
      "success": true,
      "message": "Application submitted successfully"
    },
    {
      "candidateId": "uuid-2",
      "candidateName": "Jane Smith",
      "success": true,
      "message": "Application submitted successfully"
    },
    {
      "candidateId": "uuid-3",
      "candidateName": "Bob Wilson",
      "success": false,
      "message": "Job is not active on PNET"
    }
  ]
}
```

### 4. Auto-Match & Apply (Smart AI Feature)

AI automatically selects best candidates and applies them:

```bash
POST /api/pnet/auto-apply
```

**Request:**
```json
{
  "jobUrl": "https://pnet.co.za/jobs/12345",
  "jobTitle": "Software Engineer",
  "jobDescription": "We need a React developer...",
  "maxCandidates": 5,
  "minMatchScore": 70
}
```

**Response:**
```json
{
  "total": 5,
  "successful": 4,
  "failed": 1,
  "message": "Auto-applied 4 out of 5 candidates",
  "results": [...]
}
```

### 5. Get Job Info

Get detailed job information without applying:

```bash
GET /api/pnet/job-info?jobUrl=https://pnet.co.za/jobs/12345
```

**Response:**
```json
{
  "isActive": true,
  "hasScreeningQuestions": true,
  "requiredConsents": [...],
  "screeningQuestions": [...]
}
```

## 🤖 How AI Agents Work

### Screening Question Answering

The AI agent uses **Groq LLaMA 3.3 70B** to intelligently answer screening questions based on:

1. **Candidate Profile**: Name, skills, experience, current role
2. **Job Details**: Title, description, requirements
3. **Question Type**: Text input, multiple choice, date, etc.

**Supported Question Types:**
- ✅ `INPUT_TEXT` - Text input fields
- ✅ `INPUT_INT` - Numeric input (salary, years of experience)
- ✅ `TEXTAREA` - Long text answers
- ✅ `DATE` - Date selection
- ✅ `DATE_RANGE` - Period selection
- ✅ `SINGLE_SELECT` - Dropdown selection
- ✅ `MULTI_SELECT` - Multiple choice
- ✅ `RADIO` - Single choice (Yes/No)
- ✅ `CHECKBOX` - Boolean confirmation
- ✅ `HYPERLINK` - URL input
- ✅ `FILE` - Document upload
- ✅ `INFORMATION` - Display-only content

### Consent Management

AI agent automatically:
- ✅ Accepts all **mandatory** consents (Privacy Policy, Terms & Conditions)
- ❌ Declines **optional** marketing consents (by default)

### CV Handling

The agent:
1. Tries to load candidate's CV from file system
2. If not found, generates a text CV from candidate profile
3. Converts to Base64 and submits as PDF

## 💡 Usage Examples

### Example 1: Manual Application via API

```typescript
// From your frontend or another service
const response = await fetch('/api/pnet/apply-candidate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    candidateId: 'abc-123',
    jobUrl: 'https://pnet.co.za/jobs/software-engineer-johannesburg',
    jobTitle: 'Software Engineer',
    jobDescription: 'React developer needed in Johannesburg'
  })
});

const result = await response.json();
console.log(result.success); // true
console.log(result.message); // "Application submitted successfully to PNET"
```

### Example 2: Programmatic Bulk Apply

```typescript
import { pnetApplicationAgent } from './server/pnet-application-agent';

const candidates = await storage.getCandidates(tenantId);
const matchingCandidates = candidates.filter(c => 
  c.skills?.includes('React') || c.currentRole?.includes('Developer')
);

const result = await pnetApplicationAgent.bulkApply(
  matchingCandidates,
  'https://pnet.co.za/jobs/12345',
  'React Developer',
  'We need an experienced React developer...'
);

console.log(`Applied ${result.successful} out of ${result.total} candidates`);
```

### Example 3: Direct Service Usage

```typescript
import { pnetAPIService } from './server/pnet-api-service';

// Check job status
const inquiry = await pnetAPIService.inquireJob(
  'https://pnet.co.za/jobs/12345'
);

if (inquiry.Body?.JobStatus === 'ACTIVE') {
  console.log('Job is active!');
  console.log('Screening questions:', inquiry.Body.Questions?.length);
}

// Submit application manually
const response = await pnetAPIService.submitApplication(
  {
    Email: 'candidate@example.com',
    FirstName: 'John',
    Surname: 'Doe',
    Mobile: '0821234567',
    cvBase64: '...base64 encoded CV...',
    cvFileName: 'John_Doe_CV.pdf',
    cvFileType: 'pdf',
    Answers: [...],
    Consents: {...}
  },
  'https://pnet.co.za/jobs/12345'
);
```

## 🔍 Monitoring & Debugging

### Check Logs

The AI agent logs all operations:

```bash
tail -f server.log | grep PNetAgent
```

You'll see:
- `[PNetAgent] Starting application for...`
- `[PNetAgent] Job is active. Screening questions: 3`
- `[PNetAgent] Generating answers for 3 screening questions using AI`
- `[PNetAgent] Generated 3 answers`

### Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `PNET_API_KEY not configured` | Missing API key | Add to `.env` file |
| `Job is not active on PNET` | Job expired/closed | Check job status first |
| `UNAUTHORIZED` | Invalid API key | Verify credentials with PNET |
| `INVALID_REQUEST` | Missing required fields | Check request format |
| `DUPLICATED_REQUEST` | Candidate already applied | Check application history |

## 🚀 Advanced Features

### Custom Question Answering

Override AI-generated answers:

```typescript
import { pnetApplicationAgent } from './server/pnet-application-agent';

// Extend the class for custom logic
class CustomPNetAgent extends pnetApplicationAgent {
  async generateScreeningAnswers(candidate, questions, jobTitle, jobDescription) {
    // Your custom logic here
    return customAnswers;
  }
}
```

### Rate Limiting

The bulk apply feature includes automatic rate limiting:
- 2 seconds delay between applications
- Prevents API throttling

### Retry Logic

Add retry logic for failed applications:

```typescript
async function applyWithRetry(candidateId, jobUrl, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fetch('/api/pnet/apply-candidate', {
        method: 'POST',
        body: JSON.stringify({ candidateId, jobUrl })
      });
      if (result.success) return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 5000 * (i + 1))); // Exponential backoff
    }
  }
}
```

## 📋 Checklist for Production

- [ ] PNET API credentials configured in `.env`
- [ ] Test with a real PNET job URL
- [ ] Verify candidate CVs are accessible
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure rate limits appropriately
- [ ] Test all 12 question types
- [ ] Verify consent handling
- [ ] Set up application tracking in your database

## 🆘 Support

For PNET API issues:
- Email: atsiapply@stepstone.com
- Documentation: https://app.swaggerhub.com/apis/ATSi-Apply/ats-api_specification/V4

For integration issues:
- Check logs: `tail -f server.log`
- Enable debug mode: `DEBUG=pnet:* npm run dev`

---

**Built with ❤️ for Avatar Human Capital AI Agents**
