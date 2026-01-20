# PNet AI Agent Analysis - What We Actually Need

**Date**: 17 December 2024  
**Current Implementation**: PNet Application Agent (ATSi Apply API V4)  
**Your Credentials**: Sender ID: 74597, Org ID: 120881

---

## 🎯 **Two Separate PNet Integrations**

You have documentation for **TWO DIFFERENT** PNet APIs that serve different purposes:

### **1. Job Posting API (XML Feed)** 📤
**What**: Post jobs TO PNet  
**Purpose**: List your jobs on PNet for candidates to find  
**Status**: ❌ NOT implemented yet  
**Your Credentials**: Sender ID: 74597, Org ID: 120881  

### **2. ATSi Apply API V4 (JSON REST)** 📥
**What**: Apply candidates TO jobs on PNet  
**Purpose**: Automatically submit candidate applications to PNet job listings  
**Status**: ✅ ALREADY implemented (`pnet-application-agent.ts`)  

---

## ✅ **What You ALREADY Have (ATSi Apply API)**

### **Current PNet Application Agent** (`pnet-application-agent.ts`)

**What it does:**
1. ✅ Takes a candidate from YOUR database
2. ✅ Takes a PNet job URL (job posted by someone else on PNet)
3. ✅ Checks if the job is active
4. ✅ Gets the job's screening questions
5. ✅ Uses **Groq AI** to generate intelligent answers to screening questions
6. ✅ Prepares candidate CV in base64 format
7. ✅ Accepts mandatory consents automatically
8. ✅ Submits the full application to PNet on behalf of the candidate
9. ✅ Returns success/failure and PNet application ID

**Example usage:**
```typescript
const result = await pnetApplicationAgent.applyToJob({
  candidate: candidateFromDB,
  jobUrl: "https://www.pnet.co.za/job/12345",
  jobTitle: "Software Developer",
  jobDescription: "Looking for a senior developer..."
});

// Result:
{
  success: true,
  message: "Application submitted successfully to PNET",
  pnetApplicationId: "PNET-APP-123456"
}
```

**Features:**
- ✅ AI-powered screening question answering
- ✅ Bulk application support (apply multiple candidates at once)
- ✅ Rate limiting (2 seconds between applications)
- ✅ Automatic consent handling
- ✅ CV generation from candidate data
- ✅ Error handling and retry logic

---

## ❌ **What You DON'T Have Yet (Job Posting API)**

### **Missing: PNet Job Posting Service**

**What it would do:**
1. Take a job from YOUR system
2. Convert it to PNet XML format
3. Post it to PNet so it appears on www.pnet.co.za
4. Update or delete jobs
5. Track job credits

**Why you need it:**
- Post YOUR jobs to PNet's job board
- Reach PNet's candidate database
- Manage job listings programmatically
- Track which jobs are live on PNet

---

## 🔍 **The Complete PNet Workflow (What You Actually Need)**

### **Scenario 1: You Post a Job, Candidates Apply**
**Current State**: ❌ Can't do this yet

**What you need:**
1. **Job Posting API** (use Sender ID: 74597, Org ID: 120881)
   - Post your job to PNet
   - Job appears on www.pnet.co.za
   - Candidates find and apply to your job on PNet
   - PNet sends applications to your ATS
   
**What's missing**: Job Posting API implementation

---

### **Scenario 2: Someone Else Posts Job, You Apply Your Candidates**
**Current State**: ✅ Can do this NOW

**How it works:**
1. Find a job on PNet (posted by another company)
2. Use **ATSi Apply API** (already implemented)
3. AI Agent automatically applies your candidates
4. PNet receives the applications

**What you have**: `pnet-application-agent.ts` ✅

---

### **Scenario 3: Complete PNet Integration (Ideal)**
**Future State**: 🎯 This is what you want

**Full workflow:**
1. **YOUR JOBS** → Post via Job Posting API → Appear on PNet
2. **PNET CANDIDATES** → Search/find via Partner.Net Data API → Import to your system
3. **YOUR CANDIDATES** → Apply via ATSi Apply API → Submit to PNet jobs
4. **APPLICATIONS** → Receive from PNet → Manage in your ATS

**What you need to complete this:**
- ✅ ATSi Apply API (DONE)
- ❌ Job Posting API (NEED)
- ❌ Partner.Net Data API (NEED - for candidate search, requires partnership)

---

## 📊 **Comparison: What Each API Does**

| Feature | ATSi Apply API ✅ | Job Posting API ❌ | Partner.Net Data API ❌ |
|---------|------------------|-------------------|------------------------|
| **Purpose** | Apply candidates to jobs | Post jobs to PNet | Search PNet candidates |
| **Direction** | YOU → PNet | YOU → PNet | PNet → YOU |
| **Status** | Implemented | Not implemented | Not available yet |
| **What it handles** | Candidate applications | Job listings | Candidate sourcing |
| **Your credentials** | API endpoint | Sender: 74597<br>Org: 120881 | Partnership required |
| **Data flow** | Send candidates OUT | Send jobs OUT | Get candidates IN |
| **When to use** | Apply your people to PNet jobs | List your jobs on PNet | Find PNet candidates |

---

## 💡 **What the ATSi Apply API Actually Requires**

### **From PNet (Job Side):**
1. ✅ Job must be ACTIVE on PNet
2. ✅ Job URL (e.g., `https://www.pnet.co.za/job/12345`)
3. ✅ PNet returns:
   - Screening questions
   - Required basic fields (FirstName, Surname, Email, etc.)
   - Mandatory consents
   - Optional consents

### **From You (Candidate Side):**
1. ✅ Candidate data:
   - Full name
   - Email
   - Phone (optional)
   - CV (file path or generated)
   - Skills, experience, location
   
2. ✅ AI generates:
   - Answers to screening questions
   - Intelligent responses based on candidate profile
   
3. ✅ System handles:
   - CV conversion to base64
   - Consent acceptance
   - Application submission
   - Error handling

### **API Flow:**

```
1. YOUR SYSTEM
   ↓
   Candidate: { name, email, phone, skills, cv }
   Job URL: "https://pnet.co.za/job/12345"
   ↓
   
2. PNET INQUIRY (GET)
   ← GET /inquiry (check if job active)
   → Returns: questions, consents, requirements
   ↓
   
3. AI PROCESSING (Groq)
   ← Screening questions
   → AI generates answers
   ↓
   
4. APPLICATION SUBMISSION (POST)
   → POST /application
   → Send: candidate data, CV, answers, consents
   ↓
   
5. PNET RESPONSE
   ← Status: OK
   ← Application ID: "PNET-APP-123"
   ↓
   
6. YOUR SYSTEM
   ✅ Store application ID
   ✅ Update candidate status
```

---

## 🚀 **What You Should Do Next**

### **Priority 1: Implement Job Posting API** ⭐⭐⭐
**Why**: Post YOUR jobs to PNet to reach their candidate pool

**What you need:**
- Sender ID: 74597
- Org ID: 120881
- Authentication credentials (get from PNet)
- Category IDs from Categorization.xlsx

**Implementation time**: ~2-3 days

**Impact**: HIGH - Opens up PNet's job board to your clients

---

### **Priority 2: Keep Using ATSi Apply API** ⭐⭐
**Why**: Already works, just need to use it

**What to do:**
1. When you find good candidates for a PNet job
2. Use existing `pnetApplicationAgent.applyToJob()`
3. AI automatically handles screening questions
4. Track application success

**Implementation time**: Already done ✅

**Impact**: MEDIUM - Helps place candidates in PNet jobs

---

### **Priority 3: Request Partner.Net Data API Access** ⭐
**Why**: Search and import PNet candidates (requires partnership)

**What to do:**
1. Send partnership email (already drafted)
2. Wait for PNet approval
3. Implement when approved

**Implementation time**: TBD (depends on PNet)

**Impact**: HIGH (if approved) - Access to candidate database

---

## 📋 **Summary: What You Actually Need**

### **From ATSi Apply API (Already Have):** ✅
- **Input**: Candidate object + PNet job URL
- **Process**: AI answers questions, submits application
- **Output**: Success/failure + Application ID
- **Requirements**: Nothing! It's done and working

### **From Job Posting API (Need to Build):** ❌
- **Input**: Your job details
- **Process**: Convert to XML, POST to PNet
- **Output**: Job appears on PNet
- **Requirements**: 
  - ✅ Sender ID: 74597
  - ✅ Org ID: 120881
  - ❌ Auth credentials (request from PNet)
  - ✅ Category mappings (from Categorization.xlsx)

### **From Partner.Net Data API (Future):** 🔮
- **Input**: Search criteria
- **Process**: Query PNet candidate database
- **Output**: Candidate profiles with contact info
- **Requirements**:
  - ❌ Partnership approval
  - ❌ API credentials
  - ❌ Budget for usage

---

## 🎯 **The Big Picture**

**What you have:**
- ✅ System to SEND candidates TO PNet jobs (ATSi Apply API)

**What you're missing:**
- ❌ System to POST jobs TO PNet (Job Posting API)
- ❌ System to GET candidates FROM PNet (Partner.Net Data API)

**What you should build first:**
- **Job Posting API** - Use your Sender ID: 74597, Org ID: 120881

This completes the "outbound" flow and makes your platform valuable to clients who want their jobs on PNet!

---

**Document Created**: 17 December 2024  
**Status**: Analysis Complete  
**Next Step**: Implement Job Posting API with your credentials
