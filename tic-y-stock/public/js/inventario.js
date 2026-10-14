/**
 * Panel admin > Inventario.
 *
 * El filtrado lo hace el servidor (GET /admin/inventario) y no esta página: así
 * el listado, el contador y la paginación cuentan siempre lo mismo, y la URL
 * con los filtros queda lista para compartir o marcar como favorito. Acá solo
 * se dispara el form (con un debounce) y se maneja el modal de borrado (T-21).
 */

const formFiltros = document.querySelector('[data-filtros-form]');
const busqueda = document.querySelector('[data-busqueda]');

/** Vuelve a la primera página: si no, un filtro sobre la página 5 no muestra nada. */
function filtrar() {
  if (!formFiltros) return;
  const pagina = formFiltros.querySelector('[name="pagina"]');
  if (pagina) pagina.value = '1';
  formFiltros.submit();
}

let temporizador = null;
if (busqueda && formFiltros) {
  busqueda.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(filtrar, 400);
  });
}

['#categoria', '#estado', '#ubicacion', '#orden', '#stock_critico'].forEach((sel) => {
  const el = document.querySelector(sel);
  if (el) el.addEventListener('change', filtrar);
});

/* Modal de confirmación de eliminación (T-21) */
const modal = document.querySelector('[data-modal-eliminar]');

if (modal) {
  const texto = document.getElementById('modal-texto');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-eliminar-item]');
    if (btn) {
      e.preventDefault();
      texto.textContent = `¿Seguro que querés eliminar "${btn.dataset.nombre}" del inventario? Esta acción no se puede deshacer.`;
      modal.querySelector('[data-form-eliminar]').action = btn.dataset.url;
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
