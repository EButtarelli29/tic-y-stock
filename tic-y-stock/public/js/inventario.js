const tabla = document.querySelector('[data-inventario-tabla]');
const busqueda = document.querySelector('[data-busqueda]');
const tbody = tabla ? tabla.querySelector('tbody') : null;
const contador = document.querySelector('.list-count');

const selectoresFiltro = ['#categoria', '#estado', '#ubicacion'];

function obtenerFiltros() {
  const filtros = { q: busqueda ? busqueda.value.trim() : '' };
  selectoresFiltro.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el && el.value) filtros[sel.replace('#', '')] = el.value;
  });
  return filtros;
}

function escapar(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function filaItem(item) {
  const foto = item.foto
    ? `<img src="${escapar(item.foto)}" alt="Foto de ${escapar(item.nombre)}" class="thumb" />`
    : '<span class="thumb thumb--empty" aria-hidden="true">—</span>';
  const stockCritico = item.cantidad <= item.cantidad_minima && item.estado !== 'baja';
  const ubicacion = item.ubicacion ? escapar(item.ubicacion) : '—';
  const editar = `/admin/inventario/${item.id}/editar`;
  const eliminar = `/admin/inventario/${item.id}/eliminar`;

  return `
    <tr>
      <td class="table-cell-thumb">${foto}</td>
      <td>${escapar(item.nombre)}</td>
      <td>${escapar(item.categoria)}</td>
      <td class="${stockCritico ? 'text-critical' : ''}">${item.cantidad}</td>
      <td>${item.cantidad_minima}</td>
      <td><span class="badge badge--estado badge--${escapar(item.estado)}">${escapar(item.estado)}</span></td>
      <td>${ubicacion}</td>
      <td class="table-actions">
        <a class="btn btn--outline btn--sm" href="${editar}">Editar</a>
        <button type="button" class="btn btn--danger btn--sm" data-eliminar-item
          data-nombre="${escapar(item.nombre)}" data-url="${eliminar}">Eliminar</button>
      </td>
    </tr>`;
}

async function recargar() {
  if (!tabla) return;

  const params = new URLSearchParams(obtenerFiltros());
  const resp = await fetch(`/admin/inventario/buscar?${params.toString()}`);
  const items = await resp.json();

  if (contador) contador.textContent = `${items.length} ítem(s)`;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No hay ítems que coincidan con la búsqueda.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(filaItem).join('');
}

let temporizador = null;
if (busqueda) {
  busqueda.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(recargar, 250);
  });
}

selectoresFiltro.forEach((sel) => {
  const el = document.querySelector(sel);
  if (el) el.addEventListener('change', recargar);
});

/* Modal de confirmación de eliminación (T-21) */
const modal = document.querySelector('[data-modal-eliminar]');
let formEliminar = null;

if (modal) {
  const texto = document.getElementById('modal-texto');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-eliminar-item]');
    if (btn) {
      e.preventDefault();
      texto.textContent = `¿Seguro que querés eliminar "${btn.dataset.nombre}" del inventario? Esta acción no se puede deshacer.`;
      formEliminar = modal.querySelector('[data-form-eliminar]');
      formEliminar.action = btn.dataset.url;
      modal.classList.add('modal--abierto');
      modal.setAttribute('aria-hidden', 'false');
      return;
    }

    if (e.target.closest('[data-cerrar-modal]')) {
      cerrarModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });
}

function cerrarModal() {
  if (!modal) return;
  modal.classList.remove('modal--abierto');
  modal.setAttribute('aria-hidden', 'true');
}