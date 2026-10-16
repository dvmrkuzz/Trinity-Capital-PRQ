const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { buildUnderstandingPDF } = require('./lib/pdf');
// Summary now uses the design-system template layout; the Understanding guide
// keeps its existing design until a template exists for that too.
const { buildSummaryPDF } = require('./lib/summary-pdf');
const { buildResult } = require('./lib/rpq-core');

// Short-lived record of what has already been sent. Netlify may reuse a warm
// container between invocations, so this catches most duplicates: the same
// client's identical answers arriving twice within a few minutes is a repeat
// delivery, not a second assessment.
const recentSends = new Map();
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

function alreadySent(fingerprint){
  const now = Date.now();
  for (const [k, t] of recentSends) {
    if (now - t > DUPLICATE_WINDOW_MS) recentSends.delete(k);
  }
  if (recentSends.has(fingerprint)) return true;
  recentSends.set(fingerprint, now);
  return false;
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const {
    data = {},
    summary = '',
    summaryPdfBase64      = null,   // Risk Profile Summary (1 page)
    understandingPdfBase64 = null,  // Understanding Your Result (4 pages)
    compliancePdfBase64   = null,   // unused — compliance PDF removed from email
    summaryPdfMissing      = false, // set by the client when a PDF failed to build
    understandingPdfMissing = false,
    answers                = null,  // structured question-by-question responses
    esgQuestion            = '',
    esgAnswer              = '',
    recovered              = false, // true when sent by the unload beacon
    rawAnswers             = null   // {questionId: score} - lets the server build the PDFs
  } = body;

  // Stop here if this exact submission has just been delivered. Built before
  // PDF generation so a duplicate costs nothing.
  const fingerprint = crypto.createHash('sha1').update(JSON.stringify({
    name:    data.client_name || data.name || '',
    email:   data.client_email || data.email || '',
    adviser: data.adviser || '',
    answers: rawAnswers || null
  })).digest('hex');

  if (alreadySent(fingerprint)) {
    console.log('Duplicate suppressed for', data.client_name || data.name,
                '- identical submission already sent within the last 5 minutes');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'duplicate suppressed', internalSent: false })
    };
  }

  // Generate the PDFs here rather than in the client's browser. Previously the
  // documents were built on the client's device and posted up; if they closed
  // the page first the work stopped and nothing arrived. Building them here
  // means the submission only depends on the answers reaching us, which takes
  // a fraction of a second.
  let serverSummaryPdf = null, serverUnderstandingPdf = null, pdfError = null;
  if (rawAnswers && Object.keys(rawAnswers).length) {
    const client = {
      name:    data.client_name || data.name || 'Client',
      email:   data.client_email || data.email || '',
      adviser: data.adviser || '',
      esg:     data.esg_raw || null,
      answers: rawAnswers
    };
    try {
      serverSummaryPdf = Buffer.from(buildSummaryPDF(client).output('arraybuffer')).toString('base64');
    } catch (e) {
      pdfError = e.message;
      console.error('Server summary PDF failed:', e.message);
    }
    try {
      serverUnderstandingPdf = Buffer.from(buildUnderstandingPDF(client).output('arraybuffer')).toString('base64');
    } catch (e) {
      pdfError = e.message;
      console.error('Server understanding PDF failed:', e.message);
    }
  }

  // A PDF can fail to build on the client's device (blocked CDN, low memory).
  // The submission is still sent so the adviser has the answers, but the email
  // must say plainly what did and did not arrive rather than claim attachments
  // that are not there.
  // Server-built documents take precedence. The client copies are only a
  // fallback for older page versions still in someone's browser tab.
  const finalSummary       = serverSummaryPdf       || summaryPdfBase64;
  const finalUnderstanding = serverUnderstandingPdf || understandingPdfBase64;

  const missingSummary       = !finalSummary;
  const missingUnderstanding = !finalUnderstanding;
  const anyMissing           = missingSummary || missingUnderstanding;
  const builtOnServer        = !!(serverSummaryPdf || serverUnderstandingPdf);

  const onboardingRecipient = process.env.RECIPIENT_TEST || process.env.RECIPIENT || 'send2hire.mark081103@outlook.com';

  // Adviser routing. The selected adviser is copied on their own client's
  // submission so they see it without waiting for onboarding to forward it.
  // Keys must match the adviser dropdown in index.html exactly.
  const ADVISER_EMAILS = {
    'David Wells':     'david@trinitycapitalpartners.co.uk',
    'Kevin Thomas':    'kevin@trinitycapitalpartners.co.uk',
    'Robert Saunders': 'robert@trinitycapitalpartners.co.uk',
    'Russell Provan':  'russell@trinitycapitalpartners.co.uk',
    'Collin Bowman':   'collin.bowman@trinitycapitalpartners.co.uk',
    'Darryl Boulton':  'darryl@trinitycapitalpartners.co.uk'
  };
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
  // Answers come from a fixed option list, but they are rendered into HTML
  // email so escape them rather than trusting the payload.
  const esc = v => String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const clientName  = safe(data.client_name || data.name);
  const clientEmail = safe(data.client_email || data.email);
  const adviser     = safe(data.adviser);
  const profile     = safe(data.risk_profile || data.profile);
  const score       = safe(data.rpq_score || data.score);
  const esg         = safe(data.esg_preference || data.esg);
  const submitted   = safe(data.completedAt || data.submitted || new Date().toLocaleString('en-GB'));
  const slug        = clientName.replace(/[^a-z0-9]+/gi, '-');

  // ── Branded email HTML shell ──────────────────────────────────────────────
  const emailHTML = (heading, bodyRows, note, extra) => `<!DOCTYPE html>
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
    ${extra || ''}
  </td></tr>
  <tr><td style="background:#f4f5f8;padding:16px 32px;border-top:1px solid #e8eaf0;">
    <p style="margin:0;font-size:10px;color:#6b7a8f;line-height:1.6;">Trinity Capital Partners trades as Trinity Global Capital UK Ltd and is authorised and regulated by the Financial Conduct Authority (FCA Reg. 523393). This email and any attachments are confidential and intended solely for the addressee.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  // Renders the client's answers grouped by section. Included in the adviser's
  // email so the selections are on file and available for the suitability
  // report without anyone having to open the raw message source.
  const answersBlock = () => {
    if(!Array.isArray(answers) || !answers.length) return '';
    let html = '<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e8eaf0;">'
      + '<p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;color:#ff4a57;'
      + 'text-transform:uppercase;font-weight:600;">Client answers</p>'
      + '<p style="margin:0 0 16px;font-size:12px;color:#6b7a8f;line-height:1.6;">'
      + 'Every question and the option the client selected, in the wording they saw. '
      + 'The figure in brackets is the score that answer contributed.</p>';

    let currentSection = '';
    answers.forEach(a => {
      if(a.section !== currentSection){
        currentSection = a.section;
        html += '<p style="margin:18px 0 8px;font-size:12px;font-weight:600;'
             +  'color:#151d26;letter-spacing:0.4px;">' + esc(currentSection) + '</p>';
      }
      html += '<div style="margin-bottom:12px;padding-left:12px;border-left:2px solid #e8eaf0;">'
           +  '<p style="margin:0 0 3px;font-size:12px;color:#6b7a8f;line-height:1.5;">'
           +  'Q' + a.id + ' &middot; ' + esc(a.question) + '</p>'
           +  '<p style="margin:0;font-size:13px;color:#151d26;line-height:1.5;">'
           +  esc(a.answer)
           +  (a.score ? ' <span style="color:#6b7a8f;">(' + a.score + ')</span>' : '')
           +  '</p></div>';
    });

    if(esgQuestion){
      html += '<p style="margin:18px 0 8px;font-size:12px;font-weight:600;'
           +  'color:#151d26;letter-spacing:0.4px;">Sustainable investing</p>'
           +  '<div style="margin-bottom:12px;padding-left:12px;border-left:2px solid #e8eaf0;">'
           +  '<p style="margin:0 0 3px;font-size:12px;color:#6b7a8f;line-height:1.5;">'
           +  esc(esgQuestion) + '</p>'
           +  '<p style="margin:0;font-size:13px;color:#151d26;line-height:1.5;">'
           +  esc(esgAnswer) + '</p></div>';
    }

    return html + '</div>';
  };

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

  const internalNote = (recovered && !anyMissing)
    ? 'The client closed the page shortly after finishing. Their answers were '
      + 'captured and both documents were generated here, so everything is '
      + 'attached as normal and no action is needed.'
    : recovered
    ? '<strong>Action needed — recovered submission.</strong><br/>'
      + 'The client closed the page before their documents finished generating, '
      + 'so none are attached and the client has not received theirs. Their '
      + 'answers were captured and are listed below, so the documents can be '
      + 'regenerated and sent on. The result itself is complete and correct.'
    : anyMissing
    ? '<strong>Action needed — attachments incomplete.</strong><br/>'
      + 'The client\'s browser could not generate '
      + (missingSummary && missingUnderstanding ? 'either PDF'
         : missingSummary ? 'the Risk Profile Summary'
         : 'the Understanding Your Result guide')
      + ', so '
      + (missingSummary && missingUnderstanding ? 'neither is' : 'it is not')
      + ' attached. The client\'s full answers and score are recorded above and '
      + 'in the plain-text copy of this email, so the document'
      + (missingSummary && missingUnderstanding ? 's can' : ' can')
      + ' be regenerated. The client has not received '
      + (missingSummary && missingUnderstanding ? 'these documents' : 'this document')
      + ' either and may need them sending on.'
    : 'Two documents are attached:<br/>'
      + '&bull; <strong>Risk Profile Summary</strong> — share with the client file<br/>'
      + '&bull; <strong>Understanding Your Result</strong> — client education guide';

  const onboardingAttachments = [];
  if (finalSummary) {
    onboardingAttachments.push({ filename: `${slug}-risk-profile-summary.pdf`,      content: finalSummary,       encoding: 'base64', contentType: 'application/pdf' });
  }
  if (finalUnderstanding) {
    onboardingAttachments.push({ filename: `${slug}-understanding-your-result.pdf`, content: finalUnderstanding,  encoding: 'base64', contentType: 'application/pdf' });
  }
  // Compliance PDF not attached to email — stored client-side only

  const onboardingMail = {
    from: `"Trinity Capital Partners" <${smtpUser}>`,
    to: onboardingRecipient,
    // Copy the adviser so they see their own client's result directly. When
    // RECIPIENT_TEST is set we are testing, so no real adviser is contacted.
    cc: (!process.env.RECIPIENT_TEST && ADVISER_EMAILS[adviser]) || undefined,
    subject: (anyMissing ? (recovered ? '[RECOVERED] ' : '[PDFs MISSING] ') : '')
      + `New Risk Profile — ${clientName} (${profile}, Score: ${score}) · Adviser: ${adviser}`,
    text: summary || JSON.stringify(data, null, 2),
    html: emailHTML('New Client Risk Profile Received', internalRows, internalNote, answersBlock()),
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

    const clientNote = anyMissing
      ? 'Your result is recorded above and has been sent to your adviser.<br/><br/>'
        + 'We were not able to generate your PDF documents in your browser on this '
        + 'occasion, so they are not attached. Your adviser will send them to you '
        + 'directly.<br/><br/>'
        + 'Your adviser will be in touch to discuss your results and next steps. '
        + 'This result is indicative only and does not constitute financial advice.'
      : 'Two documents are attached for you to keep:<br/>'
        + '&bull; <strong>Risk Profile Summary</strong> — your personalised one-page result<br/>'
        + '&bull; <strong>Understanding Your Result</strong> — a plain-English guide to what your profile means<br/><br/>'
        + 'Your adviser will be in touch to discuss your results and next steps. This result is indicative only and does not constitute financial advice.';

    const clientAttachments = [];
    if (finalSummary) {
      clientAttachments.push({ filename: `${slug}-risk-profile-summary.pdf`,      content: finalSummary,      encoding: 'base64', contentType: 'application/pdf' });
    }
    if (finalUnderstanding) {
      clientAttachments.push({ filename: `${slug}-understanding-your-result.pdf`, content: finalUnderstanding, encoding: 'base64', contentType: 'application/pdf' });
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
    const advCopy = ADVISER_EMAILS[adviser];
    console.log('Onboarding email sent', internalInfo.messageId,
      advCopy ? ('| adviser copied: ' + advCopy)
              : ('| NO adviser match for "' + adviser + '"'));

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