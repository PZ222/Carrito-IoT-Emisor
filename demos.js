// ==================== CONFIG ====================
const API = "http://3.225.81.202:5500/api";

// ===== refs
const apiUrlLab   = document.getElementById("apiUrl");
const badgeAPI    = document.getElementById("badgeAPI");

const selSecuencias  = document.getElementById("selSecuencias");
const btnCargar      = document.getElementById("btnCargar");
const selModelo      = document.getElementById("selModelo");
const inputOrden     = document.getElementById("inputOrden");
const inputDur       = document.getElementById("inputDur");
const inputVel       = document.getElementById("inputVel");
const btnAgregarPaso = document.getElementById("btnAgregarPaso");
const btnIniciar     = document.getElementById("btnIniciar");
const inputDisp      = document.getElementById("inputDisp");

const inputNombre    = document.getElementById("inputNombre");
const inputDesc      = document.getElementById("inputDesc");
const btnCrearSeq    = document.getElementById("btnCrearSeq");
const badgeCrear     = document.getElementById("badgeCrear");

const listaPasos     = document.getElementById("listaPasos");

if (apiUrlLab) apiUrlLab.textContent = API;

// ===== util
function setBadge(el, txt, ok = true) {
  if (!el) return;
  el.textContent = txt;
  el.className = "chip " + (ok ? "ok" : "err");
}

async function fetchJson(url, opts) {
  const r = await fetch(url, { mode: "cors", cache: "no-store", ...opts });
  if (!r.ok) {
    let detail = "";
    try { detail = await r.text(); } catch { /* ignore */ }
    throw new Error(`${r.status} ${r.statusText}${detail ? " – " + detail : ""}`);
  }
  try { return await r.json(); } catch { return null; }
}

// ===== carga base
async function pingHealth() {
  const data = await fetchJson(`${API}/health`);
  if (!data?.ok) throw new Error("Health NOK");
  setBadge(badgeAPI, "API OK", true);
}

async function cargarSecuencias() {
  const rows = await fetchJson(`${API}/secuencias`);
  selSecuencias.innerHTML = rows.map(r =>
    `<option value="${r.id_seq}">${r.nombre} (id:${r.id_seq})</option>`
  ).join("");
  return rows;
}

async function cargarPasos() {
  const id = Number(selSecuencias.value);
  if (!id) {
    listaPasos.innerHTML = `<div class="item empty">Sin secuencia</div>`;
    return;
  }
  const pasos = await fetchJson(`${API}/secuencias/${id}/pasos`);
  listaPasos.innerHTML = pasos.map(p => {
    let velTxt = "";
    if (p.parametros_json && typeof p.parametros_json === "object") {
      const v = p.parametros_json.velocidad;
      if (typeof v === "number") velTxt = ` • vel:${v}`;
    }
    return `<div class="item">#${p.orden} • ${p.mov_desc} (id_mov:${p.id_mov}) • ${p.dur_ms} ms${velTxt}</div>`;
  }).join("") || `<div class="item empty">Sin pasos</div>`;
}

// ===== acciones
btnCrearSeq?.addEventListener("click", async () => {
  try {
    const res = await fetchJson(`${API}/secuencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: inputNombre.value || "DEMO_1",
        descripcion: inputDesc.value || "",
        autor: "ui",
        es_evasion: false
      })
    });
    setBadge(badgeCrear, "Secuencia OK", true);
    const rows = await cargarSecuencias();
    if (res?.id) selSecuencias.value = String(res.id);
    await cargarPasos();
  } catch (e) {
    console.error(e);
    setBadge(badgeCrear, "Crear: " + e.message, false);
  }
});

btnCargar?.addEventListener("click", cargarPasos);

btnAgregarPaso?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias.value);
    const orden = Number(inputOrden.value || 1);
    const dur   = Number(inputDur.value || 1000);
    const id_mov = Number(selModelo.value);
    const vel   = Number(inputVel.value || 0);

    const payload = { id_mov, orden, dur_ms: dur };
    if (Number.isFinite(vel) && vel > 0) {
      payload.velocidad = vel;  // esto llega al back y se guarda en parametros_json
    }

    await fetchJson(`${API}/secuencias/${seqId}/pasos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await cargarPasos();
  } catch (e) {
    console.error(e);
    alert("Error paso: " + e.message);
  }
});

btnIniciar?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias.value);
    const disp  = Number(inputDisp.value || 1);
    const data  = await fetchJson(`${API}/secuencias/${seqId}/ejecutar?id_dispositivo=${disp}`, { method: "POST" });
    alert(`Secuencia en marcha: ${data.inserted} pasos insertados`);
  } catch (e) {
    console.error(e);
    alert("Error al iniciar: " + e.message);
  }
});

// ===== boot
(async () => {
  try {
    await pingHealth();
    await cargarSecuencias();
    await cargarPasos();
  } catch (e) {
    console.error(e);
    setBadge(badgeAPI, "Error al cargar: " + e.message, false);
  }
})();
