async function transcribe(request, env) {
  const audio = await request.arrayBuffer();
  if (!audio.byteLength || audio.byteLength > 5000000) {
    throw new Error("Ungültige Aufnahme");
  }
  const result = await env.AI.run(
    "@cf/openai/whisper",
    { audio: Array.from(new Uint8Array(audio)) }
  );
  return result.text;
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
  } catch {
    return reply({error:"Spracherkennung fehlgeschlagen"},502);
  }
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
const r=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENROUTER_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"openrouter/free",messages:[{role:"system",content:"Du bist Aura, eine deutschsprachige persönliche Assistentin mit Schwerpunkt Elektrotechnik. Antworte präzise, beachte elektrische Sicherheit und erfinde keine Livekurse. Du hast keinen Zugriff auf persönliche Daten oder Geräte."},{role:"user",content:body.message}],max_tokens:700})});
if(!r.ok)return reply({error:"KI vorübergehend nicht verfügbar ("+r.status+")"},502);
const d=await r.json();const answer=d.choices?.[0]?.message?.content;if(typeof answer!=="string")return reply({error:"Keine KI-Antwort"},502);return reply({answer});
}catch{return reply({error:"Anfrage fehlgeschlagen"},400)}
}};