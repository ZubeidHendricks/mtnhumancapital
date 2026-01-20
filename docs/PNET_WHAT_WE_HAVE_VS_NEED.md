# PNet APIs: What They Gave Us vs What We Need

**Date**: 17 December 2024  
**Company**: Avatar Human Capital  
**Your IDs**: Sender ID: 74597, Org ID: 120881

---

## 🎯 **Summary: The Confusion**

PNet gave you documentation for **Job Posting API** (to post jobs TO PNet), but you ALSO have code for **ATSi Apply API** (to apply candidates TO jobs). These are **TWO COMPLETELY DIFFERENT APIs**.

---

## 📦 **What PNet Gave You (in "Functional API" folder)**

### **Job Posting API Documentation** 📤

**Files they provided:**
1. ✅ `Authentication.txt` - How authentication works
2. ✅ `Full XML Example.txt` - Sample XML for posting jobs
3. ✅ `HTTP Posting Interface.docx` - API endpoint and methods
4. ✅ `Categorization.xlsx` - All category IDs (47KB file)
5. ✅ `Return Codes.docx` - API response codes
6. ✅ `ListingType.txt` - Standard vs Personalized listings
7. ✅ `Start and End Date.txt` - Job duration logic
8. ✅ `Test Advert Prefix.txt` - How to test

**What this API does:**
- Post YOUR jobs to PNet's website (www.pnet.co.za)
- Update/delete jobs
- Jobs appear on PNet for candidates to find

**Your credentials for this:**
- ✅ Sender ID: **74597**
- ✅ Org ID: **120881**
- ❌ **Missing**: Username/Password for API authentication

**Status**: ❌ Not implemented yet, still need username/password

---

## 💻 **What You Already Have (in your code)**

### **ATSi Apply API Implementation** 📥

**Files you built:**
1. ✅ `server/pnet-api-service.ts` - API service layer
2. ✅ `server/pnet-application-agent.ts` - AI agent that applies candidates

**What this API does:**
- Apply YOUR candidates TO jobs on PNet
- AI answers screening questions automatically
- Submit CVs and applications

**Credentials needed for this:**
- ❌ **Missing**: `PNET_API_KEY`
- ❌ **Missing**: `PNET_API_BASE_URL`

**Status**: ✅ Code implemented, needs credentials

---

## 📊 **Complete Breakdown**

### **API #1: Job Posting API (XML Feed)**

| Item | Status | Details |
|------|--------|---------|
| **Purpose** | Post jobs TO PNet | Your jobs appear on www.pnet.co.za |
| **What PNet gave you** | ✅ Complete documentation | All files in "Functional API" folder |
| **Your credentials** | ✅ Sender ID: 74597<br>✅ Org ID: 120881 | Per-client identification |
| **Still need from PNet** | ❌ Username<br>❌ Password | For API authentication (hardcoded) |
| **Implementation** | ❌ Not built yet | Need to create service |
| **Endpoint** | ✅ `https://feed.pnet.co.za/jobfeed.aspx` | From documentation |
| **Format** | XML POST | As shown in Full XML Example.txt |

**What's happening:**
- PNet gave you the documentation
- They gave you client IDs (74597, 120881)
- They still need to give you **username/password** for authentication
- You haven't built this integration yet

---

### **API #2: ATSi Apply API (JSON REST)**

| Item | Status | Details |
|------|--------|---------|
| **Purpose** | Apply candidates TO jobs | Submit applications to PNet jobs |
| **What PNet gave you** | ❌ Nothing | You built this yourself |
| **Your credentials** | ❌ Not provided yet | Need to request |
| **Still need from PNet** | ❌ API Key<br>❌ Base URL | For authentication |
| **Implementation** | ✅ Fully built | Already in your code |
| **Endpoint** | ❓ Unknown | Need from PNet (likely `https://api.atsi-apply.com`) |
| **Format** | JSON REST | Standard REST API |

**What's happening:**
- You built this integration already
- You have NO credentials yet
- You need to REQUEST credentials from PNet
- Code is ready, just needs API key

---

## 🔑 **What You NEED from PNet**

### **For Job Posting API** (they started this, incomplete)

**What they gave:**
- ✅ Documentation (all files in "Functional API" folder)
- ✅ Your Sender ID: 74597
- ✅ Your Org ID: 120881

**What they DIDN'T give (still need):**
- ❌ **Username** (for authentication)
- ❌ **Password** (for authentication)

**From their documentation:**
> "Your listings feed only needs the one set of credentials to post listings for ALL mutual clients. This must never change. It should be hardcoded... the authentication to the posting interface that will be provided to you."

**Translation**: They will provide username/password, but haven't yet!

---

### **For ATSi Apply API** (you built this, need everything)

**What they gave:**
- ❌ Nothing

**What you need:**
- ❌ **API Key**
- ❌ **API Base URL**
- ❌ **Test job URL** (optional)

---

## 📧 **Emails You Need to Send**

### **Email #1: Request Job Posting API Credentials**

```
Subject: Request for Job Posting API Authentication Credentials

Hello PNet Team,

We received the Job Posting API documentation and our client 
identifiers (Sender ID: 74597, Org ID: 120881).

According to the Authentication.txt document, you will provide 
"one set of credentials to post listings for ALL mutual clients" 
that should be "hardcoded for the PNet listings XML."

Could you please provide:
1. Username for Job Posting API authentication
2. Password for Job Posting API authentication
3. Confirmation of API endpoint: https://feed.pnet.co.za/jobfeed.aspx

These will be used to post jobs to PNet on behalf of our clients.

Thank you!
```

---

### **Email #2: Request ATSi Apply API Credentials**

```
Subject: Request for ATSi Apply API V4 Credentials

Hello PNet Team,

We have implemented the ATSi Apply API V4 integration to 
automatically submit candidate applications to PNet jobs.

Could you please provide:
1. API Key for ATSi Apply API V4
2. API Base URL (production + test/sandbox)
3. Test job URL for testing applications

Our company details:
- Company: Avatar Human Capital
- Sender ID: 74597 (if same as Job Posting)
- Organisation ID: 120881 (if same as Job Posting)

Thank you!
```

---

## 🎯 **The Complete Picture**

### **What PNet Gave You:**

```
📦 "Functional API" Folder
├─ Job Posting API docs ✅
├─ Your Sender ID: 74597 ✅
├─ Your Org ID: 120881 ✅
└─ Missing: Username/Password ❌
```

### **What You Built Yourself:**

```
💻 Your Code
├─ ATSi Apply API implementation ✅
└─ Missing: API Key + Base URL ❌
```

### **What You Need to Request:**

```
📧 Email to PNet
├─ Job Posting: Username/Password
└─ ATSi Apply: API Key + Base URL
```

---

## 🔍 **Why This is Confusing**

**The problem:**
1. PNet gave you **partial** documentation for **one API** (Job Posting)
2. You built **another API** yourself (ATSi Apply)
3. Neither is complete
4. They use **different** authentication methods
5. You thought they were the same thing

**The reality:**
- **Job Posting API** = Post jobs TO PNet (XML, uses username/password)
- **ATSi Apply API** = Apply candidates TO jobs (JSON, uses API key)
- They are **separate systems** with **separate credentials**

---

## ✅ **Action Items**

### **Priority 1: Get Job Posting Credentials**
- [x] You have documentation
- [x] You have Sender ID: 74597
- [x] You have Org ID: 120881
- [ ] **REQUEST: Username/Password from PNet**
- [ ] Build the integration once you have credentials

### **Priority 2: Get ATSi Apply Credentials**
- [x] You have implementation
- [ ] **REQUEST: API Key from PNet**
- [ ] **REQUEST: API Base URL from PNet**
- [ ] Test once you have credentials

---

## 📋 **Summary Table**

| API | What PNet Gave | What You Built | What You Need | Status |
|-----|---------------|----------------|---------------|--------|
| **Job Posting** | ✅ Docs<br>✅ IDs (74597, 120881) | ❌ Nothing | ❌ Username<br>❌ Password | Incomplete |
| **ATSi Apply** | ❌ Nothing | ✅ Full code | ❌ API Key<br>❌ Base URL | Code ready |

---

## 🎯 **Bottom Line**

**What they gave you:**
- Job Posting documentation + your IDs (but no password)

**What they didn't give you:**
- Job Posting password
- ATSi Apply credentials (any)

**What you need to do:**
1. Email PNet for **Job Posting username/password**
2. Email PNet for **ATSi Apply API key + URL**
3. Once you have both, you can use both APIs

**Why it's confusing:**
They gave you HALF of one API and NONE of another API!

---

**Document Created**: 17 December 2024  
**Status**: Waiting for credentials from PNet for BOTH APIs  
**Next Step**: Send both emails to PNet team
