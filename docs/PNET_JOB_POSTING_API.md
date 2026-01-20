# PNet Job Posting API Integration Guide

**Your Credentials:**
- **Sender ID**: 74597
- **Org ID**: 120881

---

## Overview

PNet Job Posting API allows you to post jobs to PNet programmatically via XML HTTP POST interface.

### Key Points:
- ✅ One set of hardcoded credentials for ALL clients
- ✅ Only **Sender ID** and **Org ID** change per client
- ✅ Clients need listing credits on PNet to post jobs
- ✅ Standard vs Personalized listings (branded)

---

## API Endpoint

**Production URL**: `https://feed.pnet.co.za/jobfeed.aspx`
**Test URL**: Use `test_` prefix in reference_id to create test adverts

---

## Authentication

**Static credentials** (hardcoded in your system):
- Username: [From Authentication doc - to be provided by PNet]
- Password: [From Authentication doc - to be provided by PNet]

**Per-client identification:**
```xml
<joblisting sender_id="74597" organisation_id="120881">
```

---

## XML Structure

### Complete Example:

```xml
<?xml version="1.0" encoding="utf-8"?>
<jobfeed>
    <joblisting 
        reference_id="AHC_JOB_12345" 
        sender_id="74597" 
        organisation_id="120881" 
        action="INSERT">
        
        <!-- Categories (from Categorization.xlsx) -->
        <workfield id="1005001"/>          <!-- Function/Role -->
        <geography id="22006005"/>         <!-- Location -->
        <sector id="4000"/>                <!-- Industry -->
        <contracttype id="903"/>           <!-- Permanent/Contract/Temp -->
        <worktype id="80001"/>             <!-- Full-time/Part-time -->
        <experience id="90001"/>           <!-- Experience level -->
        <situation id="91000"/>            <!-- Job situation -->
        
        <!-- Metadata -->
        <channel><![CDATA[ZA]]></channel>
        <listingtype><![CDATA[Standard]]></listingtype>
        
        <!-- Publishing dates -->
        <publish_start>17/12/2024</publish_start>
        <publish_duration>30</publish_duration>
        
        <!-- Job Details -->
        <jobdetails>
            <language><![CDATA[EN]]></language>
            <jobtitle><![CDATA[Senior Software Developer]]></jobtitle>
            
            <introduction title="About the Company">
                <![CDATA[Avatar Human Capital is a leading HR technology company...]]>
            </introduction>
            
            <tasks title="Responsibilities">
                <![CDATA[
                • Develop and maintain software applications
                • Lead technical projects
                • Mentor junior developers
                ]]>
            </tasks>
            
            <profile title="Requirements">
                <![CDATA[
                • 5+ years of experience
                • Bachelor's degree in Computer Science
                • Strong problem-solving skills
                ]]>
            </profile>
            
            <offer title="What We Offer">
                <![CDATA[
                • Competitive salary
                • Medical aid
                • Work from home options
                ]]>
            </offer>
            
            <contactinfo title="How to Apply">
                <![CDATA[Apply through our careers portal]]>
            </contactinfo>
            
            <joblocations>
                <location>
                    <countrycode><![CDATA[ZA]]></countrycode>
                    <city><![CDATA[Johannesburg]]></city>
                    <postalcode><![CDATA[2000]]></postalcode>
                    <streetname><![CDATA[Main Road]]></streetname>
                    <buildingnumber><![CDATA[123]]></buildingnumber>
                </location>
            </joblocations>
            
            <keywords><![CDATA[software, developer, javascript, react]]></keywords>
            
            <apply>
                <email><![CDATA[apply@avatarhumancapital.com]]></email>
                <url><![CDATA[https://avatarhumancapital.com/apply]]></url>
            </apply>
        </jobdetails>
        
        <!-- Company Details -->
        <companydetails>
            <companyname><![CDATA[Avatar Human Capital]]></companyname>
            <contract>
                <name><![CDATA[Professional]]></name>
                <internship><![CDATA[false]]></internship>
                <duration><![CDATA[90]]></duration>
            </contract>
            <recruiter>
                <position><![CDATA[HR Manager]]></position>
                <gender><![CDATA[M]]></gender>
                <firstname><![CDATA[John]]></firstname>
                <lastname><![CDATA[Doe]]></lastname>
                <email><![CDATA[john@avatarhumancapital.com]]></email>
                <phone><![CDATA[+27123456789]]></phone>
            </recruiter>
        </companydetails>
    </joblisting>
</jobfeed>
```

---

## Actions

### 1. INSERT - Post New Job
```xml
<joblisting reference_id="AHC_12345" action="INSERT">
```

### 2. UPDATE - Update Existing Job
```xml
<joblisting reference_id="AHC_12345" action="UPDATE">
```

### 3. DELETE - Remove Job
```xml
<joblisting reference_id="AHC_12345" action="DELETE">
```

---

## Listing Types

### Standard (Default)
```xml
<listingtype><![CDATA[Standard]]></listingtype>
```
- Uses standard JF credits
- Normal job listing appearance

### Personalized (Branded)
```xml
<listingtype><![CDATA[Personalised]]></listingtype>
```
- Uses personalized JF credits
- Branded listings (LD2/LD3 - 'better'/'best')
- Client must request and set up with PNet

---

## Testing

### Test Job Posting
Add `test_` prefix to reference_id:

```xml
<joblisting reference_id="test_AHC_12345" sender_id="74597" organisation_id="120881" action="INSERT">
```

**Benefits:**
- Job posted to PNet but NOT live
- Accessible via specialized test link
- No credits consumed
- Can verify XML format and data

---

## Category IDs

Reference `Categorization.xlsx` for all category IDs:

### Common Categories:

**Work Fields (Functions):**
- 1005001 - IT / Software Development
- 1005002 - Sales / Marketing
- 1005003 - Finance / Accounting
- [See Categorization.xlsx for full list]

**Geography (Locations):**
- 22006005 - Johannesburg
- 22006006 - Cape Town
- 22006007 - Durban
- [See Categorization.xlsx for full list]

**Contract Types:**
- 903 - Permanent
- 904 - Contract
- 905 - Temporary
- [See Categorization.xlsx for full list]

**Work Types:**
- 80001 - Full-time
- 80002 - Part-time
- [See Categorization.xlsx for full list]

**Experience Levels:**
- 90001 - Entry Level
- 90002 - Mid Level
- 90003 - Senior Level
- [See Categorization.xlsx for full list]

---

## Publishing Duration

```xml
<publish_start>17/12/2024</publish_start>
<publish_duration>30</publish_duration>
```

- **publish_start**: Date job goes live (DD/MM/YYYY)
- **publish_duration**: Number of days job stays online
- Can set current date or future date
- Can extend duration via UPDATE action

---

## HTTP POST Request

### Request Structure:

**Method**: POST  
**URL**: `https://feed.pnet.co.za/jobfeed.aspx`  
**Headers**:
```
Content-Type: application/xml
Authorization: Basic [base64(username:password)]
```

**Body**: XML content (as shown above)

---

## Response Codes

See `Return Codes.docx` for full list.

**Common responses:**
- `200 OK` - Success
- `400 Bad Request` - Invalid XML
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Insufficient credits
- `500 Server Error` - PNet system error

**Success Response Example:**
```xml
<response>
    <status>success</status>
    <reference_id>AHC_12345</reference_id>
    <pnet_job_id>123456789</pnet_job_id>
    <message>Job posted successfully</message>
</response>
```

---

## Integration Checklist

### Setup:
- [ ] Get authentication credentials from PNet
- [ ] Confirm Sender ID: **74597**
- [ ] Confirm Org ID: **120881**
- [ ] Review Categorization.xlsx for category IDs
- [ ] Set up test environment with `test_` prefix

### Implementation:
- [ ] Create XML generation function
- [ ] Map job fields to PNet categories
- [ ] Implement INSERT action
- [ ] Implement UPDATE action
- [ ] Implement DELETE action
- [ ] Handle response codes
- [ ] Error logging and retry logic

### Testing:
- [ ] Post test job with `test_` prefix
- [ ] Verify job appears in test link
- [ ] Update test job
- [ ] Delete test job
- [ ] Test error handling

### Production:
- [ ] Post real job without `test_` prefix
- [ ] Monitor credit usage
- [ ] Set up automatic job updates
- [ ] Set up job expiry handling

---

## Example Node.js Integration

```typescript
import axios from 'axios';

interface PNetJobPost {
  referenceId: string;
  title: string;
  description: string;
  location: string;
  // ... other fields
}

export class PNetJobPostingService {
  private readonly PNET_URL = 'https://feed.pnet.co.za/jobfeed.aspx';
  private readonly SENDER_ID = '74597';
  private readonly ORG_ID = '120881';
  private readonly USERNAME = process.env.PNET_USERNAME!;
  private readonly PASSWORD = process.env.PNET_PASSWORD!;

  async postJob(job: PNetJobPost, action: 'INSERT' | 'UPDATE' | 'DELETE') {
    const xml = this.generateXML(job, action);
    
    try {
      const response = await axios.post(this.PNET_URL, xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Basic ${Buffer.from(`${this.USERNAME}:${this.PASSWORD}`).toString('base64')}`
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('PNet API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  private generateXML(job: PNetJobPost, action: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<jobfeed>
    <joblisting reference_id="${job.referenceId}" sender_id="${this.SENDER_ID}" organisation_id="${this.ORG_ID}" action="${action}">
        <workfield id="1005001"/>
        <geography id="22006005"/>
        <sector id="4000"/>
        <contracttype id="903"/>
        <worktype id="80001"/>
        <experience id="90001"/>
        <channel><![CDATA[ZA]]></channel>
        <listingtype><![CDATA[Standard]]></listingtype>
        <publish_start>${new Date().toLocaleDateString('en-GB')}</publish_start>
        <publish_duration>30</publish_duration>
        <jobdetails>
            <language><![CDATA[EN]]></language>
            <jobtitle><![CDATA[${job.title}]]></jobtitle>
            <introduction title=""><![CDATA[${job.description}]]></introduction>
            <joblocations>
                <location>
                    <countrycode><![CDATA[ZA]]></countrycode>
                    <city><![CDATA[${job.location}]]></city>
                </location>
            </joblocations>
            <apply>
                <email><![CDATA[apply@avatarhumancapital.com]]></email>
            </apply>
        </jobdetails>
        <companydetails>
            <companyname><![CDATA[Avatar Human Capital]]></companyname>
        </companydetails>
    </joblisting>
</jobfeed>`;
  }
}
```

---

## Important Notes

1. **Credits**: Clients must have sufficient PNet listing credits
2. **Reference ID**: Must be unique per job (use your internal job ID)
3. **Categories**: Must use valid category IDs from Categorization.xlsx
4. **CDATA**: Always wrap text content in `<![CDATA[...]]>` tags
5. **Testing**: Always test with `test_` prefix first
6. **Updates**: Use same reference_id with UPDATE action
7. **Deletion**: Use DELETE action, not expiry - jobs auto-expire after duration

---

## Support

- **PNet Technical Support**: [Contact details from PNet]
- **Categorization Reference**: See `Categorization.xlsx`
- **Return Codes**: See `Return Codes.docx`
- **HTTP Interface**: See `HTTP Posting Interface.docx`

---

**Document Created**: 17 December 2024  
**Your Credentials**: Sender ID: 74597, Org ID: 120881  
**Status**: Ready for implementation
