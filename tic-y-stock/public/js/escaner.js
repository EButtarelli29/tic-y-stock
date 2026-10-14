// Escaneo de códigos de barras (F6 — T-33 a T-36).
//
// Tres caminos, todos terminan en el mismo lado:
//
//   1. Lector USB. Un lector de códigos de barras se comporta como un teclado:
//      tipea el código a una velocidad que nadie alcanza y manda Enter. No hace
//      falta ninguna librería ni capturar teclas a mano: alcanza con dejar que el
//      Enter del teclado dispare el submit del `<form>`.
//   2. Cámara del dispositivo. ZXing, vendorizado (ver public/vendor/README.md).
//   3. Tipeo manual. El mismo `<form>` del punto 1.
//
// El 1 y el 3 son el mismo formulario a propósito: la página tiene que funcionar
// sin JavaScript, porque en el taller la cámara puede estar bloqueada (los
// navegadores dan la cámara sólo por HTTPS o en localhost) y el lector puede
// estar sin enchufar. El JS es una mejora, nunca un requisito.
(function () {
  'use strict';

  const form = document.querySelector('[data-escaner]');
  if (!form) return;

  const input = document.querySelector('[data-escaner-input]');
  const botonCamara = document.querySelector('[data-escaner-camara]');
  const botonCerrar = document.querySelector('[data-escaner-cerrar]');
  const video = document.querySelector('[data-escaner-video]');
  const estado = document.querySelector('[data-escaner-estado]');

  let lector = null;          // el reader de ZXing, o null si la cámara está apagada
  let procesando = false;     // ya se está resolviendo un código, no aceitar otro

  function setEstado(texto) {
    if (estado) estado.textContent = texto;
  }

  /**
   * Mandar el formulario al servidor con el código leído.
   *
   * Se usa el submit nativo en vez de `fetch` para que la ruta viva en el
   * `<form action>` de la vista y no hardcodeada acá: si algún día el escaneo se
   * mueve de URL, esta función no puede quedar apuntando al lugar viejo.
   */
  function enviar() {
    if (!input || !input.value.trim()) return;
    form.submit();
  }

  // Foco en el campo al cargar: con el lector enchufado, el primer escaneo
  // funciona sin que el docente haga nada.
  if (input) input.focus();

  /* ------------------------------------------------------------ cámara (ZXing) */

  function puedeUsarCamara() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Confirmar el código leído contra la base antes de seguir.
   *
   * El paso intermedio vale la pena: si el código no existe, o el ítem está dado
   * de baja, o no hay nada que entregar ni que devolver, el docente se entera en
   * pantalla y no después de llenar un formulario entero para que el servidor se
   * lo rechace.
   */
  async function confirmar(codigo) {
    procesando = true;
    if (input) input.value = codigo;

    try {
      const respuesta = await fetch('/api/items/' + encodeURIComponent(codigo));
      const datos = await respuesta.json();

      if (!datos.ok) {
        setEstado(
          'El código "' + codigo + '" no existe en el inventario. Revisá la etiqueta o escribilo a mano.'
        );
        if (input) input.select();
        return;
      }

      if (!datos.registrable) {
        setEstado(
          datos.item.estado === 'baja'
            ? datos.item.nombre + ' está dado de baja: no se puede mover.'
            : datos.item.nombre + ' no tiene nada para entregar ni nada devuelto.'
        );
        if (input) input.select();
        return;
      }

      enviar();
    } catch (_err) {
      // Sin red el escaneo automático no sirve, pero el formulario escrito anda.
      setEstado('No pude verificar el código. Probá otra vez o escribilo a mano.');
    }
  }

  function apagarCamara() {
    if (lector) {
      try {
        lector.reset();
      } catch (_err) {
        // ZXing tira si el reader ya estaba parado. Da igual.
      }
      lector = null;
    }
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((pista) => pista.stop());
      video.srcObject = null;
    }
    // El `<video>` está oculto por CSS mientras no hay cámara: sin este atributo
    // queda un marco negro del tamaño de la caja.
    if (video) delete video.dataset.activo;
    if (botonCamara) botonCamara.hidden = false;
    if (botonCerrar) botonCerrar.hidden = true;
  }

  async function encenderCamara() {
    if (!window.ZXing || !window.ZXing.BrowserMultiFormatReader) {
      setEstado('No se pudo cargar el lector de cámara (falta ZXing). Usá el lector USB o escribí el código.');
      return;
    }
    if (!puedeUsarCamara()) {
      setEstado(
        'Este navegador no habilita la cámara sin HTTPS, y en la red del colegio se entra por http. Usá el lector USB o escribí el código.'
      );
      return;
    }

    setEstado('Pidiendo permiso para usar la cámara…');

    try {
      lector = new window.ZXing.BrowserMultiFormatReader();
      await lector.decodeFromVideoDevice(undefined, video, function (resultado) {
        // `procesando` evita que un mismo código, leído en dos cuadros seguidos,
        // dispare dos navegaciones.
        if (resultado && !procesando) {
          const codigo = String(resultado.getText() || '').trim();
          if (codigo) {
            apagarCamara();
            confirmar(codigo);
          }
        }
      });

      if (botonCamara) botonCamara.hidden = true;
      if (botonCerrar) botonCerrar.hidden = false;
      if (video) video.dataset.activo = '1';
      setEstado('Mostrando la cámara. Apuntá al código de barras de la etiqueta.');
    } catch (err) {
      lector = null;
      const nombre = err && err.name ? err.name : '';
      setEstado(
        nombre === 'NotAllowedError'
          ? 'No diste permiso para usar la cámara. Usá el lector USB o escribí el código.'
          : 'No se pudo abrir la cámara. Usá el lector USB o escribí el código.'
      );
    }
  }

  if (botonCamara) {
    botonCamara.addEventListener('click', function () {
      if (lector) apagarCamara();
      else encenderCamara();
    });
  }
  if (botonCerrar) {
    botonCerrar.addEventListener('click', apagarCamara);
  }

  // Apagar la cámara al irse de la página: sin esto el led sigue encendido
  // cuando el docente cierra la pestaña.
  window.addEventListener('pagehide', apagarCamara);
})();