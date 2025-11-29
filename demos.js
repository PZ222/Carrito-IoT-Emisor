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
const seqDesc        = document.getElementById("seqDesc");  // cuadro de descripción

// cache de secuencias para poder mostrar descripción
let secuenciasCache = [];

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

// ===== descripción de la secuencia seleccionada
function actualizarDescripcionSeleccionada() {
  if (!seqDesc || !selSecuencias) return;

  const idSel = Number(selSecuencias.value || 0);
  const row   = secuenciasCache.find(r => Number(r.id_seq) === idSel);

  if (row) {
    seqDesc.textContent = row.descripcion || "(Sin descripción registrada)";
  } else {
    seqDesc.textContent = "Selecciona una secuencia y pulsa Cargar para ver su descripción.";
  }
}

// ===== habilitar/deshabilitar duración / velocidad según movimiento
function updateVelDurState() {
  if (!selModelo || !inputDur || !inputVel) return;

  const idMov = Number(selModelo.value || 0);
  const esGiro = (idMov === 8 || idMov === 9 || idMov === 10 || idMov === 11);

  if (esGiro) {
    // usar valores fijos, solo lectura
    inputDur.value     = 0;               // el Arduino usa sus T_GIRO_90 / T_GIRO_360
    inputDur.readOnly  = true;
    inputDur.classList.add("readonly");

    inputVel.value     = 0;               // el Arduino usa defaultSpeed
    inputVel.readOnly  = true;
    inputVel.placeholder = "Usa velocidad fija";
    inputVel.classList.add("readonly");
  } else {
    inputDur.readOnly  = false;
    inputVel.readOnly  = false;
    inputDur.classList.remove("readonly");
    inputVel.classList.remove("readonly");

    if (!inputDur.value) inputDur.value = 1000;
    if (!inputVel.value) inputVel.value = 150;
    inputVel.placeholder = "0–255";
  }
}

// ===== carga base
async function pingHealth() {
  const data = await fetchJson(`${API}/health`);
  if (!data?.ok) throw new Error("Health NOK");
  setBadge(badgeAPI, "API OK", true);
}

async function cargarSecuencias() {
  const rows = await fetchJson(`${API}/secuencias`);
  secuenciasCache = Array.isArray(rows) ? rows : [];

  if (selSecuencias) {
    selSecuencias.innerHTML = secuenciasCache.map(r =>
      `<option value="${r.id_seq}">${r.nombre} (id:${r.id_seq})</option>`
    ).join("");
  }

  // mensaje por defecto en el cuadro
  if (seqDesc) {
    seqDesc.textContent = "Selecciona una secuencia y pulsa Cargar para ver su descripción.";
  }

  return secuenciasCache;
}

async function cargarPasos() {
  if (!selSecuencias || !listaPasos) return;

  const id = Number(selSecuencias.value);
  if (!id) {
    listaPasos.innerHTML = `<div class="item empty">Sin secuencia</div>`;
    if (seqDesc) {
      seqDesc.textContent = "Selecciona una secuencia y pulsa Cargar para ver su descripción.";
    }
    return;
  }

  const pasos = await fetchJson(`${API}/secuencias/${id}/pasos`);

  listaPasos.innerHTML = (pasos || []).map(p =>
    `<div class="item">
       <div>#${p.orden} • ${p.mov_desc} (id_mov:${p.id_mov})</div>
       <div class="meta">${p.dur_ms} ms</div>
     </div>`
  ).join("") || `<div class="item empty">Sin pasos</div>`;
}

// ===== acciones
btnCrearSeq?.addEventListener("click", async () => {
  try {
    const res = await fetchJson(`${API}/secuencias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre:       inputNombre?.value || "DEMO_1",
        descripcion:  inputDesc?.value   || "",
        autor:        "ui",
        es_evasion:   false
      })
    });
    setBadge(badgeCrear, "Secuencia OK", true);

    const rows = await cargarSecuencias();
    if (res?.id && selSecuencias) {
      selSecuencias.value = String(res.id);
    }
    actualizarDescripcionSeleccionada();
    await cargarPasos();
  } catch (e) {
    console.error(e);
    setBadge(badgeCrear, "Crear: " + e.message, false);
  }
});

btnCargar?.addEventListener("click", async () => {
  try {
    await cargarPasos();
    actualizarDescripcionSeleccionada();
  } catch (e) {
    console.error(e);
    setBadge(badgeAPI, "Error al cargar: " + e.message, false);
  }
});

// si el usuario cambia la secuencia en el combo, actualizamos texto (aunque no cargue pasos aún)
selSecuencias?.addEventListener("change", actualizarDescripcionSeleccionada);

// cambio de movimiento -> bloquear/desbloquear duración/velocidad
selModelo?.addEventListener("change", updateVelDurState);

btnAgregarPaso?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias?.value);
    const orden = Number(inputOrden?.value || 1);
    const dur   = Number(inputDur?.value   || 1000);
    const vel   = Number(inputVel?.value   || 0);   // 0 = usar default

    const id_mov = Number(selModelo?.value);

    await fetchJson(`${API}/secuencias/${seqId}/pasos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_mov,
        orden,
        dur_ms: dur,
        velocidad: vel      // el back lo guarda en parametros_json
      })
    });
    await cargarPasos();
  } catch (e) {
    console.error(e);
    alert("Error paso: " + e.message);
  }
});

btnIniciar?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias?.value);
    const disp  = Number(inputDisp?.value || 1);
    const data  = await fetchJson(`${API}/secuencias/${seqId}/ejecutar?id_dispositivo=${disp}`, {
      method: "POST"
    });
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
    actualizarDescripcionSeleccionada();
    await cargarPasos();
    updateVelDurState();
  } catch (e) {
    console.error(e);
    setBadge(badgeAPI, "Error al cargar: " + e.message, false);
  }
})();
