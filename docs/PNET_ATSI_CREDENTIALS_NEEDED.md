# What You Need from PNet Team for ATSi Apply API

**Date**: 17 December 2024  
**API**: ATSi Apply API V4 (Candidate Application Submission)  
**Status**: Code implemented, credentials needed

---

## 🎯 **What You Need from PNet Team**

### **1. API Key** ⭐⭐⭐ CRITICAL
**Environment Variable**: `PNET_API_KEY`

**What it is**: Authentication key for ATSi Apply API  
**Used for**: Submitting candidate applications to PNet jobs  
**Header format**: `apiKey: YOUR_API_KEY_HERE`

**Example**: 
```
PNET_API_KEY=sk_live_abc123xyz789...
```

---

### **2. API Base URL** ⭐⭐⭐ CRITICAL
**Environment Variable**: `PNET_API_BASE_URL`

**What it is**: Base endpoint for ATSi Apply API  
**Likely values**:
- Production: `https://api.atsi-apply.com` or `https://api.pnet.co.za/atsi/v4`
- Test/Sandbox: `https://sandbox.atsi-apply.com` or similar

**Example**:
```
PNET_API_BASE_URL=https://api.atsi-apply.com
```

---

## 📋 **Email Template to Send to PNet**

Copy and paste this email:

---

**Subject**: Request for ATSi Apply API V4 Credentials - Avatar Human Capital

**To**: PNet Technical Support / API Team

**Body**:

```
Hello PNet Team,

We are Avatar Human Capital and we would like to integrate with PNet's ATSi Apply API V4 to automatically submit candidate applications to jobs posted on PNet.

We have already implemented the integration on our platform and are ready to test.

Could you please provide us with the following credentials:

1. **API Key** for ATSi Apply API V4
2. **API Base URL** (production and test/sandbox if available)
3. **Documentation** for ATSi Apply API V4 (if not already provided)
4. **Test job URL** we can use for testing applications

Our details:
- Company: Avatar Human Capital
- Sender ID: 74597
- Organisation ID: 120881
- Technical Contact: [Your Name]
- Email: [Your Email]
- Phone: [Your Phone]

We have also requested access to the Partner.Net Data API for candidate sourcing. Please confirm if these are the same credentials or if we need separate ones.

Thank you for your assistance.

Best regards,
[Your Name]
Avatar Human Capital
```

---

## 🔧 **How to Configure Once You Get Credentials**

### **Step 1: Update `.env` file**

Add to `/home/zubeid/AvatarHumanCapital/.env`:

```bash
# PNet ATSi Apply API V4
PNET_API_KEY=your_api_key_from_pnet
PNET_API_BASE_URL=https://api.atsi-apply.com
```

### **Step 2: Restart your server**

```bash
npm run dev
```

### **Step 3: Test the integration**

The code is already implemented! Just use it:

```typescript
import { pnetApplicationAgent } from './server/pnet-application-agent';

// Apply a candidate to a PNet job
const result = await pnetApplicationAgent.applyToJob({
  candidate: {
    id: "123",
    fullName: "John Doe",
    email: "john@example.com",
    phone: "+27123456789",
    // ... other candidate fields
  },
  jobUrl: "https://www.pnet.co.za/job/12345",
  jobTitle: "Software Developer",
  jobDescription: "We are looking for..."
});

console.log(result);
// {
//   success: true,
//   message: "Application submitted successfully to PNET",
//   pnetApplicationId: "PNET-APP-123456"
// }
```

---

## ✅ **What's Already Implemented**

Your code already handles:

1. ✅ **Authentication**: Uses `apiKey` header automatically
2. ✅ **Job Inquiry**: Checks if job is active, gets screening questions
3. ✅ **AI-Powered Answers**: Uses Groq to generate intelligent screening answers
4. ✅ **CV Handling**: Converts CV to base64 format
5. ✅ **Consent Management**: Automatically accepts mandatory consents
6. ✅ **Application Submission**: Posts complete application to PNet
7. ✅ **Error Handling**: Handles API errors gracefully
8. ✅ **Bulk Applications**: Can apply multiple candidates at once
9. ✅ **Rate Limiting**: 2-second delay between applications

**Files**:
- `server/pnet-api-service.ts` - API communication layer
- `server/pnet-application-agent.ts` - AI-powered application agent

---

## 🚨 **Important Notes**

### **Current Status**
Your code will show this warning until configured:
```
[PNetAPIService] WARNING: PNET_API_KEY not configured. API calls will fail.
```

This is EXPECTED and will disappear once you add the credentials.

### **Two Different APIs**

**Don't confuse these:**

1. **ATSi Apply API** (what you're asking about)
   - For APPLYING candidates to jobs
   - Needs: API Key + Base URL
   - Status: Code ready, needs credentials ✅

2. **Job Posting API** (different)
   - For POSTING jobs to PNet
   - Needs: Sender ID (74597) + Org ID (120881) + Auth credentials
   - Status: Not implemented yet ❌

They are SEPARATE systems with DIFFERENT credentials!

---

## 📊 **Testing Checklist**

Once you get credentials:

- [ ] Add `PNET_API_KEY` to `.env`
- [ ] Add `PNET_API_BASE_URL` to `.env`
- [ ] Restart server
- [ ] Check console - warning should disappear
- [ ] Get a test PNet job URL from PNet team
- [ ] Run test application with a test candidate
- [ ] Verify application appears on PNet
- [ ] Check response includes `pnetApplicationId`
- [ ] Test with real job and candidate

---

## 🎯 **Summary**

**You need from PNet:**
1. **API Key** - for authentication
2. **API Base URL** - where to send requests
3. **Test job URL** - for testing (optional but helpful)

**You already have:**
- ✅ Full implementation
- ✅ AI-powered screening answers
- ✅ Error handling
- ✅ Bulk application support

**Next step:**
Send the email above to PNet team and wait for credentials!

---

## 📞 **Who to Contact at PNet**

Ask for:
- **ATSi Apply API Team**
- **PNet Technical Support**
- **API Integration Team**

Emails to try:
- `support@pnet.co.za`
- `api@pnet.co.za`
- `integrations@pnet.co.za`
- Your PNet account manager

---

**Document Created**: 17 December 2024  
**Status**: Waiting for PNet credentials  
**ETA**: Once credentials received, ready to use immediately ✅
