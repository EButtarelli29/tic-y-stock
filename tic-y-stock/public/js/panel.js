const grilla = document.querySelector('[data-grilla-materiales]');
const busqueda = document.querySelector('[data-filtro-busqueda]');

if (grilla && busqueda) {
  const cards = Array.from(grilla.querySelectorAll('[data-nombre]'));

  busqueda.addEventListener('input', () => {
    const q = busqueda.value.trim().toLowerCase();
    cards.forEach((card) => {
      card.hidden = !q || !card.dataset.nombre.includes(q);
    });
  });
}