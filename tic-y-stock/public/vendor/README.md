# Librerías vendorizadas (F6)

Estas dos librerías se sirven desde el propio repositorio, **no desde una CDN**.
El sistema tiene que funcionar en la red del taller, que no tiene salida a
internet (RNF-04), y por eso las dependencias de frontend de F6 se congelan acá.

Se bajan una sola vez, se guardan con el número de versión en el nombre y no se
actualizan a ciegas: si hay que subir de versión, se reemplaza el archivo, se
actualiza esta ficha y se vuelve a correr `test-f6.js` y `revisa-html-f6.js`.

| Archivo | Versión | Licencia | Uso |
| --- | --- | --- | --- |
| `zxing-0.23.0.min.js` | 0.23.0 | Apache-2.0 | Leer códigos de barras/QR con la cámara (`T-34`) |
| `jsbarcode-3.12.3.min.js` | 3.12.3 | MIT | Dibujar el código de barras de las etiquetas (`T-37`) |

## ZXing

- Proyecto: `@zxing/library` — <https://github.com/zxing-js/library>
- Bundle UMD para navegador (`zxing.min.js`), global `ZXing`.
- Licencia: Apache License 2.0 — <https://www.apache.org/licenses/LICENSE-2.0>
- Se usa como **contingencia**: el camino principal para escanear es el lector
  USB (que se comporta como teclado). La cámara puede estar bloqueada por el
  navegador cuando la página se sirve por HTTP en la red local, así que el
  escaneo funciona igual sin esta librería (tipeo manual).

## JsBarcode

- Proyecto: JsBarcode — <https://github.com/lindell/JsBarcode>
- Licencia: MIT — `(c) Johan Lindell`
- Se usa para las etiquetas imprimibles (formato `CODE128`). Debajo del dibujo
  siempre va el código escrito, así que la etiqueta sigue siendo legible aunque
  el script no cargue.
