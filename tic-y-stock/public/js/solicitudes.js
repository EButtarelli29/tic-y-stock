/**
 * Formulario de reserva (F8 — T-42).
 *
 * Avisa el stock disponible del material elegido, que es el dato que evita pedir
 * de más. La validación de verdad vive en el servidor: acá solo se muestra.
 */
const selectItem = document.querySelector('[data-item-reserva]');
const avisoStock = document.querySelector('[data-stock-disponible]');
const inputCantidad = document.querySelector('[data-cantidad-reserva]');

if (selectItem && avisoStock) {
  const actualizarStock = () => {
    const opcion = selectItem.selectedOptions[0];
    const stock = opcion ? opcion.dataset.stock : null;
    if (!stock) {
      avisoStock.textContent = '';
      return;
    }
    const n = Number(stock);
    avisoStock.textContent = `Disponibles ahora: ${n} unidad(es).`;
    if (inputCantidad && !inputCantidad.value) inputCantidad.value = '1';
  };

  selectItem.addEventListener('change', actualizarStock);
  actualizarStock();
}
