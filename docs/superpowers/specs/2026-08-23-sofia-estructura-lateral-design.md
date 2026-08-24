# SOFIA — Estructura lateral y acciones sobre selección

**Fecha:** 23 de agosto de 2026
**Reemplaza:** la estructura de tres destinos del plan `2026-08-23-sofia-tres-destinos.md`, no su contenido.

## Por qué

El rediseño a tres destinos resolvió *qué* muestra cada pantalla, pero el dueño lo rechazó por
cómo se ve y cómo se usa: «parece una pantalla y ya», «no hay concordancia con el objetivo del
proyecto», «lo que falla es el diseño». Dos intentos míos de proponer dirección visual fallaron
por la misma razón: cambiaba color y tipografía, no la estructura.

La referencia la puso él: **Cattlytics**, en lo que sea relevante. Se revisó su interfaz real, no
su publicidad.

## Qué se toma de Cattlytics

| Patrón | Por qué aplica aquí |
|---|---|
| Menú lateral izquierdo, colapsable, un renglón por función | «Anotar → escoger modo» son dos pasos para algo que se hace a diario. En el menú cada acción es un clic. |
| Encabezado de página: título a la izquierda, acciones a la derecha | Hoy las acciones están regadas dentro de cada pantalla. |
| Tiras de cifras compactas con ícono, no una cinta grande | La cinta de cuatro cifras iguales no jerarquiza nada. |
| Barra de herramientas en una fila: filtros a la izquierda, buscar a la derecha, cambio de vista | Hoy los filtros, los chips y el cambio de vista están en tres sitios. |
| **Selección múltiple con barra de acciones** | Es lo que vuelve fácil actuar: se marcan animales en la lista y se les hace algo sin cambiar de pantalla. |
| La chapeta como identidad de cada tarjeta, con una línea de estado debajo | La chapeta es el número que se lee en el corral. Hoy es texto gris chiquito. |

**No se toma:** su verde de marca, sus categorías (Heifer/Bull/Calf) y su vocabulario en inglés.

## Decisiones del dueño

- **El fondo pasa de crema a blanco.**
- **El verde pasa a `#008000`.**
- **La accesibilidad para daltonismo deja de ser un criterio.** Se planteó, el dueño decidió que
  no le importa. No se vuelve a levantar.
- **La curva del lote se queda como está** en cuanto a qué información muestra: peso promedio
  contra la trayectoria objetivo. Se descartaron el ranking por animal, las barras de avance y la
  opción sin gráfico.
- **La portada responde dos preguntas y no cinco:** «¿voy a llegar a la meta?» y «¿quién me está
  frenando?». Se descartaron «cuántos kilos atrás voy», «qué me falta anotar» y el inventario como
  bloque propio — el inventario es la lista de abajo, no una sección.
- **La meta se responde en kilos y fechas, no en pesos.** La plata es el plan siguiente.

## Marcas

Dos imágenes que puso el dueño, ya procesadas a PNG con fondo transparente por
`scripts/preparar-marcas.ts`:

- `public/marca/vaca.png` — silueta de vaca en línea, tinta café. Va **junto al nombre SOFIA**, en
  la cabecera del menú lateral.
- `public/marca/santa-veronica.png` — el ojo del logo de Ganadería Santa Verónica, tinta negra. Va
  **en la pantalla de entrar**, centrado sobre el formulario: es la puerta de la finca y el único
  lugar donde la marca de la finca manda sobre la de la plataforma. Repetido pequeño al pie del
  menú lateral, junto al nombre de la finca.

El dueño mandó después una versión limpia del logo con el texto completo, así que en la pantalla
de entrar va el conjunto entero (ojo y letras) y en el pie del menú va solo el ojo, que es lo que
se lee a 15 píxeles de alto.

El nombre de la plataforma se escribe **SOFIA, sin tilde**, por decisión del dueño.

## El menú lateral

Tres grupos, diez renglones, todos a un clic:

```
SOFIA  🐄

EL GANADO
  Ganado                 /
  Potreros               /potreros

ANOTAR
  Pesos                  /anotar/pesos
  Sanidad                /anotar/sanidad
  Venta o muerte         /anotar/salida
  Novedad                /anotar/novedad
  Mover lote             /anotar/mover
  Entrada de ganado      /anotar/entrada

LA FINCA
  Criterios              /finca
  Bajar todo a Excel     /exportar

────────────────
Santa Verónica · Joseph
Contraer menú
```

Cambia el mapa de rutas: **los potreros salen de `/finca` a `/potreros`** y `/finca` queda solo con
los criterios. Las redirecciones viejas siguen en pie.

## Acciones sobre selección

En Ganado, el botón «Seleccionar animales» enciende el modo selección. Cada tarjeta muestra una
marca; abajo aparece una barra fija con la cuenta y las acciones:

- **Anotarles peso** → `/anotar/pesos` con los animales ya marcados
- **Aplicarles sanidad** → `/anotar/sanidad` con los animales ya marcados
- **Registrar su salida** → `/anotar/salida` con los animales ya marcados
- **Moverlos de lote** → hoy `/anotar/mover` mueve el lote entero, no animales sueltos. Esta
  acción queda **fuera de esta entrega**: mover animales individuales entre lotes es un cambio de
  la capa de datos (hoy `Animal.loteId` solo cambia por alta), no de interfaz.

El MODO selección viaja en la dirección web, porque se enciende una vez y así aguanta una recarga.
Las MARCAS viven en estado de React: marcar tres animales seguidos son tres clics en un segundo, y
leyendo la dirección cada clic partía de una que la vuelta al servidor todavía no había
actualizado -- sobrevivía solo el último. Al pulsar una acción, las marcas sí pasan a la dirección
de la pantalla destino (`?animales=id,id,id`), que las usa para mostrar solo esos animales.

## Lo que no cambia

Ninguna función de `src/calc/`. Ninguna regla de validación. Ningún cálculo. El esquema no crece.
Todo lo que se movió en el rediseño anterior —la sanidad por animal, la línea de tiempo, la curva,
los filtros en la URL— se conserva tal cual.

## Cómo se verifica

Cada pantalla que cambie conserva sus pruebas de navegador, ajustando solo la dirección o el
selector cuando la estructura lo obligue. Se suman:

- El menú lateral ofrece los diez renglones, marca el activo y solo ese.
- Seleccionar animales y pulsar una acción llega a la pantalla correcta con esos animales marcados.
- La pantalla de entrar muestra el logo de la finca y sigue sin ofrecer destinos.
- Ninguna pantalla deja escapar un valor crudo del esquema.
