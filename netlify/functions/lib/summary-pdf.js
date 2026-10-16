// Risk Profile Summary - Doc 1 of 2.
//
// Rebuilt to the Trinity design-system template (Trinity_Risk_Profile_Summary).
// Replaces the earlier navy-header layout: this one is dark-on-white, set in
// Spectral for display and Manrope for text, with the five-category scale bar
// and the per-area breakdown the template introduced.

const { jsPDF } = require('jspdf');
const { PROFS, SMETA, QS, buildResult } = require('./rpq-core');
const { TRINITY_DARK, GO_BEYOND_DARK } = require('./logo-dark');
const { Spectral300, Spectral400, Manrope400, Manrope600 } = require('./fonts');

// Design-system palette, taken from the template.
const INK      = [21, 29, 38];    // #151d26
const INK_SOFT = [31, 41, 55];    // #1f2937
const SLATE    = [107, 122, 143]; // #6b7a8f
const MUTED    = [170, 179, 191]; // #aab3bf
const RULE     = [220, 223, 227]; // #dcdfe3
const WASH     = [247, 247, 248]; // #f7f7f8
const CORAL    = [255, 74, 87];   // #ff4a57

// A4 at 72dpi-equivalent points, which is what jsPDF uses by default.
const PW = 595.28;
const PH = 841.89;
const ML = 54;                 // left margin
const MR = PW - 54;            // right edge
const CW = MR - ML;            // content width

// Order matters: this is the scale the client sees, lowest risk first.
const SCALE = ['Low', 'Cautious', 'Balanced', 'Adventurous', 'High'];

// One line per area, chosen by how far through that area's range the client
// scored. Same copy as the previous summary so nothing reads differently to a
// client comparing an old document with a new one.
const AREA_NOTES = {
  A: {
    low:  'Cautious disposition  -  stability and predictability are important; market fluctuations cause discomfort.',
    mid:  'Balanced outlook  -  some volatility accepted for returns; prolonged losses would be uncomfortable.',
    high: 'Growth-oriented mindset  -  downturns viewed with perspective; focused on long-term objectives.'
  },
  B: {
    low:  'Limited financial resilience. A significant fall in value could materially affect living standards.',
    mid:  'Moderate ability to absorb losses. Uncomfortable, but would not critically jeopardise finances.',
    high: 'Strong resilience. A significant fall would not materially affect standard of living.'
  },
  C: {
    low:  'Shorter horizon  -  supports a more conservative allocation to protect capital near the access date.',
    mid:  'Medium-term horizon  -  supports a moderately diversified approach balancing growth and protection.',
    high: 'Longer horizon  -  supports higher equity allocation; time available to recover from short-term falls.'
  },
  D: {
    low:  'Knowledge at an earlier stage  -  adviser will ensure strategy is clearly explained.',
    mid:  'Reasonable investment knowledge  -  likely to understand principles and risks involved.',
    high: 'Strong knowledge and experience  -  well-placed to understand complex strategies.'
  },
  E: {
    low:  'Cautious, risk-averse past behaviour  -  losses weigh more heavily than equivalent gains.',
    mid:  'Measured, considered past behaviour  -  risk and reward weighed thoughtfully.',
    high: 'Confident, opportunity-seeking past behaviour  -  gains and losses processed evenly.'
  }
};

function registerFonts(doc) {
  doc.addFileToVFS('Spectral-Light.ttf', Spectral300);
  doc.addFont('Spectral-Light.ttf', 'Spectral', 'light');
  doc.addFileToVFS('Spectral-Regular.ttf', Spectral400);
  doc.addFont('Spectral-Regular.ttf', 'Spectral', 'normal');
  doc.addFileToVFS('Manrope-Regular.ttf', Manrope400);
  doc.addFont('Manrope-Regular.ttf', 'Manrope', 'normal');
  doc.addFileToVFS('Manrope-SemiBold.ttf', Manrope600);
  doc.addFont('Manrope-SemiBold.ttf', 'Manrope', 'bold');
}

// Small helpers so the layout code below reads as layout, not as setup.
const txt  = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const fill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const draw = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);

function rule(doc, y, colour) {
  draw(doc, colour || RULE);
  doc.setLineWidth(0.5);
  doc.line(ML, y, MR, y);
}

// Letter-spaced small caps, used for the eyebrow labels through the document.
function eyebrow(doc, text, x, y, colour) {
  doc.setFont('Manrope', 'bold');
  doc.setFontSize(7);
  txt(doc, colour || SLATE);
  doc.text(String(text).toUpperCase(), x, y, { charSpace: 1.4 });
}

function buildSummaryPDF(client) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  registerFonts(doc);

  const r = buildResult(client);
  const p = r.p;
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // ---- Header -----------------------------------------------------------
  let y = 52;

  eyebrow(doc, 'Risk Profiling Pack \u00B7 Doc 1 of 2', ML, y, MUTED);

  // Trinity mark, right-aligned against the margin.
  const logoW = 74, logoH = 53;
  doc.addImage(TRINITY_DARK, 'PNG', MR - logoW, y - 18, logoW, logoH);

  y += 22;
  doc.setFont('Spectral', 'normal');
  doc.setFontSize(19);
  txt(doc, INK);
  doc.text('Risk profile summary', ML, y);

  y += 14;
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(7.5);
  txt(doc, MUTED);
  doc.text('FCA Reg. 523393', ML, y);

  y += 20;
  rule(doc, y);

  // ---- Prepared for / Date ---------------------------------------------
  y += 22;
  eyebrow(doc, 'Prepared for', ML, y);
  doc.setFont('Manrope', 'bold');
  doc.setFontSize(7);
  txt(doc, SLATE);
  doc.text('DATE', MR, y, { align: 'right', charSpace: 1.4 });

  y += 15;
  doc.setFont('Spectral', 'normal');
  doc.setFontSize(13);
  txt(doc, INK);
  doc.text(client.name || 'Client', ML, y);
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(9);
  txt(doc, INK_SOFT);
  doc.text(dateStr, MR, y, { align: 'right' });

  y += 13;
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(8.5);
  txt(doc, SLATE);
  if (client.email) { doc.text(client.email, ML, y); y += 11; }
  doc.text('Adviser: ' + (client.adviser || 'Not selected'), ML, y);

  y += 20;
  rule(doc, y);

  // ---- Profile block ----------------------------------------------------
  y += 24;
  eyebrow(doc, 'Your indicative risk profile', ML, y, CORAL);

  y += 30;
  doc.setFont('Spectral', 'light');
  doc.setFontSize(33);
  txt(doc, INK);
  doc.text(p.label, ML, y);

  // Score, right-aligned, with a muted /100.
  doc.setFont('Spectral', 'light');
  doc.setFontSize(33);
  txt(doc, INK);
  const scoreStr = String(r.tot);
  const scoreW = doc.getTextWidth(scoreStr);
  doc.setFontSize(11);
  const perW = doc.getTextWidth('/100');
  doc.setFontSize(33);
  doc.text(scoreStr, MR - perW - 3, y, { align: 'right' });
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(11);
  txt(doc, MUTED);
  doc.text('/100', MR, y, { align: 'right' });

  y += 15;
  doc.setFont('Spectral', 'normal');
  doc.setFontSize(10);
  txt(doc, SLATE);
  doc.text(p.tag, ML, y);

  // ---- Five-category scale ---------------------------------------------
  y += 22;
  const segGap = 4;
  const segW = (CW - segGap * (SCALE.length - 1)) / SCALE.length;
  SCALE.forEach((key, i) => {
    const x = ML + i * (segW + segGap);
    const isMe = key === r.k;
    fill(doc, isMe ? CORAL : RULE);
    doc.rect(x, y, segW, isMe ? 5 : 3, 'F');
  });

  y += 16;
  SCALE.forEach((key, i) => {
    const x = ML + i * (segW + segGap);
    const isMe = key === r.k;
    const prof = PROFS[key];
    doc.setFont('Manrope', isMe ? 'bold' : 'normal');
    doc.setFontSize(6.6);
    txt(doc, isMe ? INK : MUTED);
    doc.text(prof.label, x, y);
    doc.setFont('Manrope', 'normal');
    doc.setFontSize(6.2);
    txt(doc, MUTED);
    doc.text(prof.band.replace('-', '\u2013'), x, y + 8);
  });

  // ---- Description ------------------------------------------------------
  y += 28;
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(8.6);
  txt(doc, INK_SOFT);
  const desc = doc.splitTextToSize(p.desc, CW);
  doc.text(desc, ML, y, { lineHeightFactor: 1.55 });
  y += desc.length * 8.6 * 1.55;

  // Capacity override is material: the client's stated appetite was not what
  // set this profile, and the document should say so plainly.
  if (r.capped) {
    y += 10;
    fill(doc, WASH);
    doc.rect(ML, y - 9, CW, 34, 'F');
    fill(doc, CORAL);
    doc.rect(ML, y - 9, 2.5, 34, 'F');
    doc.setFont('Manrope', 'bold');
    doc.setFontSize(7.6);
    txt(doc, INK);
    doc.text('Capacity for loss adjustment', ML + 12, y + 2);
    doc.setFont('Manrope', 'normal');
    doc.setFontSize(7.4);
    txt(doc, SLATE);
    const cap = doc.splitTextToSize(
      'Your answers indicate limited capacity to absorb investment losses. '
      + 'Your profile has been set to Low Risk in line with FCA guidance.', CW - 24);
    doc.text(cap, ML + 12, y + 13, { lineHeightFactor: 1.4 });
    y += 30;
  }

  y += 12;
  rule(doc, y);

  // ---- Answers by area --------------------------------------------------
  y += 18;
  eyebrow(doc, 'Your answers by area', ML, y);
  y += 16;

  Object.keys(SMETA).forEach(key => {
    const meta = SMETA[key];
    const got = r.wt[key] || 0;
    const max = meta.w;                       // SMETA.w is the weighted maximum
    const pct = max ? Math.max(0, Math.min(1, got / max)) : 0;
    const band = pct < 0.40 ? 'low' : pct < 0.70 ? 'mid' : 'high';

    doc.setFont('Manrope', 'bold');
    doc.setFontSize(8.2);
    txt(doc, INK);
    doc.text(meta.n, ML, y);

    doc.setFont('Manrope', 'normal');
    doc.setFontSize(8.2);
    txt(doc, SLATE);
    doc.text(got.toFixed(1) + ' / ' + max, MR, y, { align: 'right' });

    y += 7;
    fill(doc, RULE);
    doc.rect(ML, y, CW, 2.5, 'F');
    fill(doc, CORAL);
    doc.rect(ML, y, CW * pct, 2.5, 'F');

    y += 10;
    doc.setFont('Manrope', 'normal');
    doc.setFontSize(7.2);
    txt(doc, MUTED);
    const line = doc.splitTextToSize(AREA_NOTES[key][band], CW);
    doc.text(line[0], ML, y);

    y += 13;
  });

  // ---- Asset allocation -------------------------------------------------
  y += 2;
  rule(doc, y);
  y += 18;
  eyebrow(doc, 'Indicative asset allocation', ML, y);

  y += 14;
  const allocCols = [INK, SLATE, CORAL, MUTED];
  let ax = ML;
  p.alloc.forEach((a, i) => {
    const w = CW * (a.p / 100);
    fill(doc, allocCols[i]);
    doc.rect(ax, y, w, 9, 'F');
    ax += w;
  });

  y += 20;
  const legW = CW / 4;
  p.alloc.forEach((a, i) => {
    const x = ML + i * legW;
    fill(doc, allocCols[i]);
    doc.rect(x, y - 5.5, 6, 6, 'F');
    doc.setFont('Manrope', 'normal');
    doc.setFontSize(7);
    txt(doc, SLATE);
    doc.text(a.n, x + 10, y);
    doc.setFont('Manrope', 'bold');
    doc.setFontSize(9);
    txt(doc, INK);
    doc.text(a.p + '%', x + 10, y + 12);
  });

  y += 24;
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(7);
  txt(doc, MUTED);
  doc.text(
    'Illustrative range (before charges and tax)  -  strong year: ' + p.sy
    + ' p.a.  \u00B7  long-run average: ' + p.ret
    + ' p.a.  \u00B7  severe year: ' + p.wy,
    ML, y);

  if (client.esg) {
    y += 11;
    const esgLine = doc.splitTextToSize('ESG preference: ' + client.esg, CW);
    doc.text(esgLine[0], ML, y);
  }

  // ---- Important information (anchored to the foot) ---------------------
  // Measure the disclaimer first so the block can be placed without ever
  // running into the brand mark, however long the body above it ran.
  const LOGO_TOP = PH - 52;
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(6.2);
  const discLines = doc.splitTextToSize(
    'This questionnaire produces an indicative risk profile based solely on '
    + 'self-reported answers and does not constitute a personal recommendation or '
    + 'financial advice. All return figures are illustrative, before charges and tax, '
    + 'based on the modern market era (1975 onward) and are not forecasts or '
    + 'guarantees. Investments can fall as well as rise and you may get back less '
    + 'than you invest. A suitable recommendation will be made only after a full '
    + 'assessment by your adviser. Trinity Capital Partners trades as Trinity Global '
    + 'Capital UK Ltd and is authorised and regulated by the Financial Conduct '
    + 'Authority (FCA Reg. 523393).', CW);

  const discH = discLines.length * 6.2 * 1.45;
  // Pinned to the foot of the page, not to where the content happened to end.
  // The content above is bounded, so this never overlaps; anchoring it keeps
  // the disclaimer in the same place on every client's document.
  const discTop = LOGO_TOP - 16 - discH;
  rule(doc, discTop - 28);
  eyebrow(doc, 'Important information', ML, discTop - 12);
  txt(doc, MUTED);
  doc.setFont('Manrope', 'normal');
  doc.setFontSize(6.2);
  doc.text(discLines, ML, discTop, { lineHeightFactor: 1.45 });

  // ---- Footer -----------------------------------------------------------
  const gbW = 52, gbH = 26;
  doc.addImage(GO_BEYOND_DARK, 'PNG', ML, LOGO_TOP, gbW, gbH);

  doc.setFont('Manrope', 'normal');
  doc.setFontSize(6.6);
  txt(doc, MUTED);
  doc.text('Risk Profile Summary  \u00B7  Page 1 of 1', MR, LOGO_TOP + 17, { align: 'right' });

  return doc;
}

module.exports = { buildSummaryPDF };