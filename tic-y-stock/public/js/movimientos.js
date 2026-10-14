/**
 * Panel admin > Movimientos.
 *
 * Igual que en el inventario, el filtrado es del servidor: la tabla, el
 * contador y la paginación tienen que contar lo mismo, y la URL con los filtros
 * queda compartible. Acá solo se dispara el form (con debounce) y se avisa el
 * límite de stock del ítem elegido, que es el dato que más engaña al llenar el
 * formulario a mano.
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

['#tipo', '#item', '#usuario', '#desde', '#hasta', '#orden', '#abiertos'].forEach((sel) => {
  const el = document.querySelector(sel);
  if (el) el.addEventListener('change', filtrar);
});

/* Formulario de retiro: el stock disponible del ítem elegido. */
const selectItem = document.querySelector('[data-item-retiro]');
const avisoStock = document.querySelector('[data-stock-disponible]');
const inputCantidad = document.querySelector('[data-cantidad-retiro]');

if (selectItem && avisoStock) {
  const actualizarStock = () => {
    const opcion = selectItem.selectedOptions[0];
    const stock = opcion ? opcion.dataset.stock : null;
    if (!stock) {
      avisoStock.textContent = '';
      return;
    }
    const n = Number(stock);
    avisoStock.textContent = `Stock en el pañol: ${n} unidad(es).`;
    if (inputCantidad && !inputCantidad.value) inputCantidad.value = '1';
  };

  selectItem.addEventListener('change', actualizarStock);
  actualizarStock();
}