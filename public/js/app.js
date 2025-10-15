// SIRH front-end logic (dashboard)
// Verifica auth y provee CRUD de empleados y contratos, búsqueda y exportación

const token = localStorage.getItem('idToken');
const devPreview = new URLSearchParams(location.search).has('devpreview');
if (!token && !devPreview) {
  window.location.href = '/';
}

const apiFetch = async (path, opts = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (devPreview) headers['x-devpreview'] = '1';

  // Garantizar bypass en desarrollo también por query string
  const url = devPreview ? (path.includes('?') ? `${path}&devpreview=1` : `${path}?devpreview=1`) : path;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
};

// Helpers de UI
const setLoading = (btn, text) => {
  if (!btn) return () => {};
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = text;
  return () => {
    btn.disabled = false;
    btn.textContent = prev;
  };
};

const setMsg = (id, t, type = 'info') => {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = t;
    el.className = `msg ${type}`;
  }
};

// Toast
const toastEl = document.getElementById('toast');
let toastTimer = null;
const setToast = (t, type = 'info', ms = 2500) => {
  if (!toastEl) return;
  toastEl.hidden = false;
  toastEl.textContent = t;
  toastEl.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, ms);
};

// Confirmación accesible
const useConfirmModal = false; // desactivado: no usamos modal personalizado
const askDeleteConfirmation = false; // pon en true si quieres preguntar al borrar
const confirmDialog = (text) => {
  const overlay = document.getElementById('confirmOverlay');
  const ok = document.getElementById('confirmOk');
  const cancel = document.getElementById('confirmCancel');
  const label = document.getElementById('confirmText');
  return new Promise((resolve) => {
    if (!useConfirmModal || !overlay || !ok || !cancel || !label) {
      return resolve(confirm(text));
    }
    label.textContent = text;
    overlay.hidden = false;
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKey = (e) => { if (e.key === 'Escape') cleanup(false); };
    const onOverlay = (e) => { if (e.target === overlay) cleanup(false); };
    function cleanup(val) {
      overlay.hidden = true;
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOverlay);
      resolve(val);
    }
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', onOverlay);
    ok.focus();
  });
};

// Tabs
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    // Cambiar contenido visible
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.getElementById(`tab-${target}`).classList.add('active');
    // Estado activo de los botones
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('idToken');
  window.location.href = '/';
});

// ================= Empleados =================
const empForm = document.getElementById('employeeForm');
const empTable = document.getElementById('employeesTable');
const empSelectForContracts = document.getElementById('con_emp_select');
// Filtros y estadísticas de empleados
const empSearch = document.getElementById('emp_search');
const empEstado = document.getElementById('emp_estado_filter');
const empCargo = document.getElementById('emp_cargo_filter');
const empClearFilter = document.getElementById('emp_clear_filter');
const empStatTotal = document.getElementById('emp_stat_total');
const empStatActivos = document.getElementById('emp_stat_activos');
const empStatRetirados = document.getElementById('emp_stat_retirados');
const empExportCsv = document.getElementById('emp_export_csv');
const empPageSizeSel = document.getElementById('emp_page_size');
const empPrev = document.getElementById('emp_prev');
const empNext = document.getElementById('emp_next');
const empPageLabel = document.getElementById('emp_page_label');
let empAll = [];
let empSortKey = 'NOMBRE';
let empSortDir = 'asc';
let empPage = 1;
let empPageSize = 10;
const empPaginationEnabled = !!(empPageSizeSel || empPrev || empNext || empPageLabel);

const capitalize = (s = '') => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

const renderEmployees = (list, fillSelects = false) => {
  empTable.innerHTML = '';
  // Estadísticas
  const total = empAll.length;
  const activos = empAll.filter(e => (e.ESTADO || '').toLowerCase() === 'activo').length;
  const retirados = empAll.filter(e => (e.ESTADO || '').toLowerCase() !== 'activo').length;
  if (empStatTotal) empStatTotal.textContent = String(total);
  if (empStatActivos) empStatActivos.textContent = String(activos);
  if (empStatRetirados) empStatRetirados.textContent = String(retirados);

  if (!list || list.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="icon"><path d="M3 5h18v2H3V5zm2 4h14v10H5V9zm2 2v6h10v-6H7z"/></svg>
        <div class="title">Sin empleados para mostrar</div>
        <div class="desc">Ajusta la búsqueda o crea un nuevo empleado.</div>
      </div>
    </td>`;
    empTable.appendChild(tr);
  } else {
  list.forEach((e) => {
    const tr = document.createElement('tr');
    const estadoRaw = (e.ESTADO || '').toLowerCase();
    const estadoClass = estadoRaw === 'activo' ? 'success' : 'muted';
    tr.innerHTML = `
      <td data-label="Documento">${e.NRO_DOCUMENTO}</td>
      <td data-label="Nombre">${e.NOMBRE} ${e.APELLIDO}</td>
      <td data-label="Cargo">${e.CARGO || '-'}</td>
      <td data-label="Estado"><span class="chip ${estadoClass}">${capitalize(e.ESTADO || '')}</span></td>
      <td data-label="Acciones">
        <button class="btn sm" data-edit="${e.id}">Editar</button>
        <button class="btn sm danger" data-del="${e.id}">Eliminar</button>
      </td>
    `;
    empTable.appendChild(tr);
  });
  }

  // Rellenar select de contratos
  if (fillSelects) {
    empSelectForContracts.innerHTML = '';
    if (typeof conFilter !== 'undefined' && conFilter) {
      conFilter.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = '';
      optAll.textContent = 'Todos los empleados';
      conFilter.appendChild(optAll);
    }
    empAll.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.NOMBRE} ${e.APELLIDO} – (${e.NRO_DOCUMENTO})`;
      empSelectForContracts.appendChild(opt);
      if (typeof conFilter !== 'undefined' && conFilter) {
        const opt2 = document.createElement('option');
        opt2.value = e.id;
        opt2.textContent = `${e.NOMBRE} ${e.APELLIDO}`;
        conFilter.appendChild(opt2);
      }
    });

  // Sincronizar selección del formulario con el filtro si ya existe una selección
  if (typeof conFilter !== 'undefined' && conFilter && conFilter.value) {
    empSelectForContracts.value = conFilter.value;
  } else if (empAll.length > 0) {
    // Seleccionar por defecto el primer empleado para facilitar la creación
    empSelectForContracts.value = empAll[0].id;
  }
  }

  // Edición/Eliminación
  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-edit');
      const e = await apiFetch(`/api/employees/${id}`);
      document.getElementById('emp_id').value = e.id;
      document.getElementById('emp_doc').value = e.NRO_DOCUMENTO;
      document.getElementById('emp_nombre').value = e.NOMBRE;
      document.getElementById('emp_apellido').value = e.APELLIDO;
      document.getElementById('emp_edad').value = e.EDAD;
      document.getElementById('emp_genero').value = e.GENERO;
      document.getElementById('emp_cargo').value = e.CARGO || '';
      document.getElementById('emp_correo').value = e.CORREO;
      document.getElementById('emp_contacto').value = e.NRO_CONTACTO;
      document.getElementById('emp_estado').value = e.ESTADO;
      document.getElementById('emp_obs').value = e.OBSERVACIONES || '';
    });
  });
  document.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del');
      if (askDeleteConfirmation) {
        const ok = await confirmDialog('¿Eliminar este empleado?');
        if (!ok) return;
      }
      const release = setLoading(btn, 'Eliminando...');
      try {
        await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
        setMsg('empMsg', 'Empleado eliminado correctamente.', 'success');
        await loadEmployees();
      } catch (err) {
        console.error(err);
        setMsg('empMsg', 'No fue posible eliminar el empleado.', 'error');
      } finally {
        release();
      }
    });
  });
};

async function loadEmployees() {
  const list = await apiFetch('/api/employees');
  empAll = Array.isArray(list) ? list : [];
  // Poblar filtro de cargo
  if (empCargo) {
    const cargos = Array.from(new Set(empAll.map(e => String(e.CARGO || '').trim()).filter(Boolean))).sort();
    empCargo.innerHTML = '<option value="">Todos los cargos</option>' + cargos.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  applyEmpFilters(true);
}

function applyEmpFilters(fillSelects = false) {
  const q = (empSearch && empSearch.value ? empSearch.value : '').trim().toLowerCase();
  const estado = (empEstado && empEstado.value ? empEstado.value : '').trim().toLowerCase();
  const cargo = (empCargo && empCargo.value ? empCargo.value : '').trim().toLowerCase();
  let filtered = empAll.slice();
  if (q) {
    filtered = filtered.filter(e => {
      const doc = String(e.NRO_DOCUMENTO || '').toLowerCase();
      const nom = `${String(e.NOMBRE || '').toLowerCase()} ${String(e.APELLIDO || '').toLowerCase()}`.trim();
      return doc.includes(q) || nom.includes(q);
    });
  }
  if (estado) {
    filtered = filtered.filter(e => String(e.ESTADO || '').toLowerCase() === estado);
  }
  if (cargo) {
    filtered = filtered.filter(e => String(e.CARGO || '').toLowerCase() === cargo);
  }

  // Ordenamiento
  filtered.sort((a, b) => {
    const va = (empSortKey === 'NOMBRE') ? `${a.NOMBRE || ''} ${a.APELLIDO || ''}`.toLowerCase()
      : String(a[empSortKey] || '').toLowerCase();
    const vb = (empSortKey === 'NOMBRE') ? `${b.NOMBRE || ''} ${b.APELLIDO || ''}`.toLowerCase()
      : String(b[empSortKey] || '').toLowerCase();
    if (va < vb) return empSortDir === 'asc' ? -1 : 1;
    if (va > vb) return empSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginación (solo si hay controles visibles)
  if (empPaginationEnabled) {
    if (empPageSizeSel) {
      empPageSize = parseInt(empPageSizeSel.value, 10) || empPageSize;
    }
    const totalPages = Math.max(1, Math.ceil(filtered.length / empPageSize));
    if (empPage > totalPages) empPage = totalPages;
    const start = (empPage - 1) * empPageSize;
    const pageSlice = filtered.slice(start, start + empPageSize);
    if (empPageLabel) empPageLabel.textContent = `Página ${empPage} de ${totalPages}`;
    if (empPrev) empPrev.disabled = empPage <= 1;
    if (empNext) empNext.disabled = empPage >= totalPages;
    renderEmployees(pageSlice, fillSelects);
  } else {
    renderEmployees(filtered, fillSelects);
  }
}

// Eventos de filtros
if (empSearch) {
  empSearch.addEventListener('input', () => applyEmpFilters());
}
if (empEstado) {
  empEstado.addEventListener('change', () => applyEmpFilters());
}
if (empCargo) {
  empCargo.addEventListener('change', () => applyEmpFilters());
}
if (empClearFilter) {
  empClearFilter.addEventListener('click', () => {
    if (empSearch) empSearch.value = '';
    if (empEstado) empEstado.value = '';
    if (empCargo) empCargo.value = '';
    empPage = 1;
    applyEmpFilters();
  });
}

// Sort por encabezado
document.querySelectorAll('thead th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.getAttribute('data-sort');
    if (empSortKey === key) {
      empSortDir = empSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      empSortKey = key;
      empSortDir = 'asc';
    }
    empPage = 1;
    applyEmpFilters();
  });
});

// Paginación
if (empPageSizeSel) {
  empPageSizeSel.addEventListener('change', () => {
    empPageSize = parseInt(empPageSizeSel.value, 10) || 10;
    empPage = 1;
    applyEmpFilters();
  });
}
if (empPrev) {
  empPrev.addEventListener('click', () => { if (empPage > 1) { empPage -= 1; applyEmpFilters(); } });
}
if (empNext) {
  empNext.addEventListener('click', () => { empPage += 1; applyEmpFilters(); });
}

// Exportar CSV
function toCSVRow(e) {
  const vals = [e.NRO_DOCUMENTO, `${e.NOMBRE || ''} ${e.APELLIDO || ''}`.trim(), e.CARGO || '', e.ESTADO || '', e.CORREO || '', e.NRO_CONTACTO || ''];
  return vals.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',');
}
function currentFilteredEmployees() {
  const q = (empSearch && empSearch.value ? empSearch.value : '').trim().toLowerCase();
  const estado = (empEstado && empEstado.value ? empEstado.value : '').trim().toLowerCase();
  const cargo = (empCargo && empCargo.value ? empCargo.value : '').trim().toLowerCase();
  let filtered = empAll.slice();
  if (q) {
    filtered = filtered.filter(e => {
      const doc = String(e.NRO_DOCUMENTO || '').toLowerCase();
      const nom = `${String(e.NOMBRE || '').toLowerCase()} ${String(e.APELLIDO || '').toLowerCase()}`.trim();
      return doc.includes(q) || nom.includes(q);
    });
  }
  if (estado) filtered = filtered.filter(e => String(e.ESTADO || '').toLowerCase() === estado);
  if (cargo) filtered = filtered.filter(e => String(e.CARGO || '').toLowerCase() === cargo);
  return filtered;
}
if (empExportCsv) {
  empExportCsv.addEventListener('click', () => {
    const rows = currentFilteredEmployees().map(toCSVRow);
    const header = 'Documento,Nombre,Cargo,Estado,Correo,Contacto\n';
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'empleados.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast('CSV exportado', 'success');
  });
}

empForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!empForm.checkValidity()) { empForm.reportValidity(); return; }
  const submitBtn = empForm.querySelector('button[type="submit"]');
  const payload = {
    NRO_DOCUMENTO: document.getElementById('emp_doc').value.trim(),
    NOMBRE: document.getElementById('emp_nombre').value.trim(),
    APELLIDO: document.getElementById('emp_apellido').value.trim(),
    EDAD: Number(document.getElementById('emp_edad').value),
    GENERO: document.getElementById('emp_genero').value,
    CARGO: document.getElementById('emp_cargo').value.trim(),
    CORREO: document.getElementById('emp_correo').value.trim(),
    NRO_CONTACTO: document.getElementById('emp_contacto').value.trim(),
    ESTADO: document.getElementById('emp_estado').value,
    OBSERVACIONES: document.getElementById('emp_obs').value.trim(),
  };
  const id = document.getElementById('emp_id').value;
  const release = setLoading(submitBtn, 'Guardando...');
  try {
    if (id) {
      await apiFetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(payload) });
    }
    setMsg('empMsg', 'Empleado guardado correctamente.', 'success');
    empForm.reset();
    document.getElementById('emp_id').value = '';
    await loadEmployees();
  } catch (err) {
    console.error(err);
    setMsg('empMsg', 'No fue posible guardar el empleado.', 'error');
  } finally {
    release();
  }
});

// ================= Contratos =================
const conForm = document.getElementById('contractForm');
const conTable = document.getElementById('contractsTable');
const conFilter = document.getElementById('con_filter');
const conClearFilter = document.getElementById('con_clear_filter');
const conStatTotal = document.getElementById('con_stat_total');
const conStatMonto = document.getElementById('con_stat_monto');

const renderContracts = (list) => {
  conTable.innerHTML = '';
  // Resumen de contratos
  const total = list.length;
  const monto = list.reduce((acc, c) => acc + Number(c.Valor || 0), 0);
  if (conStatTotal) conStatTotal.textContent = String(total);
  if (conStatMonto) conStatMonto.textContent = `$${monto.toLocaleString('es-CO')}`;
  list.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Empleado">${c.Empleado}</td>
      <td data-label="Inicio">${c.Fecha_inicio}</td>
      <td data-label="Fin">${c.Fecha_fin}</td>
      <td data-label="Valor">$${Number(c.Valor).toLocaleString('es-CO')}</td>
      <td data-label="Acciones">
        <button class="btn sm" data-editc="${c.id}">Editar</button>
        <button class="btn sm danger" data-delc="${c.id}">Eliminar</button>
      </td>
    `;
    conTable.appendChild(tr);
  });

  if (list.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5">No hay contratos para mostrar.</td>`;
    conTable.appendChild(tr);
  }

  document.querySelectorAll('[data-editc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-editc');
      const c = await apiFetch(`/api/contracts/${id}`);
      document.getElementById('con_id').value = c.id;
      document.getElementById('con_emp_select').value = c.employeeId;
      document.getElementById('con_inicio').value = c.Fecha_inicio;
      document.getElementById('con_fin').value = c.Fecha_fin;
      document.getElementById('con_valor').value = c.Valor;
    });
  });
  document.querySelectorAll('[data-delc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delc');
      if (askDeleteConfirmation) {
        const ok = await confirmDialog('¿Eliminar este contrato?');
        if (!ok) return;
      }
      const release = setLoading(btn, 'Eliminando...');
      try {
        await apiFetch(`/api/contracts/${id}`, { method: 'DELETE' });
        setMsg('conMsg', 'Contrato eliminado correctamente.', 'success');
        const currentFilter = (typeof conFilter !== 'undefined' && conFilter && conFilter.value) ? conFilter.value : '';
        await loadContracts(currentFilter);
      } catch (err) {
        console.error(err);
        setMsg('conMsg', 'No fue posible eliminar el contrato.', 'error');
      } finally {
        release();
      }
    });
  });
};

async function loadContracts(employeeId = '') {
  const list = await apiFetch(employeeId ? `/api/contracts?employeeId=${encodeURIComponent(employeeId)}` : '/api/contracts');
  renderContracts(list);
}

// Filtro en la barra superior
if (conFilter) {
  conFilter.addEventListener('change', async () => {
    const id = conFilter.value || '';
    // sincronizar selección del formulario con el filtro
    const empSel = document.getElementById('con_emp_select');
    if (empSel) empSel.value = id || '';
    await loadContracts(id);
  });
}
if (conClearFilter) {
  conClearFilter.addEventListener('click', async () => {
    conFilter.value = '';
    const empSel = document.getElementById('con_emp_select');
    if (empSel) empSel.value = '';
    await loadContracts('');
  });
}

conForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = conForm.querySelector('button[type="submit"]');
  const employeeId = document.getElementById('con_emp_select').value;
  const empleadoText = document.getElementById('con_emp_select').selectedOptions[0]?.textContent || '';
  const inicio = document.getElementById('con_inicio').value;
  const fin = document.getElementById('con_fin').value;
  const valorNum = Number(document.getElementById('con_valor').value);
  // Validaciones básicas
  if (!inicio || !fin) { setMsg('conMsg', 'Debe ingresar fechas inicio y fin.', 'warn'); return; }
  if (new Date(fin) < new Date(inicio)) { setMsg('conMsg', 'La fecha fin debe ser mayor o igual a inicio.', 'error'); return; }
  if (Number.isNaN(valorNum) || valorNum < 0) { setMsg('conMsg', 'El valor debe ser un número positivo.', 'error'); return; }
  const payload = {
    Fecha_inicio: inicio,
    Fecha_fin: fin,
    Valor: valorNum,
    employeeId,
    Empleado: empleadoText.split(' – ')[0], // solo nombre
  };
  const id = document.getElementById('con_id').value;
  const release = setLoading(submitBtn, 'Guardando...');
  try {
    if (id) await apiFetch(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiFetch('/api/contracts', { method: 'POST', body: JSON.stringify(payload) });
    setMsg('conMsg', 'Contrato guardado correctamente.', 'success');
    conForm.reset();
    document.getElementById('con_id').value = '';
    const currentFilter = (typeof conFilter !== 'undefined' && conFilter && conFilter.value) ? conFilter.value : '';
    await loadContracts(currentFilter);
  } catch (err) {
    console.error(err);
    setMsg('conMsg', 'No fue posible guardar el contrato.', 'error');
  } finally {
    release();
  }
});

// ================= Búsqueda y exportación =================
const searchBtn = document.getElementById('searchBtn');
const searchResult = document.getElementById('searchResult');
let lastSearchEmployee = null;

searchBtn.addEventListener('click', async () => {
  const q = document.getElementById('search_q').value.trim();
  if (!q) { setToast('Digite el documento o nombre', 'warn'); return; }
  const release = setLoading(searchBtn, 'Buscando...');
  try {
    const r = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
    lastSearchEmployee = r.employee;
    const contratos = Array.isArray(r.contratos) ? r.contratos : [];
    const total = Number(r.totalContratos || contratos.length);
    const monto = contratos.reduce((acc, c) => acc + Number(c.Valor || 0), 0);
    const promedio = total ? Math.round(monto / total) : 0;
    const today = new Date();
    const activos = contratos.filter((c) => new Date(c.Fecha_fin) >= today).length;
    const expirados = total - activos;
    const initials = `${(r.employee.NOMBRE || '?').charAt(0)}${(r.employee.APELLIDO || '?').charAt(0)}`.toUpperCase();
    const estadoRaw = String(r.employee.ESTADO || '').toLowerCase();
    const estadoClass = estadoRaw === 'activo' ? 'success' : 'muted';

    const tableHtml = contratos.length > 0
      ? `<div class="table-wrap">
          <table>
            <thead><tr><th>Inicio</th><th>Fin</th><th>Valor</th><th>Estado</th></tr></thead>
            <tbody>
              ${contratos.map((c) => {
                const activo = new Date(c.Fecha_fin) >= today;
                const chip = activo ? '<span class="chip success">Activo</span>' : '<span class="chip">Expirado</span>';
                return `<tr>
                  <td data-label="Inicio">${c.Fecha_inicio}</td>
                  <td data-label="Fin">${c.Fecha_fin}</td>
                  <td data-label="Valor">$${Number(c.Valor).toLocaleString('es-CO')}</td>
                  <td data-label="Estado">${chip}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`
      : `<div class="empty-state">No se encontraron contratos para <b>${r.employee.NOMBRE} ${r.employee.APELLIDO}</b>.</div>`;

    searchResult.innerHTML = `
      <div class="result-header">
        <div class="profile">
          <div class="avatar">${initials}</div>
          <div class="profile-info">
            <h3>${r.employee.NOMBRE} ${r.employee.APELLIDO} <span class="badge">${r.employee.NRO_DOCUMENTO}</span></h3>
            <div>
              <span class="badge">${r.employee.CARGO || '-'}</span>
              <span class="badge ${estadoClass}">${capitalize(r.employee.ESTADO || '')}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="result-stats">
        <div class="stat"><div class="stat-label">Contratos</div><div class="stat-value">${total}</div></div>
        <div class="stat"><div class="stat-label">Valor total</div><div class="stat-value">$${monto.toLocaleString('es-CO')}</div></div>
        <div class="stat"><div class="stat-label">Promedio</div><div class="stat-value">$${promedio.toLocaleString('es-CO')}</div></div>
        <div class="stat"><div class="stat-label">Activos / Expirados</div><div class="stat-value">${activos} / ${expirados}</div></div>
      </div>
      ${tableHtml}
    `;
    setMsg('searchMsg', 'Resultados obtenidos.', 'success');
  } catch (err) {
    console.error(err);
    setMsg('searchMsg', 'No se encontró el empleado.', 'error');
    setToast('No se encontró el empleado', 'warn');
  }
  finally {
    release();
  }
});

// Descargar PDF/XLSX con token (solo botones individuales)
document.getElementById('pdfBtn').addEventListener('click', async (e) => {
  if (!lastSearchEmployee) { setToast('Realice una búsqueda primero', 'warn'); return; }
  const release = setLoading(e.currentTarget, 'Generando...');
  try {
    const blob = await apiFetch(`/api/employees/${lastSearchEmployee.id}/contracts/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratos_${lastSearchEmployee.NRO_DOCUMENTO || lastSearchEmployee.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('searchMsg', 'PDF generado y descargado.', 'success');
  } catch (err) {
    console.error(err);
    setMsg('searchMsg', 'No fue posible generar el PDF.', 'error');
    setToast('No fue posible generar el PDF', 'error');
  } finally {
    release();
  }
});

document.getElementById('xlsxBtn').addEventListener('click', async (e) => {
  if (!lastSearchEmployee) { setToast('Realice una búsqueda primero', 'warn'); return; }
  const release = setLoading(e.currentTarget, 'Generando...');
  try {
    const blob = await apiFetch(`/api/employees/${lastSearchEmployee.id}/contracts/xlsx`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratos_${lastSearchEmployee.NRO_DOCUMENTO || lastSearchEmployee.id}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('searchMsg', 'XLSX generado y descargado.', 'success');
  } catch (err) {
    console.error(err);
    setMsg('searchMsg', 'No fue posible generar el XLSX.', 'error');
    setToast('No fue posible generar el XLSX', 'error');
  } finally {
    release();
  }
});

// Fin del archivo - botones de exportación individuales restaurados

// Inicialización
// Inicialización segura sin top-level await
(async () => {
  try {
    await loadEmployees();
    const initialFilter = (typeof conFilter !== 'undefined' && conFilter && conFilter.value) ? conFilter.value : '';
    await loadContracts(initialFilter);
  } catch (e) {
    console.error('Error inicializando dashboard:', e);
    setToast('No se pudo cargar datos iniciales', 'error');
  }
})();