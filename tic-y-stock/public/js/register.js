// T-14: validación en frontend del formulario de registro
(function () {
  var form = document.getElementById('register-form');
  var submit = document.getElementById('register-submit');
  if (!form) return;

  function setError(name, message) {
    var input = form.querySelector('[name="' + name + '"]');
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    if (input) input.classList.toggle('invalid', Boolean(message));
    if (slot) slot.textContent = message;
  }

  function validar() {
    var nombre = form.nombre.value.trim();
    var email = form.email.value.trim();
    var password = form.password.value;
    var confirmar = form.confirmar_contrasena.value;

    var nombreValido = nombre.length >= 2;
    var emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var passwordValida = password.length >= 6;
    var coinciden = password === confirmar;

    setError('nombre', nombreValido ? '' : 'Ingresá tu nombre completo.');
    setError('email', emailValido ? '' : 'Ingresá un correo electrónico válido.');
    setError('password', passwordValida ? '' : 'La contraseña debe tener al menos 6 caracteres.');
    setError('confirmar_contrasena', coinciden ? '' : 'Las contraseñas no coinciden.');

    return nombreValido && emailValido && passwordValida && coinciden;
  }

  form.addEventListener('submit', function (e) {
    if (!validar()) {
      e.preventDefault();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Creando cuenta...';
  });

  form.addEventListener('input', function () {
    validar();
  });
})();