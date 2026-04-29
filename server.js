// Express server to forward website messages via WhatsApp (Twilio) + Email (Nodemailer)
// Provides redundancy - if WhatsApp fails, falls back to email
// Usage:
// 1. npm install express twilio cors dotenv nodemailer
// 2. Create a .env file with required variables (see .env.example)
// 3. node server.js

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Twilio from 'twilio';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { 
  TWILIO_ACCOUNT_SID, 
  TWILIO_AUTH_TOKEN, 
  TWILIO_WHATSAPP_FROM, 
  OWNER_WHATSAPP,
  GMAIL_USER,
  GMAIL_PASS,
  OWNER_EMAIL = 'viveknandimandalam334@gmail.com'
} = process.env;

// Validate Twilio config
const hasTwilioConfig = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM && OWNER_WHATSAPP;
if (!hasTwilioConfig) {
  console.warn('⚠️  Twilio not configured. Please set: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, OWNER_WHATSAPP');
}

// Validate Email config
const hasEmailConfig = GMAIL_USER && GMAIL_PASS;
if (!hasEmailConfig) {
  console.warn('⚠️  Email not configured. Please set: GMAIL_USER, GMAIL_PASS');
}

let twilioClient = null;
let emailTransporter = null;

if (hasTwilioConfig) {
  twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

if (hasEmailConfig) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
  });
  
  // Test email connection
  emailTransporter.verify((err) => {
    if (err) {
      console.warn('⚠️  Email configuration error:', err.message);
      emailTransporter = null;
    } else {
      console.log('✅ Email service ready');
    }
  });
}

console.log(`✅ Twilio WhatsApp: ${hasTwilioConfig ? 'Ready' : 'Not configured'}`);
console.log(`✅ Email Fallback: ${hasEmailConfig ? 'Ready' : 'Not configured'}`);

app.post('/api/send-whatsapp', async (req, res) => {
  try {
    const { message, visitorName, visitorEmail } = req.body;
    
    // Validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Empty message', ok: false });
    }
    
    if (!visitorName || visitorName.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required', ok: false });
    }

    const formattedMessage = `New message from portfolio website:\n${visitorName ? `Name: ${visitorName}\n` : ''}${visitorEmail ? `Email: ${visitorEmail}\n` : ''}\nMessage:\n${message}`;
    
    let success = false;
    let whatsappResult = null;
    let emailResult = null;

    // Try WhatsApp first
    if (hasTwilioConfig && twilioClient) {
      try {
        whatsappResult = await twilioClient.messages.create({
          from: TWILIO_WHATSAPP_FROM,
          to: OWNER_WHATSAPP,
          body: formattedMessage,
        });
        success = true;
        console.log('✅ Message sent via WhatsApp:', whatsappResult.sid);
      } catch (whatsappErr) {
        console.error('❌ WhatsApp error:', whatsappErr.message);
      }
    }

    // If WhatsApp failed, try email as fallback
    if (!success && hasEmailConfig && emailTransporter) {
      try {
        emailResult = await emailTransporter.sendMail({
          from: GMAIL_USER,
          to: OWNER_EMAIL,
          subject: `Portfolio Contact: Message from ${visitorName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">New Message from Your Portfolio</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Name:</strong> ${visitorName}</p>
                ${visitorEmail ? `<p><strong>Email:</strong> ${visitorEmail}</p>` : ''}
                <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap; word-wrap: break-word;">${message}</p>
              </div>
              <p style="color: #6b7280; font-size: 12px;">Reply directly to ${visitorEmail || 'this email'} or visit your portfolio dashboard.</p>
            </div>
          `,
        });
        success = true;
        console.log('✅ Message sent via Email:', emailResult.messageId);
      } catch (emailErr) {
        console.error('❌ Email error:', emailErr.message);
      }
    }

    // Response
    if (success) {
      return res.json({ 
        ok: true, 
        method: whatsappResult ? 'whatsapp' : 'email',
        sid: whatsappResult?.sid || emailResult?.messageId
      });
    } else {
      console.error('All delivery methods failed');
      return res.status(500).json({ 
        ok: false,
        error: 'Failed to send message via all methods',
        details: 'Both WhatsApp and Email services are currently unavailable. Please try again later or email directly.'
      });
    }
  } catch (err) {
    console.error('❌ Unexpected error in /api/send-whatsapp:', err);
    return res.status(500).json({ 
      ok: false,
      error: 'send_failed', 
      details: err.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    services: {
      whatsapp: hasTwilioConfig,
      email: hasEmailConfig
    }
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 Message forwarding server running on http://localhost:${PORT}`);
  console.log(`📍 Endpoint: POST /api/send-whatsapp`);
  console.log(`💊 Health check: GET /api/health\n`);
});
