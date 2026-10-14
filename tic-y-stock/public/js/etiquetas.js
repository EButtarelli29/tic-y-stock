// Dibuja los códigos de barras de las etiquetas (F6 — T-37, T-38).
//
// JsBarcode dibuja un SVG dentro del elemento que se le pasa; acá se le pasa el
// `<svg data-codigo="...">` de cada etiqueta. El número también va escrito en el
// HTML al lado, porque un código de barras que no se puede leer a simple vista no
// sirve de nada: si la etiqueta se arruga o el lector falla, el docente puede
// tipear el número.
//
// Code128 y no EAN-13 porque los códigos son `TIC-000073`, con letras: EAN-13 es
// sólo numérico. Code128 además es lo que leen bien los lectores USB baratos del
// taller.
(function () {
  'use strict';

  const OPCIONES = {
    format: 'CODE128',
    // Sin esto JsBarcode agrega su propio texto adentro del SVG y el número
    // queda duplicado con el que ya está en el HTML de la etiqueta.
    displayValue: false,
    height: 34,
    width: 1.4,
    margin: 0,
    background: '#ffffff',
    lineColor: '#0b0b0b',
  };

  function dibujar(elemento) {
    const codigo = elemento.getAttribute('data-codigo');
    if (!codigo) return;

    if (!window.JsBarcode) {
      // Sin JsBarcode la etiqueta sigue siendo usable: el número está escrito en
      // el HTML y se puede escanear a mano. Sólo falta el dibujo.
      elemento.insertAdjacentHTML(
        'afterend',
        '<span class="etiqueta-sin-dibujo">No se pudo dibujar el código de barras</span>'
      );
      return;
    }

    try {
      window.JsBarcode(elemento, codigo, OPCIONES);
    } catch (_err) {
      // Un código con caracteres que Code128 no soporta haría throw y, si no se
      // captura, dejaría la hoja de etiquetas en blanco sin explicación.
      elemento.insertAdjacentHTML(
        'afterend',
        '<span class="etiqueta-sin-dibujo">Código no imprimible: ' + codigo + '</span>'
      );
    }
  }

  document.querySelectorAll('[data-codigo]').forEach(dibujar);

  const boton = document.querySelector('[data-imprimir]');
  if (boton) {
    boton.addEventListener('click', function () {
      window.print();
    });
  }
})();