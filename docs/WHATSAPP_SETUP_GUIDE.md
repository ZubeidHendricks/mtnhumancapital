# WhatsApp Business Integration Setup Guide
**Business Phone Number**: 063 045 7306

---

## Overview

Your platform already has WhatsApp integration code ready. You just need to configure it with your WhatsApp Business API credentials from Meta (Facebook).

## Current Status

✅ **WhatsApp Service**: Fully implemented (`server/whatsapp-service.ts`)  
✅ **WhatsApp Monitor UI**: Built (`client/src/pages/whatsapp-monitor.tsx`)  
❌ **API Credentials**: Not configured (placeholder values in `.env`)  

---

## Step-by-Step Setup

### Option 1: WhatsApp Business API (Recommended for Production)

This is the official Meta WhatsApp Business API used by businesses worldwide.

#### Prerequisites:
- Facebook Business Manager account
- Verified business
- Phone number: **063 045 7306** (not currently used on WhatsApp)

#### Steps:

**1. Create/Access Meta Business Account**

Go to: https://business.facebook.com/

- Create a Business Manager account or use existing
- Verify your business (may require documents)

**2. Set Up WhatsApp Business Platform**

Go to: https://developers.facebook.com/

1. Click **"My Apps"** → **"Create App"**
2. Select **"Business"** as app type
3. Fill in app details:
   - **App Name**: Avatar Human Capital WhatsApp
   - **Business Account**: Your business
   - **Email**: [your email]

4. Once created, go to your app dashboard

**3. Add WhatsApp Product**

1. In app dashboard, click **"Add Product"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the WhatsApp setup wizard

**4. Add Phone Number (063 045 7306)**

1. In WhatsApp settings, click **"Add Phone Number"**
2. Select **"Add your own phone number"**
3. Enter: **+27 63 045 7306** (with country code)
4. Select method: **SMS** or **Voice call**
5. Enter verification code you receive

**5. Get API Credentials**

After setup, you'll see:

- **Phone Number ID**: A long numeric ID (save this)
- **WhatsApp Business Account ID**: Another ID (note this)
- **Access Token**: Temporary token (need permanent one)

**6. Create Permanent Access Token**

1. Go to **WhatsApp** → **Getting Started**
2. Under **"Permanent access token"**, click **"Create"**
3. Or use System User:
   - Settings → Users → System Users
   - Create system user: "WhatsApp Bot"
   - Generate token with these permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`

**7. Update Your `.env` File**

```bash
# WhatsApp Business API
WHATSAPP_API_TOKEN=your_permanent_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

**8. Set Up Webhook (for receiving messages)**

1. In WhatsApp settings, go to **"Webhooks"**
2. Click **"Configure Webhook"**
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/whatsapp/webhook
   ```
4. Create verification token (any random string):
   ```
   WHATSAPP_WEBHOOK_TOKEN=your_random_secure_token_123
   ```
5. Subscribe to events:
   - ✅ messages
   - ✅ message_status
   - ✅ message_echoes

6. Click **"Verify and Save"**

**9. Implement Webhook Endpoint**

Your platform needs a webhook endpoint. Create this file if it doesn't exist:

`server/routes/whatsapp-webhook.ts`:
```typescript
import { Router } from "express";
import { whatsappService } from "../whatsapp-service";

const router = Router();

// Webhook verification (Meta will call this)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

// Receive messages from WhatsApp
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            const value = change.value;
            
            // Process incoming message
            if (value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const from = message.from; // Phone number
              const waId = value.contacts?.[0]?.wa_id;
              const profileName = value.contacts?.[0]?.profile?.name;
              
              // Get tenant ID from business phone number ID
              // For now, use default tenant
              const tenantId = "default";
              
              await whatsappService.processIncomingMessage(
                tenantId,
                waId,
                from,
                profileName,
                message
              );
            }

            // Process message status updates
            if (value.statuses && value.statuses.length > 0) {
              const status = value.statuses[0];
              await whatsappService.updateMessageStatus(
                "default", // tenant ID
                status.id,
                status.status,
                new Date(status.timestamp * 1000)
              );
            }
          }
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    res.status(500).send("Error");
  }
});

export default router;
```

Add to your main router:
```typescript
import whatsappWebhookRouter from "./routes/whatsapp-webhook";
app.use("/api/whatsapp", whatsappWebhookRouter);
```

---

### Option 2: Twilio WhatsApp API (Easier Setup)

If Meta's setup is too complex, use Twilio as intermediary.

#### Steps:

1. **Sign up for Twilio**: https://www.twilio.com/
2. **Get WhatsApp-enabled number** or use sandbox
3. **Configure in Twilio Console**:
   - Get Account SID
   - Get Auth Token
   - Get WhatsApp number

4. **Update `.env`**:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+27630457306
```

5. **Modify `whatsapp-service.ts` to use Twilio SDK** instead of Meta API

**Pros**: Easier setup, good for testing  
**Cons**: Additional costs, not direct Meta integration  

---

## Testing Your Setup

### 1. Test Sending Messages

Create a test script: `server/test-whatsapp.ts`:

```typescript
import { whatsappService } from "./whatsapp-service";

async function testWhatsApp() {
  const tenantId = "default";
  const conversationId = "test-conv-1";
  const phone = "27630457306"; // Your business number for testing
  
  console.log("Testing WhatsApp integration...");
  console.log("Configured:", whatsappService.isConfigured());
  
  if (!whatsappService.isConfigured()) {
    console.error("WhatsApp not configured! Check your .env file.");
    return;
  }
  
  const message = await whatsappService.sendTextMessage(
    tenantId,
    conversationId,
    phone,
    "Hello from Avatar Human Capital! This is a test message.",
    "ai"
  );
  
  console.log("Message sent:", message);
}

testWhatsApp().catch(console.error);
```

Run:
```bash
npx tsx server/test-whatsapp.ts
```

### 2. Test Receiving Messages

1. Send a message to **063 045 7306** from your personal WhatsApp
2. Check your webhook logs
3. Message should appear in WhatsApp Monitor UI

### 3. Access WhatsApp Monitor

Once configured, access at:
```
https://your-domain.com/whatsapp-monitor
```

Features available:
- View all conversations
- Send/receive messages
- Track document requests
- Manage candidate communications

---

## Environment Variables Summary

Add these to your `.env` file:

```bash
# WhatsApp Business API (Meta/Facebook)
WHATSAPP_API_TOKEN=EAAxxxxxxxxx  # From Meta Business
WHATSAPP_PHONE_NUMBER_ID=123456789012345  # Phone Number ID from Meta
WHATSAPP_WEBHOOK_TOKEN=random_secure_string_123  # You choose this

# OR Twilio WhatsApp (Alternative)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+27630457306
```

---

## Features Your Platform Will Have

Once configured, your WhatsApp integration enables:

### ✅ Candidate Communication
- Automated candidate outreach
- Job notifications
- Interview scheduling
- Application status updates

### ✅ Document Collection
- Request documents via WhatsApp
- Receive documents directly
- Auto-categorize by type (ID, CV, certificates, etc.)
- Track submission status

### ✅ Appointment Management
- Send appointment requests
- Receive confirmations/reschedules
- Automated reminders

### ✅ KPI Reviews
- Send KPI review requests
- Receive employee scores
- Manager notifications

### ✅ Two-Way Messaging
- AI auto-responses (when handoff mode = "ai")
- Manual human responses (when handoff mode = "human")
- Message status tracking (sent, delivered, read)

---

## Costs

### Meta WhatsApp Business API
- **Free tier**: 1,000 conversations/month
- **After free tier**: ~$0.01-0.05 per conversation (varies by country)
- **Conversation**: 24-hour messaging window

### Twilio WhatsApp
- **Sandbox**: Free (for testing)
- **Production**: $0.005 per message + Twilio fees

---

## Production Checklist

Before going live:

- [ ] Business verified on Meta Business Manager
- [ ] Phone number **063 045 7306** verified and added
- [ ] Permanent access token created
- [ ] Webhook endpoint deployed and tested
- [ ] Environment variables configured
- [ ] Test messages sent and received successfully
- [ ] WhatsApp Monitor UI accessible
- [ ] Message templates approved (if using templates)
- [ ] Rate limits understood
- [ ] Error handling tested
- [ ] Logging configured

---

## Common Issues & Solutions

### Issue: "Phone number already in use"
**Solution**: Remove number from personal WhatsApp first

### Issue: "Webhook verification failed"
**Solution**: Check `WHATSAPP_WEBHOOK_TOKEN` matches in both Meta and `.env`

### Issue: "Messages not sending"
**Solution**: 
1. Check `WHATSAPP_API_TOKEN` is valid
2. Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
3. Check API quota limits

### Issue: "Not receiving messages"
**Solution**:
1. Verify webhook URL is publicly accessible (HTTPS)
2. Check webhook subscriptions in Meta dashboard
3. Review webhook logs for errors

---

## Support Resources

- **Meta WhatsApp Docs**: https://developers.facebook.com/docs/whatsapp
- **Twilio WhatsApp Docs**: https://www.twilio.com/docs/whatsapp
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer

---

## Next Steps

1. Choose Option 1 (Meta) or Option 2 (Twilio)
2. Follow setup steps for chosen option
3. Update `.env` with credentials
4. Create webhook endpoint if using Meta
5. Test with test script
6. Deploy to production
7. Start using WhatsApp Monitor UI

**Need help?** Contact me with any errors or issues during setup!

---

**Document Created**: 16 December 2025  
**Business Phone**: 063 045 7306  
**Status**: Ready for Configuration
