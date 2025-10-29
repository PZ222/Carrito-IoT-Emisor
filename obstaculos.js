// ================= OBSTÁCULOS =================
const API = "http://3.225.81.202:5500/api";

const els = {
  deviceId: document.getElementById("deviceId"),
  dist:     document.getElementById("dist"),
  lado:     document.getElementById("lado"),
  status:   document.getElementById("statusText"),
  tiles:    document.querySelectorAll(".tile"),
  apiUrlEl: document.getElementById("apiUrl")
};

if (els.apiUrlEl) els.apiUrlEl.textContent = API.replace(/\/api$/, "");

function setStatus(t){ if (els.status) els.status.textContent = t; }

async function postObstaculo(claveModelo){
  const id = Number(els.deviceId?.value || 1);
  const distancia = els.dist?.value ? Number(els.dist.value) : null;
  const lado = els.lado?.value || null;

  const payload = {
    id_dispositivo: id,
    clave_modelo: claveModelo,
    ...(distancia != null ? { distancia_cm: distancia } : {}),
    ...(lado ? { lado } : {})
  };

  setStatus("Enviando…");
  try{
    const res = await fetch(`${API}/obstaculos`, {
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
    setStatus("Obstáculo: OK");
  }catch(err){
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
}

function bindTiles(){
  els.tiles.forEach(tile => {
    tile.addEventListener("click", () => {
      const clave = Number(tile.getAttribute("data-clave"));
      if(!clave){ setStatus("Error: clave inválida"); return; }
      postObstaculo(clave);
    });
  });
}

bindTiles();
setStatus("Listo");
