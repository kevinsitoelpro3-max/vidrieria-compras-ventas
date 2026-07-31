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
