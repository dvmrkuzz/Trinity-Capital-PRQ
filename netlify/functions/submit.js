const nodemailer = require('nodemailer');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' } }

  const { data = {}, summary = '', summaryPdfBase64 = null, compliancePdfBase64 = null } = body;
  const recipient = process.env.RECIPIENT_TEST || process.env.RECIPIENT || 'send2hire.mark081103@outlook.com';
  const smtpUser = process.env.SMTP_USER; // e.g. trinitycapitalrpq@gmail.com
  const smtpPass = process.env.SMTP_PASS; // app password

  if (!smtpUser || !smtpPass) {
    console.error('SMTP credentials missing');
    return { statusCode: 500, body: 'SMTP credentials not configured in environment' };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const clientName = data.client_name || data.name || '';
  const subject = `New Client Risk Profile — ${clientName} ${data.reference ? '('+data.reference+')' : ''}`;
  const text = summary || JSON.stringify(data, null, 2);

  const safe = v => (v==null || v===undefined) ? '—' : String(v);
  const submitted = safe(data.completedAt || data.submitted || new Date().toISOString());
  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#222">
    <div style="background:#0f1720;color:#fff;padding:22px 24px;border-radius:6px 6px 0 0;text-align:center;">
      <div style="font-size:12px;letter-spacing:2px;color:#ff6b6b">GO BEYOND</div>
      <h2 style="margin:6px 0 0 0">New Client Risk Profile</h2>
    </div>
    <div style="background:#f6f7f8;padding:18px 22px;border:1px solid #eee;border-top:none;border-radius:0 0 6px 6px;">
      <table style="width:100%;border-collapse:collapse;color:#222">
        <tbody>
            <tr><td style="width:160px;padding:8px 12px;color:#6b7280">Name</td><td style="padding:8px 12px;font-weight:600">${safe(clientName)}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280">Email</td><td style="padding:8px 12px">${safe(data.client_email||data.email)}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280">Adviser</td><td style="padding:8px 12px">${safe(data.adviser)}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280">Risk profile</td><td style="padding:8px 12px">${safe(data.risk_profile || data.profile || data.profileName)}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280">Score</td><td style="padding:8px 12px">${safe(data.rpq_score || data.score || data.total)}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280">ESG preference</td><td style="padding:8px 12px">${safe(data.esg_preference || data.esg || data.esg_preference)}</td></tr>
              <tr><td style="padding:8px 12px;color:#6b7280">Submitted</td><td style="padding:8px 12px">${submitted}</td></tr>
        </tbody>
      </table>
      <div style="margin-top:16px;padding:12px;background:#fff;border-left:4px solid #ff6b6b;color:#374151;border-radius:4px">Full details are in the attached PDF.</div>
    </div>
  </div>
  `;

  // Prepare attachments: prefer PDF base64 attachments if provided
  const attachments = [];
  if (summaryPdfBase64) {
    attachments.push({ filename: `${clientName.replace(/[^a-z0-9]+/gi,'-')}-risk-profile-summary.pdf`, content: summaryPdfBase64, encoding: 'base64', contentType: 'application/pdf' });
  }
  if (compliancePdfBase64) {
    attachments.push({ filename: `${clientName.replace(/[^a-z0-9]+/gi,'-')}-risk-profile-compliance.pdf`, content: compliancePdfBase64, encoding: 'base64', contentType: 'application/pdf' });
  }

  const mailOptions = {
    from: smtpUser,
    to: recipient,
    subject,
    text: text,
    html: html,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent', info.messageId);
    return { statusCode: 200, body: JSON.stringify({ message: 'sent', messageId: info.messageId }) };
  } catch (err) {
    console.error('Send failed', err);
    return { statusCode: 500, body: String(err) };
  }
};
