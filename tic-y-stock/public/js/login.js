// T-09: validación en frontend del formulario de inicio de sesión
(function () {
  var form = document.getElementById('login-form');
  var submit = document.getElementById('login-submit');
  if (!form) return;

  function setError(name, message) {
    var input = form.querySelector('[name="' + name + '"]');
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    if (input) input.classList.toggle('invalid', Boolean(message));
    if (slot) slot.textContent = message;
  }

  function validar() {
    var email = form.email.value.trim();
    var password = form.password.value;

    var emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError('email', emailValido ? '' : 'Ingresá un correo electrónico válido.');
    setError('password', password ? '' : 'Ingresá tu contraseña.');

    return emailValido && Boolean(password);
  }

  form.addEventListener('submit', function (e) {
    if (!validar()) {
      e.preventDefault();
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Ingresando...';
  });

  form.addEventListener('input', function () {
    validar();
  });
})();