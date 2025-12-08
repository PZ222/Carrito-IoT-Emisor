// ==================== CONFIG GENERAL ====================
// Base URL de la API (mismo host/puerto que tu backend Flask)
const API = "http://3.225.81.202:5500/api";

// ==================== REFERENCIAS A ELEMENTOS DEL DOM ====================
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

// Cache para guardar las secuencias y poder mostrar descripción sin re-consultar siempre
let secuenciasCache = [];

// Mostrar la URL actual de la API en la UI (para depurar)
if (apiUrlLab) apiUrlLab.textContent = API;

// ==================== UTILS GENERALES ====================

/**
 * Pone un "chip" de estado (ok / error) en la UI
 */
function setBadge(el, txt, ok = true) {
  if (!el) return;
  el.textContent = txt;
  el.className = "chip " + (ok ? "ok" : "err");
}

/**
 * Wrapper genérico para hacer fetch y parsear JSON.
 * Lanza excepciones amigables si algo falla.
 */
async function fetchJson(url, opts) {
  const r = await fetch(url, { mode: "cors", cache: "no-store", ...opts });
  if (!r.ok) {
    let detail = "";
    try { detail = await r.text(); } catch { /* ignore */ }
    throw new Error(`${r.status} ${r.statusText}${detail ? " – " + detail : ""}`);
  }
  try { 
    return await r.json(); 
  } catch { 
    return null; 
  }
}

// ==================== DESCRIPCIÓN DE LA SECUENCIA SELECCIONADA ====================

/**
 * Muestra en el cuadro de texto la descripción de la secuencia
 * actualmente seleccionada en el combo <select>.
 */
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

// ==================== CONTROL DE DURACIÓN / VELOCIDAD POR TIPO DE MOVIMIENTO ====================

/**
 * Según el movimiento seleccionado (adelante, giro, etc.),
 * se decide si la duración y velocidad son editables o fijas.
 *
 * - Para giros (90° / 360°) manejamos valores fijos en el front,
 *   pero el carrito usa sus tiempos internos T_GIRO_90 / T_GIRO_360 y GIRO_SPEED.
 */
function updateVelDurState() {
  if (!selModelo || !inputDur || !inputVel) return;

  const idMov = Number(selModelo.value || 0);
  const esGiro90  = (idMov === 8 || idMov === 9);
  const esGiro360 = (idMov === 10 || idMov === 11);
  const esGiro    = esGiro90 || esGiro360;

  if (esGiro) {
    // Para giros: usar duración fija aproximada al giro real en el carrito,
    // solo para que la API tenga un dur_ms > 0 y se respete el "ritmo" de la demo.
    inputDur.readOnly  = true;
    inputDur.classList.add("readonly");
    inputDur.value     = esGiro90 ? 250 : 900;   // correlacionado con T_GIRO_90 / T_GIRO_360

    // La velocidad en el carrito es GIRO_SPEED, así que aquí solo dejamos 0 como marcador.
    inputVel.readOnly  = true;
    inputVel.classList.add("readonly");
    inputVel.value     = 0;
    inputVel.placeholder = "Velocidad fija en el carrito";
  } else {
    // Movimientos "normales": se puede editar duración y velocidad
    inputDur.readOnly  = false;
    inputDur.classList.remove("readonly");

    inputVel.readOnly  = false;
    inputVel.classList.remove("readonly");

    if (!inputDur.value) inputDur.value = 1000; // 1 segundo por defecto
    if (!inputVel.value) inputVel.value = 150;  // velocidad por defecto
    inputVel.placeholder = "0–255";
  }
}

// ==================== CARGA INICIAL: HEALTH Y LISTA DE SECUENCIAS ====================

/**
 * Verifica que la API esté viva (endpoint /health).
 */
async function pingHealth() {
  const data = await fetchJson(`${API}/health`);
  if (!data?.ok) throw new Error("Health NOK");
  setBadge(badgeAPI, "API OK", true);
}

/**
 * Carga la lista de secuencias desde /api/secuencias
 * y llena el <select>.
 */
async function cargarSecuencias() {
  const rows = await fetchJson(`${API}/secuencias`);
  secuenciasCache = Array.isArray(rows) ? rows : [];

  if (selSecuencias) {
    selSecuencias.innerHTML = secuenciasCache.map(r =>
      `<option value="${r.id_seq}">${r.nombre} (id:${r.id_seq})</option>`
    ).join("");
  }

  // Mensaje por defecto en el cuadro de descripción
  if (seqDesc) {
    seqDesc.textContent = "Selecciona una secuencia y pulsa Cargar para ver su descripción.";
  }

  return secuenciasCache;
}

/**
 * Carga los pasos de la secuencia seleccionada y los muestra
 * en la lista lateral.
 */
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

  // Mostrar cada paso con su orden, descripción y duración
  listaPasos.innerHTML = (pasos || []).map(p =>
    `<div class="item">
       <div>#${p.orden} • ${p.mov_desc} (id_mov:${p.id_mov})</div>
       <div class="meta">${p.dur_ms} ms</div>
     </div>`
  ).join("") || `<div class="item empty">Sin pasos</div>`;
}

// ==================== ACCIONES DE LA UI ====================

// Crear una nueva secuencia (sin pasos todavía)
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

    // Recargar lista de secuencias y seleccionar la nueva
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

// Cargar pasos de la secuencia seleccionada
btnCargar?.addEventListener("click", async () => {
  try {
    await cargarPasos();
    actualizarDescripcionSeleccionada();
  } catch (e) {
    console.error(e);
    setBadge(badgeAPI, "Error al cargar: " + e.message, false);
  }
});

// Si el usuario cambia la secuencia en el combo, solo se actualiza la descripción
// (los pasos se cargan cuando pulsa "Cargar")
selSecuencias?.addEventListener("change", actualizarDescripcionSeleccionada);

// Cambio de movimiento -> bloquear/desbloquear duración/velocidad
selModelo?.addEventListener("change", updateVelDurState);

// Agregar un paso a la secuencia actual
btnAgregarPaso?.addEventListener("click", async () => {
  try {
    const seqId = Number(selSecuencias?.value);
    const orden = Number(inputOrden?.value || 1);
    let   dur   = Number(inputDur?.value   || 1000);
    const vel   = Number(inputVel?.value   || 0);   // 0 = usar default en el carrito

    const id_mov = Number(selModelo?.value);

    // Seguridad: nunca mandar dur_ms = 0 al backend
    if (dur <= 0) dur = 1;

    await fetchJson(`${API}/secuencias/${seqId}/pasos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_mov,
        orden,
        dur_ms: dur,
        velocidad: vel      // el back lo guarda en parametros_json.velocidad
      })
    });
    await cargarPasos();
  } catch (e) {
    console.error(e);
    alert("Error paso: " + e.message);
  }
});

// Iniciar la ejecución de la secuencia (backend inserta pasos con delay entre ellos)
// Esta llamada dispara en el back los INSERTs a estatus_movimiento
// y los ws_broadcast("movimiento", ...) que el carrito escucha.
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

// ==================== BOOT / ARRANQUE DE LA PÁGINA ====================

(async () => {
  try {
    // 1) Verificar API
    await pingHealth();

    // 2) Cargar secuencias disponibles
    await cargarSecuencias();
    actualizarDescripcionSeleccionada();

    // 3) Cargar pasos de la secuencia seleccionada (si hay)
    await cargarPasos();

    // 4) Ajustar estado inicial de duración / velocidad según modelo actual
    updateVelDurState();
  } catch (e) {
    console.error(e);
    setBadge(badgeAPI, "Error al cargar: " + e.message, false);
  }
})();
