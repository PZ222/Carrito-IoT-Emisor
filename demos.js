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
const descSecEl      = document.getElementById("descripcionSecuencia");

apiUrlLab.textContent = API;

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
    try { detail = await r.text(); } catch {}
    throw new Error(`${r.status} ${r.statusText}${detail ? " – " + detail : ""}`);
  }
  try { return await r.json(); } catch { return null; }
}

// ==================== HEALTH ====================
async function pingHealth() {
  const data = await fetchJson(`${API}/health`);
  if (!data?.ok) throw new Error("Health NOK");
  setBadge(badgeAPI, "API OK", true);
}

// ==================== SECUENCIAS ====================
async function cargarSecuencias() {
  const rows = await fetchJson(`${API}/secuencias`);
  selSecuencias.innerHTML = rows.map(r =>
    `<option value="${r.id_seq}" data-desc="${r.descripcion || ''}">
       ${r.nombre} (id:${r.id_seq})
     </option>`
  ).join("");
  return rows;
}

// Mostrar descripción
function mostrarDescripcion() {
  const opt = selSecuencias.selectedOptions[0];
  if (!opt) {
    descSecEl.textContent = "Selecciona una secuencia y pulsa Cargar para ver su descripción.";
    return;
  }
  const text = opt.dataset.desc || "Sin descripción";
  descSecEl.textContent = text;
}

// ==================== PASOS ====================
async function cargarPasos() {
  const id = Number(selSecuencias.value);
  if (!id) {
    listaPasos.innerHTML = `<div class="item empty">Sin secuencia</div>`;
    return;
  }

  mostrarDescripcion();

  const pasos = await fetchJson(`${API}/secuencias/${id}/pasos`);
  listaPasos.innerHTML =
    pasos.map(p =>
      `<div class="item">#${p.orden} • ${p.mov_desc} (id_mov:${p.id_mov}) • ${p.dur_ms} ms</div>`
    ).join("") || `<div class="item empty">Sin pasos</div>`;
}

// ==================== BLOQUEO DE CAMPOS ====================
function updateVelDurLock() {
  const mov = Number(selModelo.value);
  const isFixed = (mov >= 8 && mov <= 11); // giros fijos

  if (isFixed) {
    // ---- DURACIÓN ----
    inputDur.value = "";
    inputDur.placeholder = "Tiempo fijo";
    inputDur.disabled = true;

    // ---- VELOCIDAD ----
    inputVel.value = "";
    inputVel.placeholder = "Usa velocidad fija";
    inputVel.disabled = true;
  } else {
    // Restaurar controles
    inputDur.disabled = false;
    inputDur.placeholder = "Duración en ms";
    if (!inputDur.value) inputDur.value = "1000";

    inputVel.disabled = false;
    inputVel.placeholder = "0–255";
    if (!inputVel.value) inputVel.value = "150";
  }
}

// ==================== CREAR SECUENCIA ====================
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

// ==================== AGREGAR PASO ====================
btnAgregarPaso?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias.value);
    const orden = Number(inputOrden.value || 1);
    const dur   = inputDur.disabled ? null : Number(inputDur.value || 1000);
    const vel   = inputVel.disabled ? null : Number(inputVel.value || 150);

    const id_mov = Number(selModelo.value);

    // parámetros JSON
    const params = {};
    if (vel !== null) params.velocidad = vel;

    await fetchJson(`${API}/secuencias/${seqId}/pasos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_mov,
        orden,
        dur_ms: dur ?? 0,
        parametros_json: params
      })
    });

    await cargarPasos();
  } catch (e) {
    console.error(e);
    alert("Error paso: " + e.message);
  }
});

// ==================== EJECUTAR SECUENCIA ====================
btnIniciar?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias.value);
    const disp  = Number(inputDisp.value || 1);

    const data  = await fetchJson(
      `${API}/secuencias/${seqId}/ejecutar?id_dispositivo=${disp}`,
      { method: "POST" }
    );

    alert(`Secuencia en marcha: ${data.inserted} pasos insertados`);
  } catch (e) {
    console.error(e);
    alert("Error al iniciar: " + e.message);
  }
});

// ==================== EVENTOS ====================
selSecuencias?.addEventListener("change", mostrarDescripcion);
selModelo?.addEventListener("change", updateVelDurLock);

// ==================== ARRANQUE ====================
(async () => {
  try {
    await pingHealth();
    await cargarSecuencias();
    mostrarDescripcion();
    await cargarPasos();
    updateVelDurLock();
  } catch (e) {
    console.error(e);
    setBadge(badgeAPI, "Error al cargar: " + e.message, false);
  }
})();
