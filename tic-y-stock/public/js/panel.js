/**
 * Panel del alumno: filtrado por texto mientras se escribe (T-26).
 *
 * El filtro es una comodidad inmediata sobre las tarjetas ya cargadas; la
 * búsqueda real la hace el servidor al enviar el formulario (GET /panel?q=...),
 * que es la única fuente de verdad cuando hay muchos materiales.
 */

const grilla = document.querySelector('[data-grilla-materiales]');
const busqueda = document.querySelector('[data-filtro-busqueda]');
const sinResultados = document.querySelector('[data-sin-resultados]');

if (grilla && busqueda) {
  const cards = Array.from(grilla.querySelectorAll('[data-texto]'));

  busqueda.addEventListener('input', () => {
    const q = busqueda.value.trim().toLowerCase();
    let visibles = 0;

    cards.forEach((card) => {
      const coincide = !q || card.dataset.texto.includes(q);
      card.hidden = !coincide;
      if (coincide) visibles += 1;
    });

    if (sinResultados) sinResultados.hidden = visibles > 0;
  });
}
