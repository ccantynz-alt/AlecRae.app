# AlecRae Voice

**AI-powered professional dictation for legal and accounting professionals.**

Built with OpenAI Whisper for transcription and Claude AI for intelligent document formatting. Not a general-purpose dictation tool — purpose-built for how attorneys, lawyers, and accountants actually work.

---

## What Makes This Different

General dictation tools transcribe your words. AlecRae Voice understands what you're drafting and formats it accordingly. Dictate a legal letter and get a properly structured legal letter. Dictate a tax advisory and get correct IRC references and professional formatting. No other tool on the market does this.

| Feature | Dragon Legal | WisprFlow | AlecRae Voice |
|---------|-------------|-----------|---------------|
| Legal terminology | Yes | Basic | Yes + accounting |
| AI text cleanup | No | Yes | Yes (streaming) |
| Document formatting | No | No | 12 specialised modes |
| Custom vocabulary | Limited | No | Unlimited user terms |
| Cross-platform | Windows only | Mac/Win/iOS | All devices (web) |
| Pricing | $699 + $199/yr | $15-19/month | Self-hosted, free |

---

## Features

### Dictation
- OpenAI Whisper transcription with legal/accounting vocabulary hints
- Voice commands: "new paragraph", "period", "comma", "delete that", "open quote", "close quote"
- Continuous recording — dictate as long as you need
- Custom vocabulary — add client names, case names, firm-specific terms for better accuracy

### AI Enhancement (12 Modes)

**Legal:** Legal letter · Legal memorandum · Court filing · Demand letter · Deposition summary · Engagement letter

**Accounting:** Accounting report · Tax advisory · Audit opinion

**General:** General cleanup · Client email · Meeting notes

### Productivity
- Customisable hotkeys — rebind record, enhance, copy, clear, export
- Custom AI instructions — firm name, spelling preferences, date format, any standing rules
- Streaming output — watch the formatted document appear in real-time
- Export to .docx — download properly formatted Word documents
- Copy to clipboard — paste anywhere instantly
- Dictation history — access your last 50 dictations
- Privacy mode — disable history for sensitive client dictations
- Word count tracking

### Access
- Admin password protection — no subscription, no per-user fees
- Works on Windows, Mac, iPad, iPhone, Android — any device with a browser
- PWA installable — add to home screen for app-like experience
- Responsive design — full-screen desktop layout, mobile-optimised on phones

---

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **OpenAI Whisper API** — transcription
- **Claude API** (Sonnet) — streaming AI document formatting
- **Tailwind CSS** — styling
- **jose** — JWT session auth
- **docx** — Word document export
- **Vercel** — hosting and deployment

---

## Deploy

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- OpenAI API key ([platform.openai.com](https://platform.openai.com))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Step 1 — Push to GitHub
Upload all project files to your GitHub repo. Use the github.dev web editor (press `.` in your repo) for easy drag-and-drop upload.

### Step 2 — Connect to Vercel
Go to [vercel.com](https://vercel.com) → Add New → Project → Import your repo. Framework auto-detects as Next.js.

### Step 3 — Environment Variables
In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `ADMIN_PASSWORD` | Your chosen login password |
| `JWT_SECRET` | Any random string (32+ characters) |

### Step 4 — Deploy
Click Deploy. Once live, visit your URL, enter your admin password, and start dictating.

### Step 5 — Custom Domain (optional)
In Vercel → Project → Settings → Domains, add your domain (e.g. `voice.alecrae.app`).

---

## Install on Devices

| Device | How to install |
|--------|---------------|
| iPhone / iPad | Open in Safari → Share button → "Add to Home Screen" |
| Android | Open in Chrome → Menu (⋮) → "Add to Home Screen" |
| Windows | Open in Chrome or Edge → Click install icon in address bar |
| Mac | Open in Chrome → Menu → "Install AlecRae Voice" |

Once installed, it opens full-screen like a native app with its own icon.

---

## Keyboard Shortcuts (Default)

| Action | Default Key | Customisable |
|--------|-------------|:---:|
| Start / stop recording | F2 | Yes |
| Enhance with AI | F4 | Yes |
| Copy enhanced text | F6 | Yes |
| Clear all | F8 | Yes |
| Export to .docx | F10 | Yes |

All hotkeys can be rebound in Settings → Hotkeys.

---

## Voice Commands

Say these while recording and they'll be interpreted as formatting:

| Say this | Result |
|----------|--------|
| "new paragraph" | Paragraph break |
| "new line" | Line break |
| "period" | . |
| "comma" | , |
| "question mark" | ? |
| "exclamation mark" | ! |
| "colon" | : |
| "semicolon" | ; |
| "open quote" | " |
| "close quote" | " |
| "delete that" | Removes last phrase |

---

## Roadmap

- [ ] Neon PostgreSQL for cross-device sync
- [ ] Native iOS app (Apple App Store)
- [ ] Native Android app (Google Play Store)
- [ ] Real-time streaming transcription
- [ ] Document templates with fillable fields
- [ ] Batch audio file transcription
- [ ] Multi-user accounts with subscriptions
- [ ] Integration with AlecRae legal and accounting platforms
- [ ] Enterprise features (SSO, HIPAA, SOC 2)

---

## License

Proprietary. All rights reserved. AlecRae Voice is a product of the AlecRae / MarcoReid brand portfolio.
