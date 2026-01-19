# WhatsApp Setup - Complete Guide
**Your App Details**

- **App ID**: 1589752215356082
- **Business ID**: 512014264158759
- **Phone Number**: 063 045 7306 (+27 63 045 7306)
- **Webhook Token**: `ea28ab772fc718e727fd3372dc5f2b8a0409059d4aeeadcb34d1cf9d370a20ab`

---

## ✅ What's Already Done

✅ Meta App created (ID: 1589752215356082)  
✅ `.env` file updated with webhook token  
✅ Webhook endpoint created (`server/routes/whatsapp-webhook.ts`)  
✅ Webhook route registered in main server  
✅ WhatsApp service already implemented  

---

## 🔧 What You Need to Do Now

### Step 1: Add WhatsApp Product to Your App

1. Go to your app dashboard:
   ```
   https://developers.facebook.com/apps/1589752215356082/
   ```

2. Look for **"Add a product"** or **"Add Product"**

3. Find **"WhatsApp"** and click **"Set up"**

---

### Step 2: Test with Meta's Test Number

After adding WhatsApp, you'll see **Quick Start** page:

1. In **"Step 1: Send test messages"** section
2. You'll see a **temporary access token** - copy it
3. You'll see a **test phone number ID** - note it  
4. Enter YOUR personal WhatsApp number
5. Click **"Send message"**
6. Check your phone - you should receive a test message!

This confirms the API is working ✅

---

### Step 3: Add Your Business Phone (063 045 7306)

Scroll to **"Step 5: Add a phone number"** or look for **"Phone Numbers"** in left menu

1. Click **"Add phone number"**
2. Choose **"Use your own phone number"**
3. Enter phone number:
   - Country: **South Africa (+27)**
   - Number: **630457306**
   - Full number: **+27630457306**

4. **Verification**: Choose SMS or voice call
5. **Enter verification code** you receive
6. **Display Name**: `Avatar Human Capital`
7. **Category**: Select business category

---

### Step 4: GET THESE TWO VALUES (Critical!)

After verification, you'll see:

#### 📱 Your Phone Number ID

```
Phone number: +27 63 045 7306
Phone number ID: 123456789012345  ← COPY THIS!
Status: Verified ✅
```

**Save this number - it's your `WHATSAPP_PHONE_NUMBER_ID`**

#### 🔑 Create Permanent Access Token

Option A - Quick Way:
1. In WhatsApp settings, look for **"Permanent token"**
2. Click **"Create permanent token"**
3. Copy the token

Option B - System User (Recommended):
1. Go to: https://business.facebook.com/settings/system-users/512014264158759
2. Click **"Add"** → Create: `WhatsApp API Bot`
3. Role: **Admin**
4. Click **"Generate New Token"**
5. Select app: **1589752215356082**
6. Permissions:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
7. Duration: **Never expire**
8. Click **"Generate Token"**
9. **COPY AND SAVE THIS TOKEN!**

---

### Step 5: Update Your `.env` File

Open `.env` file and replace these placeholders with your actual values:

```bash
# WhatsApp Business API
WHATSAPP_API_TOKEN=paste_your_permanent_token_here
WHATSAPP_PHONE_NUMBER_ID=paste_your_phone_number_id_here
WHATSAPP_WEBHOOK_TOKEN=ea28ab772fc718e727fd3372dc5f2b8a0409059d4aeeadcb34d1cf9d370a20ab
```

**Example:**
```bash
WHATSAPP_API_TOKEN=EAAXrMZBxZBIABO7j...very_long_token_here
WHATSAPP_PHONE_NUMBER_ID=374859362654120
WHATSAPP_WEBHOOK_TOKEN=ea28ab772fc718e727fd3372dc5f2b8a0409059d4aeeadcb34d1cf9d370a20ab
```

---

### Step 6: Set Up Webhook in Meta

#### A. Get Your Webhook URL

**For testing (local)**: Use ngrok
```bash
ngrok http 5000
```
You'll get: `https://abc123.ngrok-free.app`

**For production**: Your actual domain
```
https://avatarhumancapital.com
```

#### B. Configure in Meta

1. In your app, go to **WhatsApp** → **Configuration**
2. Find **"Webhook"** section
3. Click **"Edit"**

**Callback URL**:
```
https://your-domain.com/api/whatsapp/webhook
```
(or ngrok URL for testing: `https://abc123.ngrok-free.app/api/whatsapp/webhook`)

**Verify Token**:
```
ea28ab772fc718e727fd3372dc5f2b8a0409059d4aeeadcb34d1cf9d370a20ab
```

4. Click **"Verify and Save"**

Meta will call your endpoint to verify it's working.

#### C. Subscribe to Events

After verification succeeds:
- ✅ **messages** - Check this box
- ✅ **message_status** - Check this box (optional)

Click **"Subscribe"**

---

### Step 7: Start Your Server

Make sure your server is running:

```bash
npm run dev
```

Or if using ngrok:
```bash
# Terminal 1: Start your server
npm run dev

# Terminal 2: Start ngrok
ngrok http 5000
```

---

### Step 8: Test the Integration

#### Test 1: Send a Message FROM Your System

Create a test file: `server/test-whatsapp-send.ts`

```typescript
import { whatsappService } from "./whatsapp-service";

async function testSend() {
  console.log("🧪 Testing WhatsApp send...");
  console.log("Is configured:", whatsappService.isConfigured());
  
  if (!whatsappService.isConfigured()) {
    console.error("❌ Not configured! Check your .env file.");
    return;
  }
  
  // Send to YOUR personal WhatsApp number to test
  const message = await whatsappService.sendTextMessage(
    "default",
    "test-conv-1",
    "27XXXXXXXXX", // Replace with YOUR personal number
    "🎉 Hello! This is a test message from Avatar Human Capital WhatsApp integration!",
    "ai"
  );
  
  console.log("✅ Message result:", message);
}

testSend().catch(console.error);
```

Run it:
```bash
npx tsx server/test-whatsapp-send.ts
```

**Expected result**: You receive the message on your personal WhatsApp! 📱

#### Test 2: Receive a Message TO Your System

1. Send a message TO **063 045 7306** from your personal WhatsApp
2. Check your server console logs
3. You should see:
   ```
   📨 WhatsApp webhook received: ...
   📱 Message from [Your Name] (27XXX): Hello!
   ```
4. Message should be stored in database

---

## 🎯 What You Can Do Now

Once configured, your platform can:

### ✅ Send Messages
```typescript
await whatsappService.sendTextMessage(
  tenantId,
  conversationId,
  phone,
  "Your message here"
);
```

### ✅ Request Documents
```typescript
await whatsappService.sendDocumentRequest(
  tenantId,
  conversationId,
  phone,
  "id_document",
  "ID Document",
  "Please send a photo of your ID document",
  new Date("2025-12-31")
);
```

### ✅ Schedule Appointments
```typescript
await whatsappService.sendAppointmentRequest(
  tenantId,
  conversationId,
  phone,
  "interview",
  "Job Interview - Sales Manager",
  new Date("2025-12-20T10:00:00"),
  60,
  "123 Main St, Johannesburg"
);
```

### ✅ View Conversations

Access the WhatsApp Monitor UI:
```
https://your-domain.com/whatsapp-monitor
```

Features:
- View all conversations
- Send/receive messages
- Track document submissions
- Monitor delivery status
- AI auto-responses

---

## 💰 Costs

**Free Tier**: 1,000 conversations/month  
**After Free Tier**: ~$0.01-$0.05 per conversation

A "conversation" is a 24-hour window with a contact.

---

## 🚨 Common Issues & Fixes

### Issue: Webhook verification fails

**Check**: Is your server publicly accessible?

```bash
# Test if Meta can reach your webhook
curl "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=ea28ab772fc718e727fd3372dc5f2b8a0409059d4aeeadcb34d1cf9d370a20ab&hub.challenge=test123"

# Should return: test123
```

**Fix**: 
- Ensure server is running
- Ensure ngrok is running (if testing locally)
- Check firewall settings
- Verify webhook token matches

### Issue: Messages not sending

**Check**: Are your credentials correct?

```bash
# Test API directly
curl -X POST "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "27XXXXXXXXX",
    "type": "text",
    "text": { "body": "Test message" }
  }'
```

**Fix**:
- Verify `WHATSAPP_API_TOKEN` is correct
- Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
- Check token has required permissions
- Check if token expired (use permanent token!)

### Issue: Not receiving messages

**Check webhook logs** in Meta:
1. App Dashboard → WhatsApp → Configuration → Webhook
2. Click **"Test"** to send a test webhook
3. Check **"Recent Deliveries"** for errors

**Fix**:
- Check server console logs
- Verify webhook subscriptions are active
- Ensure endpoint responds within 20 seconds

---

## ✅ Production Checklist

Before going live:

- [ ] Phone number **063 045 7306** verified in Meta
- [ ] Permanent access token created
- [ ] Phone Number ID saved in `.env`
- [ ] Access Token saved in `.env`
- [ ] Webhook token saved in `.env`
- [ ] Webhook URL configured in Meta
- [ ] Webhook verification successful
- [ ] Webhook events subscribed (messages, message_status)
- [ ] Test message sent successfully
- [ ] Test message received successfully
- [ ] WhatsApp Monitor UI accessible
- [ ] Server deployed to production (not ngrok)
- [ ] HTTPS enabled on production domain

---

## 🎉 Next Steps

1. **Complete Meta configuration** (Steps 1-6 above)
2. **Update `.env`** with your credentials
3. **Test sending** a message
4. **Test receiving** a message
5. **Access WhatsApp Monitor** at `/whatsapp-monitor`
6. **Start using** for candidate communication!

---

**Your Details Quick Reference:**

```
App ID: 1589752215356082
Business ID: 512014264158759
Phone: +27 63 045 7306
Webhook Token: ea28ab772fc718e727fd3372dc5f2b8a0409059d4aeeadcb34d1cf9d370a20ab

Webhook URL: https://your-domain.com/api/whatsapp/webhook
```

---

**Need Help?**
- Meta Docs: https://developers.facebook.com/docs/whatsapp
- Your App Dashboard: https://developers.facebook.com/apps/1589752215356082/

**Status**: Ready to configure! Follow steps 1-8 above.

**Document Created**: 16 December 2025, 6:51 AM
