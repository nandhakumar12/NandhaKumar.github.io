import twilio from 'twilio';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize Gmail transporter
const gmailTransporter = (process.env.GMAIL_USER && process.env.GMAIL_PASS)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })
  : null;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitorName, visitorEmail, message } = req.body;

    // Validation - email is optional
    if (!visitorName || !message) {
      return res.status(400).json({ error: 'Name and message are required fields' });
    }

    if (!twilioClient && !gmailTransporter) {
      return res.status(500).json({ error: 'No communication service configured' });
    }

    let method = null;
    let sid = null;

    // Try WhatsApp first
    if (twilioClient && process.env.OWNER_WHATSAPP) {
      try {
        const whatsappMessage = await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
          to: process.env.OWNER_WHATSAPP,
          body: `📩 New message from portfolio:\n\nName: ${visitorName}\nEmail: ${visitorEmail}\n\nMessage:\n${message}`,
        });
        method = 'whatsapp';
        sid = whatsappMessage.sid;
      } catch (whatsappError) {
        console.error('WhatsApp error:', whatsappError.message);
      }
    }

    // Fallback to email if WhatsApp failed
    if (!sid && gmailTransporter) {
      try {
        const emailInfo = await gmailTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: process.env.OWNER_EMAIL || process.env.GMAIL_USER,
          replyTo: visitorEmail,
          subject: `New Portfolio Message from ${visitorName}`,
          html: `
            <h2>New message from your portfolio</h2>
            <p><strong>Name:</strong> ${visitorName}</p>
            <p><strong>Email:</strong> ${visitorEmail}</p>
            <hr />
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
        });
        method = 'email';
        sid = emailInfo.messageId;
      } catch (emailError) {
        console.error('Email error:', emailError.message);
      }
    }

    if (sid) {
      return res.status(200).json({ ok: true, method, sid });
    } else {
      return res.status(500).json({ error: 'Failed to send message' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
