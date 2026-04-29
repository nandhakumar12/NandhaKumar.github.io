// Production-grade Node.js server with MongoDB + Twilio webhooks
// Usage:
// 1. npm install express twilio cors dotenv body-parser mongoose
// 2. Create .env with: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, 
//    OWNER_WHATSAPP, MONGODB_URI, WEBHOOK_AUTH_TOKEN, PORT
// 3. node server.cjs

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Twilio = require('twilio');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// === ENV VARIABLES ===
const { 
  TWILIO_ACCOUNT_SID, 
  TWILIO_AUTH_TOKEN, 
  TWILIO_WHATSAPP_FROM, 
  OWNER_WHATSAPP,
  MONGODB_URI,
  WEBHOOK_AUTH_TOKEN,
  PORT = 4000
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !OWNER_WHATSAPP) {
  console.warn('⚠️  Missing Twilio env vars');
}

if (!MONGODB_URI) {
  console.warn('⚠️  Missing MONGODB_URI - conversations won\'t be saved');
}

const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// === MONGODB SCHEMA ===
const messageSchema = new mongoose.Schema({
  conversationId: { type: String, unique: true, sparse: true }, // Based on visitor phone/email
  visitorName: String,
  visitorEmail: String,
  visitorPhone: String, // Twilio phone if they reply
  messages: [{
    sender: { type: String, enum: ['visitor', 'owner'] }, // Who sent it
    text: String,
    timestamp: { type: Date, default: Date.now },
    twilio_sid: String, // Twilio message ID
  }],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

let Conversation;

// === CONNECT TO MONGODB ===
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('✅ Connected to MongoDB');
    Conversation = mongoose.model('Conversation', messageSchema);
  }).catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
}

// === ENDPOINT 1: Send message from portfolio (visitor → WhatsApp) ===
app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { message, visitorName, visitorEmail } = req.body;
    
    if (!visitorName || visitorName.trim().length === 0) {
      return res.status(400).json({ error: 'Visitor name is required' });
    }
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Format message for WhatsApp
    const formattedMessage = `
📬 NEW PORTFOLIO MESSAGE

👤 From: ${visitorName.trim()}
${visitorEmail ? `📧 Email: ${visitorEmail.trim()}\n` : ''}
💬 Message:
${message.trim()}

---
Sent from: portfolio
`.trim();

    // Send to WhatsApp
    const msg = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: OWNER_WHATSAPP,
      body: formattedMessage,
    });

    // Save to MongoDB if connected
    if (Conversation) {
      const conversationId = visitorEmail || visitorName.replace(/\s+/g, '_').toLowerCase();
      
      await Conversation.findOneAndUpdate(
        { conversationId },
        {
          $set: {
            visitorName,
            visitorEmail,
            updatedAt: new Date(),
          },
          $push: {
            messages: {
              sender: 'visitor',
              text: message.trim(),
              twilio_sid: msg.sid,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    return res.json({ ok: true, sid: msg.sid });
  } catch (err) {
    console.error('❌ send-whatsapp error:', err);
    return res.status(500).json({ error: 'send_failed', details: err.message });
  }
});

// === ENDPOINT 2: Twilio webhook for incoming WhatsApp messages ===
app.post('/api/incoming-whatsapp', async (req, res) => {
  try {
    // Verify webhook signature (optional but recommended)
    const authToken = req.query.auth || req.body.auth;
    if (authToken !== WEBHOOK_AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { From, Body, MessageSid } = req.body;

    console.log(`📩 Incoming WhatsApp from ${From}: ${Body}`);

    // Extract phone number (remove 'whatsapp:' prefix)
    const visitorPhone = From.replace('whatsapp:', '');

    // Save to MongoDB
    if (Conversation) {
      const conversation = await Conversation.findOneAndUpdate(
        { visitorPhone },
        {
          $set: {
            visitorPhone,
            updatedAt: new Date(),
          },
          $push: {
            messages: {
              sender: 'visitor',
              text: Body,
              twilio_sid: MessageSid,
            },
          },
        },
        { upsert: true, new: true }
      );

      console.log(`💾 Saved message from ${From} to conversation`);
    }

    // Send confirmation (optional)
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ incoming-whatsapp error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ENDPOINT 3: Get all conversations (for admin dashboard) ===
app.get('/api/conversations', async (req, res) => {
  try {
    const authToken = req.query.auth;
    if (authToken !== WEBHOOK_AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Conversation) {
      return res.status(503).json({ error: 'MongoDB not connected' });
    }

    const conversations = await Conversation.find().sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (err) {
    console.error('❌ get conversations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === ENDPOINT 4: Reply to visitor ===
app.post('/api/reply', async (req, res) => {
  try {
    const { conversationId, replyMessage } = req.body;
    const authToken = req.query.auth;

    if (authToken !== WEBHOOK_AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!conversationId || !replyMessage) {
      return res.status(400).json({ error: 'conversationId and replyMessage required' });
    }

    if (!Conversation) {
      return res.status(503).json({ error: 'MongoDB not connected' });
    }

    // Find conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.visitorPhone) {
      return res.status(404).json({ error: 'Conversation not found or no phone number' });
    }

    // Send WhatsApp reply
    const msg = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${conversation.visitorPhone}`,
      body: replyMessage,
    });

    // Save reply to conversation
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $push: {
          messages: {
            sender: 'owner',
            text: replyMessage,
            twilio_sid: msg.sid,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    res.json({ ok: true, sid: msg.sid });
  } catch (err) {
    console.error('❌ reply error:', err);
    res.status(500).json({ error: err.message });
  }
});

// === START SERVER ===
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║  WhatsApp Portfolio Server Running   ║
║  Port: ${PORT}                        ║
║  Webhooks enabled ✅                  ║
║  MongoDB: ${MONGODB_URI ? '✅' : '❌ (offline mode)'}                 ║
╚══════════════════════════════════════╝

📡 Twilio Webhook URL (in production):
   https://your-deploy-url.com/api/incoming-whatsapp?auth=${WEBHOOK_AUTH_TOKEN}
  `);
});

module.exports = { app, server };
