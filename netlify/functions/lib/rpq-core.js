// Shared risk-profile core, used by the serverless function.
// Kept identical to the browser copy in index.html so a client's score can be
// reproduced server-side exactly as they saw it.

const QS=[
{id:1,s:"A",sn:"Attitude to Risk",t:"When thinking about investing, which best describes your primary goal?",opts:[
{t:"Protect my capital above all else, even if it means very low returns",v:1},
{t:"Modest growth with minimal risk of losing money",v:2},
{t:"Balance between growth and protection  -  some fluctuation is acceptable",v:3},
{t:"Strong long-term growth, accepting that values will rise and fall",v:4},
{t:"Maximum growth potential  -  significant short-term losses are acceptable",v:5}]},
{id:2,s:"A",sn:"Attitude to Risk",t:"Your portfolio has fallen 20% in six months. How would you most likely feel?",opts:[
{t:"Very worried  -  I'd want to switch to something safer immediately",v:1},
{t:"Concerned  -  I'd seriously consider reducing my risk exposure",v:2},
{t:"Uncomfortable, but I'd hold and reassess over the coming months",v:3},
{t:"Relatively calm  -  I'd expect recovery and stay invested",v:4},
{t:"Unbothered  -  short-term falls are a normal part of investing",v:5}]},
{id:3,s:"A",sn:"Attitude to Risk",t:"Which investment option appeals to you most?",opts:[
{t:"Guaranteed 2% per year  -  no risk of losing money",v:1},
{t:"Expected 4% per year  -  small chance of losing up to 5% in a bad year",v:2},
{t:"Expected 6% per year  -  moderate chance of losing up to 12% in a bad year",v:3},
{t:"Expected 9% per year  -  realistic chance of losing up to 25% in a bad year",v:4},
{t:"Expected 12%+ per year  -  losses of 35% or more are possible in a bad year",v:5}]},
{id:4,s:"A",sn:"Attitude to Risk",t:"How would you honestly describe your attitude to financial risk in everyday life?",opts:[
{t:"I avoid financial risk wherever possible",v:1},
{t:"I strongly prefer the safer option, even if it limits my upside",v:2},
{t:"I accept some risk in exchange for better returns, but prefer balance",v:3},
{t:"I'm comfortable with meaningful risk if the potential reward justifies it",v:4},
{t:"I actively look for higher-risk opportunities  -  bold decisions don't unsettle me",v:5}]},
{id:5,s:"A",sn:"Attitude to Risk",t:"The stock market drops sharply and leads the news. How do you typically react?",opts:[
{t:"I feel anxious and check my investments immediately  -  I want to act",v:1},
{t:"I'm concerned and start thinking about whether I should make changes",v:2},
{t:"I take note but try not to overreact  -  I'll keep an eye on it",v:3},
{t:"Long-term view keeps me steady  -  I see it as background noise",v:4},
{t:"I see it as a potential opportunity to invest more at lower prices",v:5}]},
{id:6,s:"B",sn:"Capacity for Loss",t:"If your investments fell 20% in value, what would the financial impact be on your life?",opts:[
{t:"Severe  -  it would significantly affect my ability to cover essential living costs",v:1},
{t:"Significant  -  it would meaningfully affect my standard of living",v:2},
{t:"Noticeable but manageable  -  uncomfortable, but not financially critical",v:3},
{t:"Limited  -  I have other assets or income streams to absorb this",v:4},
{t:"Minimal  -  very little impact on my overall financial picture",v:5}]},
{id:7,s:"B",sn:"Capacity for Loss",t:"If all earned income stopped today, how long could you sustain your current standard of living?",opts:[
{t:"Less than 3 months",v:1},
{t:"3 to 6 months",v:2},
{t:"6 months to 1 year",v:3},
{t:"1 to 3 years",v:4},
{t:"More than 3 years",v:5}]},
{id:8,s:"B",sn:"Capacity for Loss",t:"What proportion of your total financial assets does this investment represent?",opts:[
{t:"More than 75%  -  the majority of what I have",v:1},
{t:"50 to 75%  -  a large portion of my total assets",v:2},
{t:"25 to 50%  -  meaningful but not dominant",v:3},
{t:"10 to 25%  -  one part of a broader financial picture",v:4},
{t:"Less than 10%  -  a relatively small part of my overall wealth",v:5}]},
{id:9,s:"B",sn:"Capacity for Loss",t:"Do you have significant financial commitments (mortgage, school fees, care costs) that could be affected by poor investment performance?",opts:[
{t:"Yes  -  my commitments are heavily reliant on my investments performing well",v:1},
{t:"Yes  -  there is meaningful reliance on investment performance",v:2},
{t:"Some commitments exist but are not directly linked to investment performance",v:3},
{t:"Only minor commitments  -  largely separate from my investments",v:4},
{t:"No significant financial commitments of this kind",v:5}]},
{id:10,s:"B",sn:"Capacity for Loss",t:"How would you describe your overall income security and financial resilience?",opts:[
{t:"Limited or fixed income only (e.g. State Pension)  -  very little financial cushion",v:1},
{t:"Variable or part-time income  -  modest financial cushion",v:2},
{t:"Stable employed income  -  single earner with some savings in reserve",v:3},
{t:"Multiple income sources or strong self-employed income with meaningful reserves",v:4},
{t:"Significant passive income, property, or business interests  -  very resilient",v:5}]},
{id:11,s:"C",sn:"Time Horizon",t:"When do you expect to need access to the majority of this investment?",opts:[
{t:"Within 2 years",v:1},
{t:"2 to 5 years",v:2},
{t:"5 to 10 years",v:3},
{t:"10 to 15 years",v:4},
{t:"15 years or more",v:5}]},
{id:12,s:"C",sn:"Time Horizon",t:"If your investment fell significantly in the first year, how would you most likely respond?",opts:[
{t:"Sell to protect what remains  -  I cannot afford further losses",v:1},
{t:"Significantly reduce my exposure and wait for conditions to improve",v:2},
{t:"Hold steady and review the situation in 6 months",v:3},
{t:"Remain fully invested  -  I believe in recovery over the long term",v:4},
{t:"Consider investing more  -  an early fall can be a valuable buying opportunity",v:5}]},
{id:13,s:"D",sn:"Knowledge & Experience",t:"How would you describe your understanding of financial markets and investment products?",opts:[
{t:"Very limited  -  I find financial products confusing or difficult to follow",v:1},
{t:"Basic  -  I understand savings accounts, ISAs, and simple funds",v:2},
{t:"Moderate  -  I understand how diversified portfolios and funds work",v:3},
{t:"Good  -  I'm comfortable with equities, bonds, and different asset classes",v:4},
{t:"Extensive  -  I have professional training or significant investment experience",v:5}]},
{id:14,s:"D",sn:"Knowledge & Experience",t:"Have you previously invested in stocks, shares, or investment funds?",opts:[
{t:"No  -  this would be my first time investing beyond a savings account",v:1},
{t:"Yes, but only small amounts and I found it stressful",v:2},
{t:"Yes  -  with a mix of positive and negative experiences",v:3},
{t:"Yes  -  I invest regularly and am comfortable with the process",v:4},
{t:"Yes  -  investing is a well-established part of my financial life",v:5}]},
{id:15,s:"E",sn:"Behavioural Factors",t:"Thinking honestly: you gain £5,000 on one occasion and separately lose £5,000 on another. Which feels more significant?",opts:[
{t:"The loss feels far more painful  -  I'd go to significant lengths to avoid it",v:1},
{t:"The loss feels considerably worse than the gain feels good",v:2},
{t:"Both feel roughly equal in significance",v:3},
{t:"The gain feels more motivating than the loss feels painful",v:4},
{t:"I process both fairly evenly  -  gains and losses are part of investing",v:5}]},
{id:16,s:"E",sn:"Behavioural Factors",t:"Looking back honestly at important financial decisions you have made, how would you describe your pattern?",opts:[
{t:"Very conservative  -  I almost always choose the safest option available",v:1},
{t:"Cautious  -  I favour lower-risk choices and sometimes regret bolder decisions",v:2},
{t:"Balanced  -  I carefully weigh risk and reward before committing",v:3},
{t:"Opportunistic  -  I have made calculated financial risks when timing felt right",v:4},
{t:"Bold  -  I've made significant risk-based decisions and have no regrets",v:5}]}
];

const ESG_Q={t:"One final question: would you like your investments to incorporate environmental, social, and governance (ESG) considerations?",opts:[
{t:"Yes  -  ESG is very important and should be central to my portfolio",v:"strong"},
{t:"Somewhat  -  I'd like ESG considered but not at the expense of returns",v:"moderate"},
{t:"No strong preference either way",v:"neutral"},
{t:"No  -  I prefer investment decisions to prioritise returns above ESG factors",v:"none"}
]};

const PROFS={
Low:{id:1,k:"Low",label:"Low Risk",sub:"Defensive",tag:"Capital protection first",
desc:"Your responses indicate that protecting your capital is the overriding priority. You have a low tolerance for investment losses, and your financial circumstances support a defensive approach. Your portfolio should focus primarily on capital stability and income, with lower growth accepted in exchange for greater stability.",
alloc:[{n:"Cash & Money Market",p:20},{n:"Bonds & Gilts",p:55},{n:"Equities",p:20},{n:"Alternatives",p:5}],
sy:"+10 to +14%",ret:"4-5%",wy:"-8 to -12%",sc:{b:148000,g:163000},band:"0-24"},
Cautious:{id:2,k:"Cautious",label:"Cautious",sub:"Cautious Growth",tag:"Stability-tilted, with modest growth",
desc:"You seek modest growth with a strong emphasis on protecting your capital. A measured equity allocation is appropriate to stay ahead of inflation, but your portfolio should remain tilted towards lower-risk assets. You are prepared for some fluctuation but would find significant losses uncomfortable.",
alloc:[{n:"Cash & Money Market",p:12},{n:"Bonds & Gilts",p:43},{n:"Equities",p:40},{n:"Alternatives",p:5}],
sy:"+15 to +20%",ret:"5-6%",wy:"-13 to -18%",sc:{b:163000,g:180000},band:"25-44"},
Balanced:{id:3,k:"Balanced",label:"Balanced",sub:"Balanced Growth",tag:"An even footing between growth and protection",
desc:"You are comfortable with moderate investment risk in pursuit of meaningful long-term returns. A diversified mix of equities and bonds suits your objectives. You understand that values will fluctuate and have both the financial capacity and temperament to stay invested through periods of volatility.",
alloc:[{n:"Cash & Money Market",p:8},{n:"Bonds & Gilts",p:25},{n:"Equities",p:60},{n:"Alternatives",p:7}],
sy:"+20 to +27%",ret:"6-7%",wy:"-19 to -25%",sc:{b:179000,g:196000},band:"45-64"},
Adventurous:{id:4,k:"Adventurous",label:"Adventurous",sub:"Adventurous Growth",tag:"Growth-led, accepting meaningful short-term falls",
desc:"You have a high tolerance for risk and a clear focus on long-term growth. You are comfortable with significant short-term fluctuations and understand these are part of achieving stronger long-term returns. Your portfolio will be predominantly invested in equities with limited defensive allocation.",
alloc:[{n:"Cash & Money Market",p:5},{n:"Bonds & Gilts",p:9},{n:"Equities",p:78},{n:"Alternatives",p:8}],
sy:"+29 to +38%",ret:"7-8%",wy:"-27 to -33%",sc:{b:216000,g:240000},band:"65-82"},
High:{id:5,k:"High",label:"High Risk",sub:"Aggressive Growth",tag:"Maximum growth focus; significant volatility expected",
desc:"You have the highest tolerance for risk and are focused on maximising long-term growth. You accept the real possibility of significant short-term losses  -  including losses exceeding 35% in adverse conditions  -  and have the financial resilience and psychological temperament to remain invested through severely volatile periods.",
alloc:[{n:"Cash & Money Market",p:3},{n:"Bonds & Gilts",p:0},{n:"Equities",p:92},{n:"Alternatives",p:5}],
sy:"+33 to +44%",ret:"8-9%",wy:"-35 to -42%",sc:{b:259000,g:285000},band:"83-100"}
};

const WT={A:1.4,B:1.2,C:1.5,D:1.0,E:1.0};

const SMETA={
  A:{n:"Attitude to Risk",w:35},
  B:{n:"Capacity for Loss",w:30},
  C:{n:"Time Horizon",w:15},
  D:{n:"Knowledge & Experience",w:10},
  E:{n:"Behavioural Factors",w:10}
};

function calc(ans){
  const raw={A:0,B:0,C:0,D:0,E:0};
  QS.forEach(q=>{if(ans[q.id])raw[q.s]+=ans[q.id];});
  let tot=0;const wt={};
  Object.keys(raw).forEach(s=>{wt[s]=Math.round(raw[s]*WT[s]*10)/10;tot+=wt[s];});
  return{raw,wt,tot:Math.round(tot)};
}

function getProf(tot,rawB){
  let k;
  if(tot<=24)k="Low";
  else if(tot<=44)k="Cautious";
  else if(tot<=64)k="Balanced";
  else if(tot<=82)k="Adventurous";
  else k="High";
  const capped=["Cautious","Balanced","Adventurous","High"].includes(k)&&rawB<=10;
  if(capped)k="Low";
  return{k,capped};
}

function fmt(n){ return "\u00A3" + n.toLocaleString(); }

// Builds everything the PDFs and the email need from a set of answers.
function buildResult(client){
  const ans = client.answers || {};
  const {raw, wt, tot} = calc(ans);
  const {k, capped} = getProf(tot, raw.B);
  return { raw, wt, tot, k, capped, p: PROFS[k] };
}

module.exports = { QS, ESG_Q, PROFS, WT, SMETA, calc, getProf, fmt, buildResult };