// PDF generation, running on the server.
//
// These are the same builders that previously ran in the client's browser.
// Moving them here means a client can close the page the moment their answers
// are sent: the documents are produced and emailed regardless of what their
// device does next, which removes the recovered-submission failure entirely.

const { PROFS, SMETA, WT, QS, ESG_Q, buildResult, fmt } = require('./rpq-core');
const { LOGO_WHITE } = require('./logo');

function buildPDF(client){
  const{raw,wt,tot,k,capped,p}=buildResult(client);
  const {jsPDF} = require("jspdf");
  const doc=new jsPDF({unit:"pt",format:"a4"});
  const W=doc.internal.pageSize.getWidth();
  const M=48; let y=0;
  const navy=[21,29,38], coral=[255,74,87], slate=[107,122,143], ink=[21,29,38];

  // Header band
  doc.setFillColor(...ink); doc.rect(0,0,W,96,"F");
  doc.setFillColor(...coral); doc.rect(0,96,W,3,"F");
  // logo aspect ratio 404x334; draw at ~52pt tall
  try{ doc.addImage(LOGO_WHITE,"PNG",M,22,Math.round(52*404/334),52); }catch(e){}
  doc.setTextColor(255,255,255); doc.setFont("times","normal"); doc.setFontSize(10);
  doc.text("RISK PROFILE SUMMARY", W-M, 44, {align:"right"});
  doc.setFontSize(9); doc.setTextColor(205,205,205);
  doc.text("FCA Reg. 523393", W-M, 60, {align:"right"});
  y=132;

  // Client + date
  doc.setTextColor(...slate); doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.text("PREPARED FOR", M, y);
  doc.text("DATE", W-M, y, {align:"right"});
  y+=16;
  doc.setTextColor(...ink); doc.setFont("helvetica","bold"); doc.setFontSize(13);
  doc.text(client.name||"Client", M, y);
  doc.setFont("helvetica","normal"); doc.setFontSize(11);
  doc.text(new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}), W-M, y, {align:"right"});
  if(client.email){ y+=15; doc.setTextColor(...slate); doc.setFontSize(9.5); doc.text(client.email, M, y); }
  if(client.adviser){ y+=13; doc.setTextColor(...slate); doc.setFontSize(9.5); doc.text("Adviser: "+client.adviser, M, y); }
  y+=26;

  // Profile block
  doc.setFillColor(...navy); doc.roundedRect(M,y,W-2*M,82,8,8,"F");
  doc.setTextColor(255,255,255); doc.setFont("helvetica","normal"); doc.setFontSize(9);
  doc.setTextColor(...coral); doc.text("YOUR INDICATIVE RISK PROFILE", M+20, y+24);
  doc.setTextColor(255,255,255); doc.setFont("times","bold"); doc.setFontSize(26);
  doc.text(p.label, M+20, y+54);
  doc.setFont("times","italic"); doc.setFontSize(12); doc.setTextColor(205,205,205);
  doc.text(p.tag, M+20, y+72);
  doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(255,255,255);
  doc.text(String(tot), W-M-26, y+44, {align:"right"});
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(180,185,195);
  doc.text("/100", W-M-22, y+58, {align:"right"});
  y+=104;

  // Description
  doc.setTextColor(...ink); doc.setFont("helvetica","normal"); doc.setFontSize(10.5);
  const dlines=doc.splitTextToSize(p.desc, W-2*M);
  doc.text(dlines, M, y); y+=dlines.length*14+8;

  if(capped){
    doc.setFillColor(255,240,241); doc.setDrawColor(...coral);
    const cl=doc.splitTextToSize("Capacity for loss adjustment: your overall score indicated a higher profile, but your capacity-for-loss responses suggest a more conservative approach. Your profile has been set to Low Risk in line with FCA guidance.", W-2*M-24);
    const ch=cl.length*12+20;
    doc.roundedRect(M,y,W-2*M,ch,6,6,"FD");
    doc.setTextColor(...ink); doc.setFontSize(9); doc.text(cl, M+12, y+15); y+=ch+12;
  }

  // Section breakdown
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...slate);
  doc.text("YOUR ANSWERS BY AREA", M, y); y+=14;

  const PDF_INTERP={
    A:{
      low:"Cautious disposition  -  stability and predictability are important; market fluctuations cause discomfort.",
      mid:"Balanced outlook  -  some volatility accepted for returns; prolonged losses would be uncomfortable.",
      high:"Growth-oriented mindset  -  downturns viewed with perspective; focused on long-term objectives."
    },
    B:{
      low:"Limited financial resilience. A significant fall in value could materially affect living standards.",
      mid:"Moderate ability to absorb losses. Uncomfortable, but would not critically jeopardise finances.",
      high:"Strong resilience. A significant fall would not materially affect standard of living."
    },
    C:{
      low:"Shorter horizon  -  supports a more conservative allocation to protect capital near the access date.",
      mid:"Medium-term horizon  -  supports a moderately diversified approach balancing growth and protection.",
      high:"Longer horizon  -  supports higher equity allocation; time available to recover from short-term falls."
    },
    D:{
      low:"Knowledge at an earlier stage  -  adviser will ensure strategy is clearly explained.",
      mid:"Reasonable investment knowledge  -  likely to understand principles and risks involved.",
      high:"Strong knowledge and experience  -  well-placed to understand complex strategies."
    },
    E:{
      low:"Cautious, risk-averse past behaviour  -  losses weigh more heavily than equivalent gains.",
      mid:"Measured, considered past behaviour  -  risk and reward weighed thoughtfully.",
      high:"Confident, opportunity-seeking past behaviour  -  gains and losses processed evenly."
    }
  };

  Object.entries(SMETA).forEach(([s,meta])=>{
    const pct=Math.round((wt[s]/meta.w)*100);
    const interpSection=PDF_INTERP[s];
    let interpText;
    if(pct<40) interpText=interpSection.low;
    else if(pct<70) interpText=interpSection.mid;
    else interpText=interpSection.high;

    doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(...ink);
    doc.text(meta.n, M, y);
    doc.text((wt[s]||0).toFixed(1)+" / "+meta.w, W-M, y, {align:"right"});
    doc.setFillColor(238,240,243); doc.roundedRect(M,y+4,W-2*M,5,2,2,"F");
    doc.setFillColor(...slate); doc.roundedRect(M,y+4,(W-2*M)*pct/100,5,2,2,"F");
    y+=18;
    doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(...slate);
    const interpLines=doc.splitTextToSize(interpText, W-2*M-4);
    doc.text(interpLines, M+2, y); y+=interpLines.length*10+6;
  });
  y+=6;

  // Indicative allocation
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...slate);
  doc.text("INDICATIVE ASSET ALLOCATION", M, y); y+=14;
  const allocCols={"Cash & Money Market":[205,205,205],"Bonds & Gilts":[107,122,143],"Equities":[255,74,87],"Alternatives":[31,41,55]};
  let bx=M; const bw=W-2*M;
  p.alloc.forEach(a=>{ const seg=bw*a.p/100; doc.setFillColor(...(allocCols[a.n]||slate)); doc.rect(bx,y,seg,18,"F"); bx+=seg; });
  y+=28;
  let lx=M;
  p.alloc.forEach(a=>{ doc.setFillColor(...(allocCols[a.n]||slate)); doc.rect(lx,y-7,8,8,"F");
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...ink);
    const t=a.n+" "+a.p+"%"; doc.text(t, lx+12, y); lx+=doc.getTextWidth(t)+34; });
  y+=24;

  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...slate);
  doc.text("Illustrative range (before charges and tax)  -  strong year: "+p.sy+" p.a. · long-run average: "+p.ret+" p.a. · severe year: "+p.wy, M, y); y+=20;

  if(client.esg){
    const esgLabels={strong:"Important  -  to be central to portfolio",moderate:"Preferred where possible",neutral:"No strong preference",none:"Not a priority  -  returns first"};
    doc.setTextColor(...ink); doc.setFontSize(9.5);
    doc.text("ESG preference: "+(esgLabels[client.esg]||client.esg), M, y); y+=20;
  }

  // Disclaimer footer
  const disc="This questionnaire produces an indicative risk profile based solely on self-reported answers and does not constitute a personal recommendation or financial advice. All return figures are illustrative, before charges and tax, based on the modern market era (1975 onward) and are not forecasts or guarantees. Investments can fall as well as rise and you may get back less than you invest. A suitable recommendation will be made only after a full assessment by your adviser. Trinity Capital Partners trades as Trinity Global Capital UK Ltd and is authorised and regulated by the Financial Conduct Authority (FCA Reg. 523393).";
  doc.setDrawColor(225,227,230); doc.line(M,y,W-M,y); y+=12;
  doc.setFontSize(7.5); doc.setTextColor(...slate);
  doc.text(doc.splitTextToSize(disc, W-2*M), M, y);

  return doc;
}

function buildUnderstandingPDF(client){
  const{k,p}=buildResult(client);
  const {jsPDF} = require("jspdf");
  const doc=new jsPDF({unit:"pt",format:"a4"});
  const W=595.28, H=841.89;
  const ML=51, MR=51;
  const maxW=W-ML-MR;

  // Exact colours from PDF analysis
  const navy=[21,29,38];       // rgb(0.0824,0.1137,0.149)
  const coral=[255,74,87];     // rgb(1.0,0.2902,0.3412)
  const slate=[107,122,143];
  const ink=[30,32,34];
  const cardGrey=[230,233,237]; // rgb(0.902,0.9137,0.9294) -- dimension cards
  const rowGrey=[244,246,249];  // rgb(0.9569,0.9647,0.9725) -- table grey rows
  const sepLine=[227,230,234];  // row separator lines
  const footLine=[227,230,234]; // footer line

  // Allocation bar colours (exact from PDF)
  const allocC=[[205,205,205],[107,122,143],[255,74,87],[21,29,38]];

  // ── Shared page frame ──────────────────────────────────────────────────────
  const pageFrame=(title)=>{
    // Dark navy band covers entire header area (logo floats on top in white)
    doc.setFillColor(...navy); doc.rect(0,0,W,91.5,"F");
    // Coral accent line
    doc.setFillColor(...coral); doc.rect(0,91.5,W,2.2,"F");
    // Logo -- white version on navy (try LOGO_WHITE, fallback to text)
    try{ doc.addImage(LOGO_WHITE,"PNG",ML,16,Math.round(40*404/334),40); }catch(e){
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(255,255,255);
      doc.text("TRINITY",ML,36);
      doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(200,205,215);
      doc.text("CAPITAL PARTNERS",ML,50);
    }
    // Page title top right -- EBGaramond style → use times as closest
    doc.setFont("times","normal"); doc.setFontSize(11.5); doc.setTextColor(255,255,255);
    doc.text(title, W-MR, 40, {align:"right"});
    // FCA Reg
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(190,197,207);
    doc.text("FCA Reg. 523393", W-MR, 57, {align:"right"});
  };

  const pageFooter=(n,total)=>{
    doc.setDrawColor(...footLine); doc.setLineWidth(0.7);
    doc.line(ML,792,W-MR,792);
    // GO BEYOND -- Cinzel style → times bold spaced
    doc.setFont("times","bold"); doc.setFontSize(9); doc.setTextColor(...coral);
    doc.setCharSpace(2.5); doc.text("GO BEYOND",ML,806); doc.setCharSpace(0);
    // Page X of Y
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...slate);
    doc.text("Understanding Your Risk Profile  ·  Page "+n+" of "+total, W-MR, 806, {align:"right"});
  };

  // Body text helper -- returns new y
  const body=(txt,x,y,w,sz,clr,style)=>{
    sz=sz||9.6; clr=clr||ink; style=style||"normal";
    doc.setFont("helvetica",style); doc.setFontSize(sz); doc.setTextColor(...clr);
    const lines=doc.splitTextToSize(txt,w||maxW);
    lines.forEach(l=>{ doc.text(l,x||ML,y); y+=sz*1.5; });
    return y;
  };

  // Inline mixed-style text helper: renders segments with optional bold/color inline
  // segments = [{t:"text", bold:true, color:[r,g,b]}, ...]
  // Handles word-wrapping across segments. Returns new y.
  const bodyMixed=(segs,x,y,mw,sz,defColor)=>{
    sz=sz||9.6; x=x||ML; mw=mw||maxW; defColor=defColor||ink;
    // Tokenise into words preserving spaces, each with style
    const tokens=[];
    segs.forEach(s=>{
      const parts=s.t.split(/(\s+)/);
      parts.forEach(p=>{ if(p!=="") tokens.push({w:p,bold:!!s.bold,col:s.color||defColor}); });
    });
    let lineTokens=[]; let lw=0;
    const flush=()=>{
      if(!lineTokens.length)return;
      let cx=x;
      lineTokens.forEach(t=>{
        doc.setFont("helvetica",t.bold?"bold":"normal");
        doc.setFontSize(sz); doc.setTextColor(...t.col);
        doc.text(t.w,cx,y); cx+=doc.getTextWidth(t.w);
      });
      y+=sz*1.55; lineTokens=[]; lw=0;
    };
    tokens.forEach(t=>{
      doc.setFont("helvetica",t.bold?"bold":"normal");
      doc.setFontSize(sz);
      const tw=doc.getTextWidth(t.w);
      const isSpace=/^\s+$/.test(t.w);
      if(!isSpace && lw+tw>mw && lineTokens.length){ flush(); }
      lineTokens.push(t); lw+=tw;
    });
    flush();
    return y;
  };


  // Dark navy rounded box helper (pages 1, 2, 3)
  const navyBox=(x,y,w,h,fn)=>{
    doc.setFillColor(...navy); doc.roundedRect(x,y,w,h,6,6,"F");
    fn(x,y,w,h);
  };

  // Light grey rounded box helper (page 4)
  const greyBox=(x,y,w,h,fn)=>{
    doc.setFillColor(...cardGrey); doc.roundedRect(x,y,w,h,6,6,"F");
    fn(x,y,w,h);
  };

  // ════════════════════════════════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════════════════════════════════
  pageFrame("UNDERSTANDING YOUR RESULT");
  let y=122.3;

  // Eyebrow -- Poppins-Bold 8pt coral spaced → helvetica bold
  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...coral);
  doc.setCharSpace(1.8); doc.text("RISK PROFILE  ·  THE GUIDE BEHIND YOUR SUMMARY",ML,y);
  doc.setCharSpace(0); y+=18;

  // Heading -- Poppins-Bold 23pt
  doc.setFont("helvetica","bold"); doc.setFontSize(23); doc.setTextColor(...ink);
  const h1=doc.splitTextToSize("What investment risk really means",maxW);
  h1.forEach(l=>{ doc.text(l,ML,y); y+=30; }); y+=8;

  // Intro italic -- EBGaramond-Italic 12.5pt → times italic
  doc.setFont("times","italic"); doc.setFontSize(12.5); doc.setTextColor(...slate);
  const intro=doc.splitTextToSize("Your one-page summary gives you a number and a category. This guide explains what sits behind it -- so the result is something you understand and own, not just a label you were handed.",maxW);
  intro.forEach(l=>{ doc.text(l,ML,y); y+=18; }); y+=16;

  // Section head -- Poppins-Bold 12pt
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(...ink);
  doc.text("Risk is not one thing",ML,y); y+=18;

  // Para 1 -- bold inline: volatility, permanent loss, shortfall risk
  y=bodyMixed([
    {t:'Most people hear “risk” and think only of losing money. In practice it has three faces, and a good plan weighs all of them. The first is '},
    {t:'volatility',bold:true},
    {t:' -- the natural rise and fall in the value of investments along the way. The second is '},
    {t:'permanent loss',bold:true},
    {t:' -- money that does not come back, usually the result of selling at the wrong moment rather than simply riding out a dip. The third is the quietest and most overlooked: '},
    {t:'shortfall risk',bold:true},
    {t:' -- the danger that your money grows too slowly to do what you need it to do.'},
  ],ML,y,maxW,9.6);
  y+=6;
  y=body("Volatility is uncomfortable, but it is not the same as loss. A portfolio that falls and recovers has cost you nothing but nerve. A portfolio that never moves can still fail you -- if it never grows.",ML,y,maxW,9.6); y+=20;

  // Section head
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(...ink);
  doc.text("The relationship between risk and return",ML,y); y+=18;

  // Para 2 -- bold inline: right amount of it for you
  y=bodyMixed([
    {t:'There is no return without risk. Higher potential growth always comes packaged with larger short-term swings; anyone promising the former without the latter should be treated with caution. The job of a risk profile is not to remove risk -- that is impossible -- but to find the '},
    {t:'right amount of it for you',bold:true},
    {t:': enough to reach your goals, not so much that you abandon the plan at the worst possible moment.'},
  ],ML,y,maxW,9.6); y+=22;

  // Dark navy box with £74,000 in coral
  const b1Segs=[
    {t:'Holding everything in cash feels safe, but inflation erodes its buying power every year. At 3% inflation, £100,000 left in cash has the spending power of roughly '},
    {t:'£74,000',color:coral},
    {t:' after a decade. Taking too little risk is itself a risk -- it is simply a slower, quieter one.'},
  ];
  // Measure height
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  const b1fullTxt='Holding everything in cash feels safe, but inflation erodes its buying power every year. At 3% inflation, £100,000 left in cash has the spending power of roughly £74,000 after a decade. Taking too little risk is itself a risk -- it is simply a slower, quieter one.';
  const b1lines=doc.splitTextToSize(b1fullTxt,maxW-28);
  const b1h=b1lines.length*13.5+50;
  navyBox(ML,y,maxW,b1h,(bx,by)=>{
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(255,255,255);
    doc.text("The cost of playing it too safe",bx+14,by+18);
    // Render with £74,000 highlighted coral
    let ty=by+32;
    ty=bodyMixed(b1Segs,bx+14,ty,maxW-28,9,[210,215,222]);
  });
  y+=b1h+16;

  // Footer note -- small italic grey
  doc.setFont("helvetica","italic"); doc.setFontSize(8.4); doc.setTextColor(...slate);
  const fn1=doc.splitTextToSize("Throughout this guide, the goal is balance: real growth requires accepting real ups and downs, and the right level of risk is the one you can live with and that gets you where you need to go.",maxW);
  fn1.forEach(l=>{ doc.text(l,ML,y); y+=12; });

  pageFooter(1,4);

  // ════════════════════════════════════════════════════════════════
  // PAGE 2
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  pageFrame("HOW YOUR PROFILE IS BUILT");
  y=122.3;

  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...coral);
  doc.setCharSpace(1.8); doc.text("FIVE DIMENSIONS, ONE RESULT",ML,y); doc.setCharSpace(0); y+=18;

  doc.setFont("helvetica","bold"); doc.setFontSize(23); doc.setTextColor(...ink);
  const h2=doc.splitTextToSize("A profile is more than “how brave you feel”",maxW);
  h2.forEach(l=>{ doc.text(l,ML,y); y+=30; }); y+=8;

  y=body("A credible risk profile is never a single question about appetite. Your score combines five distinct dimensions -- the same architecture used by the established risk-profiling field and aligned with what the regulator expects of a suitable assessment. Each measures something different, and the most cautious of them tends to set the ceiling.",ML,y,maxW,9.6); y+=14;

  // 5 dimension cards -- exact from PDF:
  // Each card: x=51, w=493.5, h=68.2, fill=cardGrey, left coral bar
  // Number: Poppins-Bold 15pt (light); badge: OpenSans 7.4pt right-aligned; title: Poppins-Bold 10pt; body: OpenSans 8.8pt
  const dims=[
    {n:"1",badge:"WILLINGNESS",title:"Attitude to Risk",   body:"Your psychological comfort with markets rising and falling -- how you feel about uncertainty and the trade-off between safety and growth."},
    {n:"2",badge:"ABILITY",    title:"Capacity for Loss",  body:"Whether your finances could absorb a fall without derailing your goals or lifestyle. This is the hard financial constraint -- and it can override appetite entirely."},
    {n:"3",badge:"TIMEFRAME",  title:"Time Horizon",       body:"How long until you need the money. The longer the horizon, the more time markets have to recover from short-term falls, and the more volatility you can reasonably carry."},
    {n:"4",badge:"UNDERSTANDING",title:"Knowledge & Experience",body:"How well you understand the way investments behave. Familiarity helps you stay the course when headlines turn negative."},
    {n:"5",badge:"COMPOSURE",  title:"Behavioural Factors",body:"How you actually act in a downturn -- which is often different from how you predict you will. Measuring this helps guard against costly, emotion-driven decisions."},
  ];

  dims.forEach(d=>{
    doc.setFont("helvetica","normal"); doc.setFontSize(8.8);
    const blines=doc.splitTextToSize(d.body,maxW-130);
    // Dynamic card height: 34pt for title row + body lines + 14pt padding
    const cardH=Math.max(68.2, 34 + blines.length*12 + 14);
    // Light grey card background
    doc.setFillColor(...cardGrey); doc.rect(ML,y,maxW,cardH,"F");
    // Coral left border (3pt wide)
    doc.setFillColor(...coral); doc.rect(ML,y,3,cardH,"F");
    // Number -- Poppins-Bold 15pt, light grey colour
    doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(170,178,190);
    doc.text(d.n, ML+18, y+24);
    // Title -- Poppins-Bold 10pt
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...ink);
    doc.text(d.title, ML+53, y+20);
    // Badge -- small caps right
    doc.setFont("helvetica","normal"); doc.setFontSize(7.4); doc.setTextColor(...slate);
    doc.setCharSpace(0.8); doc.text(d.badge, W-MR, y+20, {align:"right"}); doc.setCharSpace(0);
    // Body -- 8.8pt
    doc.setFont("helvetica","normal"); doc.setFontSize(8.8); doc.setTextColor(...ink);
    blines.forEach((l,i)=>{ doc.text(l, ML+53, y+34+i*12); });
    // Bottom separator line
    doc.setDrawColor(...sepLine); doc.setLineWidth(0.7); doc.line(ML,y+cardH,W-MR,y+cardH);
    y+=cardH+12;
  });

  y+=8;
  // Dark navy box: "Why we combine them"
  const wctSegs=[
    {t:'You might have a high appetite for risk but limited capacity to absorb a loss. Where the two disagree, '},
    {t:'ability takes precedence over willingness',color:coral},
    {t:'. A profile that ignored this would flatter your confidence while quietly exposing your finances. This three-pillar discipline -- measuring attitude, capacity and behaviour separately -- underpins the methodologies developed by specialists such as EV (eValue), Dynamic Planner, Oxford Risk and Defaqto, and it is the foundation of how your result is reached. The detailed scoring methodology is documented separately.'},
  ];
  const wctFullTxt='You might have a high appetite for risk but limited capacity to absorb a loss. Where the two disagree, ability takes precedence over willingness. A profile that ignored this would flatter your confidence while quietly exposing your finances. This three-pillar discipline -- measuring attitude, capacity and behaviour separately -- underpins the methodologies developed by specialists such as EV (eValue), Dynamic Planner, Oxford Risk and Defaqto, and it is the foundation of how your result is reached. The detailed scoring methodology is documented separately.';
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  const wctLines=doc.splitTextToSize(wctFullTxt,maxW-28);
  const wctH=wctLines.length*13+50;
  navyBox(ML,y,maxW,wctH,(bx,by)=>{
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(255,255,255);
    doc.text("Why we combine them -- and why the lowest usually wins",bx+14,by+18);
    let wctY=by+34;
    wctY=bodyMixed(wctSegs,bx+14,wctY,maxW-28,9,[199,205,213]);
  });

  pageFooter(2,4);

  // ════════════════════════════════════════════════════════════════
  // PAGE 3
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  pageFrame("THE RISK CATEGORIES");
  y=122.3;

  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...coral);
  doc.setCharSpace(1.8); doc.text("FROM CAUTIOUS TO HIGH",ML,y); doc.setCharSpace(0); y+=18;

  doc.setFont("helvetica","bold"); doc.setFontSize(23); doc.setTextColor(...ink);
  doc.text("The five risk categories",ML,y); y+=32;

  y=bodyMixed([
    {t:'Your score places you in one of five categories. For each, the table shows three numbers drawn from the modern market era since 1975: a '},
    {t:'strong year',bold:true},
    {t:', the '},
    {t:'long-run average',bold:true},
    {t:', and a '},
    {t:'crisis year',bold:true},
    {t:'. The best and worst are rare extremes -- they happen occasionally, not most years. The middle figure, the long-run average, is the one to plan around. All figures are illustrative, before charges, and are not forecasts or guarantees.'},
  ],ML,y,maxW,9.6); y+=10;

  // Table -- exact column positions from PDF rect data:
  // Cat col: x=51, w=147.7 | Mix col: x=198.7, w=108.7 | Best: x=307.5, w=78 | Target: x=385.5, w=78 | Worst: x=463.5, w=81
  const cC=51, cM=198.7, cB=307.5, cT=385.5, cW=463.5;
  const tblW=maxW;

  // Header row -- Poppins-Bold 6.8pt spaced
  doc.setFillColor(30,38,50); doc.rect(ML,y,tblW,16.5,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(6.8); doc.setTextColor(255,255,255);
  doc.setCharSpace(0.5);
  doc.text("CATEGORY",cC+4,y+11);
  doc.text("INDICATIVE MIX",cM+4,y+11);
  doc.text("BEST YEAR",cB+4,y+11);
  doc.text("TARGET P.A.",cT+4,y+11);
  doc.text("WORST YEAR",cW+4,y+11);
  doc.setCharSpace(0);
  y+=16.5;

  // Separator below header
  doc.setFillColor(...navy); doc.rect(ML,y,tblW,0.7,"F"); y+=0.7;

  const bands=[
    {bk:"Low",         label:"Low Risk",    score:"Score 0-24",  desc:"Capital protection first; lower growth accepted for greater stability.", eq:20, alloc:[20,55,20,5],  best:"+10 to +14%", tgt:"4-5%", worst:"-8 to -12%"},
    {bk:"Cautious",    label:"Cautious",    score:"Score 25-44", desc:"Stability-tilted, with modest growth to stay ahead of inflation.",       eq:40, alloc:[12,43,40,5],  best:"+15 to +20%", tgt:"5-6%", worst:"-13 to -18%"},
    {bk:"Balanced",    label:"Balanced",    score:"Score 45-64", desc:"An even footing between growth and protection.",                         eq:60, alloc:[8,25,60,7],   best:"+20 to +27%", tgt:"6-7%", worst:"-19 to -25%"},
    {bk:"Adventurous", label:"Adventurous", score:"Score 65-82", desc:"Growth-led, accepting meaningful short-term falls along the way.",       eq:78, alloc:[5,9,78,8],   best:"+29 to +38%", tgt:"7-8%", worst:"-27 to -33%"},
    {bk:"High",        label:"High Risk",   score:"Score 83-100",desc:"Maximum growth focus; significant volatility expected.",                eq:92, alloc:[3,0,92,5],   best:"+33 to +44%", tgt:"8-9%", worst:"-35 to -42%"},
  ];

  // Row heights from PDF: Cautious=64.5, others similar. High row taller (YOUR RESULT pill)
  bands.forEach((b,i)=>{
    const isMe=b.bk===k;
    const descLines=doc.splitTextToSize(b.desc,cM-cC-8);
    const extraH=isMe?16:0; // extra for YOUR RESULT pill
    const rowH=64.5+extraH;

    // Row background
    if(isMe){
      doc.setFillColor(255,245,245);
      doc.rect(ML,y,tblW,rowH,"F");
      // Coral left border
      doc.setFillColor(...coral); doc.rect(ML,y,3,rowH,"F");
    } else {
      doc.setFillColor(255,255,255); doc.rect(ML,y,tblW,rowH,"F");
    }

    // Category name -- Poppins-Bold 9.2pt
    doc.setFont("helvetica","bold"); doc.setFontSize(9.2);
    doc.setTextColor(isMe?coral[0]:ink[0], isMe?coral[1]:ink[1], isMe?coral[2]:ink[2]);
    doc.text(b.label, cC+6, y+14);

    // YOUR RESULT pill
    if(isMe){
      const pillTxt="YOUR RESULT";
      doc.setFillColor(...coral); doc.roundedRect(cC+6,y+17,47,9,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(5.6); doc.setTextColor(255,255,255);
      doc.text(pillTxt, cC+8, y+24);
    }

    // Score label -- OpenSans 7pt slate
    const scoreY=isMe ? y+31 : y+26;
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...slate);
    doc.text(b.score, cC+6, scoreY);

    // Description -- OpenSans 7pt ink
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(...ink);
    const descStartY=isMe ? y+42 : y+37;
    descLines.forEach((l,j)=>{ doc.text(l,cC+6,descStartY+j*10); });

    // Allocation bar -- exact bar x=207.7 (= cM + 9), w=90pt, h=5.2
    const barX=cM+9, barY=y+14, barW=90, barH=5.2;
    let bx2=barX;
    b.alloc.forEach((pct,ai)=>{
      const seg=barW*pct/100;
      doc.setFillColor(...allocC[ai]); doc.rect(bx2,barY,seg,barH,"F");
      bx2+=seg;
    });
    // Equity % label below bar
    doc.setFont("helvetica","normal"); doc.setFontSize(6.8); doc.setTextColor(...slate);
    doc.text(b.eq+"% equities", barX, barY+barH+9);

    // Best year -- 7.8pt — vertically centre relative to category name + desc
    const midY=isMe ? y+rowH/2+8 : y+rowH/2+3;
    doc.setFont("helvetica","bold"); doc.setFontSize(7.8); doc.setTextColor(...ink);
    doc.text(b.best, cB+4, midY);

    // Target p.a. -- 7.8pt ink normal
    doc.setFont("helvetica","normal"); doc.setFontSize(7.8); doc.setTextColor(...ink);
    doc.text(b.tgt, cT+4, midY);

    // Worst year -- 7.8pt coral bold
    doc.setFont("helvetica","bold"); doc.setFontSize(7.8); doc.setTextColor(...coral);
    doc.text(b.worst, cW+4, midY);

    // Row separator line
    doc.setDrawColor(...sepLine); doc.setLineWidth(0.7); doc.line(ML,y+rowH,W-MR,y+rowH);
    y+=rowH;
  });

  y+=10;
  // Legend -- Cash / Bonds & Gilts / Equities / Alternatives
  const legItems=[["Cash",[205,205,205]],["Bonds & Gilts",[107,122,143]],["Equities",[255,74,87]],["Alternatives",[21,29,38]]];
  let lx=ML;
  legItems.forEach(([lbl,col])=>{
    doc.setFillColor(...col); doc.rect(lx,y,8,8,"F");
    doc.setFont("helvetica","normal"); doc.setFontSize(7.2); doc.setTextColor(...ink);
    doc.text(lbl, lx+11, y+7);
    lx+=doc.getTextWidth(lbl)+28;
  });
  y+=20;

  // Dark navy box: "How to read the three numbers"
  const htr="The average is what matters most -- it is the figure your plan is built around. Best and worst are rare extremes, shown so you can see the full range each profile has actually delivered through booms and crises. Be honest about the worst column: if a fall of that size would make you sell, the profile is too high for you -- whatever the best column might tempt you with.";
  const htrLines=doc.splitTextToSize(htr,maxW-28);
  const htrH=htrLines.length*13+50;
  navyBox(ML,y,maxW,htrH,(bx,by)=>{
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(255,255,255);
    doc.text("How to read the three numbers",bx+14,by+18);
    // "average is what matters most" bold inline
    let htrY=by+34;
    htrY=bodyMixed([
      {t:'The '},
      {t:'average is what matters most',color:coral},
      {t:' -- it is the figure your plan is built around. Best and worst are rare extremes, shown so you can see the full range each profile has actually delivered through booms and crises. Be honest about the worst column: if a fall of that size would make you sell, the profile is too high for you -- whatever the best column might tempt you with.'},
    ],bx+14,htrY,maxW-28,9,[199,205,213]);
  });
  y+=htrH+10;

  // Footnote -- 8.4pt slate
  doc.setFont("helvetica","normal"); doc.setFontSize(8.4); doc.setTextColor(...slate);
  const fn3=doc.splitTextToSize("Figures reflect the modern market era (1975 onward), are shown before charges and tax, and are illustrative rather than forecasts. Best and worst years are uncommon; most years fall between. Your category is the starting point for a conversation -- your adviser sets the final strategy against your goals and capacity for loss.",maxW);
  fn3.forEach(l=>{ doc.text(l,ML,y); y+=12; });

  pageFooter(3,4);

  // ════════════════════════════════════════════════════════════════
  // PAGE 4
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  pageFrame("CAPACITY FOR LOSS");
  y=122.3;

  doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...coral);
  doc.setCharSpace(1.8); doc.text("THE REALITY CHECK",ML,y); doc.setCharSpace(0); y+=18;

  doc.setFont("helvetica","bold"); doc.setFontSize(23); doc.setTextColor(...ink);
  const h4=doc.splitTextToSize("Could you afford the fall, not just stomach it?",maxW);
  h4.forEach(l=>{ doc.text(l,ML,y); y+=30; }); y+=8;

  y=bodyMixed([
    {t:'Of the five dimensions, capacity for loss does the most to protect you. '},
    {t:'Willingness',bold:true},
    {t:' is about how a fall would feel; '},
    {t:'capacity',bold:true},
    {t:' is about what a fall would actually do to your plans. The two are easy to confuse, and confusing them is where real damage happens.'},
  ],ML,y,maxW,9.6); y+=18;

  // £500k example table -- white background with borders
  // From PDF: table heading at y≈257, rows at ~282, 309, 336, 362, 389
  const tblSX=ML, tblSW=maxW;
  // Heading box
  doc.setFillColor(249,250,251); doc.setDrawColor(...sepLine); doc.setLineWidth(0.5);
  doc.roundedRect(tblSX,y,tblSW,20,3,3,"FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(...ink);
  doc.text("What a bad year can look like -- a £500,000 portfolio",tblSX+12,y+13);
  y+=20;

  const exRows=[
    {L:"Starting value",         V:"£500,000",                       bold:false, coralV:false},
    {L:"A -35% year (within the High profile range)", V:"-£175,000",bold:false,coralV:true},
    {L:"Value at the low point", V:"£325,000",                       bold:false, coralV:false},
    {L:"Growth then needed simply to get back to £500,000",V:"+54%", bold:true,  coralV:false},
    {L:"What rescues it",        V:"Time, and not needing the money yet", bold:true,  coralV:false},
  ];
  exRows.forEach((r,i)=>{
    const rH=27;
    if(i%2===0) doc.setFillColor(255,255,255); else doc.setFillColor(249,250,251);
    doc.rect(tblSX,y,tblSW,rH,"F");
    // left/right borders
    doc.setDrawColor(...sepLine); doc.setLineWidth(0.5);
    doc.line(tblSX,y+rH,tblSX+tblSW,y+rH);
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(...ink);
    doc.text(r.L, tblSX+12, y+17);
    doc.setFont("helvetica",r.bold?"bold":"normal");
    doc.setTextColor(...(r.coralV?coral:ink));
    doc.text(r.V, tblSX+tblSW-8, y+17, {align:"right"});
    y+=rH;
  });
  y+=14;

  y=bodyMixed([
    {t:'The maths shows why '},
    {t:'time horizon and capacity travel together',bold:true},
    {t:'. A 35% fall is survivable -- even unremarkable -- for someone with a decade ahead and income from elsewhere. The same fall can be permanent for someone who must sell into it to fund their life. That second danger is called '},
    {t:'sequencing risk',bold:true},
    {t:': a large loss early, while you are drawing on the money, can do harm that no later recovery undoes.'},
  ],ML,y,maxW,9.6); y+=18;

  // Section heading -- Poppins-Bold 12pt
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(...ink);
  doc.text("Three questions that test your real capacity",ML,y); y+=18;

  const qs=[
    "If your portfolio fell by the “worst year” figure for your category, would your day-to-day standard of living change?",
    "Would you be forced to sell investments at the low point to cover income or planned spending?",
    "How many years could you leave the money untouched while it recovers?",
  ];
  qs.forEach(q=>{
    doc.setFillColor(...coral); doc.circle(ML+5,y-2,4,"F");
    doc.setFont("helvetica","normal"); doc.setFontSize(8.9); doc.setTextColor(...ink);
    const qlines=doc.splitTextToSize(q,maxW-16);
    qlines.forEach((l,j)=>{ doc.text(l,ML+14,y+j*13); });
    y+=qlines.length*13+8;
  });
  y+=6;

  // Light grey box: "What happens next" -- from PDF y0=421.5 to y1=600 = 178.5pt
  const whnSegs=[
    {t:'This profile is the indicative starting point -- not a recommendation. Your adviser combines it with your full circumstances, goals and timeframe to build a '},
    {t:'personal, suitable recommendation',bold:true,color:coral},
    {t:', and will revisit it as your life and the markets change. If anything here doesn\'t match how you see yourself, that is exactly the conversation worth having.'},
  ];
  const whnFullTxt='This profile is the indicative starting point -- not a recommendation. Your adviser combines it with your full circumstances, goals and timeframe to build a personal, suitable recommendation, and will revisit it as your life and the markets change. If anything here doesn\'t match how you see yourself, that is exactly the conversation worth having.';
  doc.setFont("helvetica","normal"); doc.setFontSize(9);
  const whnLines=doc.splitTextToSize(whnFullTxt,maxW-28);
  const whnH=whnLines.length*13+50;
  navyBox(ML,y,maxW,whnH,(bx,by)=>{
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(255,255,255);
    doc.text("What happens next",bx+14,by+18);
    let whnY=by+34;
    whnY=bodyMixed(whnSegs,bx+14,whnY,maxW-28,9,[199,205,213]);
  });
  y+=whnH+12;

  // Extra separator line before disclaimer (from PDF y=740.2)
  doc.setDrawColor(237,239,242); doc.setLineWidth(0.7); doc.line(ML,y,W-MR,y); y+=10;

  // Disclaimer -- 6.6pt
  doc.setFont("helvetica","normal"); doc.setFontSize(6.6); doc.setTextColor(...slate);
  const disc="This guide is for general information to help you understand your indicative risk profile. It is not a personal recommendation, financial advice or an offer to invest. Target returns, worst-year ranges and asset allocations are illustrative, are not forecasts and are not guaranteed. Investments can fall as well as rise and you may get back less than you invest; past performance is not a guide to future returns. A personal recommendation is made only after a full assessment of your circumstances, objectives and capacity for loss by your adviser. Trinity Capital Partners trades as Trinity Global Capital UK Ltd and is authorised and regulated by the Financial Conduct Authority (FCA Reg. 523393).";
  const dlines=doc.splitTextToSize(disc,maxW);
  dlines.forEach(l=>{ doc.text(l,ML,y); y+=10; });

  pageFooter(4,4);

  return doc;
}

module.exports = { buildPDF, buildUnderstandingPDF };