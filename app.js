// ==================== CONFIG ====================
const API_BASE = "http://3.225.81.202:5500";
const API_MOVS = `${API_BASE}/api/movimientos`;
const WS_URL   = "ws://3.225.81.202:5500/ws";

// ===== refs DOM
const apiUrlSpan   = document.getElementById("apiUrl");
const wsBadge      = document.getElementById("wsBadge");
const deviceInput  = document.getElementById("deviceId");
const tilesGrid    = document.getElementById("tilesGrid");
const statusText   = document.getElementById("statusText");
const btnVelocidad = document.getElementById("btnVelocidad");

// Mostrar URL API
if (apiUrlSpan) apiUrlSpan.textContent = API_BASE;

// ==================== MODOS DE VELOCIDAD ====================
// Solo 2 modos: Medio y Rápido
const speedModes = [
  { id: "medio",  label: "Modo: Medio",  className: "speed-medio",  value: 200 },
  { id: "rapido", label: "Modo: Rápido", className: "speed-rapido", value: 250 }
];

let currentSpeedIndex = 0; // arrancamos en "Medio"

function getCurrentSpeedValue() {
  return speedModes[currentSpeedIndex].value;
}

function updateSpeedButton() {
  if (!btnVelocidad) return;
  const mode = speedModes[currentSpeedIndex];

  btnVelocidad.classList.remove("speed-lento", "speed-medio", "speed-rapido");
  btnVelocidad.classList.add(mode.className);
  btnVelocidad.textContent = mode.label;
}

// Inicializamos el botón al cargar
updateSpeedButton();

// Click en el botón → ciclar modos
if (btnVelocidad) {
  btnVelocidad.addEventListener("click", () => {
    currentSpeedIndex = (currentSpeedIndex + 1) % speedModes.length;
    updateSpeedButton();

    const mode = speedModes[currentSpeedIndex];
    setStatus(`Velocidad: ${mode.label.replace("Modo: ", "")}`);
  });
}

// ==================== MAPEO CMD → clave_modelo ====================
const CMD_TO_MODEL = {
  "ADELANTE": 1,
  "ATRAS": 2,
  "DETENER": 3,
  "VUELTA_ADELANTE_DERECHA": 4,
  "VUELTA_ADELANTE_IZQUIERDA": 5,
  "VUELTA_ATRAS_DERECHA": 6,
  "VUELTA_ATRAS_IZQUIERDA": 7,
  "GIRO_90_DERECHA": 8,
  "GIRO_90_IZQUIERDA": 9,
  "GIRO_360_DERECHA": 10,
  "GIRO_360_IZQUIERDA": 11
};

// ==================== UTILIDADES ====================
function setStatus(msg, isError = false) {
  if (!statusText) return;
  statusText.textContent = msg || "Listo";
  statusText.style.color = isError ? "#FCA5A5" : "#9CA3AF";
}

// ==================== WEB SOCKET (solo monitor de estado) ====================
let ws = null;
let wsReconnectTimer = null;

function updateWsBadge(text, ok) {
  if (!wsBadge) return;
  wsBadge.textContent = text;
  wsBadge.style.color = ok ? "#6EE7B7" : "#FCA5A5";
}

function connectWS() {
  try {
    if (ws) {
      ws.close();
      ws = null;
    }

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      updateWsBadge("WS: conectado", true);
      console.log("[WS] conectado");
    };

    ws.onclose = () => {
      updateWsBadge("WS: desconectado", false);
      console.log("[WS] cerrado");
      wsReconnectTimer = setTimeout(connectWS, 3000);
    };

    ws.onerror = (err) => {
      console.error("[WS] error", err);
      updateWsBadge("WS: error", false);
    };

    ws.onmessage = (ev) => {
      // si algún día quieres reaccionar a algo en el control:
      // console.log("[WS] msg:", ev.data);
    };
  } catch (e) {
    console.error("[WS] excepción al conectar", e);
    updateWsBadge("WS: error", false);
  }
}

// ==================== HTTP POST MOVIMIENTOS ====================
async function postMovimiento(cmd) {
  const idDispositivo = Number(deviceInput?.value || 1);
  const clave_modelo = CMD_TO_MODEL[cmd];

  if (!clave_modelo) {
    console.warn("[CMD] comando no mapeado:", cmd);
    return;
  }

  const velocidad = getCurrentSpeedValue();

  const payload = {
    id_dispositivo: idDispositivo,
    clave_modelo,
    origen: "MANUAL",
    resultado: "OK",
    parametros_json: {
      velocidad
    }
  };

  try {
    const res = await fetch(API_MOVS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[POST] Error", res.status, txt);
      setStatus("Error al enviar movimiento", true);
      return;
    }

    setStatus(`Enviado: ${cmd} (vel=${velocidad})`);
  } catch (err) {
    console.error("[POST] Excepción", err);
    setStatus("Error de red al enviar movimiento", true);
  }
}

// ==================== MANEJO DE BOTONES (mouse + touch) ====================
let activeCmd = null;

function handlePressStart(cmd) {
  activeCmd = cmd;
  postMovimiento(cmd);
}

function handlePressEnd() {
  if (!activeCmd) return;

  if (activeCmd !== "DETENER") {
    postMovimiento("DETENER");
  }
  activeCmd = null;
}

function setupTileEvents(tile) {
  const cmd = tile.getAttribute("data-cmd");
  if (!cmd) return;

  // MOUSE
  tile.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    handlePressStart(cmd);
  });

  tile.addEventListener("mouseup", (ev) => {
    ev.preventDefault();
    handlePressEnd();
  });

  tile.addEventListener("mouseleave", (ev) => {
    if (ev.buttons === 1) {
      handlePressEnd();
    }
  });

  // TOUCH
  tile.addEventListener("touchstart", (ev) => {
    ev.preventDefault();
    handlePressStart(cmd);
  }, { passive: false });

  tile.addEventListener("touchend", (ev) => {
    ev.preventDefault();
    handlePressEnd();
  }, { passive: false });

  tile.addEventListener("touchcancel", (ev) => {
    ev.preventDefault();
    handlePressEnd();
  }, { passive: false });
}

// ==================== INIT ====================
function init() {
  connectWS();

  if (tilesGrid) {
    const tiles = tilesGrid.querySelectorAll(".tile");
    tiles.forEach(setupTileEvents);
  }

  updateSpeedButton();
  setStatus("Listo");
}

document.addEventListener("DOMContentLoaded", init);
