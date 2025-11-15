// ================= EMISOR =================
const API = "http://3.225.81.202:5500/api";
const WS  = "ws://3.225.81.202:5500/ws";

// Elementos
const els = {
  deviceId:  document.getElementById("deviceId"),
  status:    document.getElementById("statusText"),
  wsBadge:   document.getElementById("wsBadge"),
  tiles:     document.querySelectorAll(".tile"),
  apiUrlEl:  document.getElementById("apiUrl")
};

// Mostrar host API en la insignia
if (els.apiUrlEl) els.apiUrlEl.textContent = API.replace(/\/api$/, "");

/*
  Mapa de comandos -> clave_modelo (alineado con tu firmware):
    1: ADELANTE
    2: ATRAS
    3: DETENER
    4: VUELTA_ADELANTE_DERECHA
    5: VUELTA_ADELANTE_IZQUIERDA
    6: VUELTA_ATRAS_DERECHA
    7: VUELTA_ATRAS_IZQUIERDA
    8: GIRO_90_DERECHA
    9: GIRO_90_IZQUIERDA
   10: GIRO_360_DERECHA
   11: GIRO_360_IZQUIERDA
*/
const CMD_TO_MODEL = {
  ADELANTE: 1,
  ATRAS: 2,
  DETENER: 3,

  VUELTA_ADELANTE_DERECHA: 4,
  VUELTA_ADELANTE_IZQUIERDA: 5,
  VUELTA_ATRAS_DERECHA: 6,
  VUELTA_ATRAS_IZQUIERDA: 7,

  GIRO_90_DERECHA: 8,
  GIRO_90_IZQUIERDA: 9,
  GIRO_360_DERECHA: 10,
  GIRO_360_IZQUIERDA: 11
};

// Util
function setStatus(t){ if (els.status) els.status.textContent = t; }

// Enviar movimiento
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
      const cmd = tile.getAttribute("data-cmd");
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
  }catch{/* ignore */}
}

bindTiles();
initWS();
setStatus("Listo");
