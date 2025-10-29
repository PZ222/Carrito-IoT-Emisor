// ================= EMISOR =================
const API = "http://3.225.81.202:5500/api";
const WS  = "ws://3.225.81.202:5500/ws";

// Elementos que el HTML NUEVO ya trae
const els = {
  deviceId:  document.getElementById("deviceId"),
  status:    document.getElementById("statusText"),
  wsBadge:   document.getElementById("wsBadge"),
  tiles:     document.querySelectorAll(".tile"),
  apiUrlEl:  document.getElementById("apiUrl")
};

// Muestra host actual de API en la insignia
if (els.apiUrlEl) els.apiUrlEl.textContent = API.replace(/\/api$/, "");

// Map de comandos -> clave_modelo (usa tus mismas claves)
const CMD_TO_MODEL = {
  // fila 1
  "ADELANTE": 1,
  "VUELTA_ADELANTE_IZQUIERDA": 5,  // como venías usando en los logs
  "VUELTA_ADELANTE_DERECHA": 6,    // si tu catálogo usa otro, cámbialo aquí
  "ATRAS": 2,
  // fila 2
  "GIRO_90_IZQUIERDA": 9,
  "GIRO_90_DERECHA": 8,
  "GIRO_360_IZQUIERDA": 11,
  "GIRO_360_DERECHA": 10
};

// Util
function setStatus(t){ if (els.status) els.status.textContent = t; }

// Envío de movimiento
async function postMovimiento(claveModelo){
  const id = Number(els.deviceId?.value || 1);
  const payload = {
    id_dispositivo: id,
    clave_modelo: claveModelo,
    origen: "MANUAL"
  };
  setStatus("Enviando…");
  try{
    const res = await fetch(`${API}/movimientos`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      const txt = await res.text().catch(()=> "");
      throw new Error(`${res.status} ${res.statusText} ${txt}`);
    }
    const j = await res.json().catch(()=> ({}));
    if(j && j.ok === false) throw new Error(j.error || "Error API");
    setStatus(`Movimiento ${claveModelo}: OK`);
  }catch(err){
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
}

// Clicks en los mosaicos
function bindTiles(){
  els.tiles.forEach(tile => {
    tile.addEventListener("click", () => {
      // en HTML cada tile tiene data-cmd (o usamos su texto/ícono? mejor data-cmd)
      // Si no hay data-cmd, inferimos por posición/label:
      const cmdAttr = tile.getAttribute("data-cmd");
      let cmd = cmdAttr;
      if(!cmd){
        // fallback por texto visible (por si se olvidó el data-cmd)
        const label = (tile.textContent || "").toUpperCase();
        if(label.includes("ADELANTE") && !label.includes("VTA")) cmd = "ADELANTE";
        else if(label.includes("VTA ADEL") && label.includes("IZQ")) cmd = "VUELTA_ADELANTE_IZQUIERDA";
        else if(label.includes("VTA ADEL") && label.includes("DER")) cmd = "VUELTA_ADELANTE_DERECHA";
        else if(label.includes("ATRÁS") || label.includes("ATRAS")) cmd = "ATRAS";
        else if(label.includes("GIRO 90") && label.includes("IZQ")) cmd = "GIRO_90_IZQUIERDA";
        else if(label.includes("GIRO 90") && label.includes("DER")) cmd = "GIRO_90_DERECHA";
        else if(label.includes("GIRO 360") && label.includes("IZQ")) cmd = "GIRO_360_IZQUIERDA";
        else if(label.includes("GIRO 360") && label.includes("DER")) cmd = "GIRO_360_DERECHA";
      }
      const modelo = CMD_TO_MODEL[cmd];
      if(!modelo){
        setStatus("Error: comando no mapeado");
        return;
      }
      postMovimiento(modelo);
    });
  });
}

// WebSocket (solo indicador)
function initWS(){
  try{
    const ws = new WebSocket(WS);
    ws.onopen = () => { if (els.wsBadge) els.wsBadge.textContent = "WS: conectado"; };
    ws.onclose = () => { if (els.wsBadge) els.wsBadge.textContent = "WS: desconectado"; };
    ws.onerror = () => { if (els.wsBadge) els.wsBadge.textContent = "WS: error"; };
    // Si quisieras refrescar algo en tiempo real:
    // ws.onmessage = (ev) => { ... }
  }catch{/* ignore */}
}

bindTiles();
initWS();
setStatus("Listo");
