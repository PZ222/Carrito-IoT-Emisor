// ================= EMISOR =================
const API = "http://3.225.81.202:5500/api";
const WS  = "ws://3.225.81.202:5500/ws";

// Elementos del HTML
const els = {
  deviceId:  document.getElementById("deviceId"),
  status:    document.getElementById("statusText"),
  wsBadge:   document.getElementById("wsBadge"),
  tiles:     document.querySelectorAll(".tile"),
  apiUrlEl:  document.getElementById("apiUrl")
};

// Mostrar la URL base de la API
if (els.apiUrlEl) els.apiUrlEl.textContent = API.replace(/\/api$/, "");

// ========== MAPEO COMANDOS -> clave_modelo ==========
// Debe coincidir con catalogo_movimientos de tu BD
const CMD_TO_MODEL = {
  "ADELANTE":                  1,
  "ATRAS":                     2,
  "DETENER":                   3,
  "VUELTA_ADELANTE_DERECHA":   4,
  "VUELTA_ADELANTE_IZQUIERDA": 5,
  "VUELTA_ATRAS_DERECHA":      6,
  "VUELTA_ATRAS_IZQUIERDA":    7,
  "GIRO_90_DERECHA":           8,
  "GIRO_90_IZQUIERDA":         9,
  "GIRO_360_DERECHA":          10,
  "GIRO_360_IZQUIERDA":        11
};

// Comandos que deben ser continuos mientras el botón esté presionado
const CONTINUOUS_CMDS = new Set([
  "ADELANTE",
  "ATRAS",
  "VUELTA_ADELANTE_IZQUIERDA",
  "VUELTA_ADELANTE_DERECHA",
  "VUELTA_ATRAS_IZQUIERDA",
  "VUELTA_ATRAS_DERECHA"
]);

function setStatus(t){
  if (els.status) els.status.textContent = t;
}

// Envío de movimiento
async function postMovimiento(claveModelo){
  const id = Number(els.deviceId?.value || 1);
  const payload = {
    id_dispositivo: id,
    clave_modelo: claveModelo,
    origen: "MANUAL"
  };
  try{
    const res = await fetch(`${API}/movimientos`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok){
      const txt = await res.text().catch(()=> "");
      throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    const j = await res.json().catch(()=> ({}));
    if (j && j.ok === false) throw new Error(j.error || "Error API");
  }catch(err){
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
}

// Resolver comando desde el tile (usa data-cmd del HTML)
function getCmdFromTile(tile){
  const cmdAttr = tile.getAttribute("data-cmd");
  if (cmdAttr) return cmdAttr;

  const label = (tile.textContent || "").toUpperCase();

  if (label.includes("ADELANTE") && !label.includes("VTA")) return "ADELANTE";
  if (label.includes("VTA ADEL") && label.includes("IZQ"))  return "VUELTA_ADELANTE_IZQUIERDA";
  if (label.includes("VTA ADEL") && label.includes("DER"))  return "VUELTA_ADELANTE_DERECHA";
  if (label.includes("ATRÁS") || label.includes("ATRAS"))   return "ATRAS";
  if (label.includes("VTA ATR") && label.includes("IZQ"))   return "VUELTA_ATRAS_IZQUIERDA";
  if (label.includes("VTA ATR") && label.includes("DER"))   return "VUELTA_ATRAS_DERECHA";
  if (label.includes("GIRO 90") && label.includes("IZQ"))   return "GIRO_90_IZQUIERDA";
  if (label.includes("GIRO 90") && label.includes("DER"))   return "GIRO_90_DERECHA";
  if (label.includes("GIRO 360") && label.includes("IZQ"))  return "GIRO_360_IZQUIERDA";
  if (label.includes("GIRO 360") && label.includes("DER"))  return "GIRO_360_DERECHA";

  return null;
}

// ===== Eventos de los tiles =====
function bindTiles(){
  els.tiles.forEach(tile => {
    const cmd = getCmdFromTile(tile);
    if (!cmd){
      tile.addEventListener("click", () => setStatus("Tile sin comando mapeado"));
      return;
    }

    const modelo = CMD_TO_MODEL[cmd];

    // pointerdown -> iniciar acción
    tile.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      if (!modelo){
        setStatus("Error: comando no mapeado");
        return;
      }

      if (CONTINUOUS_CMDS.has(cmd)){
        // Movimiento continuo: solo un comando para arrancar
        setStatus(`Moviendo: ${cmd}`);
        postMovimiento(modelo);
      }else{
        // Giros: un solo evento
        setStatus(`Ejecutando: ${cmd}`);
        postMovimiento(modelo);
      }
    });

    // pointerup / pointerleave -> si es continuo, mandar DETENER
    const stopHandler = ev => {
      ev.preventDefault();
      if (CONTINUOUS_CMDS.has(cmd)){
        const modeloDetener = CMD_TO_MODEL["DETENER"];
        if (modeloDetener){
          setStatus("Detenido");
          postMovimiento(modeloDetener);
        }
      }
    };

    tile.addEventListener("pointerup", stopHandler);
    tile.addEventListener("pointerleave", stopHandler);

    // Evitar doble disparo por click en comandos continuos
    tile.addEventListener("click", ev => {
      if (CONTINUOUS_CMDS.has(cmd)){
        ev.preventDefault();
      }
    });
  });
}

// WebSocket (solo indicador de estado)
function initWS(){
  try{
    const ws = new WebSocket(WS);
    ws.onopen  = () => els.wsBadge && (els.wsBadge.textContent = "WS: conectado");
    ws.onclose = () => els.wsBadge && (els.wsBadge.textContent = "WS: desconectado");
    ws.onerror = () => els.wsBadge && (els.wsBadge.textContent = "WS: error");
  }catch{/* ignore */}
}

// Arranque
bindTiles();
initWS();
setStatus("Listo");
