(() => {
  "use strict";
  const DB_NAME = "carluchiclothes-db";
  const DB_VERSION = 1;
  const STORE = "records";
  const STATE_KEY = "appState";
  const categories = {tops:"Parte de arriba",bottoms:"Parte de abajo",shoes:"Zapatos",accessories:"Accesorios",other:"Otros"};
  const categoryOrder = ["tops","bottoms","shoes","accessories"];
  const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
  let db;
  let state = {items:[],looks:[],week:{},usage:{},selected:{},currentDay:"Lunes"};
  let activeOnlyFavorites = false;
  let pendingPhoto = null;
  let currentLook = {tops:null,bottoms:null,shoes:null,accessories:null};
  let toastTimer;

  const $ = id => document.getElementById(id);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const todayString = () => new Intl.DateTimeFormat("es-ES",{day:"numeric",month:"short"}).format(new Date());
  const imgUrl = item => item && item.photo ? item.photo : "";
  const itemById = id => state.items.find(i => i.id === id);
  const itemIdsForLook = look => (look && look.items || []).filter(Boolean);
  const notify = msg => {
    const t=$("toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2600);
  };
  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE);};
      req.onsuccess=()=>{db=req.result;resolve(db);};
      req.onerror=()=>reject(req.error);
    });
  }
  function readState(){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get(STATE_KEY);
      req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
    });
  }
  function persist(){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(state,STATE_KEY);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  async function commit(message){
    try { await persist(); renderAll(); if(message)notify(message); }
    catch(e){console.error(e);notify("No se pudo guardar. Exporta una copia y revisa el espacio disponible.");}
  }
  function go(page){
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
    document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page || (page==="week"&&n.dataset.page==="profile")));
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function showDialog(id){const d=$(id);if(d.showModal)d.showModal();else d.setAttribute("open","");}
  function closeDialog(id){const d=$(id);if(d.close)d.close();else d.removeAttribute("open");}
  function imageMarkup(item, cls=""){
    if(item?.photo)return `<img class="${cls}" src="${item.photo}" alt="${esc(item.name||"Prenda")}" loading="lazy">`;
    return `<span class="clothing-placeholder ${cls}">♡</span>`;
  }
  function renderHome(){
    $("itemCount").textContent=`${state.items.length} ${state.items.length===1?"prenda guardada":"prendas guardadas"}`;
    $("favCount").textContent=`${state.looks.length} ${state.looks.length===1?"look guardado":"looks guardados"}`;
  }
  function renderCloset(){
    const query=$("searchInput").value.trim().toLowerCase(),cat=$("categoryFilter").value,color=$("colorFilter").value;
    const list=state.items.filter(i=>(!query||(i.name+" "+i.notes+" "+(categories[i.category]||"")+" "+(i.color||"")).toLowerCase().includes(query))&&(cat==="all"||i.category===cat)&&(color==="all"||i.color===color)&&(!activeOnlyFavorites||i.favorite));
    $("closetGrid").innerHTML=list.map(i=>`<article class="clothing-card"><button class="card-heart" data-action="favorite-item" data-id="${i.id}" aria-label="Marcar favorito">${i.favorite?"♥":"♡"}</button><div class="clothing-photo" data-action="details" data-id="${i.id}">${imageMarkup(i)}</div><div class="card-info"><b>${esc(i.name)}</b><small>${esc(categories[i.category]||"Otros")}${i.color?" · "+esc(i.color):""}</small><div class="card-buttons"><button class="mini-btn" data-action="use" data-id="${i.id}">Usar</button><button class="mini-btn" data-action="details" data-id="${i.id}">Detalles</button></div></div></article>`).join("");
    $("closetEmpty").classList.toggle("visible",list.length===0);
    if(list.length===0){$("closetEmpty").querySelector("h3").textContent=state.items.length?"No encontramos prendas":"Tu armario empieza aquí";$("closetEmpty").querySelector("p").textContent=state.items.length?"Prueba otro nombre o cambia los filtros.":"Añade tu primera prenda y empieza a crear looks.";}
  }
  function renderTryon(){
    $("outfitDate").textContent=todayString().toUpperCase();
    const slots=[{key:"tops",label:"Parte de arriba"},{key:"bottoms",label:"Parte de abajo"},{key:"shoes",label:"Zapatos"},{key:"accessories",label:"Accesorios"}];
    $("outfitSlots").innerHTML=slots.map(s=>{
      const item=itemById(currentLook[s.key]);const pool=state.items.filter(i=>i.category===s.key);
      if(s.key==="accessories"&&!pool.length&&!item)return "";
      const idx=pool.findIndex(i=>i.id===currentLook[s.key]);
      return `<div class="outfit-slot"><div class="slot-image">${item?imageMarkup(item):`<span>${s.key==="tops"?"♧":s.key==="bottoms"?"♢":s.key==="shoes"?"⌁":"♡"}</span>`}</div><div class="slot-copy"><b>${item?esc(item.name):s.label}</b><small>${item?esc(categories[item.category])+(item.color?" · "+esc(item.color):""):"Elige una prenda de tu armario"}</small></div><div class="slot-change"><button data-action="cycle" data-key="${s.key}" data-dir="-1" aria-label="Prenda anterior" ${pool.length<2?"disabled":""}>‹</button><button data-action="cycle" data-key="${s.key}" data-dir="1" aria-label="Siguiente prenda" ${pool.length<2?"disabled":""}>›</button></div></div>`;
    }).join("");
    if(!state.items.some(i=>categoryOrder.includes(i.category)))$("outfitSlots").innerHTML+=`<div class="empty-inline">Añade prendas al armario para empezar a combinarlas.</div>`;
  }
  function renderLooks(){
    const looks=state.looks.filter(l=>l.favorite);
    $("favoritesList").innerHTML=looks.map(l=>lookCard(l)).join("");
    $("favoritesEmpty").classList.toggle("visible",looks.length===0);
  }
  function lookCard(look){
    const items=itemIdsForLook(look).map(itemById).filter(Boolean);
    return `<article class="look-card"><div class="look-head"><div><b>${esc(look.name||"Mi outfit")}</b><br><small>${esc(look.date||"Look guardado")}</small></div><button class="card-heart" style="position:static" data-action="toggle-look-fav" data-id="${look.id}" aria-label="Quitar favorito">♥</button></div><div class="look-thumbs">${items.length?items.map(i=>`<div class="look-thumb">${imageMarkup(i)}</div>`).join(""):`<div class="empty-inline">Las prendas de este look ya no están disponibles.</div>`}</div><div class="look-actions"><button class="mini-btn" data-action="load-look" data-id="${look.id}">Volver a usar</button><button class="mini-btn" data-action="delete-look" data-id="${look.id}">Eliminar</button></div></article>`;
  }
  function renderWeek(){
    $("weekList").innerHTML=days.map(day=>{
      const entry=state.week[day],look=entry&&entry.look;
      const items=look?itemIdsForLook(look).map(itemById).filter(Boolean):[];
      return `<article class="week-card"><div class="day-tag"><b>${day.slice(0,3)}</b><small>${entry?"Planificado":"Sin look"}</small></div><div class="week-copy"><b>${esc(entry?.name||"¿Qué te pondrás?")}</b><p>${items.length?items.map(i=>i.name).map(esc).join(" · "):"Organiza tu outfit para este día"}</p></div><button data-action="edit-day" data-day="${day}" aria-label="Editar ${day}">${entry?"✎":"＋"}</button></article>`;
    }).join("");
  }
  function renderStats(){
    $("statItems").textContent=state.items.length;
    $("statLooks").textContent=state.looks.length;
    $("statFavorites").textContent=state.looks.filter(l=>l.favorite).length;
    const popular=[...state.items].sort((a,b)=>(state.usage[b.id]||0)-(state.usage[a.id]||0)).slice(0,5);
    $("popularItems").innerHTML=popular.length?popular.map(i=>`<div class="popular-row"><div class="popular-img">${imageMarkup(i)}</div><div style="flex:1"><b>${esc(i.name)}</b><small>${esc(categories[i.category]||"Otros")}</small></div><small>${state.usage[i.id]||0} usos</small><button class="mini-btn" data-action="used" data-id="${i.id}">+1 uso</button></div>`).join(""):`<div class="empty-inline">Añade prendas para ver tus estadísticas.</div>`;
  }
  function renderAll(){renderHome();renderCloset();renderTryon();renderLooks();renderWeek();renderStats();}
  async function compressImage(file){
    if(!file.type.startsWith("image/"))throw new Error("El archivo no es una imagen.");
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});
    try{
      const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=reject;el.src=data;});
      const max=1100,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
      const ctx=canvas.getContext("2d");ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      return canvas.toDataURL("image/jpeg",.82);
    }catch(e){return data;}
  }
  function resetItemForm(){
    $("itemForm").reset();$("itemId").value="";pendingPhoto=null;$("photoPreview").hidden=true;$("photoPreview").removeAttribute("src");$("photoPreviewIcon").hidden=false;$("photoLabel").textContent="Añadir foto";$("itemDialogTitle").textContent="Nueva prenda";
  }
  function editItem(item){
    resetItemForm();$("itemDialogTitle").textContent="Editar prenda";$("itemId").value=item.id;$("itemName").value=item.name;$("itemCategory").value=item.category;$("itemColor").value=item.color||"";$("itemNotes").value=item.notes||"";
    pendingPhoto=item.photo||null;
    if(pendingPhoto){$("photoPreview").src=pendingPhoto;$("photoPreview").hidden=false;$("photoPreviewIcon").hidden=true;$("photoLabel").textContent="Cambiar foto";}
    showDialog("itemDialog");
  }
  function openItemDetails(item){
    const d=$("detailContent");
    d.innerHTML=`<div class="modal-head"><div><p class="eyebrow">DETALLES DE LA PRENDA</p><h2>${esc(item.name)}</h2></div><button class="close-btn" data-close="detailDialog" aria-label="Cerrar">×</button></div>${item.photo?`<img class="detail-photo" src="${item.photo}" alt="${esc(item.name)}">`:`<div class="detail-photo" style="height:160px;display:grid;place-items:center;font-size:45px;color:#d1a2b1">♡</div>`}<p class="detail-meta">${esc(categories[item.category]||"Otros")}${item.color?" · "+esc(item.color):""}<br>${esc(item.notes||"Sin notas añadidas")}<br>Usos registrados: ${state.usage[item.id]||0}</p><div class="detail-buttons"><button class="primary-btn" data-action="use" data-id="${item.id}">Usar en probador</button><button class="secondary-btn" data-action="edit-item" data-id="${item.id}">Editar</button><button class="secondary-btn" data-action="used" data-id="${item.id}">＋ Registrar uso</button><button class="text-btn" data-action="delete-item" data-id="${item.id}">Eliminar prenda</button></div>`;
    showDialog("detailDialog");
  }
  function addItemToLook(item){
    if(item.category==="other"){notify("Esta categoría no tiene una ranura propia en el probador.");return;}
    currentLook[item.category]=item.id;
    state.usage[item.id]=(state.usage[item.id]||0)+1;
    go("tryon");renderTryon();persist().catch(console.error);notify("Prenda añadida al probador");
  }
  function cycleSlot(key,dir){
    const pool=state.items.filter(i=>i.category===key);if(!pool.length)return;
    let idx=pool.findIndex(i=>i.id===currentLook[key]);
    idx=idx<0?(dir>0?0:pool.length-1):(idx+dir+pool.length)%pool.length;
    currentLook[key]=pool[idx].id;renderTryon();
  }
  function buildLook(name){
    return {id:uid(),name:name||"Mi outfit",date:new Date().toLocaleDateString("es-ES"),items:categoryOrder.map(k=>currentLook[k]).filter(Boolean),favorite:false,createdAt:Date.now()};
  }
  async function saveLook(favorite=true){
    const look=buildLook("Mi outfit");
    if(!look.items.length){notify("Añade al menos una prenda antes de guardar.");return;}
    look.favorite=favorite;
    state.looks.unshift(look);await commit(favorite?"Look guardado en favoritos ♡":"Look guardado");
  }
  function randomize(){
    const categoriesPresent=categoryOrder.filter(k=>state.items.some(i=>i.category===k));
    if(!categoriesPresent.length){notify("Primero añade prendas a tu armario.");return;}
    categoryOrder.forEach(k=>{const pool=state.items.filter(i=>i.category===k);currentLook[k]=pool.length?pool[Math.floor(Math.random()*pool.length)].id:null;});
    renderTryon();notify("¡Nuevo outfit preparado!");
  }
  function openDayDialog(day){
    state.currentDay=day||days[(new Date().getDay()+6)%7];
    $("daySelect").value=state.currentDay;$("dayLookName").value=state.week[state.currentDay]?.name||"";
    showDialog("dayDialog");
  }
  async function saveDay(){
    const day=$("daySelect").value,name=$("dayLookName").value.trim()||"Mi outfit";
    const look=buildLook(name);
    if(!look.items.length){notify("Añade al menos una prenda al probador antes de asignar el día.");return;}
    state.week[day]={name,look,date:new Date().toISOString()};
    await commit(`Look guardado para ${day}`);
    closeDialog("dayDialog");
  }
  function downloadBlob(blob,filename){
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  async function exportBackup(){
    try{
      const payload={app:"carluchiclothes",version:1,exportedAt:new Date().toISOString(),state};
      const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
      downloadBlob(blob,`carluchiclothes-backup-${new Date().toISOString().slice(0,10)}.json`);
      notify("Copia preparada. Guárdala en un lugar seguro.");
    }catch(e){console.error(e);notify("No se pudo crear la copia de seguridad.");}
  }
  async function importBackup(file){
    if(!file)return;
    try{
      const text=await file.text(),payload=JSON.parse(text);
      if(payload.app!=="carluchiclothes"||!payload.state||!Array.isArray(payload.state.items)||!Array.isArray(payload.state.looks))throw new Error("Formato no reconocido");
      const yes=confirm("La restauración reemplazará el armario y los looks actuales de este dispositivo. Exporta primero una copia de lo que tienes ahora. ¿Continuar?");
      if(!yes)return;
      const s=payload.state;
      state={items:s.items,looks:s.looks,week:s.week||{},usage:s.usage||{},selected:s.selected||{},currentDay:s.currentDay||"Lunes"};
      currentLook={tops:null,bottoms:null,shoes:null,accessories:null};
      await commit("Copia restaurada correctamente.");
    }catch(e){console.error(e);notify("No se pudo restaurar. Comprueba que sea una copia válida de carluchiclothes.");}
    finally{$("backupFile").value="";}
  }
  document.addEventListener("click",async e=>{
    const nav=e.target.closest("[data-page]");if(nav){go(nav.dataset.page);return;}
    const goBtn=e.target.closest("[data-go]");if(goBtn){go(goBtn.dataset.go);return;}
    const close=e.target.closest("[data-close]");if(close){closeDialog(close.dataset.close);return;}
    const act=e.target.closest("[data-action]");if(!act)return;
    const {action,id,key,dir,day}=act.dataset;const item=itemById(id);
    try{
      if(action==="favorite-item"&&item){item.favorite=!item.favorite;await commit(item.favorite?"Prenda marcada como favorita":"Prenda quitada de favoritas");}
      if(action==="details"&&item)openItemDetails(item);
      if(action==="edit-item"&&item){closeDialog("detailDialog");editItem(item);}
      if(action==="use"&&item){closeDialog("detailDialog");addItemToLook(item);}
      if(action==="cycle")cycleSlot(key,Number(dir));
      if(action==="toggle-look-fav"){const l=state.looks.find(x=>x.id===id);if(l){l.favorite=!l.favorite;await commit(l.favorite?"Look añadido a favoritos":"Look quitado de favoritos");}}
      if(action==="delete-look"&&confirm("¿Eliminar este look guardado?")){state.looks=state.looks.filter(x=>x.id!==id);await commit("Look eliminado");}
      if(action==="load-look"){const l=state.looks.find(x=>x.id===id);if(l){currentLook={tops:null,bottoms:null,shoes:null,accessories:null};itemIdsForLook(l).map(itemById).filter(Boolean).forEach(i=>{if(currentLook[i.category]!==undefined)currentLook[i.category]=i.id;});go("tryon");renderTryon();}}
      if(action==="edit-day")openDayDialog(day);
      if(action==="used"&&item){state.usage[item.id]=(state.usage[item.id]||0)+1;await commit("Uso registrado");if($("detailDialog").open)openItemDetails(item);}
      if(action==="delete-item"&&item&&confirm(`¿Eliminar "${item.name}" del armario? Esta acción no se puede deshacer si no tienes una copia de seguridad.`)){state.items=state.items.filter(i=>i.id!==id);Object.keys(currentLook).forEach(k=>{if(currentLook[k]===id)currentLook[k]=null;});await commit("Prenda eliminada");closeDialog("detailDialog");}
    }catch(err){console.error(err);notify("Ha ocurrido un problema al guardar.");}
  });
  $("addTop").addEventListener("click",()=>{resetItemForm();showDialog("itemDialog");});
  $("addCloset").addEventListener("click",()=>{resetItemForm();showDialog("itemDialog");});
  $("emptyAdd").addEventListener("click",()=>{resetItemForm();showDialog("itemDialog");});
  $("itemPhoto").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>20*1024*1024){notify("La foto pesa demasiado. Elige una imagen de menos de 20 MB.");e.target.value="";return;}
    try{pendingPhoto=await compressImage(file);$("photoPreview").src=pendingPhoto;$("photoPreview").hidden=false;$("photoPreviewIcon").hidden=true;$("photoLabel").textContent="Foto seleccionada";}
    catch(err){console.error(err);notify("No se ha podido leer la foto.");}
  });
  $("itemForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const id=$("itemId").value||uid(),old=itemById(id);
    const item={id,name:$("itemName").value.trim(),category:$("itemCategory").value,color:$("itemColor").value,notes:$("itemNotes").value.trim(),photo:pendingPhoto||null,favorite:old?.favorite||false,createdAt:old?.createdAt||Date.now()};
    if(!item.name){notify("Escribe un nombre para la prenda.");return;}
    state.items=old?state.items.map(i=>i.id===id?item:i):[item,...state.items];
    await commit(old?"Prenda actualizada":"Prenda guardada en tu armario");
    closeDialog("itemDialog");resetItemForm();
  });
  $("itemDialog").addEventListener("click",e=>{if(e.target===$("itemDialog"))closeDialog("itemDialog");});
  $("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))closeDialog("detailDialog");});
  $("dayDialog").addEventListener("click",e=>{if(e.target===$("dayDialog"))closeDialog("dayDialog");});
  $("dayForm").addEventListener("submit",e=>{e.preventDefault();saveDay();});
  $("searchInput").addEventListener("input",renderCloset);
  $("categoryFilter").addEventListener("change",renderCloset);
  $("colorFilter").addEventListener("change",renderCloset);
  $("onlyFavorites").addEventListener("click",()=>{activeOnlyFavorites=!activeOnlyFavorites;$("onlyFavorites").classList.toggle("selected",activeOnlyFavorites);renderCloset();});
  $("randomLook").addEventListener("click",randomize);
  $("clearLook").addEventListener("click",()=>{currentLook={tops:null,bottoms:null,shoes:null,accessories:null};renderTryon();notify("Probador limpio");});
  $("saveLook").addEventListener("click",()=>saveLook(true));
  $("saveToDay").addEventListener("click",()=>openDayDialog());
  $("exportBackup").addEventListener("click",exportBackup);
  $("importBackup").addEventListener("click",()=>$("backupFile").click());
  $("backupFile").addEventListener("change",e=>importBackup(e.target.files?.[0]));
  $("nav")?.addEventListener("click",()=>{});
  async function init(){
    try{
      await openDB();
      const saved=await readState();
      if(saved&&Array.isArray(saved.items))state={items:saved.items,looks:saved.looks||[],week:saved.week||{},usage:saved.usage||{},selected:saved.selected||{},currentDay:saved.currentDay||"Lunes"};
      renderAll();
      if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(e=>console.warn("No se pudo registrar el service worker",e));
    }catch(e){
      console.error(e);
      document.body.insertAdjacentHTML("afterbegin",'<div style="padding:12px;background:#fff0f0;color:#8c334b;text-align:center;font-size:12px">El almacenamiento local no está disponible en este navegador. Prueba desde una página HTTPS como GitHub Pages.</div>');
    }
  }
  init();
})();