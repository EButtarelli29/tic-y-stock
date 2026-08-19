# **Buenas prácticas de desarrollo y calidad de software**

## **¿Qué son las buenas prácticas y por qué importan?**

Las buenas prácticas de desarrollo son un **conjunto de convenciones** que hacen que el código sea legible, organizado y modificable por cualquier integrante del equipo, no solo por quien lo escribió. No son reglas sobre si el código funciona o no: un código puede funcionar perfectamente y, al mismo tiempo, ser imposible de entender para otra persona, o incluso para el mismo autor unas semanas después.

Esto tiene una consecuencia concreta en un proyecto de varias personas trabajando sobre el mismo repositorio, como el que están construyendo. Cuando no se aplican buenas prácticas, el código se vuelve:

- más lento de corregir, porque los errores son difíciles de encontrar si nadie entiende bien qué hace cada parte;   
- más difícil de ampliar, porque una base desordenada multiplica los errores cada vez que se agrega una función nueva;   
- y más propenso a fallar, porque los problemas crecen sin que nadie los note hasta que el sistema colapsa. 

Estas consecuencias no aparecen de inmediato: se acumulan con el tiempo, lo que hace que parezca que no aplicar buenas prácticas no tiene costo, hasta que ese costo se vuelve imposible de ignorar.

En esta clase se trabajan cuatro de ellas en detalle: la nomenclatura de variables y funciones, la organización de archivos, el uso de comentarios, y la legibilidad e indentación del código.

### **Variables y funciones: convenciones de nomenclatura**

El nombre de una variable o de una función es, muchas veces, la única información disponible sobre qué hace esa parte del código, sin necesidad de leer lo que sigue. Un buen nombre describe con precisión su contenido o su propósito.

* ❌ Nombres que no dicen nada: x, datos, f1, cosa.  
* ✅ Nombres que describen: usuarioActual, validarFormulario(), estaAutenticado.

La convención general es la siguiente: 

1. Las variables se nombran con sustantivos que describen qué contienen (emailUsuario, no e);   
2. Las funciones se nombran con verbos que describen qué hacen (guardarRegistro(), no funcion2()); y los booleanos, (valores que son verdadero o falso), se nombran como una pregunta o un estado (estaActivo, haIniciadoSesion). 

Esta convención se aplica de manera uniforme en todo el proyecto: no alcanza con que cada integrante nombre bien lo suyo si el criterio cambia de un archivo a otro.

### 

### **Organización de archivos: separación por responsabilidad**

La misma lógica de separación por función que se aplicó al organizar el repositorio en carpetas (código, recursos, documentación) se repite dentro de la carpeta de código, a un nivel más fino: cada archivo agrupa el código relacionado con una sola responsabilidad. En un proyecto web, esto significa, por ejemplo, separar en archivos distintos la lógica de autenticación, la lógica de las vistas de administración y la lógica de acceso a datos, en vez de mezclar todo en un único archivo extenso.

Esta separación tiene un efecto práctico inmediato en el trabajo en equipo: si cada responsabilidad vive en su propio archivo, dos integrantes pueden trabajar en paralelo sobre partes distintas del sistema con menos probabilidad de generar conflictos al combinar sus cambios.

### **Comentarios: cuándo suman y cuándo son ruido**

Un comentario tiene sentido cuando explica el *por qué* de una decisión, no el *qué* hace una línea, porque eso último ya lo dice el código, si está bien escrito.

* ❌ // valida el email sobre la línea if (validarEmail(email)) { ... } (redundante: el código ya lo dice)  
* ✅ // se valida el formato antes de consultar la base de datos, para evitar consultas innecesarias sobre esa misma línea (explica la razón, que el código por sí solo no muestra)

Un código lleno de comentarios que repiten lo obvio es tan difícil de leer como uno sin ningún comentario: el ruido termina tapando la información que sí es útil. Un comentario bien escrito, en cambio, ahorra tiempo a cualquiera que necesite entender por qué el código está resuelto de una manera y no de otra.

### **Legibilidad e indentación: consistencia en el código**

La indentación, (los espacios o tabulaciones que muestran la jerarquía del código), no es una cuestión estética: permite ver de un vistazo qué bloque de código pertenece a qué condición, función o estructura de control. La mayoría de los editores de código la aplican automáticamente a medida que se escribe. Lo que queda a cargo del equipo es mantenerla consistente en todo el proyecto: que no cada integrante use su propio estilo, sino el mismo criterio en todos los archivos, independientemente de quién los haya escrito.

#### **El documento de convenciones del proyecto**

Las buenas prácticas dejan de ser útiles si cada integrante lo interpreta a su manera. Para que las buenas prácticas funcionen en equipo, no alcanza con conocerlas: hace falta acordarlas por escrito, en un documento de referencia propio del proyecto. 

Un **documento de convenciones** reúne las reglas concretas que ese equipo, en particular, va a seguir de acá en adelante: 

- cómo se nombran las variables y funciones en su proyecto,   
- qué carpeta o archivo le corresponde a cada tipo de lógica a medida que el código crece,   
- y qué aspectos de calidad son más críticos para lo que están construyendo. 

No es una lista genérica copiada de un manual: se escribe con ejemplos reales del propio proyecto, y su función es simple, cualquier integrante del equipo puede (y debe) consultarlo antes de escribir código nuevo, en vez de decidir cada vez por su cuenta. 

### **Calidad de software: qué significa**

Un sistema puede cumplir su función y, aún así, ser de mala calidad: lento, difícil de modificar, inaccesible para ciertos usuarios, o inseguro frente a un uso malintencionado. *"Funciona"* no es sinónimo de *"tiene calidad"*. 

La calidad de software es un concepto con múltiples dimensiones, no una característica única y binaria que se cumple o no se cumple.

Esta distinción importa particularmente en un proyecto como este, que involucra el manejo de datos de usuarios (login, registro, información administrada desde un panel): un sistema que funciona en la demostración pero falla ante un dato inesperado, o que expone información que debería estar protegida, no es un sistema de calidad, aunque cumpla su función principal.

### **El marco ISO/IEC 25010**

Para poder hablar de calidad de forma ordenada y no como una impresión subjetiva, existe una norma internacional (ISO/IEC 25010\) que descompone la calidad de un sistema de software en ocho características:

1. **Adecuación funcional**: si el sistema hace lo que tiene que hacer, de forma completa y correcta.  
2. **Eficiencia de desempeño**: cómo usa los recursos —tiempo, memoria, capacidad de procesamiento— para cumplir su función.  
3. **Compatibilidad**: si puede convivir o intercambiar información con otros sistemas sin generar conflictos.  
4. **Usabilidad**: qué tan fácil resulta de aprender y de usar para quien lo opera. (Heuristica de Nielsen)  
5. **Fiabilidad**: qué tan estable es y cómo se comporta ante fallos.  
6. **Seguridad**: cómo protege la información y controla el acceso al sistema.  
7. **Mantenibilidad**: qué tan fácil es modificarlo, corregirlo o extenderlo.  
8. **Portabilidad**: qué tan fácil es trasladarlo a otro entorno o dispositivo.

La norma ISO/IEC 25010 forma parte de una familia más amplia de normas de calidad de software, conocida como SQuaRE (*Software product Quality Requirements and Evaluation*), publicada y mantenida por la Organización Internacional de Normalización (ISO) junto con la Comisión Electrotécnica Internacional (IEC). 

Su función no es imponer un único modo correcto de programar, sino ofrecer un vocabulario común: cuando dos equipos, dos empresas o dos personas hablan de "calidad", esta norma permite que se refieran exactamente a lo mismo, en vez de que cada uno tenga en mente una idea distinta de qué significa "un buen sistema". Por eso se usa tanto en el desarrollo de software como en su evaluación posterior: sirve tanto para guiar decisiones de diseño durante la construcción de un sistema, como para auditar un sistema ya terminado y determinar en qué medida cumple con cada una de sus ocho características.

Este marco no se agota en una sola clase: a lo largo de las próximas, cada una de estas características se retoma con mayor profundidad, siempre en relación directa con el sprint que el equipo esté desarrollando en ese momento. La idea no es memorizar las ocho características de una vez, sino ir reconociéndolas a medida que el proyecto las hace relevantes.