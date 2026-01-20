# Meta WhatsApp Business API - Quick Setup Guide
**For Phone Number**: 063 045 7306  
**Date**: 16 December 2025

---

## Prerequisites

✅ Facebook/Meta account  
✅ Business verified (or will verify during setup)  
✅ Phone number **063 045 7306** NOT currently on WhatsApp  
⚠️ If number is on WhatsApp personal, remove it first!

---

## Step-by-Step Setup (10 minutes)

### Step 1: Access Meta Business Platform

Go to: **https://developers.facebook.com/**

1. Click **"My Apps"** in top right
2. Click **"Create App"** button

### Step 2: Create Business App

1. **Select app type**: Choose **"Business"**
2. Click **"Next"**
3. Fill in details:
   - **App name**: `Avatar Human Capital WhatsApp`
   - **App contact email**: [your business email]
   - **Business Portfolio**: Create new or select existing
4. Click **"Create App"**

### Step 3: Add WhatsApp Product

1. You'll see the app dashboard
2. Scroll down to **"Add products to your app"**
3. Find **"WhatsApp"** card
4. Click **"Set up"** button

### Step 4: Start WhatsApp Setup

You'll see the **WhatsApp Quick Start** page with:

#### 📱 **Test Number Section** (Top)
- Meta provides a test number for immediate testing
- You can send 5 test messages to your personal phone
- **Use this first to verify everything works!**

#### 🔧 **Your Business Number Section** (Bottom)
- This is where you'll add **063 045 7306**

### Step 5: Test with Meta's Number (Optional but Recommended)

Before adding your number, test the integration:

1. In **"Step 1: Send test messages"** section
2. Click **"Send test message"**
3. Enter YOUR personal WhatsApp number (to receive test)
4. Click send - you should receive a message!

This confirms the API is working.

### Step 6: Get Temporary Access Token

In the **"Step 1"** section, you'll see:

```
Temporary access token: EAAxxxxxxxxxxxxxxxxx
```

- Click **"Copy"** button
- Save this somewhere (it's temporary, ~24 hours)
- We'll create a permanent one later

### Step 7: Get Phone Number ID

Still in **"Step 1"**, you'll see:

```
Phone number ID: 123456789012345
```

- This is Meta's test number ID
- Note it down (you'll get a different one for your business number)

### Step 8: Add Your Business Number (063 045 7306)

Scroll down to **"Step 5: Add a phone number"**

1. Click **"Add phone number"** button
2. Select **"Register a new phone number"** or **"Add your own phone number"**

#### Verification Process:

1. **Enter phone number**: `+27630457306`
2. **Verification method**: Choose **"Text message (SMS)"** or **"Phone call"**
3. Click **"Next"**
4. **Enter verification code** you receive
5. Click **"Verify"**

#### Display Name:

1. **Business display name**: `Avatar Human Capital`
2. **Category**: Select appropriate business category
3. Click **"Next"**

### Step 9: Get YOUR Phone Number ID

After verification, you'll see:

```
Phone number ID: 987654321098765  (your actual number)
```

**SAVE THIS!** This is the `WHATSAPP_PHONE_NUMBER_ID` for your `.env` file.

### Step 10: Create Permanent Access Token

The temporary token expires in 24 hours. Create permanent one:

#### Method A: Via WhatsApp Settings

1. In left sidebar, click **"WhatsApp" → "Getting Started"**
2. Scroll to **"Permanent access token"** section
3. Click **"Create permanent token"**
4. Copy the token - **SAVE THIS!**

#### Method B: Via System User (More Secure)

1. Go to **"Settings"** (gear icon) → **"Basic"**
2. Note your **App ID**
3. Go to https://business.facebook.com/settings/system-users
4. Click **"Add"** → Create system user: `WhatsApp Bot`
5. Assign role: **"Admin"**
6. Click **"Generate New Token"**
7. Select your app
8. Check permissions:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
9. Click **"Generate Token"**
10. Copy token - **SAVE THIS!**

This token never expires!

### Step 11: Update Your `.env` File

Open `/home/zubeid/AvatarHumanCapital/.env` and update:

```bash
# WhatsApp Business API (Meta)
WHATSAPP_API_TOKEN=EAAyour_permanent_token_here
WHATSAPP_PHONE_NUMBER_ID=987654321098765
WHATSAPP_WEBHOOK_TOKEN=create_random_secure_string_123
```

**Generate random webhook token:**
```bash
openssl rand -hex 32
```

### Step 12: Set Up Webhook

#### A. Deploy Your Webhook Endpoint First

Your webhook needs to be publicly accessible (HTTPS).

**Local development**: Use ngrok
```bash
ngrok http 5000
```
This gives you: `https://abc123.ngrok.io`

**Production**: Your actual domain
```
https://yourapp.com
```

#### B. Configure Webhook in Meta

1. In WhatsApp settings, click **"Configuration"** in left menu
2. Go to **"Webhook"** section
3. Click **"Edit"**

**Webhook URL**: 
```
https://yourapp.com/api/whatsapp/webhook
```
(or ngrok URL for testing)

**Verify token**: 
```
create_random_secure_string_123
```
(same as `WHATSAPP_WEBHOOK_TOKEN` in `.env`)

4. Click **"Verify and Save"**

Meta will send a GET request to verify your endpoint responds correctly.

#### C. Subscribe to Webhook Events

After verification, check these boxes:
- ✅ **messages** - Receive incoming messages
- ✅ **message_status** - Track delivery/read status

Click **"Subscribe"**

### Step 13: Create Webhook Endpoint

Create file: `server/routes/whatsapp-webhook.ts`

```typescript
import { Router } from "express";
import { whatsappService } from "../whatsapp-service";

const router = Router();

// Webhook verification (GET request from Meta)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Webhook verification request:", { mode, token });

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed!");
    res.status(403).send("Forbidden");
  }
});

// Receive messages (POST request from Meta)
router.post("/webhook", async (req, res) => {
  try {
    console.log("📨 Webhook received:", JSON.stringify(req.body, null, 2));

    const body = req.body;

    // Quick response to Meta (acknowledge receipt)
    res.status(200).send("OK");

    // Process in background
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            const value = change.value;
            
            // New message received
            if (value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const from = message.from;
              const waId = value.contacts?.[0]?.wa_id;
              const profileName = value.contacts?.[0]?.profile?.name;
              
              console.log(`📱 Message from ${profileName} (${from}):`, message.text?.body);
              
              // Process message
              await whatsappService.processIncomingMessage(
                "default", // tenant ID
                waId,
                from,
                profileName,
                message
              );
            }

            // Message status update
            if (value.statuses && value.statuses.length > 0) {
              const status = value.statuses[0];
              console.log(`📊 Status update: ${status.status} for message ${status.id}`);
              
              await whatsappService.updateMessageStatus(
                "default",
                status.id,
                status.status,
                new Date(status.timestamp * 1000)
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    // Still send 200 to Meta (already sent above)
  }
});

export default router;
```

#### Add to your main server file:

In `server/index.ts` or wherever you set up routes:

```typescript
import whatsappWebhookRouter from "./routes/whatsapp-webhook";

// Add this line
app.use("/api/whatsapp", whatsappWebhookRouter);
```

### Step 14: Test the Integration

#### A. Test Sending Messages

Create test file: `server/test-whatsapp-send.ts`

```typescript
import { whatsappService } from "./whatsapp-service";

async function testSend() {
  console.log("🧪 Testing WhatsApp send...");
  console.log("Configured:", whatsappService.isConfigured());
  
  if (!whatsappService.isConfigured()) {
    console.error("❌ Not configured! Check .env");
    return;
  }
  
  // Send to YOUR personal WhatsApp to test
  const result = await whatsappService.sendTextMessage(
    "default",
    "test-conv-1",
    "27XXXXXXXXX", // YOUR personal WhatsApp number
    "🎉 Hello from Avatar Human Capital! WhatsApp integration is working!",
    "ai"
  );
  
  console.log("✅ Message sent:", result);
}

testSend().catch(console.error);
```

Run:
```bash
npx tsx server/test-whatsapp-send.ts
```

Check your personal WhatsApp - you should receive the message!

#### B. Test Receiving Messages

1. Send a message TO **063 045 7306** from your personal WhatsApp
2. Check your server logs - you should see webhook processing
3. Check database - message should be stored

### Step 15: Access WhatsApp Monitor UI

Once everything is working:

```
https://yourapp.com/whatsapp-monitor
```

You'll see:
- All conversations
- Send/receive messages
- Track documents
- Monitor status

---

## Important Notes

### Message Limits

**Free Tier**: 1,000 conversations/month  
**After free**: ~$0.01-$0.05 per conversation (ZAR equivalent)

A "conversation" is a 24-hour window of messaging with a contact.

### Message Templates

For messages YOU initiate (outside 24-hour window), you need **approved templates**.

1. Go to **WhatsApp → Message Templates**
2. Create templates for:
   - Job notifications
   - Interview invitations
   - Document requests
3. Submit for approval (takes 1-2 days)

For now, you can respond to incoming messages freely!

### Business Verification

For production at scale:
1. Verify your business (Meta will request documents)
2. Increases sending limits
3. Adds green checkmark to business profile

---

## Troubleshooting

### Issue: Webhook verification fails

**Check:**
```bash
# Is webhook endpoint accessible?
curl https://yourapp.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test123

# Should return: test123
```

**Fix**: Ensure `WHATSAPP_WEBHOOK_TOKEN` matches in both Meta and `.env`

### Issue: Messages not sending

**Check:**
```bash
# Test API token
curl -X POST "https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "27XXXXXXXXX",
    "type": "text",
    "text": { "body": "Test" }
  }'
```

**Fix**: Verify token is permanent and has correct permissions

### Issue: Not receiving messages

**Check webhook logs** in Meta:
1. WhatsApp → Configuration → Webhook
2. Click **"Test"** to send test event
3. View error logs

---

## Next Steps

✅ Meta app created  
✅ WhatsApp product added  
✅ Phone **063 045 7306** verified  
✅ Permanent token created  
✅ Phone Number ID obtained  
✅ `.env` updated  
✅ Webhook configured  
✅ Endpoint deployed  
✅ Test message sent successfully  
✅ Receiving messages  
✅ WhatsApp Monitor accessible  

**You're ready for production!** 🚀

---

## Support

- **Meta Docs**: https://developers.facebook.com/docs/whatsapp
- **API Reference**: https://developers.facebook.com/docs/whatsapp/cloud-api/reference
- **Support**: https://developers.facebook.com/support

**Document Created**: 16 December 2025  
**Status**: Ready to implement
