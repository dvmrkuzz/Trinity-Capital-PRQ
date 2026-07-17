const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const {
    data = {},
    summary = '',
    summaryPdfBase64      = null,   // Risk Profile Summary (1 page)
    understandingPdfBase64 = null,  // Understanding Your Result (4 pages)
    compliancePdfBase64   = null    // unused — compliance PDF removed from email
  } = body;

  const onboardingRecipient = process.env.RECIPIENT_TEST || process.env.RECIPIENT || 'send2hire.mark081103@outlook.com';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.error('SMTP credentials missing');
    return { statusCode: 500, body: 'SMTP credentials not configured' };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const safe = v => (v == null) ? '—' : String(v);
  const clientName  = safe(data.client_name || data.name);
  const clientEmail = safe(data.client_email || data.email);
  const adviser     = safe(data.adviser);
  const profile     = safe(data.risk_profile || data.profile);
  const score       = safe(data.rpq_score || data.score);
  const esg         = safe(data.esg_preference || data.esg);
  const submitted   = safe(data.completedAt || data.submitted || new Date().toLocaleString('en-GB'));
  const slug        = clientName.replace(/[^a-z0-9]+/gi, '-');

  // ── Branded email HTML shell ──────────────────────────────────────────────
  const emailHTML = (heading, bodyRows, note) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f5f8;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#151d26;padding:28px 32px;">
    <p style="margin:0;font-size:10px;letter-spacing:3px;color:#ff4a57;text-transform:uppercase;font-weight:600;">GO BEYOND</p>
    <h1 style="margin:8px 0 4px;font-size:20px;font-weight:600;color:#ffffff;">${heading}</h1>
    <p style="margin:0;font-size:11px;color:#6b7a8f;">Trinity Capital Partners · FCA Reg. 523393</p>
  </td></tr>
  <tr><td style="background:#ff4a57;height:3px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="background:#ffffff;padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">${bodyRows}</table>
    ${note ? `<div style="margin-top:20px;padding:14px 16px;background:#fff0f1;border-left:4px solid #ff4a57;border-radius:4px;font-size:13px;color:#151d26;line-height:1.6;">${note}</div>` : ''}
  </td></tr>
  <tr><td style="background:#f4f5f8;padding:16px 32px;border-top:1px solid #e8eaf0;">
    <p style="margin:0;font-size:10px;color:#6b7a8f;line-height:1.6;">Trinity Capital Partners trades as Trinity Global Capital UK Ltd and is authorised and regulated by the Financial Conduct Authority (FCA Reg. 523393). This email and any attachments are confidential and intended solely for the addressee.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const row = (label, value, bold = false) => `
    <tr>
      <td style="padding:9px 0;width:160px;font-size:13px;color:#6b7a8f;vertical-align:top;border-bottom:1px solid #f0f1f4;">${label}</td>
      <td style="padding:9px 0;font-size:13px;color:#151d26;font-weight:${bold?'600':'400'};border-bottom:1px solid #f0f1f4;">${value}</td>
    </tr>`;

  // ── 1. ONBOARDING email — all three PDFs attached ─────────────────────────
  const internalRows =
    row('Client name',    clientName,  true) +
    row('Client email',   clientEmail) +
    row('Adviser',        adviser) +
    row('Risk profile',   profile,     true) +
    row('RPQ score',      score + ' / 100') +
    row('ESG preference', esg) +
    row('Submitted',      submitted);

  const internalNote = 'Two documents are attached:<br/>'
    + '&bull; <strong>Risk Profile Summary</strong> — share with the client file<br/>'
    + '&bull; <strong>Understanding Your Result</strong> — client education guide';

  const onboardingAttachments = [];
  if (summaryPdfBase64) {
    onboardingAttachments.push({ filename: `${slug}-risk-profile-summary.pdf`,      content: summaryPdfBase64,       encoding: 'base64', contentType: 'application/pdf' });
  }
  if (understandingPdfBase64) {
    onboardingAttachments.push({ filename: `${slug}-understanding-your-result.pdf`, content: understandingPdfBase64,  encoding: 'base64', contentType: 'application/pdf' });
  }
  // Compliance PDF not attached to email — stored client-side only

  const onboardingMail = {
    from: `"Trinity Capital Partners" <${smtpUser}>`,
    to: onboardingRecipient,
    subject: `New Risk Profile — ${clientName} (${profile}, Score: ${score}) · Adviser: ${adviser}`,
    text: summary || JSON.stringify(data, null, 2),
    html: emailHTML('New Client Risk Profile Received', internalRows, internalNote),
    attachments: onboardingAttachments
  };

  // ── 2. CLIENT confirmation email — Summary + Understanding only ───────────
  let clientMail = null;
  const clientEmailAddress = data.client_email || data.email;
  if (clientEmailAddress && clientEmailAddress !== '—') {
    const clientRows =
      row('Name',           clientName,  true) +
      row('Adviser',        adviser) +
      row('Risk profile',   profile,     true) +
      row('Score',          score + ' / 100') +
      row('Date completed', submitted);

    const clientNote = 'Two documents are attached for you to keep:<br/>'
      + '&bull; <strong>Risk Profile Summary</strong> — your personalised one-page result<br/>'
      + '&bull; <strong>Understanding Your Result</strong> — a plain-English guide to what your profile means<br/><br/>'
      + 'Your adviser will be in touch to discuss your results and next steps. This result is indicative only and does not constitute financial advice.';

    const clientAttachments = [];
    if (summaryPdfBase64) {
      clientAttachments.push({ filename: `${slug}-risk-profile-summary.pdf`,      content: summaryPdfBase64,      encoding: 'base64', contentType: 'application/pdf' });
    }
    if (understandingPdfBase64) {
      clientAttachments.push({ filename: `${slug}-understanding-your-result.pdf`, content: understandingPdfBase64, encoding: 'base64', contentType: 'application/pdf' });
    }

    clientMail = {
      from: `"Trinity Capital Partners" <${smtpUser}>`,
      to: clientEmailAddress,
      subject: `Your Trinity Capital Partners Risk Profile — ${profile}`,
      html: emailHTML('Your Risk Profile Summary', clientRows, clientNote),
      attachments: clientAttachments
    };
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  try {
    const internalInfo = await transporter.sendMail(onboardingMail);
    console.log('Onboarding email sent', internalInfo.messageId);

    let clientSent = false;
    if (clientMail) {
      try {
        const clientInfo = await transporter.sendMail(clientMail);
        console.log('Client email sent', clientInfo.messageId);
        clientSent = true;
      } catch (clientErr) {
        console.error('Client email failed (non-fatal):', clientErr.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'sent', internalSent: true, clientSent, messageId: internalInfo.messageId })
    };
  } catch (err) {
    console.error('Onboarding email send failed:', err);
    return { statusCode: 500, body: String(err) };
  }
};