// Carga datos de ejemplo del taller TIC para poder probar la aplicación sin
// tener que cargar todo a mano. Uso: npm run db:demo
//
// No pisa lo que ya está cargado: si encuentra ítems, avisa y no hace nada.
// Para empezar de cero: npm run db:demo -- --reset
//
// Además: npm run db:demo -- --movimientos agrega un historial de retiros y
// devoluciones sobre esos mismos ítems (F5). Es opt-in aparte para no cambiar
// las cantidades que ya revisaste.
require('dotenv').config();

const pool = require('../models/db');
const Item = require('../models/item.model');
const Movimiento = require('../models/movimiento.model');
const User = require('../models/user.model');

// Materiales del pañol de una escuela técnica: lo que se usa, se rompe y se
// repone a lo largo del año. Mezcla categorías, estados y ubicaciones, y deja
// varios ítems en o por debajo del mínimo para que el stock crítico del
// dashboard tenga algo que mostrar.
const ITEMS = [
  // Cables y conectividad
  { nombre: 'Cable UTP Cat6 (caja 305 m)', categoria: 'Cables', cantidad: 3, cantidad_minima: 2, estado: 'disponible', ubicacion: 'Estante A1', observaciones: 'Dos cajas abiertas durante el primer trimestre.' },
  { nombre: 'Cable UTP Cat6 (rollo 305 m)', categoria: 'Cables', cantidad: 0, cantidad_minima: 2, estado: 'baja', ubicacion: 'Estante A1', observaciones: 'Rollos vacíos, se descartaron.' },
  { nombre: 'Conector RJ45 Cat6', categoria: 'Cables', cantidad: 180, cantidad_minima: 100, estado: 'disponible', ubicacion: 'Cajón A2', observaciones: 'Bolsas de 100 unidades.' },
  { nombre: 'Patch panel 24 puertos Cat6', categoria: 'Cables', cantidad: 2, cantidad_minima: 3, estado: 'disponible', ubicacion: 'Estante A3', observaciones: 'Falta comprar uno para el rack nuevo.' },
  { nombre: 'Cable de red tendido 20 m', categoria: 'Cables', cantidad: 4, cantidad_minima: 2, estado: 'disponible', ubicacion: 'Estante A1' },
  { nombre: 'Bobina de fibra óptica OM3', categoria: 'Cables', cantidad: 1, cantidad_minima: 1, estado: 'disponible', ubicacion: 'Estante A4', observaciones: 'Se presta a cursos de cuarto año.' },
  { nombre: 'Latiguillo de fibra LC-LC', categoria: 'Cables', cantidad: 9, cantidad_minima: 8, estado: 'disponible', ubicacion: 'Cajón A2' },

  // Instrumentos de medición
  { nombre: 'Multímetro digital Fluke 107', categoria: 'Instrumentos', cantidad: 3, cantidad_minima: 2, estado: 'disponible', ubicacion: 'Gaveta B1', observaciones: 'Con pila nueva y funda.' },
  { nombre: 'Tester de cable de red', categoria: 'Instrumentos', cantidad: 4, cantidad_minima: 2, estado: 'disponible', ubicacion: 'Gaveta B1' },
  { nombre: 'Osciloscopio 20 MHz', categoria: 'Instrumentos', cantidad: 1, cantidad_minima: 1, estado: 'disponible', ubicacion: 'Armario B3', observaciones: 'Se usa con turno previo pedido al docente.' },
  { nombre: 'Pinza amperimétrica 100 A', categoria: 'Instrumentos', cantidad: 0, cantidad_minima: 2, estado: 'en_reparacion', ubicacion: 'Taller de reparaciones', observaciones: 'La pinza interna está quemada. Llega el repuesto en dos semanas.' },
  { nombre: 'Sonda lógica TTL', categoria: 'Instrumentos', cantidad: 5, cantidad_minima: 4, estado: 'disponible', ubicacion: 'Gaveta B1' },

  // Fuentes de alimentación
  { nombre: 'Fuente regulada 0-30 V / 5 A', categoria: 'Fuentes', cantidad: 2, cantidad_minima: 3, estado: 'disponible', ubicacion: 'Estante C1' },
  { nombre: 'Fuente con lectura digital de laboratorio', categoria: 'Fuentes', cantidad: 1, cantidad_minima: 1, estado: 'en_reparacion', ubicacion: 'Taller de reparaciones', observaciones: 'No enciende: revisar la fuente de alimentación switching.' },
  { nombre: 'Transformador de aislación 500 VA', categoria: 'Fuentes', cantidad: 2, cantidad_minima: 1, estado: 'disponible', ubicacion: 'Estante C1' },

  // Periféricos
  { nombre: 'Mouse óptico USB', categoria: 'Periféricos', cantidad: 12, cantidad_minima: 10, estado: 'disponible', ubicacion: 'Cajón D1' },
  { nombre: 'Teclado USB estándar', categoria: 'Periféricos', cantidad: 12, cantidad_minima: 10, estado: 'disponible', ubicacion: 'Cajón D1' },
  { nombre: 'Mouse inalámbrico', categoria: 'Periféricos', cantidad: 1, cantidad_minima: 4, estado: 'disponible', ubicacion: 'Cajón D1', observaciones: 'Se rompieron los botones. Hay que comprar.' },
  { nombre: 'Headset con micrófono', categoria: 'Periféricos', cantidad: 6, cantidad_minima: 6, estado: 'disponible', ubicacion: 'Armario D3', observaciones: 'Se prestan a alumnos de cuarto año.' },
  { nombre: 'Monitor 21,5 pulgadas LED', categoria: 'Periféricos', cantidad: 7, cantidad_minima: 6, estado: 'disponible', ubicacion: 'Aula de informática' },
  { nombre: 'Webcam USB HD', categoria: 'Periféricos', cantidad: 4, cantidad_minima: 3, estado: 'disponible', ubicacion: 'Cajón D2' },

  // Redes
  { nombre: 'Switch 8 puertos gestionable', categoria: 'Redes', cantidad: 3, cantidad_minima: 2, estado: 'disponible', ubicacion: 'Estante E1' },
  { nombre: 'Switch 24 puertos no gestionable', categoria: 'Redes', cantidad: 5, cantidad_minima: 4, estado: 'disponible', ubicacion: 'Estante E1' },
  { nombre: 'Access point Wi-Fi doble banda', categoria: 'Redes', cantidad: 1, cantidad_minima: 2, estado: 'disponible', ubicacion: 'Rack de la biblioteca' },
  { nombre: 'Router Fritz!Box 7590', categoria: 'Redes', cantidad: 1, cantidad_minima: 1, estado: 'disponible', ubicacion: 'Rack de la biblioteca', observaciones: 'La contraseña de administración está en la carpeta del docente.' },
  { nombre: 'Antena direccional 2,4 GHz', categoria: 'Redes', cantidad: 0, cantidad_minima: 1, estado: 'baja', ubicacion: null, observaciones: 'Se rompió el soporte. Retirado.' },

  // Insumos de electrónica
  { nombre: 'Breadboard 830 puntos', categoria: 'Insumos', cantidad: 15, cantidad_minima: 10, estado: 'disponible', ubicacion: 'Cajón F1' },
  { nombre: 'Cable Dupont, juego de 40', categoria: 'Insumos', cantidad: 14, cantidad_minima: 12, estado: 'disponible', ubicacion: 'Cajón F1' },
  { nombre: 'Resistencias 1/4 W, surtido', categoria: 'Insumos', cantidad: 200, cantidad_minima: 100, estado: 'disponible', ubicacion: 'Cajón F2', observaciones: 'En bolsas de 100 por valor.' },
  { nombre: 'LED 5 mm, surtido de colores', categoria: 'Insumos', cantidad: 0, cantidad_minima: 3, estado: 'disponible', ubicacion: 'Cajón F2' },
  { nombre: 'Soldador de estaño 25 W', categoria: 'Insumos', cantidad: 6, cantidad_minima: 4, estado: 'disponible', ubicacion: 'Gaveta F3' },
  { nombre: 'Estaño 0,7 mm con flux', categoria: 'Insumos', cantidad: 6, cantidad_minima: 5, estado: 'disponible', ubicacion: 'Gaveta F3' },
  { nombre: 'Pinza pelacables', categoria: 'Insumos', cantidad: 7, cantidad_minima: 5, estado: 'disponible', ubicacion: 'Gaveta F3' },
  { nombre: 'Cinta de aislar, varios colores', categoria: 'Insumos', cantidad: 11, cantidad_minima: 8, estado: 'disponible', ubicacion: 'Cajón F1' },
];

/**
 * Historial de ejemplo para F5 (T-28 a T-32).
 *
 * `dias` es la cantidad de días que pasó desde el retiro, y `devolucion` los días
 * que pasó hasta la devolución (`null` = sigue afuera del pañol).
 *
 * Nota sobre el estado: los ítems de arriba NO se cargan como `prestado`. El
 * estado se calcula a partir de los movimientos, así que un ítem marcado así sin
 * ningún préstamo detrás se normaliza a `disponible` al guardarlo. Los dos
 * préstamos abiertos de esta lista caen en los dos ítems que efectivamente los
 * tienen ("Bobina de fibra óptica OM3" y "Headset con micrófono"), así que al
 * cargar `-- --movimientos` quedan prestadados de verdad, no por declaración.
 */
const MOVIMIENTOS = [
  { item: 'Osciloscopio 20 MHz', cantidad: 1, dias: 25, devolucion: 12, nota: 'Medición de la fuente regulada del laboratorio', notaDevolucion: 'Vuelve con la pinza de punta.' },
  { item: 'Multímetro digital Fluke 107', cantidad: 1, dias: 20, devolucion: 6, nota: 'Reparación de un monitor de la sala B' },
  { item: 'Cable UTP Cat6 (caja 305 m)', cantidad: 1, dias: 15, devolucion: 3, nota: 'Armado del patch del rack nuevo' },
  { item: 'Tester de cable de red', cantidad: 2, dias: 12, devolucion: 4, nota: 'Certificado de red del aula de informática', notaDevolucion: 'Uno se rompió, queda en el taller de reparaciones.' },
  { item: 'Breadboard 830 puntos', cantidad: 3, dias: 8, devolucion: 2, nota: 'Práctica de Electrónica' },
  { item: 'Soldador de estaño 25 W', cantidad: 1, dias: 6, devolucion: 1, nota: 'Soldar un conector en un proyecto' },
  { item: 'Mouse óptico USB', cantidad: 3, dias: 2, devolucion: 1, nota: 'Práctica de ofimática' },
  // Los dos siguientes siguen abiertos (devolucion = null).
  { item: 'Bobina de fibra óptica OM3', cantidad: 1, dias: 30, devolucion: null, nota: 'Curso de cuarto año: se devuelve al cierre del trimestre' },
  { item: 'Headset con micrófono', cantidad: 2, dias: 5, devolucion: null, nota: 'Práctica de comunicación, clase de los jueves' },
];

/** Fecha MySQL (`YYYY-MM-DD HH:MM:SS`) de hace `dias` días, a las 11:30. */
function haceDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(11, 30, 0, 0);
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())} ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}:00`;
}

async function cargarMovimientos() {
  const yaHay = await pool.query('SELECT COUNT(*) AS total FROM movimientos');
  if (yaHay[0][0].total > 0) {
    console.log(`Ya hay ${yaHay[0][0].total} movimiento(s) cargados: no se agrega nada.`);
    return;
  }

  const alumnos = await User.findAll({ rol: 'usuario' });
  if (alumnos.length === 0) {
    console.log('No hay alumnos registrados: hace falta al menos uno para asentar los movimientos.');
    return;
  }

  const items = await Item.findAll({});
  const porNombre = new Map(items.map((i) => [i.nombre, i]));

  let creados = 0;
  for (const [indice, mov] of MOVIMIENTOS.entries()) {
    const item = porNombre.get(mov.item);
    if (!item) {
      console.log(`  (omitido: no está el ítem "${mov.item}")`);
      continue;
    }
    const alumno = alumnos[indice % alumnos.length];

    const retiro = await Movimiento.registrarRetiro({
      id_item: item.id,
      id_usuario: alumno.id,
      cantidad: mov.cantidad,
      observaciones: mov.nota,
      fecha_hora: haceDias(mov.dias),
    });
    if (!retiro.ok) {
      console.log(`  (omitido: ${mov.item} -> ${Object.values(retiro.errores).join(' ')})`);
      continue;
    }
    creados += 1;

    if (mov.devolucion !== null) {
      const devolucion = await Movimiento.registrarDevolucion({
        id_retiro: retiro.id,
        id_usuario: alumno.id,
        observaciones: mov.notaDevolucion || '',
        fecha_hora: haceDias(mov.devolucion),
      });
      if (!devolucion.ok) {
        console.log(`  (aviso: no se pudo devolver ${mov.item}: ${Object.values(devolucion.errores).join(' ')})`);
      }
    }
  }

  const abiertos = await Movimiento.contarPrestamosActivos();
  console.log(`Listo: ${creados} retiros y sus devoluciones cargados (${abiertos} préstamos siguen abiertos).`);
  console.log('Mirá el historial en /admin/movimientos y "Mis préstamos" entrando como alumno.');
}

async function main() {
  const reset = process.argv.includes('--reset');
  const conMovimientos = process.argv.includes('--movimientos');
  const total = await Item.contar();

  if (total > 0 && !reset) {
    console.log(`Ya hay ${total} item(s) cargados: no se toca nada.`);
    console.log('Para reemplazarlos por los datos de ejemplo: npm run db:demo -- --reset');
    if (conMovimientos) {
      await cargarMovimientos();
    }
    await pool.end();
    return;
  }

  if (total > 0) {
    console.log(`Borrando ${total} item(s) previos...`);
    await pool.query('DELETE FROM items');
  }

  for (const item of ITEMS) {
    await Item.create(item);
  }

  const criticos = await Item.stockCritico();
  console.log(`Listo: ${ITEMS.length} items del taller cargados (${criticos} en stock critico).`);
  console.log('Entra como docente (npm run db:seed) para verlos en /admin/inventario.');

  if (conMovimientos) {
    await cargarMovimientos();
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Error cargando los datos de ejemplo:', err.message);
  process.exit(1);
});
