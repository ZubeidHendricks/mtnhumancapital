import { Router } from "express";
import { whatsappService } from "../whatsapp-service";

const router = Router();

// Webhook verification (GET request from Meta)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("📞 WhatsApp webhook verification request:", { mode, token: token?.substring(0, 10) + "..." });

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed! Token mismatch.");
    res.status(403).send("Forbidden");
  }
});

// Receive messages (POST request from Meta)
router.post("/webhook", async (req, res) => {
  try {
    console.log("📨 WhatsApp webhook received:", JSON.stringify(req.body, null, 2));

    const body = req.body;

    // Quick response to Meta (acknowledge receipt within 20 seconds)
    res.status(200).send("OK");

    // Process in background to avoid timeout
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
              
              console.log(`📱 Message from ${profileName || "Unknown"} (${from}):`, message.text?.body || `[${message.type}]`);
              
              // Process message
              await whatsappService.processIncomingMessage(
                "default", // tenant ID - update this if you have multi-tenancy
                waId,
                from,
                profileName,
                message
              );
            }

            // Message status update (delivered, read, etc.)
            if (value.statuses && value.statuses.length > 0) {
              const status = value.statuses[0];
              console.log(`📊 Status update: ${status.status} for message ${status.id}`);
              
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
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    // We already sent 200 OK to Meta, so just log the error
  }
});

export default router;
