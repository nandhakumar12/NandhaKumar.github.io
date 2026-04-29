# Portfolio Setup & Configuration Guide

## 🚀 Quick Start

This portfolio uses a React frontend with an Express backend to handle contact form submissions via WhatsApp and Email.

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager
- Gmail account (for email notifications)
- Twilio account (optional, for WhatsApp notifications)

---

## ⚙️ Backend Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

#### **Email Configuration (REQUIRED)**
```env
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_app_password_here
OWNER_EMAIL=your_email@gmail.com
```

**How to get Gmail App Password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords" (appears only if 2FA is enabled)
4. Select "Mail" and "Windows Computer"
5. Copy the generated 16-character password
6. Paste it as `GMAIL_PASS` in your `.env` file

#### **WhatsApp Configuration (OPTIONAL)**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
OWNER_WHATSAPP=whatsapp:+your_number
```

#### **Server Configuration**
```env
PORT=4000
```

#### **Frontend Configuration (for production)**
```env
VITE_API_BASE_URL=http://localhost:4000  # Development
# VITE_API_BASE_URL=https://your-deployed-server.com  # Production
```

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Frontend (Vite Dev Server):**
```bash
npm run dev
```
Runs on `http://localhost:5173`

**Terminal 2 - Backend (Express Server):**
```bash
node server.js
```
Runs on `http://localhost:4000`

### Production Build

**Build Frontend:**
```bash
npm run build
```

**Run Backend (Production):**
```bash
PORT=4000 node server.js
```

---

## 🔧 API Endpoints

### Send Message
```
POST /api/send-whatsapp
Content-Type: application/json

{
  "visitorName": "John Doe",
  "visitorEmail": "john@example.com",
  "message": "Your message here"
}
```

**Success Response:**
```json
{
  "ok": true,
  "method": "whatsapp" | "email",
  "sid": "message_id"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "error_code",
  "details": "error message"
}
```

### Health Check
```
GET /api/health
```

Returns service availability status.

---

## 📧 Message Delivery Flow

1. **User submits form** → Message goes to backend
2. **Try WhatsApp first** → If Twilio is configured and working
3. **Fallback to Email** → If WhatsApp fails or not configured
4. **Both methods failed** → Error message returned to user

This ensures you always receive messages, regardless of service status.

---

## 🚀 Deployment (Render.com)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Update portfolio with email fallback"
git push origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Set environment:
   - Name: `viveks-career-portfolio`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`

### Step 3: Add Environment Variables
In Render dashboard, go to "Environment" and add:
```env
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_app_password
OWNER_EMAIL=your_email@gmail.com
TWILIO_ACCOUNT_SID=... (optional)
TWILIO_AUTH_TOKEN=... (optional)
TWILIO_WHATSAPP_FROM=... (optional)
OWNER_WHATSAPP=... (optional)
PORT=4000
```

### Step 4: Update Frontend URL
In `.env.production`:
```env
VITE_API_BASE_URL=https://viveks-career-portfolio.onrender.com
```

---

## ✅ Testing

### Test the Contact Form Locally
1. Open `http://localhost:5173`
2. Click "Get In Touch"
3. Fill in the form and submit
4. Check your email inbox within 30 seconds

### Test Email Delivery
Add this to your `.env` for testing:
```env
OWNER_EMAIL=your_test_email@gmail.com
```

### View Server Logs
Check terminal where you ran `node server.js` for:
- ✅ Message sent via WhatsApp: `message_sid`
- ✅ Message sent via Email: `message_id`
- ❌ Errors and their details

---

## 🎨 Portfolio Features

### Professional Animations
- Scroll-triggered animations using Framer Motion
- Staggered list animations for smooth reveal
- Hover effects on all interactive elements
- Smooth transitions between states

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly form inputs
- Optimized modal on mobile devices

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigable forms
- High contrast color scheme

---

## 🐛 Troubleshooting

### Messages Not Arriving?
1. **Check Gmail password**: Use app-specific password, not your regular password
2. **Check firewall**: Some corporate networks block SMTP
3. **Enable "Less secure apps"** (if not using 2FA app password)
4. **Check spam folder**: Sometimes emails go to spam

### Email Service Error?
```
Error: Invalid login: 535-5.7.8 Username and password not accepted
```
**Solution:** Use Gmail App Password (generated in Google Account Security)

### WhatsApp Not Working?
```
"error": "send_failed", "details": "Invalid 'from' parameter"
```
**Solution:** Check Twilio credentials in `.env`

### CORS Errors?
If you see CORS errors in browser console:
1. Frontend is on `localhost:5173`
2. Backend is on `localhost:4000`
3. Backend has CORS enabled for all origins
4. Check `server.js` line: `app.use(cors());`

---

## 📝 Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `GMAIL_USER` | ✅ Yes | Gmail account email |
| `GMAIL_PASS` | ✅ Yes | Gmail app password |
| `OWNER_EMAIL` | ✅ Yes | Email to receive messages |
| `TWILIO_ACCOUNT_SID` | ❌ No | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | ❌ No | Twilio authentication |
| `TWILIO_WHATSAPP_FROM` | ❌ No | Twilio WhatsApp number |
| `OWNER_WHATSAPP` | ❌ No | Your WhatsApp number |
| `PORT` | ✅ Yes | Server port (default: 4000) |
| `VITE_API_BASE_URL` | ❌ No | Backend URL for frontend |

---

## 📚 Resources

- **Framer Motion**: [https://www.framer.com/motion/](https://www.framer.com/motion/)
- **Tailwind CSS**: [https://tailwindcss.com/](https://tailwindcss.com/)
- **Express.js**: [https://expressjs.com/](https://expressjs.com/)
- **Nodemailer**: [https://nodemailer.com/](https://nodemailer.com/)
- **Twilio**: [https://www.twilio.com/](https://www.twilio.com/)

---

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` with Gmail credentials
3. ✅ Test locally: `npm run dev` + `node server.js`
4. ✅ Deploy on Render with environment variables
5. ✅ Test contact form on production

---

## 💡 Pro Tips

- **Mobile Testing**: Use `ngrok` to expose localhost to internet for mobile testing
- **Email Templates**: Modify HTML in `server.js` for custom email styling
- **Rate Limiting**: Add rate limiter middleware to prevent spam
- **Logging**: Use Winston or Morgan for better logging
- **Monitoring**: Set up monitoring on Render to track uptime

---

**Questions?** Check console logs for detailed error messages!
