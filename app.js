const STORAGE_KEY = "vidrieria-registro-v2";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ventas: [], compras: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      ventas: Array.isArray(parsed.ventas) ? parsed.ventas : [],
      compras: Array.isArray(parsed.compras) ? parsed.compras : [],
    };
  } catch {
    return { ventas: [], compras: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatMoney(n) {
  return "$" + n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const state = loadState();

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ---------- Items dinámicos (productos por transacción) ----------
function createItemRow() {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <input type="text" data-field="descripcion" placeholder="Descripción del producto" required>
    <input type="number" data-field="cantidad" min="0.01" step="0.01" value="1" required>
    <input type="number" data-field="precio" min="0" step="0.01" placeholder="Precio" required>
    <span class="item-subtotal">$0.00</span>
    <button type="button" class="btn-quitar-item" aria-label="Quitar producto">✕</button>
  `;
  const cantidadInput = row.querySelector('[data-field="cantidad"]');
  const precioInput = row.querySelector('[data-field="precio"]');
  const subtotalEl = row.querySelector(".item-subtotal");
  const updateSubtotal = () => {
    const c = parseFloat(cantidadInput.value) || 0;
    const p = parseFloat(precioInput.value) || 0;
    subtotalEl.textContent = formatMoney(c * p);
  };
  cantidadInput.addEventListener("input", updateSubtotal);
  precioInput.addEventListener("input", updateSubtotal);
  row.querySelector(".btn-quitar-item").addEventListener("click", () => {
    const list = row.parentElement;
    if (list.children.length > 1) row.remove();
  });
  updateSubtotal();
  return row;
}

function setupItemsList(form) {
  const list = form.querySelector("[data-items]");
  list.appendChild(createItemRow());
  form.querySelector(".btn-agregar-item").addEventListener("click", () => {
    list.appendChild(createItemRow());
  });
}

function readItems(form) {
  const list = form.querySelector("[data-items]");
  return [...list.querySelectorAll(".item-row")].map((row) => {
    const descripcion = row.querySelector('[data-field="descripcion"]').value.trim();
    const cantidad = parseFloat(row.querySelector('[data-field="cantidad"]').value);
    const precio = parseFloat(row.querySelector('[data-field="precio"]').value);
    return { descripcion, cantidad, precio, total: cantidad * precio };
  });
}

function resetItemsList(form) {
  const list = form.querySelector("[data-items]");
  list.innerHTML = "";
  list.appendChild(createItemRow());
}

function itemsSummaryHtml(items) {
  return items
    .map((it) => `${escapeHtml(it.descripcion)} (${it.cantidad} × ${formatMoney(it.precio)})`)
    .join(", ");
}

// ---------- Ventas ----------
const formVentas = document.getElementById("form-ventas");
const tablaVentasBody = document.getElementById("tabla-ventas-body");
const ventasEmpty = document.getElementById("ventas-empty");
setupItemsList(formVentas);

formVentas.addEventListener("submit", (e) => {
  e.preventDefault();
  const items = readItems(formVentas);
  const total = items.reduce((sum, it) => sum + it.total, 0);
  state.ventas.push({
    id: makeId(),
    fecha: formVentas.fecha.value,
    cliente: formVentas.cliente.value.trim(),
    items,
    total,
  });
  saveState();
  renderVentas();
  renderResumen();
  renderClientes();
  formVentas.reset();
  formVentas.fecha.valueAsDate = new Date();
  resetItemsList(formVentas);
});

function renderVentas() {
  tablaVentasBody.innerHTML = "";
  ventasEmpty.style.display = state.ventas.length ? "none" : "block";
  state.ventas
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .forEach((v) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.fecha}</td>
        <td>${escapeHtml(v.cliente)}</td>
        <td>${itemsSummaryHtml(v.items)}</td>
        <td>${formatMoney(v.total)}</td>
        <td><button class="btn-eliminar" data-id="${v.id}">Eliminar</button></td>
      `;
      tr.querySelector(".btn-eliminar").addEventListener("click", () => {
        state.ventas = state.ventas.filter((x) => x.id !== v.id);
        saveState();
        renderVentas();
        renderResumen();
        renderClientes();
      });
      tablaVentasBody.appendChild(tr);
    });
}

document.getElementById("export-ventas").addEventListener("click", () => {
  exportCSV(state.ventas, "cliente", "ventas.csv");
});

// ---------- Compras ----------
const formCompras = document.getElementById("form-compras");
const tablaComprasBody = document.getElementById("tabla-compras-body");
const comprasEmpty = document.getElementById("compras-empty");
setupItemsList(formCompras);

formCompras.addEventListener("submit", (e) => {
  e.preventDefault();
  const items = readItems(formCompras);
  const total = items.reduce((sum, it) => sum + it.total, 0);
  state.compras.push({
    id: makeId(),
    fecha: formCompras.fecha.value,
    proveedor: formCompras.proveedor.value.trim(),
    items,
    total,
  });
  saveState();
  renderCompras();
  renderResumen();
  formCompras.reset();
  formCompras.fecha.valueAsDate = new Date();
  resetItemsList(formCompras);
});

function renderCompras() {
  tablaComprasBody.innerHTML = "";
  comprasEmpty.style.display = state.compras.length ? "none" : "block";
  state.compras
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.fecha}</td>
        <td>${escapeHtml(c.proveedor)}</td>
        <td>${itemsSummaryHtml(c.items)}</td>
        <td>${formatMoney(c.total)}</td>
        <td><button class="btn-eliminar" data-id="${c.id}">Eliminar</button></td>
      `;
      tr.querySelector(".btn-eliminar").addEventListener("click", () => {
        state.compras = state.compras.filter((x) => x.id !== c.id);
        saveState();
        renderCompras();
        renderResumen();
      });
      tablaComprasBody.appendChild(tr);
    });
}

document.getElementById("export-compras").addEventListener("click", () => {
  exportCSV(state.compras, "proveedor", "compras.csv");
});

// ---------- Clientes ----------
const tablaClientesBody = document.getElementById("tabla-clientes-body");
const clientesEmpty = document.getElementById("clientes-empty");
const clientesDatalist = document.getElementById("clientes-list");

function getClientes() {
  const map = new Map();
  state.ventas.forEach((v) => {
    const key = normalizeName(v.cliente);
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { nombre: v.cliente, compras: 0, total: 0, ultima: v.fecha });
    }
    const c = map.get(key);
    c.compras += 1;
    c.total += v.total;
    if (v.fecha > c.ultima) c.ultima = v.fecha;
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function renderClientes() {
  const clientes = getClientes();

  clientesDatalist.innerHTML = clientes
    .map((c) => `<option value="${escapeHtml(c.nombre)}"></option>`)
    .join("");

  tablaClientesBody.innerHTML = "";
  clientesEmpty.style.display = clientes.length ? "none" : "block";
  clientes.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.nombre)}</td>
      <td>${c.compras}</td>
      <td>${formatMoney(c.total)}</td>
      <td>${c.ultima}</td>
    `;
    tablaClientesBody.appendChild(tr);
  });
}

// ---------- Cotizador ----------
// Fórmulas replicadas del tarifario Excel de la vidriería (hojas Costos, Tarifario, PVC y Calculadora).
const COT_CONFIG_KEY = "vidrieria-cotizador-config-v1";
const COT_KEY = "vidrieria-cotizaciones-v1";

function defaultCotConfig() {
  return {
    negocio: { nombre: "Vidriería", nit: "" },
    vidrios: [
      { id: "float4", nombre: "Vidrio float 4 mm", precioM2: 182.4 },
      { id: "float5", nombre: "Vidrio float 5 mm", precioM2: 181.08 },
      { id: "float6", nombre: "Vidrio float 6 mm", precioM2: 198.63 },
      { id: "floatBronce6", nombre: "Vidrio float bronce 6 mm", precioM2: 56.0 },
      { id: "templado6", nombre: "Vidrio templado 6 mm", precioM2: 477.89 },
      { id: "templado8", nombre: "Vidrio templado 8 mm", precioM2: 929.43 },
      { id: "templado10", nombre: "Vidrio templado 10 mm", precioM2: 1222.83 },
      { id: "dvh446", nombre: "Doble vidriado 4/6/4 (DVH)", precioM2: 354.0 },
    ],
    pvcCatalogo: [
      { id: "s60practicable", nombre: "Ventana PVC S60 practicable 80×40 cm", precio: 742.5 },
      { id: "s80proyectable", nombre: "Ventana PVC S80 proyectable 100×100 cm", precio: 792.5 },
      { id: "puertaCorredizaFija", nombre: "Puerta PVC corrediza 200×210 cm (medida fija)", precio: 2250.0 },
    ],
    reglas: {
      areaMinima: 0.5,
      minimoVisita: 50,
      kmIncluidos: 8,
      costoKm: 10,
      recargoAlturaPct: 20,
      perforacionExtra: 50,
      anticipoDefaultPct: 50,
    },
    pvcParams: {
      precioMarco: 15.4552,
      precioHojaVentana: 10.9672,
      precioMosquitero: 7.3966,
      precioBatiente: 3.4966,
      precioTraslape: 3.5672,
      precioHojaPuerta: 15.6121,
      precioRiel: 0,
      precioRodoCorredera: 2.0495,
      precioRodoMosquitero: 0.786,
      precioCierreGancho: 9.4667,
      precioTopeGancho: 1.94,
      precioMasilla: 17.22,
      precioRodoPuerta: 0,
      precioMallaCedazoM2: 0,
      precioVidrioM2: 90.5603,
      marcoSuma: 5,
      hojaAltoResta: 70,
      hojaPegueResta: 5,
      hojaAnchoSuma: 5,
      tapaJambaPiezasPorHoja: 1,
      rielResta: 45,
      mosquiteroResta: 0,
      batienteResta: 0,
      desperdicioCorte: 0.08,
      horasFabricacionBase: 1.5,
      horasExtraPorHoja: 0.75,
      horasInstalacionBase: 1.5,
      horasExtraPorM2: 0.5,
      tarifaHoraCliente: 80,
      costoHoraReal: 45,
      horasExtraPuerta: 1,
      multiplicadorMaterial: 1,
      cargoFijoTrabajo: 0,
      pisoM2: 650,
      pisoTrabajo: 450,
    },
  };
}

function loadCotConfig() {
  const raw = localStorage.getItem(COT_CONFIG_KEY);
  const def = defaultCotConfig();
  if (!raw) return def;
  try {
    const parsed = JSON.parse(raw);
    return {
      negocio: { ...def.negocio, ...parsed.negocio },
      vidrios: Array.isArray(parsed.vidrios) && parsed.vidrios.length ? parsed.vidrios : def.vidrios,
      pvcCatalogo: Array.isArray(parsed.pvcCatalogo) && parsed.pvcCatalogo.length ? parsed.pvcCatalogo : def.pvcCatalogo,
      reglas: { ...def.reglas, ...parsed.reglas },
      pvcParams: { ...def.pvcParams, ...parsed.pvcParams },
    };
  } catch {
    return def;
  }
}

function saveCotConfig() {
  localStorage.setItem(COT_CONFIG_KEY, JSON.stringify(cotConfig));
}

function loadCotizaciones() {
  const raw = localStorage.getItem(COT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCotizaciones() {
  localStorage.setItem(COT_KEY, JSON.stringify(cotizaciones));
}

let cotConfig = loadCotConfig();
let cotizaciones = loadCotizaciones();
let cotLineas = [];

function ceilTo5(x) {
  return Math.ceil(x / 5) * 5;
}

function calcularLineaVidrio(input, config) {
  const producto = config.vidrios.find((p) => p.id === input.productoId);
  const anchoR = ceilTo5(input.anchoCm);
  const altoR = ceilTo5(input.altoCm);
  const m2 = (anchoR / 100) * (altoR / 100);
  const m2Cobrable = Math.max(m2, config.reglas.areaMinima);
  let precioUnitario = m2Cobrable * producto.precioM2;
  if (input.altura) precioUnitario *= 1 + config.reglas.recargoAlturaPct / 100;
  if (input.perforacion) precioUnitario += config.reglas.perforacionExtra;
  return {
    nombre: producto.nombre,
    medidaTexto: `${anchoR}×${altoR} cm`,
    precioUnitario,
    subtotal: precioUnitario * input.cantidad,
    avisoIncompleto: false,
  };
}

function calcularLineaPvcCatalogo(input, config) {
  const producto = config.pvcCatalogo.find((p) => p.id === input.productoId);
  let precioUnitario = producto.precio;
  if (input.altura) precioUnitario *= 1 + config.reglas.recargoAlturaPct / 100;
  if (input.perforacion) precioUnitario += config.reglas.perforacionExtra;
  return {
    nombre: producto.nombre,
    medidaTexto: "—",
    precioUnitario,
    subtotal: precioUnitario * input.cantidad,
    avisoIncompleto: false,
  };
}

function calcularLineaPvcMedida(input, config) {
  const p = config.pvcParams;
  const esPuerta = input.productoId === "puerta";
  const nombre = esPuerta
    ? "Puerta PVC S60 corrediza (por medida)"
    : "Ventana PVC S60 corrediza (por medida)";
  const anchoR = ceilTo5(input.anchoCm);
  const altoR = ceilTo5(input.altoCm);
  const m2 = (anchoR / 100) * (altoR / 100);
  const hojas = Math.max(input.hojas || 2, 1);
  const parHojas = Math.ceil(hojas / 2);
  const Emm = anchoR * 10;
  const Fmm = altoR * 10;

  let perfil;
  if (esPuerta) {
    perfil =
      ((2 * (Emm + p.marcoSuma) + 2 * (Fmm + p.marcoSuma)) / 1000) * p.precioMarco +
      ((2 * hojas * (Emm / hojas + p.hojaAnchoSuma) + 2 * hojas * (Fmm - p.hojaAltoResta - p.hojaPegueResta)) / 1000) * p.precioHojaPuerta +
      ((2 * hojas * (Emm / hojas - p.batienteResta) + 2 * hojas * (Fmm - p.batienteResta)) / 1000) * p.precioBatiente +
      ((p.tapaJambaPiezasPorHoja * hojas * (Fmm - p.hojaAltoResta - p.hojaPegueResta)) / 1000) * p.precioTraslape +
      ((2 * (Emm - 2 * p.rielResta)) / 1000) * p.precioRiel;
  } else {
    perfil =
      ((2 * (Emm + p.marcoSuma) + 2 * (Fmm + p.marcoSuma)) / 1000) * p.precioMarco +
      ((2 * hojas * (Emm / hojas + p.hojaAnchoSuma) + 2 * hojas * (Fmm - p.hojaAltoResta - p.hojaPegueResta)) / 1000) * p.precioHojaVentana +
      ((2 * parHojas * (Emm / hojas - p.mosquiteroResta) + 2 * parHojas * (Fmm - p.mosquiteroResta)) / 1000) * p.precioMosquitero +
      ((2 * hojas * (Emm / hojas - p.batienteResta) + 2 * hojas * (Fmm - p.batienteResta)) / 1000) * p.precioBatiente +
      ((p.tapaJambaPiezasPorHoja * hojas * (Fmm - p.hojaAltoResta - p.hojaPegueResta)) / 1000) * p.precioTraslape;
  }

  const herrajes = esPuerta
    ? 4 * hojas * p.precioRodoPuerta + (hojas - 1) * p.precioCierreGancho + (hojas - 1) * p.precioTopeGancho + parHojas * p.precioMasilla
    : 4 * hojas * p.precioRodoCorredera + 4 * parHojas * p.precioRodoMosquitero + (hojas - 1) * p.precioCierreGancho + (hojas - 1) * p.precioTopeGancho + parHojas * p.precioMasilla;

  const vidrioCosto = m2 * p.precioVidrioM2;
  const materiales = perfil + herrajes + vidrioCosto + (esPuerta ? 0 : (m2 / 2) * p.precioMallaCedazoM2);
  const horas =
    p.horasFabricacionBase +
    Math.max(0, hojas - 2) * p.horasExtraPorHoja +
    p.horasInstalacionBase +
    Math.max(0, m2 - 1) * p.horasExtraPorM2 +
    (esPuerta ? p.horasExtraPuerta : 0);
  const materialesConDesperdicio = materiales * (1 + p.desperdicioCorte);
  const precioCalculado = materialesConDesperdicio * p.multiplicadorMaterial + horas * p.tarifaHoraCliente + p.cargoFijoTrabajo;
  const piso1 = m2 * p.pisoM2;
  const piso2 = p.pisoTrabajo;
  let precioUnitario = Math.max(precioCalculado, piso1, piso2);

  let regla = "cálculo normal";
  if (precioUnitario === piso2) regla = "mínimo por trabajo";
  else if (Math.round(precioUnitario * 100) === Math.round(piso1 * 100)) regla = "piso por m²";

  if (input.altura) precioUnitario *= 1 + config.reglas.recargoAlturaPct / 100;
  if (input.perforacion) precioUnitario += config.reglas.perforacionExtra;

  const avisoIncompleto = esPuerta && (p.precioHojaPuerta === 0 || p.precioRiel === 0 || p.precioRodoPuerta === 0);

  return {
    nombre,
    medidaTexto: `${anchoR}×${altoR} cm · ${hojas} hojas (${regla})`,
    precioUnitario,
    subtotal: precioUnitario * input.cantidad,
    avisoIncompleto,
  };
}

function calcularLinea(input, config) {
  if (input.categoria === "vidrio") return calcularLineaVidrio(input, config);
  if (input.categoria === "pvc_catalogo") return calcularLineaPvcCatalogo(input, config);
  return calcularLineaPvcMedida(input, config);
}

function cotRefreshProductoOptions() {
  const categoria = document.getElementById("cot-categoria").value;
  const sel = document.getElementById("cot-producto");
  let opciones = [];
  if (categoria === "vidrio") {
    opciones = cotConfig.vidrios.map((p) => ({ id: p.id, nombre: p.nombre }));
  } else if (categoria === "pvc_catalogo") {
    opciones = cotConfig.pvcCatalogo.map((p) => ({ id: p.id, nombre: p.nombre }));
  } else {
    opciones = [
      { id: "ventana", nombre: "Ventana PVC S60 corrediza (por medida)" },
      { id: "puerta", nombre: "Puerta PVC S60 corrediza (por medida)" },
    ];
  }
  sel.innerHTML = opciones.map((o) => `<option value="${o.id}">${escapeHtml(o.nombre)}</option>`).join("");
  cotActualizarCamposVisibles();
  cotActualizarAviso();
}

function cotActualizarCamposVisibles() {
  const categoria = document.getElementById("cot-categoria").value;
  const showMedida = categoria === "vidrio" || categoria === "pvc_medida";
  const showHojas = categoria === "pvc_medida";
  document.getElementById("cot-campo-ancho").style.display = showMedida ? "" : "none";
  document.getElementById("cot-campo-alto").style.display = showMedida ? "" : "none";
  document.getElementById("cot-campo-hojas").style.display = showHojas ? "" : "none";
}

function cotActualizarAviso() {
  const categoria = document.getElementById("cot-categoria").value;
  const producto = document.getElementById("cot-producto").value;
  const aviso = document.getElementById("cot-aviso-puerta");
  const p = cotConfig.pvcParams;
  const incompleto = categoria === "pvc_medida" && producto === "puerta" && (p.precioHojaPuerta === 0 || p.precioRiel === 0 || p.precioRodoPuerta === 0);
  aviso.hidden = !incompleto;
  if (incompleto) {
    aviso.textContent =
      "Aviso: todavía faltan precios de proveedor para la puerta (riel de aluminio y/o rodo de puerta) en Configuración. Mientras tanto, este precio puede salir más barato de lo real.";
  }
}

function renderCotLineas() {
  const body = document.getElementById("cot-lineas-body");
  const empty = document.getElementById("cot-lineas-empty");
  body.innerHTML = "";
  empty.style.display = cotLineas.length ? "none" : "block";
  cotLineas.forEach((l) => {
    const tr = document.createElement("tr");
    const extras = [];
    if (l.input.altura) extras.push("+altura");
    if (l.input.perforacion) extras.push("+perforación");
    if (l.avisoIncompleto) extras.push("⚠ precio incompleto");
    tr.innerHTML = `
      <td>${escapeHtml(l.nombre)}${extras.length ? `<br><small>${extras.join(" · ")}</small>` : ""}</td>
      <td>${l.medidaTexto}</td>
      <td>${l.input.cantidad}</td>
      <td>${formatMoney(l.precioUnitario)}</td>
      <td>${formatMoney(l.subtotal)}</td>
      <td class="cot-print-hide"><button class="btn-eliminar" data-id="${l.id}">Quitar</button></td>
    `;
    tr.querySelector(".btn-eliminar").addEventListener("click", () => {
      cotLineas = cotLineas.filter((x) => x.id !== l.id);
      renderCotLineas();
      renderCotResumen();
    });
    body.appendChild(tr);
  });
}

function cotCalcularTotales() {
  const subtotalItems = cotLineas.reduce((sum, l) => sum + l.subtotal, 0);
  const minimoVisita = cotConfig.reglas.minimoVisita;
  const ajusteMinimo = subtotalItems > 0 && subtotalItems < minimoVisita ? minimoVisita - subtotalItems : 0;
  const km = parseFloat(document.getElementById("cot-km").value) || 0;
  const kmExtra = Math.max(0, km - cotConfig.reglas.kmIncluidos) * cotConfig.reglas.costoKm;
  const subtotalAjustado = subtotalItems + ajusteMinimo + kmExtra;
  const descuentoPct = parseFloat(document.getElementById("cot-descuento").value) || 0;
  const descuentoMonto = subtotalAjustado * (descuentoPct / 100);
  const totalFinal = subtotalAjustado - descuentoMonto;
  const anticipoPct = parseFloat(document.getElementById("cot-anticipo").value) || 0;
  const anticipo = totalFinal * (anticipoPct / 100);
  const saldo = totalFinal - anticipo;
  return { subtotalItems, ajusteMinimo, km, kmExtra, subtotalAjustado, descuentoPct, descuentoMonto, totalFinal, anticipoPct, anticipo, saldo };
}

function renderCotResumen() {
  const t = cotCalcularTotales();
  const el = document.getElementById("cot-resumen");
  el.innerHTML = `
    <div class="cot-resumen-linea"><span>Subtotal de productos</span><span>${formatMoney(t.subtotalItems)}</span></div>
    ${t.ajusteMinimo > 0 ? `<div class="cot-resumen-linea"><span>Ajuste por mínimo de visita</span><span>${formatMoney(t.ajusteMinimo)}</span></div>` : ""}
    ${t.kmExtra > 0 ? `<div class="cot-resumen-linea"><span>Traslado · km adicionales</span><span>${formatMoney(t.kmExtra)}</span></div>` : ""}
    ${t.descuentoMonto > 0 ? `<div class="cot-resumen-linea"><span>Descuento (${t.descuentoPct}%)</span><span>-${formatMoney(t.descuentoMonto)}</span></div>` : ""}
    <div class="cot-resumen-linea total"><span>TOTAL DE LA COTIZACIÓN</span><span>${formatMoney(t.totalFinal)}</span></div>
    <div class="cot-resumen-linea"><span>Anticipo a solicitar (${t.anticipoPct}%)</span><span>${formatMoney(t.anticipo)}</span></div>
    <div class="cot-resumen-linea"><span>Saldo contra entrega</span><span>${formatMoney(t.saldo)}</span></div>
  `;
}

function renderCotizacionesGuardadas() {
  const body = document.getElementById("tabla-cotizaciones-body");
  const empty = document.getElementById("cotizaciones-empty");
  body.innerHTML = "";
  empty.style.display = cotizaciones.length ? "none" : "block";
  cotizaciones
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.fecha}</td>
        <td>${escapeHtml(c.cliente || "(sin nombre)")}</td>
        <td>${formatMoney(c.totalFinal)}</td>
        <td>${formatMoney(c.anticipo)}</td>
        <td>
          <button type="button" class="btn-secondary btn-cargar">Cargar</button>
          <button type="button" class="btn-secondary btn-convertir">A venta</button>
          <button type="button" class="btn-eliminar">Eliminar</button>
        </td>
      `;
      tr.querySelector(".btn-cargar").addEventListener("click", () => cotCargar(c.id));
      tr.querySelector(".btn-convertir").addEventListener("click", () => cotConvertirAVenta(c.id));
      tr.querySelector(".btn-eliminar").addEventListener("click", () => {
        cotizaciones = cotizaciones.filter((x) => x.id !== c.id);
        saveCotizaciones();
        renderCotizacionesGuardadas();
      });
      body.appendChild(tr);
    });
}

function cotCargar(id) {
  const c = cotizaciones.find((x) => x.id === id);
  if (!c) return;
  cotLineas = c.lineas.map((l) => ({ ...l }));
  document.getElementById("cot-cliente").value = c.cliente || "";
  document.getElementById("cot-telefono").value = c.telefono || "";
  document.getElementById("cot-lugar").value = c.lugar || "";
  document.getElementById("cot-km").value = c.km || 0;
  document.getElementById("cot-descuento").value = c.descuentoPct || 0;
  document.getElementById("cot-anticipo").value = c.anticipoPct || cotConfig.reglas.anticipoDefaultPct;
  renderCotLineas();
  renderCotResumen();
  document.querySelector('[data-tab="cotizador"]').click();
}

function cotConvertirAVenta(id) {
  const c = cotizaciones.find((x) => x.id === id);
  if (!c) return;
  if (!confirm("¿Registrar esta cotización como venta?")) return;
  const items = c.lineas.map((l) => ({
    descripcion: `${l.nombre} (${l.medidaTexto})`,
    cantidad: l.input.cantidad,
    precio: l.precioUnitario,
    total: l.subtotal,
  }));
  if (c.ajusteMinimo > 0) {
    items.push({ descripcion: "Ajuste por mínimo de visita", cantidad: 1, precio: c.ajusteMinimo, total: c.ajusteMinimo });
  }
  if (c.kmExtra > 0) {
    items.push({ descripcion: "Traslado · km adicionales", cantidad: 1, precio: c.kmExtra, total: c.kmExtra });
  }
  if (c.descuentoMonto > 0) {
    items.push({ descripcion: `Descuento (${c.descuentoPct}%)`, cantidad: 1, precio: -c.descuentoMonto, total: -c.descuentoMonto });
  }
  state.ventas.push({
    id: makeId(),
    fecha: new Date().toISOString().slice(0, 10),
    cliente: c.cliente || "(sin nombre)",
    items,
    total: c.totalFinal,
  });
  saveState();
  renderVentas();
  renderResumen();
  renderClientes();
  alert("Cotización registrada como venta.");
}

document.getElementById("cot-categoria").addEventListener("change", cotRefreshProductoOptions);
document.getElementById("cot-producto").addEventListener("change", cotActualizarAviso);
document.getElementById("cot-km").addEventListener("input", renderCotResumen);
document.getElementById("cot-descuento").addEventListener("input", renderCotResumen);
document.getElementById("cot-anticipo").addEventListener("input", renderCotResumen);

document.getElementById("cot-agregar-linea").addEventListener("click", () => {
  const categoria = document.getElementById("cot-categoria").value;
  const productoId = document.getElementById("cot-producto").value;
  const anchoCm = parseFloat(document.getElementById("cot-ancho").value);
  const altoCm = parseFloat(document.getElementById("cot-alto").value);
  const hojas = parseInt(document.getElementById("cot-hojas").value, 10);
  const cantidad = parseFloat(document.getElementById("cot-cantidad").value) || 1;
  const altura = document.getElementById("cot-altura").checked;
  const perforacion = document.getElementById("cot-perforacion").checked;

  if (!productoId) return;
  if ((categoria === "vidrio" || categoria === "pvc_medida") && (!anchoCm || !altoCm)) {
    alert("Ingresá ancho y alto.");
    return;
  }

  const input = { categoria, productoId, anchoCm, altoCm, hojas, cantidad, altura, perforacion };
  const linea = { id: makeId(), input, ...calcularLinea(input, cotConfig) };
  cotLineas.push(linea);
  renderCotLineas();
  renderCotResumen();

  document.getElementById("cot-ancho").value = "";
  document.getElementById("cot-alto").value = "";
  document.getElementById("cot-cantidad").value = "1";
  document.getElementById("cot-altura").checked = false;
  document.getElementById("cot-perforacion").checked = false;
});

document.getElementById("cot-nueva").addEventListener("click", () => {
  if (cotLineas.length && !confirm("¿Vaciar la cotización actual?")) return;
  cotLineas = [];
  document.getElementById("cot-cliente").value = "";
  document.getElementById("cot-telefono").value = "";
  document.getElementById("cot-lugar").value = "";
  document.getElementById("cot-km").value = "0";
  document.getElementById("cot-descuento").value = "0";
  document.getElementById("cot-anticipo").value = cotConfig.reglas.anticipoDefaultPct;
  renderCotLineas();
  renderCotResumen();
});

document.getElementById("cot-guardar").addEventListener("click", () => {
  if (!cotLineas.length) {
    alert("Agregá al menos un producto.");
    return;
  }
  const t = cotCalcularTotales();
  const cot = {
    id: makeId(),
    fecha: new Date().toISOString().slice(0, 10),
    cliente: document.getElementById("cot-cliente").value.trim(),
    telefono: document.getElementById("cot-telefono").value.trim(),
    lugar: document.getElementById("cot-lugar").value.trim(),
    lineas: cotLineas.map((l) => ({ ...l })),
    km: t.km,
    descuentoPct: t.descuentoPct,
    anticipoPct: t.anticipoPct,
    subtotalItems: t.subtotalItems,
    ajusteMinimo: t.ajusteMinimo,
    kmExtra: t.kmExtra,
    descuentoMonto: t.descuentoMonto,
    totalFinal: t.totalFinal,
    anticipo: t.anticipo,
    saldo: t.saldo,
  };
  cotizaciones.push(cot);
  saveCotizaciones();
  renderCotizacionesGuardadas();
  alert("Cotización guardada.");
});

document.getElementById("cot-imprimir").addEventListener("click", () => {
  document.getElementById("cot-print-negocio").textContent = cotConfig.negocio.nombre || "Cotización";
  document.getElementById("cot-print-nit").textContent = cotConfig.negocio.nit ? `NIT: ${cotConfig.negocio.nit}` : "";
  window.print();
});

document.getElementById("export-cotizaciones").addEventListener("click", () => {
  const columns = ["fecha", "cliente", "telefono", "producto", "medida", "cantidad", "precio_unitario", "subtotal", "total_cotizacion"];
  const header = columns.join(",");
  const csvEscape = (val) => {
    const str = String(val ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [];
  cotizaciones.forEach((c) => {
    c.lineas.forEach((l) => {
      lines.push(
        [c.fecha, c.cliente, c.telefono, l.nombre, l.medidaTexto, l.input.cantidad, l.precioUnitario.toFixed(2), l.subtotal.toFixed(2), c.totalFinal.toFixed(2)]
          .map(csvEscape)
          .join(",")
      );
    });
  });
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cotizaciones.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ---------- Configuración del cotizador ----------
const REGLAS_LABELS = {
  areaMinima: "Área mínima cobrable (m²)",
  minimoVisita: "Mínimo por visita ($)",
  kmIncluidos: "Kilómetros incluidos",
  costoKm: "$ por km adicional",
  recargoAlturaPct: "Recargo por altura (%)",
  perforacionExtra: "Cargo por corte especial / perforación ($)",
  anticipoDefaultPct: "Anticipo sugerido por defecto (%)",
};

const PVC_PARAM_LABELS = {
  precioMarco: "Marco — $/metro lineal",
  precioHojaVentana: "Hoja de ventana corrediza — $/ml",
  precioMosquitero: "Hoja de mosquitero — $/ml",
  precioBatiente: "Batiente — $/ml",
  precioTraslape: "Traslape / tapa jamba — $/ml",
  precioHojaPuerta: "Hoja de puerta corrediza — $/ml",
  precioRiel: "Riel de aluminio — $/ml",
  precioRodoCorredera: "Rodo sencillo corredera — $/u",
  precioRodoMosquitero: "Rodo para mosquitero — $/u",
  precioCierreGancho: "Cierre de gancho pequeño — $/u",
  precioTopeGancho: "Tope para cierre de gancho — $/u",
  precioMasilla: "Tubo de masilla (sellador) — $/u",
  precioRodoPuerta: "Rodo de puerta — $/u",
  precioMallaCedazoM2: "Malla de cedazo — $/m²",
  precioVidrioM2: "Vidrio de la ventana/puerta PVC — $/m²",
  marcoSuma: "Marco: mm que se suman por pegue",
  hojaAltoResta: "Hoja: mm que se restan del alto",
  hojaPegueResta: "Hoja: mm de pegue adicionales a restar",
  hojaAnchoSuma: "Hoja: mm que se suman al ancho dividido",
  tapaJambaPiezasPorHoja: "Tapa jamba: piezas por hoja",
  rielResta: "Riel: mm a restar de cada lado",
  mosquiteroResta: "Mosquitero: mm a restar por pieza",
  batienteResta: "Batiente: mm a restar por pieza",
  desperdicioCorte: "Desperdicio de corte de perfil (0 a 1)",
  horasFabricacionBase: "Horas de fabricación, base",
  horasExtraPorHoja: "Horas extra por cada hoja arriba de 2",
  horasInstalacionBase: "Horas de instalación, base",
  horasExtraPorM2: "Horas extra por cada m² arriba de 1",
  tarifaHoraCliente: "Tarifa por hora al cliente ($)",
  costoHoraReal: "Costo real de la hora de taller ($)",
  horasExtraPuerta: "Horas extra si es puerta",
  multiplicadorMaterial: "Multiplicador sobre el material",
  cargoFijoTrabajo: "Cargo fijo por trabajo ($)",
  pisoM2: "Piso de precio mínimo por m² ($)",
  pisoTrabajo: "Piso de precio mínimo por trabajo ($)",
};

function renderCfgAll() {
  document.getElementById("cfg-negocio-nombre").value = cotConfig.negocio.nombre;
  document.getElementById("cfg-negocio-nit").value = cotConfig.negocio.nit;

  document.getElementById("cfg-vidrios").innerHTML = cotConfig.vidrios
    .map(
      (p) => `
      <div class="cfg-fila" data-id="${p.id}">
        <span class="cfg-label">${escapeHtml(p.nombre)}</span>
        <input type="number" step="0.01" min="0" class="cfg-vidrio-precio" value="${p.precioM2}">
      </div>`
    )
    .join("");

  document.getElementById("cfg-pvc-catalogo").innerHTML = cotConfig.pvcCatalogo
    .map(
      (p) => `
      <div class="cfg-fila" data-id="${p.id}">
        <span class="cfg-label">${escapeHtml(p.nombre)}</span>
        <input type="number" step="0.01" min="0" class="cfg-pvc-cat-precio" value="${p.precio}">
      </div>`
    )
    .join("");

  document.getElementById("cfg-reglas").innerHTML = Object.keys(REGLAS_LABELS)
    .map(
      (key) => `
      <div class="cfg-fila" data-key="${key}">
        <span class="cfg-label">${REGLAS_LABELS[key]}</span>
        <input type="number" step="0.01" class="cfg-regla-input" value="${cotConfig.reglas[key]}">
      </div>`
    )
    .join("");

  document.getElementById("cfg-pvc-params").innerHTML = Object.keys(PVC_PARAM_LABELS)
    .map(
      (key) => `
      <div class="cfg-fila" data-key="${key}">
        <span class="cfg-label">${PVC_PARAM_LABELS[key]}</span>
        <input type="number" step="0.0001" class="cfg-pvc-param-input" value="${cotConfig.pvcParams[key]}">
      </div>`
    )
    .join("");
}

function cotRecalcularLineasActuales() {
  cotLineas = cotLineas.map((l) => ({ ...l, ...calcularLinea(l.input, cotConfig) }));
  cotRefreshProductoOptions();
  renderCotLineas();
  renderCotResumen();
}

document.getElementById("cfg-guardar").addEventListener("click", () => {
  cotConfig.negocio.nombre = document.getElementById("cfg-negocio-nombre").value.trim();
  cotConfig.negocio.nit = document.getElementById("cfg-negocio-nit").value.trim();

  document.querySelectorAll("#cfg-vidrios .cfg-fila").forEach((row) => {
    const p = cotConfig.vidrios.find((x) => x.id === row.dataset.id);
    if (p) p.precioM2 = parseFloat(row.querySelector(".cfg-vidrio-precio").value) || 0;
  });

  document.querySelectorAll("#cfg-pvc-catalogo .cfg-fila").forEach((row) => {
    const p = cotConfig.pvcCatalogo.find((x) => x.id === row.dataset.id);
    if (p) p.precio = parseFloat(row.querySelector(".cfg-pvc-cat-precio").value) || 0;
  });

  document.querySelectorAll("#cfg-reglas .cfg-fila").forEach((row) => {
    cotConfig.reglas[row.dataset.key] = parseFloat(row.querySelector(".cfg-regla-input").value) || 0;
  });

  document.querySelectorAll("#cfg-pvc-params .cfg-fila").forEach((row) => {
    cotConfig.pvcParams[row.dataset.key] = parseFloat(row.querySelector(".cfg-pvc-param-input").value) || 0;
  });

  saveCotConfig();
  cotRecalcularLineasActuales();
  alert("Configuración guardada.");
});

document.getElementById("cfg-restaurar").addEventListener("click", () => {
  if (!confirm('¿Restaurar todos los precios a los valores originales del Excel? Se perderán tus cambios.')) return;
  cotConfig = defaultCotConfig();
  saveCotConfig();
  renderCfgAll();
  cotRecalcularLineasActuales();
});

document.getElementById("cot-anticipo").value = cotConfig.reglas.anticipoDefaultPct;
cotRefreshProductoOptions();
renderCotLineas();
renderCotResumen();
renderCotizacionesGuardadas();
renderCfgAll();

// ---------- Resumen ----------
function renderResumen() {
  const totalVentas = state.ventas.reduce((sum, v) => sum + v.total, 0);
  const totalCompras = state.compras.reduce((sum, c) => sum + c.total, 0);
  const balance = totalVentas - totalCompras;

  document.getElementById("resumen-total-ventas").textContent = formatMoney(totalVentas);
  document.getElementById("resumen-total-compras").textContent = formatMoney(totalCompras);

  const balanceEl = document.getElementById("resumen-balance");
  balanceEl.textContent = formatMoney(balance);
  balanceEl.classList.toggle("positive", balance >= 0);
  balanceEl.classList.toggle("negative", balance < 0);

  document.getElementById("resumen-count-ventas").textContent = state.ventas.length;
  document.getElementById("resumen-count-compras").textContent = state.compras.length;
}

// ---------- Exportar CSV ----------
function exportCSV(transactions, entityField, filename) {
  const columns = ["fecha", entityField, "descripcion", "cantidad", "precio", "total"];
  const header = columns.join(",");
  const csvEscape = (val) => {
    const str = String(val ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [];
  transactions.forEach((t) => {
    t.items.forEach((it) => {
      lines.push(
        [t.fecha, t[entityField], it.descripcion, it.cantidad, it.precio, it.total]
          .map(csvEscape)
          .join(",")
      );
    });
  });
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Init ----------
formVentas.fecha.valueAsDate = new Date();
formCompras.fecha.valueAsDate = new Date();
renderVentas();
renderCompras();
renderResumen();
renderClientes();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
