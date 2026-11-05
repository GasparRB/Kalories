// Calorie Camera — Worker con web móvil + análisis de calorías y macronutrientes (Workers AI)
// Modelo de visión: @cf/meta/llama-3.2-11b-vision-instruct
// Opcional: historial en D1 (env.DB) y fotos en R2 (env.PHOTOS).

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Calorie Camera</title>
<style>
  :root { --bg:#0b1020; --card:#161c2e; --accent:#4f8cff; --txt:#eef2ff; --muted:#9aa6c4; --ok:#3ddc97; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:var(--bg); color:var(--txt); min-height:100vh;
    display:flex; flex-direction:column; align-items:center; padding:20px 16px 40px; }
  h1 { font-size:22px; margin:8px 0 4px; text-align:center; }
  p.sub { color:var(--muted); font-size:14px; margin:0 0 18px; text-align:center; }
  .card { width:100%; max-width:480px; background:var(--card); border-radius:18px; padding:20px;
    box-shadow:0 8px 30px rgba(0,0,0,.35); margin-bottom:16px; }
  .preview { width:100%; aspect-ratio:4/3; border-radius:14px; overflow:hidden; background:#0d1326;
    display:flex; align-items:center; justify-content:center; border:1px dashed #2a3350; margin-bottom:16px; }
  .preview img { width:100%; height:100%; object-fit:cover; display:block; }
  .preview .ph { color:var(--muted); font-size:14px; text-align:center; padding:20px; }
  .btn-row { display:flex; gap:10px; margin-bottom:16px; }
  button { flex:1; padding:14px; border:none; border-radius:12px; font-size:15px; font-weight:600;
    background:var(--accent); color:#fff; cursor:pointer; transition:opacity .15s; }
  button:disabled { opacity:.45; cursor:default; }
  button.secondary { background:#232b45; }
  input[type=file] { display:none; }
  .status { font-size:14px; color:var(--muted); text-align:center; min-height:20px; margin-bottom:12px; }
  .spinner { width:22px; height:22px; border:3px solid #2a3350; border-top-color:var(--accent);
    border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 8px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .result { display:none; }
  .result h2 { font-size:16px; margin:0 0 10px; color:var(--ok); }
  .calories { font-size:40px; font-weight:800; text-align:center; margin:6px 0 2px; }
  .calories small { font-size:16px; font-weight:500; color:var(--muted); }
  .macros-bar { display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; }
  .macro { background:#0d1326; border-radius:8px; padding:8px 12px; text-align:center; min-width:70px; }
  .macro .v { font-size:18px; font-weight:700; }
  .macro .l { font-size:10px; color:var(--muted); text-transform:uppercase; margin-top:2px; }
  .macro.p .v { color:#4f8cff; } .macro.c .v { color:#3ddc97; } .macro.f .v { color:#f5a623; } .macro.fi .v { color:#b48cff; }
  .items { margin-top:14px; }
  .item { display:flex; justify-content:space-between; padding:10px 0; border-top:1px solid #232b45; font-size:14px; }
  .item .kcal { color: var(--muted); }
  .item .macros { font-size:11px; color:var(--muted); margin-top:2px; }
  .note { font-size:12px; color:var(--muted); margin-top:14px; line-height:1.5; }
  .hist-title { font-size:15px; margin:0 0 10px; color:var(--muted); }
  .hist-item { display:flex; gap:12px; padding:10px 0; border-top:1px solid #232b45; }
  .hist-item img { width:54px; height:54px; border-radius:10px; object-fit:cover; flex-shrink:0; background:#0d1326; }
  .hist-item .info { flex:1; min-width:0; }
  .hist-item .info .d { font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .hist-item .info .k { font-size:13px; color:var(--ok); margin-top:2px; }
  .hist-item .info .t { font-size:11px; color:var(--muted); margin-top:2px; }
  .empty { color:var(--muted); font-size:13px; text-align:center; padding:10px 0; }
</style>
</head>
<body>
  <h1>🍽️ Calorie Camera</h1>
  <p class="sub">Toma una foto de tu plato y estima las calorías y macronutrientes</p>

  <div class="card">
    <div class="preview" id="preview"><div class="ph">La foto aparecerá aquí</div></div>
    <div class="btn-row">
      <button onclick="document.getElementById('cam').click()">📷 Tomar foto</button>
      <button class="secondary" onclick="document.getElementById('file').click()">📁 Subir</button>
    </div>
    <input type="file" id="cam" accept="image/*" capture="environment">
    <input type="file" id="file" accept="image/*">
    <div class="status" id="status"></div>
    <div class="result" id="result">
      <h2>✅ Análisis completado</h2>
      <div class="calories" id="kcal">— <small>kcal</small></div>
      <div class="macros-bar" id="macros"></div>
      <div class="items" id="items"></div>
      <div class="note" id="note"></div>
    </div>
  </div>

  <div class="card">
    <div class="hist-title">🕘 Historial reciente</div>
    <div id="history"><div class="empty">Cargando…</div></div>
  </div>

<script>
  let currentImage = null;
  function handleFile(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    document.getElementById('preview').innerHTML = '<img src="'+url+'" alt="plato">';
    currentImage = f;
  }
  document.getElementById('cam').addEventListener('change', e => handleFile(e.target));
  document.getElementById('file').addEventListener('change', e => handleFile(e.target));

  document.addEventListener('change', async () => {
    if (!currentImage) return;
    const status = document.getElementById('status'), result = document.getElementById('result');
    result.style.display = 'none';
    status.innerHTML = '<div class="spinner"></div>Analizando el plato…';
    try {
      const b64 = await toBase64(currentImage);
      const res = await fetch('/analyze', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image: b64 }) });
      if (!res.ok) {
        let msg = 'Error '+res.status;
        try { const e = await res.json(); if (e.error) msg = e.error; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      renderResult(data); status.innerHTML = ''; loadHistory();
    } catch (err) { status.innerHTML = '⚠️ No se pudo analizar: '+err.message; }
  });

  function toBase64(file){ return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const max=1024;
        let w=img.width, h=img.height;
        if(w>max||h>max){ if(w>h){ h=Math.round(h*max/w); w=max; } else { w=Math.round(w*max/h); h=max; } }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/jpeg',0.85));
      };
      img.onerror=reject; img.src=r.result;
    };
    r.onerror=reject; r.readAsDataURL(file);
  }); }

  function renderResult(data){
    const result = document.getElementById('result');
    document.getElementById('kcal').innerHTML = (data.totalCalories!=null?data.totalCalories:'—')+' <small>kcal</small>';
    const mb = document.getElementById('macros');
    if (data.totalProtein!=null || data.totalCarbs!=null || data.totalFat!=null) {
      mb.innerHTML =
        '<div class="macro p"><div class="v">'+(data.totalProtein!=null?data.totalProtein:'—')+'</div><div class="l">Proteína</div></div>'+
        '<div class="macro c"><div class="v">'+(data.totalCarbs!=null?data.totalCarbs:'—')+'</div><div class="l">Hidratos</div></div>'+
        '<div class="macro f"><div class="v">'+(data.totalFat!=null?data.totalFat:'—')+'</div><div class="l">Grasas</div></div>'+
        '<div class="macro fi"><div class="v">'+(data.totalFiber!=null?data.totalFiber:'—')+'</div><div class="l">Fibra</div></div>';
    } else { mb.innerHTML = ''; }
    const items = document.getElementById('items');
    if (data.items && data.items.length) {
      items.innerHTML = data.items.map(i=>{
        let macros = '';
        if (i.protein!=null || i.carbs!=null || i.fat!=null) {
          macros = '<div class="macros">P: '+(i.protein||0)+'g · H: '+(i.carbs||0)+'g · G: '+(i.fat||0)+'g'+(i.fiber!=null?' · F: '+i.fiber+'g':'')+'</div>';
        }
        return '<div class="item"><span>'+esc(i.name)+macros+'</span><span class="kcal">'+
          (i.calories!=null?i.calories+' kcal':'—')+'</span></div>';
      }).join('');
    } else { items.innerHTML = '<div class="item"><span>'+esc(data.description||'')+'</span></div>'; }
    document.getElementById('note').textContent = data.confidence ? ('Confianza: '+data.confidence) : '';
    result.style.display = 'block';
  }

  async function loadHistory(){
    try {
      const res = await fetch('/history'); const data = await res.json();
      const el = document.getElementById('history');
      if (!data.length){ el.innerHTML = '<div class="empty">Aún no hay análisis guardados.</div>'; return; }
      el.innerHTML = data.map(h=>{
        const img = h.photoUrl ? '<img src="'+esc(h.photoUrl)+'">' : '';
        const date = new Date(h.created_at+'Z');
        return '<div class="hist-item">'+img+
          '<div class="info"><div class="d">'+esc(h.description||'Plato')+'</div>'+
          '<div class="k">'+(h.total_calories!=null?h.total_calories:'—')+' kcal</div>'+
          '<div class="t">'+date.toLocaleString('es')+'</div></div></div>';
      }).join('');
    } catch { document.getElementById('history').innerHTML = '<div class="empty">Historial no disponible.</div>'; }
  }
  loadHistory();

  function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(HTML, { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }
    if (url.pathname === "/analyze" && request.method === "POST") {
      return handleAnalyze(request, env);
    }
    if (url.pathname === "/history" && request.method === "GET") {
      return handleHistory(env);
    }
    const m = url.pathname.match(/^\/photo\/(.+)$/);
    if (m && request.method === "GET") { return handlePhoto(m[1], env); }
    return new Response("Not Found", { status: 404 });
  },
};

async function handleAnalyze(request, env) {
  try {
    const body = await request.json();
    const image = body.image;
    if (!image || typeof image !== "string") {
      return Response.json({ error: "Falta el campo 'image' (base64 data URL)." }, { status: 400 });
    }

    // Aceptar la licencia del modelo (requerido por Meta)
    try {
      await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", { prompt: "agree" });
    } catch {}

    const response = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      messages: [
        { role: "system", content: "Eres un nutricionista experto. Analizas fotos de platos de comida e identificas los alimentos presentes, estimando para cada uno las calorias y los macronutrientes (proteinas en gramos, hidratos de carbono en gramos, grasas en gramos y fibra en gramos). Tambien das los totales. Responde SIEMPRE en espanol y EXCLUSIVAMENTE con un objeto JSON valido con este formato: {\"description\":\"descripcion detallada del plato incluyendo tipo de cocina y ingredientes principales\",\"items\":[{\"name\":\"nombre del alimento\",\"calories\":numero_entero,\"protein\":numero,\"carbs\":numero,\"fat\":numero,\"fiber\":numero}],\"totalCalories\":numero_entero,\"totalProtein\":numero,\"totalCarbs\":numero,\"totalFat\":numero,\"totalFiber\":numero,\"confidence\":\"alta|media|baja\"}" },
        { role: "user", content: "Analiza este plato de comida. Identifica cada alimento, estima calorias y macronutrientes (proteinas, hidratos, grasas, fibra) en gramos." },
      ],
      image,
      max_tokens: 2048,
    });

    let text = response.response || response.result || "";
    if (typeof text !== "string") text = JSON.stringify(text);

    let parsed = safeParseJSON(text);
    if (!parsed) parsed = parseMoondreamResponse(text);

    let photoUrl = null;
    if (env.PHOTOS) {
      try {
        const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const bytes = dataURLToBytes(image);
        await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: "image/jpeg" } });
        photoUrl = `/photo/${key}`;
      } catch {}
    }

    if (env.DB) {
      try {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, description TEXT, total_calories INTEGER, items_json TEXT, photo_key TEXT)`
        ).run();
        await env.DB.prepare(
          `INSERT INTO analyses (created_at, description, total_calories, items_json, photo_key) VALUES (?, ?, ?, ?, ?)`
        ).bind(new Date().toISOString(), parsed.description||"", parsed.totalCalories??null, JSON.stringify(parsed.items||[]), photoUrl||null).run();
      } catch {}
    }

    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: "Error al procesar: " + err.message }, { status: 500 });
  }
}

async function handleHistory(env) {
  if (!env.DB) return Response.json([]);
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, created_at, description, total_calories, photo_key FROM analyses ORDER BY id DESC LIMIT 20`
    ).all();
    const out = (results||[]).map(r => ({ id:r.id, created_at:r.created_at, description:r.description, total_calories:r.total_calories, photoUrl:r.photo_key||null }));
    return Response.json(out);
  } catch { return Response.json([]); }
}

async function handlePhoto(key, env) {
  if (!env.PHOTOS) return new Response("Not Found", { status: 404 });
  const obj = await env.PHOTOS.get(`photos/${key.replace(/^photos\//, "")}`);
  if (!obj) return new Response("Not Found", { status: 404 });
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType || "image/jpeg" } });
}

function safeParseJSON(text) {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function parseMoondreamResponse(text) {
  const json = safeParseJSON(text);
  if (json && json.items) return json;
  const result = { description: "", items: [], totalCalories: null, confidence: "media" };
  const parts = text.split("|").map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const tm = part.match(/TOTAL\s*[:=]?\s*(\d+)/i);
    if (tm) { result.totalCalories = parseInt(tm[1]); continue; }
    const im = part.match(/^(.+?)[:\s]+(\d+)\s*k?cal/i);
    if (im) { result.items.push({ name: im[1].trim(), calories: parseInt(im[2]) }); }
    else if (!result.description) { result.description = part; }
  }
  if (result.totalCalories === null && result.items.length) {
    result.totalCalories = result.items.reduce((s, i) => s + (i.calories || 0), 0);
  }
  if (!result.description) result.description = text.slice(0, 200);
  return result;
}

function dataURLToBytes(dataURL) {
  const base64 = dataURL.split(",")[1] || "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
