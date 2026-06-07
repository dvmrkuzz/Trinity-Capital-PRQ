# PRQ (Client Onboarding) — Netlify + Serverless Function

This small app collects a client's PRQ (pre-qualification) info, auto-downloads a summary for the client, and emails the summary to the onboarding address via a Netlify serverless function using a Gmail account as the sender.

Quick setup

- In Netlify site settings (or your environment) set these environment variables:
  - `SMTP_USER` — e.g. `trinitycapitalrpq@gmail.com`
  - `SMTP_PASS` — Gmail app password (recommended) or SMTP password
  - `RECIPIENT_TEST` — test recipient (defaults to `send2hire.mark081103@outlook.com`)
  - `RECIPIENT` — production recipient (e.g. `clientonboarding@trinitycapital.co.uk`)
  
App Password (recommended quick start)

- For a Gmail account, enable 2-Step Verification and create an App Password:
  1. Open your Google Account > Security > Signing in to Google > 2-Step Verification and enable it.
  2. Then go to App passwords, select "Mail" and "Other (Custom name)" and generate a password.
  3. Copy the 16-character app password — use this as `SMTP_PASS`.
  4. Set `SMTP_USER` to your Gmail address (e.g. `trinitycapitalrpq@gmail.com`).

Local testing with Netlify CLI

1. Install dependencies:

```bash
npm install
```

2. Install Netlify CLI and run locally (provide env vars inline or via a `.env` file):

```bash
npm install -g netlify-cli
# set env for this session (PowerShell example)
#$env:SMTP_USER='trinitycapitalrpq@gmail.com'
#$env:SMTP_PASS='your-app-password'
# then run
netlify dev
```

When `netlify dev` is running the front-end will be served and the function will be available at `/.netlify/functions/submit`.

Local testing

1. Install dependencies:

```bash
npm install
```

2. Install Netlify CLI if you want to run functions locally:

```bash
npm install -g netlify-cli
netlify dev
```


Deployment

- Push the repo to Git and connect the site on Netlify. Add the environment variables in Netlify site settings. Netlify will install `nodemailer` from `package.json` and deploy the function.

Gmail notes

- Use an App Password for `SMTP_PASS` (recommended). See Google account security settings — for regular accounts you must enable 2FA and create an app password.
- If using a GSuite/Google Workspace account check SMTP relay settings or use OAuth2 flow.

Files changed

- `index.html` — form + client JS to build summary, auto-download, and POST to the function.
- `netlify/functions/submit.js` — serverless function that sends the summary to `RECIPIENT_TEST` (or `RECIPIENT`) using `SMTP_USER`.
- `package.json` — dependency list for Netlify functions.

If you want, I can also:
- Add validation and richer form fields (file uploads, multi-step flow).
- Implement OAuth2 sending for Gmail to avoid app passwords.
- Add tests or CI.
