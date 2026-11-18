async function transcribe(request, env) {
  const audio = await request.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > 5000000) {
    throw new Error("Ungültige Aufnahme");
  }
  const result = await env.AI.run(
    "@cf/openai/whisper-large-v3-turbo",
    { audio: Array.from(new Uint8Array(audio)), language: "de", task: "transcribe", vad_filter: true }
  );
  return result.text || result.transcription_info?.text || "";
}
export default {async fetch(request,env){
const origin="https://stvnsittner-ops.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS, GET","Access-Control-Allow-Headers":"Content-Type, Authorization","Cache-Control":"no-store"};
const reply=(data,status=200)=>Response.json(data,{status,headers});
const url=new URL(request.url);
if (url.pathname === "/api/speech") {
  if (request.method === "OPTIONS")
    return new Response(null,{status:204,headers});
  if (request.method !== "POST")
    return reply({error:"Method not allowed"},405);
  if (!env.AURA_ACCESS_TOKEN ||
      request.headers.get("Authorization") !==
      "Bearer " + env.AURA_ACCESS_TOKEN)
    return reply({error:"Zugang verweigert"},401);
  try {
    return reply({text:await transcribe(request,env)});
  } catch (error) {
    return reply({error:"Spracherkennung fehlgeschlagen: "+String(error?.message||error).slice(0,180)},502);
  }
}
if(url.pathname==="/api/market-analysis"){
if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
if(request.method!=="GET")return reply({error:"Method not allowed"},405);
if(!env.AURA_ACCESS_TOKEN||request.headers.get("Authorization")!=="Bearer "+env.AURA_ACCESS_TOKEN)return reply({error:"Zugang verweigert"},401);
const symbol=(url.searchParams.get("symbol")||"").trim().toUpperCase();
if(!/^[A-Z0-9.^=-]{1,20}$/.test(symbol))return reply({error:"Ungültiges Aktiensymbol"},400);
try{
const [qr,nr]=await Promise.all([
fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range=5d&interval=1d",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}}),
fetch("https://query1.finance.yahoo.com/v1/finance/search?q="+encodeURIComponent(symbol)+"&newsCount=8&quotesCount=0",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}})
]);
if(!qr.ok) return reply({error:"Kursdaten derzeit nicht verfügbar"},502);
const qj=await qr.json(),q=qj.chart?.result?.[0],meta=q?.meta;
if(!meta||typeof meta.regularMarketPrice!=="number")return reply({error:"Kein Kurs gefunden"},404);
let news=[];if(nr.ok){const nj=await nr.json();news=(nj.news||[]).slice(0,8).map(n=>({title:String(n.title||"").slice(0,240),publisher:String(n.publisher||"").slice(0,100),link:String(n.link||"").slice(0,600),published:n.providerPublishTime||null})).filter(n=>n.title)}
const closes=(q.indicators?.quote?.[0]?.close||[]).filter(x=>typeof x==="number");
const first=closes[0],last=closes[closes.length-1],change=first&&last?(last-first)/first*100:null;
const market={symbol:meta.symbol||symbol,name:meta.longName||meta.shortName||symbol,price:meta.regularMarketPrice,currency:meta.currency||"",previousClose:meta.chartPreviousClose??meta.previousClose??null,change5d:change,marketState:meta.marketState||"unknown",quoteTime:meta.regularMarketTime||null,news};
const prompt="Analysiere diese Aktie ausschließlich anhand der gelieferten Marktdaten und Schlagzeilen. Antworte auf Deutsch als JSON mit genau diesen Schlüsseln: signal (nur 'BEOBACHTEN', 'EHER POSITIV', 'EHER NEGATIV' oder 'DATEN UNZUREICHEND'), timing (konkrete Bedingung für einen möglichen Einstieg oder 'Kein belastbarer Einstiegspunkt'), exit (konkrete Bedingung für Risiko-Begrenzung/Gewinnmitnahme, keine Garantie), reasons (Array mit maximal 4 kurzen Gründen), risks (Array mit maximal 3 Risiken), confidence (NIEDRIG/MITTEL; niemals HOCH), horizon (KURZFRISTIG/MITTELFRISTIG). Erfinde keine Fakten. Nenne Trump, Krieg, Zölle, Politik oder Zinspolitik nur, wenn die gelieferten Schlagzeilen das ausdrücklich belegen. Wenn keine relevanten aktuellen Schlagzeilen vorhanden sind oder Daten fehlen, nutze DATEN UNZUREICHEND. Keine definitive Aufforderung zum Kaufen/Verkaufen. Trenne Nachricht und Interpretation. Daten: "+JSON.stringify(market);
const ai=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENROUTER_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"openrouter/free",messages:[{role:"user",content:prompt}],max_tokens:700})});
let analysis={signal:"DATEN UNZUREICHEND",timing:"Kein belastbarer Einstiegspunkt",exit:"Risikogrenze vor einem möglichen Einstieg selbst festlegen",reasons:["Keine verifizierte KI-Auswertung verfügbar."],risks:["Kursdaten und Schlagzeilen können verzögert sein."],confidence:"NIEDRIG",horizon:"KURZFRISTIG"};
if(ai.ok){const ad=await ai.json();const raw=ad.choices?.[0]?.message?.content||"";try{const clean=raw.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();const parsed=JSON.parse(clean);if(["BEOBACHTEN","EHER POSITIV","EHER NEGATIV","DATEN UNZUREICHEND"].includes(parsed.signal))analysis={...analysis,...parsed}}catch{}}
return reply({market,analysis,source:"Yahoo Finance headlines and quote data",disclaimer:"Informative AI analysis, not investment advice. Quotes/news may be delayed or incomplete."});
}catch{return reply({error:"Marktanalyse momentan nicht verfügbar"},502)}
}
if(url.pathname==="/api/quote"){
if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
if(request.method!=="GET")return reply({error:"Method not allowed"},405);
const symbol=(url.searchParams.get("symbol")||"").trim().toUpperCase();
if(!/^[A-Z0-9.^=-]{1,20}$/.test(symbol))return reply({error:"Ungültiges Aktiensymbol"},400);
try{
const upstream=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(symbol)+"?range=1d&interval=5m",{headers:{"Accept":"application/json","User-Agent":"Mozilla/5.0"}});
if(!upstream.ok)return reply({error:"Kursquelle derzeit nicht erreichbar"},502);
const data=await upstream.json(),q=data.chart?.result?.[0],meta=q?.meta;
if(!meta||typeof meta.regularMarketPrice!=="number")return reply({error:"Kein Kurs für dieses Symbol gefunden"},404);
return reply({symbol:meta.symbol||symbol,price:meta.regularMarketPrice,currency:meta.currency||"",previousClose:meta.chartPreviousClose??meta.previousClose??null,marketState:meta.marketState||"unknown",asOf:meta.regularMarketTime||null,source:"Yahoo Finance",delayed:true});
}catch{return reply({error:"Kursabfrage fehlgeschlagen"},502)}
}
if(url.pathname==="/api/image"){
if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
if(request.method!=="POST")return reply({error:"Method not allowed"},405);
if(!env.AURA_ACCESS_TOKEN||request.headers.get("Authorization")!=="Bearer "+env.AURA_ACCESS_TOKEN)return reply({error:"Zugang verweigert"},401);
try{const b=await request.json();if(typeof b.prompt!=="string"||!b.prompt.trim()||b.prompt.length>1000)return reply({error:"Ungültige Bildbeschreibung"},400);
const img=await env.AI.run("@cf/bytedance/stable-diffusion-xl-lightning",{prompt:b.prompt,num_steps:4});return new Response(img,{headers:{...headers,"Content-Type":"image/png"}})}catch{return reply({error:"Bilderstellung momentan nicht verfügbar oder Nutzungslimit erreicht"},502)}
}
if(url.pathname!=="/api/chat")return url.pathname==="/"?Response.redirect(origin+"/Aura/",302):reply({error:"Not found"},404);
if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
if(request.method!=="POST")return reply({status:"Aura API",configured:!!(env.OPENROUTER_API_KEY&&env.AURA_ACCESS_TOKEN)},200);
if(!env.OPENROUTER_API_KEY||!env.AURA_ACCESS_TOKEN)return reply({error:"Server noch nicht eingerichtet"},503);
if(request.headers.get("Authorization")!=="Bearer "+env.AURA_ACCESS_TOKEN)return reply({error:"Zugang verweigert"},401);
try{
if(Number(request.headers.get("Content-Length"))>20000)return reply({error:"Anfrage zu groß"},413);
const raw=await request.text();if(raw.length>20000)return reply({error:"Anfrage zu groß"},413);
const body=JSON.parse(raw);if(typeof body.message!=="string"||!body.message.trim()||body.message.length>4000)return reply({error:"Ungültige Nachricht"},400);
const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENROUTER_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"openrouter/free",messages:[{role:"system",content:"Du bist Aura, eine vielseitige deutschsprachige persönliche KI-Assistentin. Hilf bei Technik, Mathematik, Programmierung, Reisen, Organisation und Alltagswissen. Antworte natürlich, präzise und freundlich, bei komplexen Fragen gründlich. Beachte elektrische Sicherheit. Erfinde keine aktuellen Fakten, Livekurse oder Fähigkeiten. Du hast keinen Zugriff auf persönliche Daten oder Geräte außer dem mitgelieferten Zeitkontext."},{role:"user",content:"Gerätezeit (vom Client): "+String(body.localDate||"unbekannt").slice(0,100)+" "+String(body.localTime||"").slice(0,20)+" "+String(body.timeZone||"").slice(0,80)+"\n\nNutzerfrage: "+body.message}],max_tokens:1800})});
if(!r.ok)return reply({error:"KI vorübergehend nicht verfügbar ("+r.status+")"},502);
const d=await r.json();const answer=d.choices?.[0]?.message?.content;if(typeof answer!=="string")return reply({error:"Keine KI-Antwort"},502);return reply({answer});
}catch{return reply({error:"Anfrage fehlgeschlagen"},400)}
}};