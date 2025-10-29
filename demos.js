// === CONFIG ===
const API = "http://3.225.81.202:5500/api";

const els = {
  apiUrl:      document.getElementById("apiUrl"),
  statusBadge: document.getElementById("statusBadge"),

  devId:   document.getElementById("devId"),
  seqName: document.getElementById("seqName"),
  seqDesc: document.getElementById("seqDesc"),
  btnCreate: document.getElementById("btnCreate"),

  movSel: document.getElementById("movSel"),
  durMs:  document.getElementById("durMs"),
  btnAdd: document.getElementById("btnAdd"),

  seqSel: document.getElementById("seqSel"),
  btnReload: document.getElementById("btnReload"),
  btnRun: document.getElementById("btnRun"),
};

function setStatusOk(t){ els.statusBadge.className="status ok"; els.statusBadge.textContent=t; }
function setStatusErr(t){ els.statusBadge.className="status err"; els.statusBadge.textContent=t; }
function setStatus(t){ els.statusBadge.className="status"; els.statusBadge.textContent=t; }

async function jpost(url, body){
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = {ok:false, error:text || res.statusText}; }
  if(!res.ok || data.ok === false){
    const msg = data?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data.data ?? data; // backend puede envolverte en {ok,data}
}

async function jget(url){
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = {ok:false, error:text || res.statusText}; }
  if(!res.ok || data.ok === false){
    const msg = data?.error || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data.data ?? data;
}

async function loadSequences(){
  try{
    const rows = await jget(`${API}/secuencias`);
    // Esperamos un array con {id_seq, nombre, ...}
    els.seqSel.innerHTML = rows.map(r => `<option value="${r.id_seq}">${r.nombre} (id ${r.id_seq})</option>`).join("");
    setStatusOk("Secuencias cargadas");
  }catch(e){
    setStatusErr(`Error al cargar: ${e.message}`);
  }
}

async function createSequence(){
  const nombre = els.seqName.value.trim();
  const descripcion = els.seqDesc.value.trim();
  if(!nombre){ setStatusErr("Pon un nombre a la secuencia"); return; }

  try{
    setStatus("Creando…");
    const out = await jpost(`${API}/secuencias`, {
      nombre, descripcion, autor: "rafa", es_evasion: false
    });
    // El backend devuelve {id_seq: N} o similar
    await loadSequences();
    // seleccionar la recien creada si viene el id
    const newId = out?.id_seq ?? null;
    if(newId){
      const opt = [...els.seqSel.options].find(o => Number(o.value) === Number(newId));
      if(opt) opt.selected = true;
      setStatusOk(`Secuencia creada (id ${newId})`);
    }else{
      setStatusOk("Secuencia creada");
    }
  }catch(e){
    setStatusErr(`Crear: ${e.message}`);
  }
}

async function addStep(){
  const id_seq = Number(els.seqSel.value);
  if(!id_seq){ setStatusErr("Selecciona una secuencia (usa Cargar)"); return; }

  const clave_modelo = Number(els.movSel.value);  // 1..11
  const dur_ms = Number(els.durMs.value || 0);

  // El backend de referencia acepta id_mov o clave_modelo. Enviamos ambos por compatibilidad.
  try{
    setStatus("Agregando paso…");
    await jpost(`${API}/secuencias/pasos`, {
      id_seq,
      id_mov: clave_modelo,        // si el server mapea 1..11 a id_mov
      clave_modelo,                // si el server espera la clave del modelo
      dur_ms
    });
    setStatusOk("Paso agregado");
  }catch(e){
    setStatusErr(`Agregar paso: ${e.message}`);
  }
}

async function runSequence(){
  const id_seq = Number(els.seqSel.value);
  const id_dispositivo = Number(els.devId.value || 1);
  if(!id_seq){ setStatusErr("Selecciona una secuencia"); return; }
  if(!id_dispositivo){ setStatusErr("ID de dispositivo inválido"); return; }

  try{
    setStatus("Iniciando…");
    // El backend de referencia usa {id_dispositivo, id_seq, modo_disparo}
    await jpost(`${API}/secuencias/iniciar`, {
      id_dispositivo,
      id_seq,
      modo_disparo: "AUTOMATICO"
    });
    setStatusOk("Ejecución iniciada");
  }catch(e){
    setStatusErr(`Iniciar: ${e.message}`);
  }
}

// Listeners
els.btnCreate.addEventListener("click", createSequence);
els.btnReload.addEventListener("click", loadSequences);
els.btnAdd.addEventListener("click", addStep);
els.btnRun.addEventListener("click", runSequence);

// Init
els.apiUrl.textContent = API;
loadSequences().catch(()=>{});
setStatus("Listo");
