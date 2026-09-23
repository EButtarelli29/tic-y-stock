document.querySelectorAll('[data-confirmar-eliminar]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    const nombre = form.dataset.nombre || 'este usuario';
    if (!window.confirm(`¿Seguro que querés eliminar al usuario "${nombre}"? Esta acción no se puede deshacer.`)) {
      e.preventDefault();
    }
  });
});