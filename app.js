// ================= EMISOR =================
const API = "http://3.225.81.202:5500/api";
const WS  = "ws://3.225.81.202:5500/ws";

// Elementos que el HTML trae
const els = {
  deviceId:  document.getElementById("deviceId"),
  status:    document.getElementById("statusText"),
  wsBadge:   document.getElementById("wsBadge"),
  tiles:     document.querySelectorAll(".tile"),
  apiUrlEl:  document.getElementById("apiUrl")
};

// Mostrar host de API
if (els.apiUrlEl) els.apiUrlEl.textContent = API.replace(/\/api$/, "");

// Map de comandos -> clave_modelo (usa tu catálogo de movimientos)
const CMD_TO_MODEL = {
  // continuos
  "ADELANTE": 1,
  "ATRAS": 2,
  "VUELTA_ADELANTE_IZQUIERDA": 5,
  "VUELTA_ADELANTE_DERECHA": 4,
  "VUELTA_ATRAS_IZQUIERDA": 7,   // ajusta a tu clave real si es otra
  "VUELTA_ATRAS_DERECHA": 6,     // o la que tengas en catálogo

  // detener
  "DETENER": 3,

  // giros discretos
  "GIRO_90_IZQUIERDA": 9,
  "GIRO_90_DERECHA": 8,
  "GIRO_360_IZQUIERDA": 11,
  "GIRO_360_DERECHA": 10
};

// Comandos que se controlan “dejando presionado”
const HOLD_CMDS = new Set([
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

// Enviar movimiento a la API
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

// Vincular tiles
function bindTiles(){
  els.tiles.forEach(tile => {
    let cmd = tile.getAttribute("data-cmd");

    if(!cmd){
      const label = (tile.textContent || "").toUpperCase();
      if(label.includes("ADELANTE") && !label.includes("VTA")) cmd = "ADELANTE";
      else if(label.includes("VTA ADEL") && label.includes("IZQ")) cmd = "VUELTA_ADELANTE_IZQUIERDA";
      else if(label.includes("VTA ADEL") && label.includes("DER")) cmd = "VUELTA_ADELANTE_DERECHA";
      else if(label.includes("ATRÁS") || label.includes("ATRAS")) cmd = "ATRAS";
      else if(label.includes("VTA ATR") && label.includes("IZQ")) cmd = "VUELTA_ATRAS_IZQUIERDA";
      else if(label.includes("VTA ATR") && label.includes("DER")) cmd = "VUELTA_ATRAS_DERECHA";
      else if(label.includes("GIRO 90") && label.includes("IZQ")) cmd = "GIRO_90_IZQUIERDA";
      else if(label.includes("GIRO 90") && label.includes("DER")) cmd = "GIRO_90_DERECHA";
      else if(label.includes("GIRO 360") && label.includes("IZQ")) cmd = "GIRO_360_IZQUIERDA";
      else if(label.includes("GIRO 360") && label.includes("DER")) cmd = "GIRO_360_DERECHA";
      else if(label.includes("DETENER")) cmd = "DETENER";
    }

    const modelo = CMD_TO_MODEL[cmd];

    // Comandos de “mantener presionado”
    if (cmd && HOLD_CMDS.has(cmd)) {
      const start = (ev) => {
        ev.preventDefault();
        if(!modelo){
          setStatus("Error: comando no mapeado");
          return;
        }
        postMovimiento(modelo); // arranca movimiento
      };

      const stop = (ev) => {
        if(ev) ev.preventDefault();
        const stopModel = CMD_TO_MODEL["DETENER"];
        if(stopModel){
          postMovimiento(stopModel); // manda DETENER
        }
      };

      tile.addEventListener("pointerdown", start);
      tile.addEventListener("pointerup", stop);
      tile.addEventListener("pointerleave", stop);
      tile.addEventListener("pointercancel", stop);
    }
    else {
      // Giros y botón DETENER: un solo click
      tile.addEventListener("click", () => {
        if(!modelo){
          setStatus("Error: comando no mapeado");
          return;
        }
        postMovimiento(modelo);
      });
    }
  });
}

// WebSocket (solo indicador visual)
function initWS(){
  try{
    const ws = new WebSocket(WS);
    ws.onopen = () => { if (els.wsBadge) els.wsBadge.textContent = "WS: conectado"; };
    ws.onclose = () => { if (els.wsBadge) els.wsBadge.textContent = "WS: desconectado"; };
    ws.onerror = () => { if (els.wsBadge) els.wsBadge.textContent = "WS: error"; };
  }catch{/* ignore */}
}

bindTiles();
initWS();
setStatus("Listo");
