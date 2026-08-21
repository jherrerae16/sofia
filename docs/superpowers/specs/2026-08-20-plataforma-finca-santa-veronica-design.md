# SOFÍA — Diseño v1

*Plataforma de control integral de la finca Santa Verónica*

**Fecha:** 20 de agosto de 2026
**Estado:** diseño aprobado, pendiente plan de implementación

---

## 0. El nombre

**SOFÍA** = **SOF**anor + **IA**.

Sofanor Echeverría fue el dueño anterior de Santa Verónica y el abuelo del propietario actual. Su nombre ya contenía la sigla adentro, así que la plataforma lleva el suyo sin necesidad de inventar nada.

En la aplicación, el nombre completo se muestra una sola vez, al pie de la pantalla Hoy: *"SOFÍA — por Sofanor Echeverría."* Ni frase de bienvenida, ni pantalla de créditos. Un homenaje que se dice una vez se recuerda; uno que se repite en cada pantalla se vuelve decorado.

El asistente de inteligencia artificial, cuando llegue en una versión posterior, se llamará **Vero** — de Santa Verónica, y porque *vero* significa verdadero. Así el abuelo nombra la plataforma y la finca nombra al asistente.

---

## 1. Qué es

SOFÍA es una plataforma web privada para administrar la finca ganadera de ceba Santa Verónica (Sabanalarga, Atlántico). Reemplaza el archivo `Proyeccion Sta Veronica.xlsx` y la libreta de campo, y convierte los dos en un sistema vivo que responde una pregunta central:

> ¿La finca se está pagando sola, y qué tan lejos está de pagar además los $85.000.000 anuales de predial familiar?

Es una herramienta interna para dos personas. No es un producto, no se vende, no escala a otras fincas.

## 2. Contexto real de la operación

Estos hechos determinan casi todas las decisiones de diseño:

- **Dos usuarios:** el propietario (en Barranquilla) y Joseph, el administrador (viaja a la finca desde Barranquilla). Ambos con el mismo poder, sin jerarquía de permisos.
- **La captura la hace el propietario.** Joseph anota en cuaderno o en notas del celular; el propietario transcribe a la plataforma por tandas, no dato por dato.
- **Web, no app.** No va a ninguna tienda de aplicaciones. Responsive para que se vea bien en el navegador del celular si Joseph decide usarla, pero el escenario principal es un computador.
- **Escala:** ~55 novillos de ceba, más 7 vacas de leche y un lote de novillos del ciclo anterior. 35 hectáreas útiles. Dos ciclos de engorde al año (comprar en septiembre, vender en febrero; recomprar y vender en agosto).
- **Pesaje con cinta bovinométrica**, sin báscula. Cadencia irregular: puede ser cada mes o cada dos.
- **Los animales aún no tienen identificación individual.** Se chapetean con el lote que entra en septiembre de 2026. Sin número no hay GDP individual ni trazabilidad sanitaria.

## 3. Decisiones cerradas

| Decisión | Valor | Razón |
|---|---|---|
| Quién digita | El propietario, por tandas | Joseph anota en papel; la transcripción es el cuello de botella real |
| Dispositivo | Web escritorio, responsive a celular | Sin app nativa, sin tiendas |
| Usuarios y permisos | Dos superusuarios idénticos | Se conocen; permisos granulares son fricción sin beneficio |
| Identificación animal | Chapeta numerada desde septiembre 2026 | Requisito de todo lo individual |
| Cadencia de pesaje | Libre | La GDP se calcula con los días que hayan pasado |
| Unidades de negocio | Lotes con tipo (`ceba` / `leche` / `otros`) | Todos comen el mismo pasto; solo los de ceba tienen GDP |
| Alcance v1 | Engorde + plata juntos | La mitad sola no responde la pregunta central |
| Hospedaje | Internet, privado con clave | Acceso desde cualquier parte para ambos |
| Datos iniciales | Limpio, sin migración | Todo se configura dentro de la plataforma |
| Reparto de gastos generales | Entre número de animales, mes a mes | Explicable y auditable; el corte mensual evita cobrarle a un animal gastos anteriores a su llegada |
| Metas | Dos niveles, ambas editables | Meta 1 = gastos de la finca; Meta 2 = eso + predial familiar |

## 4. Principios de diseño

Cinco reglas que atraviesan todo el sistema. Cualquier decisión de implementación que las contradiga está mal.

**4.1 El número real le gana al supuesto.** Se separan dos capas. *Lo real* son gastos, pesos, compras y ventas registrados con su fecha y su valor exacto. *Los supuestos* son parámetros editables con fecha de vigencia (precio/kg, consumo de sal, GDP objetivo, gasto mensual esperado por categoría, metas) que existen solo para proyectar hacia adelante. Cambiar un supuesto hoy nunca reescribe la historia.

**4.2 El sistema nunca inventa un gasto.** Los gastos recurrentes generan un *recordatorio* ("Luz de agosto sin registrar"), nunca un registro automático. Un gasto autogenerado es un dato falso indistinguible de uno verdadero, y contamina el costo por kg de forma permanente.

**4.3 Nada cableado en el código salvo las fórmulas.** Hectáreas, capacidades de potrero, categorías de gasto, tipos de lote, métodos de pesaje, umbrales de clasificación, metas: todo se edita desde la plataforma.

**4.4 Real y proyectado nunca se ven iguales.** Un peso medido y un peso proyectado tienen tratamiento visual distinto en toda la interfaz. Lo mismo para meses vividos contra meses proyectados.

**4.5 Cero pantallas de solo mirar.** Cada indicador es clickeable y lleva a los registros que lo produjeron. Un indicador que no se puede auditar no se cree, y uno que no se cree no se usa.

## 5. Modelo de datos

Diez entidades. Todo lo demás se calcula.

**Finca** — hectáreas útiles, zona horaria, moneda.

**Parámetro** — clave, valor, fecha de vigencia. Guarda precio/kg de referencia, GDP objetivo, umbrales de clasificación, gasto mensual esperado por categoría, metas 1 y 2. Versionado por fecha: el valor vigente en junio se conserva aunque hoy sea otro.

**Potrero** — nombre, hectáreas, tipo de pasto, capacidad estimada (kg vivos o unidades animales), estado, disponibilidad de agua, notas.

**Lote** — nombre, tipo (`ceba` / `leche` / `otros`), fecha de apertura, fecha de cierre, potrero actual.

**Animal** — número de chapeta, lote, sexo, raza, cruce, fecha de entrada, edad estimada al entrar, condición corporal al entrar, proveedor, peso de entrada, costo real de entrada, estado (`activo` / `vendido` / `muerto` / `robado`), fecha y motivo de salida.

**Pesaje** — fecha, método (cinta / báscula / estimación), quién pesó, notas. Contiene una lista de mediciones: animal + peso en kg. Una sesión puede cubrir 56 animales o 12.

**Movimiento** — lote, potrero de origen, potrero de destino, fecha.

**Gasto** — fecha, categoría, subcategoría, descripción, valor, proveedor, método de pago, si es fijo o variable, imputación (a la finca entera o a un lote específico), comprobante opcional.

**Evento sanitario** — animal o lote completo, fecha, tipo (vacuna / desparasitación / vitamina / tratamiento), producto, dosis, responsable, próxima fecha prevista, notas. Los ciclos de vacunación son obligación legal y su costo es real; excluirlos rompería tanto la trazabilidad como el costo por kg.

**Compra** — proveedor, fecha, lote destino, y el desglose: precio del ganado, transporte, comisión, otros. Una compra **crea los registros de Animal** correspondientes, cada uno con su chapeta y su costo real de entrada calculado a partir del desglose.

**Venta** — comprador, fecha, precio/kg, comisión, transporte, descuentos, y la lista de animales vendidos con su peso de venta. Al guardarse, cada animal referenciado pasa a estado `vendido` con esa fecha.

**Nunca se guarda:** GDP, peso vivo total, carga animal, kg producidos, costo por kg, cobertura de metas, días de ocupación y descanso, proyecciones. Guardar un número calculado garantiza que algún día contradiga a sus ingredientes.

**Auditoría:** cada registro guarda quién lo creó, cuándo, y quién lo modificó por última vez.

## 6. Cálculos

Estos son el producto. Lo demás es formulario.

### 6.1 Engorde

- **GDP entre pesajes** = (peso actual − peso anterior del mismo animal) ÷ días transcurridos.
- **GDP acumulada** = (peso actual − peso de entrada) ÷ días en finca.
- **GDP del lote** = promedio ponderado de los animales pesados en la sesión, con el n siempre visible ("basado en 12 de 56").
- **kg producidos** = suma de (peso actual − peso de entrada) de los animales vivos, más los kg que ganaron los vendidos antes de salir. Los animales muertos o robados aportan cero kg y su costo permanece.

### 6.2 Pasto

- **Carga** = kg vivos ÷ ha, y cabezas ÷ ha.
- **Días de ocupación** = hoy − fecha de entrada del lote al potrero.
- **Días de descanso** = hoy − fecha de salida del último lote.
- **Techo de capacidad:** el peso vivo sobre un potrero se compara contra su capacidad configurada. La alerta ocurre en el momento del registro del movimiento, no en un informe posterior.

### 6.3 Plata

- **Costo real de entrada por animal** = (precio + transporte + comisión + otros) ÷ animales. Nunca el precio pelado.
- **Asignación de gastos generales:** mes a mes, gastos generales del mes ÷ animales presentes ese mes. Cada animal acumula su parte.
- **Costo directo por kg producido** = gastos imputados a lotes de ceba ÷ kg producidos.
- **Costo total por kg producido** = lo anterior + generales asignados ÷ kg producidos.
- **Margen del ciclo** = ingreso neto de ventas − costo de entrada − gastos directos − generales asignados.

### 6.4 Metas y caja

- **Cobertura meta 1** = margen generado o proyectado ÷ meta 1 (gastos de la finca).
- **Cobertura meta 2** = margen ÷ (meta 1 + predial familiar).
- **Punto de equilibrio**, resuelto en cuatro direcciones: kg necesarios, animales necesarios, precio/kg mínimo de venta, y **GDP mínima** — la única variable que se mueve con manejo.
- **Exposición de caja** = máximo acumulado de salidas antes de que entre la venta, separando el capital que vuelve (el ganado es capital de trabajo) del gasto que no vuelve.

Los tres son móviles: se recalculan con los gastos reales registrados, no contra una constante.

### 6.5 Proyecciones

Peso a 30/60/90/180 días, fecha estimada de venta, valor estimado. Se calculan con la **GDP observada** de cada animal, no con la objetivo. Marcadas como proyección en toda la interfaz.

Para meses futuros sin datos, cada categoría de gasto proyecta con el promedio de sus últimos 3 meses reales, que se mueve solo conforme se registra. El usuario puede sobrescribir una categoría cuando sabe algo que el promedio no sabe (alza del salario mínimo, predial que viene).

## 7. Pantallas

### 7.1 Hoy

La portada. Arriba, la frescura de los datos: "actualizado hace 3 días" en tono normal, "hace 43 días" en grande y en ámbar. Debajo, dos bloques:

- **Engorde:** animales vivos, peso vivo total, GDP promedio, kg producidos en el ciclo.
- **Plata:** gastado este mes, gastado en el ciclo, costo total por kg producido, y las dos barras de cobertura de metas.

Al pie, alertas accionables: animales bajo la GDP objetivo, potreros sobrecargados, gastos recurrentes sin registrar, animales listos para venta, pesajes vencidos y eventos sanitarios con fecha prevista cumplida.

### 7.2 Cómo vamos

La pantalla del engorde, y la razón de ser de la plataforma para el día a día.

**Encabezado — el promedio.** GDP promedio de la finca y de cada lote de ceba, con el n de animales pesados. Un selector de periodo cambia qué se está midiendo:
- *Desde el último pesaje* — el tramo más reciente, el que dice cómo va el mes.
- *Últimos 30 / 60 / 90 días*.
- *Acumulado desde la entrada* — la GDP del ciclo completo.

Al lado, la comparación contra la GDP objetivo configurada y la tendencia contra el periodo anterior: si el lote venía en 780 g/día y ahora va en 640, eso es lo primero que se ve.

**Cuerpo — el individual.** Tabla de todos los animales, ordenable por cualquier columna: chapeta, lote, peso actual, fecha del último pesaje, kg ganados totales, GDP del último tramo, GDP acumulada, clasificación y días en finca. Ordenar por GDP ascendente responde de inmediato "¿cuáles no están engordando?".

**Clasificación por semáforo**, con umbrales configurables (los valores de arranque son sugerencias, no constantes):
- Excelente ≥ 900 g/día
- Bueno 750–899
- Normal 600–749
- Bajo rendimiento 400–599
- Crítico < 400 o pérdida de peso

**Gráfico de dispersión** de todos los animales del lote: peso actual contra GDP. Los rezagados se separan visualmente del grupo sin necesidad de leer la tabla.

Cada fila lleva a la ficha del animal.

### 7.3 Digitar

La pantalla que decide si el sistema vive. Diseñada para vaciar una libreta de un mes de un solo golpe.

**Pesaje en tanda:** se escoge fecha y lote; aparece la lista de chapetas; se baja escribiendo pesos con Tab, sin mouse, sin guardar uno por uno. Las chapetas no pesadas se dejan vacías. Antes de guardar, el sistema muestra la GDP que resultaría de cada animal y marca lo imposible: 3.100 g/día, o una caída de 40 kg, es casi siempre un dedazo. El error se atrapa ahí, no tres meses después cuando ya contaminó el costo por kg.

**Gastos en tanda:** una fila por gasto — fecha, categoría, valor, descripción. La categoría del último registro queda precargada y el buscador prioriza las ya usadas. Veinte gastos son veinte líneas, no veinte formularios.

### 7.4 Resto de pantallas

- **Lotes** — lista y detalle: animales, GDP, potrero actual, días en ese potrero, inversión, gastos, valor estimado.
- **Animal** — ficha completa: datos de entrada, gráfico de peso en el tiempo con la recta de la GDP objetivo superpuesta, historial sanitario con las próximas fechas previstas, traslados de lote, cambios de estado y costo acumulado.
- **Potreros** — estado de cada uno, días de ocupación o descanso, carga actual contra capacidad, botón para mover un lote.
- **Gastos** — lo registrado, filtrable por fecha, categoría y lote, con el corte fijos contra variables.
- **Compras** y **Ventas** — desglose completo; la venta compara contra el costo real de esos animales.
- **Resultados** — costo directo y total por kg, margen del ciclo, cobertura de metas, exposición de caja mes a mes, punto de equilibrio en sus cuatro formas.
- **Comparador** — ver sección 8.
- **Simulador** — se mueven animales, pesos, precios, GDP, duración y gastos; devuelve inversión, producción, utilidad, ROI y break even al instante. Arranca con los números reales y **nunca escribe** en los datos.
- **Configuración** — parámetros, metas, categorías, potreros, tipos de lote, usuarios.

## 8. Comparador por característica

En vez de un módulo de razas cableado, una agrupación genérica.

**Agrupar por:** raza, cruce, proveedor, sexo, rango de peso de entrada, rango de edad de entrada, lote, potrero.

**Comparar:** GDP promedio, kg ganados, costo por kg producido, días hasta peso objetivo, mortalidad, margen por animal.

**Dos frenos obligatorios**, sin los cuales el comparador convierte ruido en convicción:

1. **El n siempre visible.** "Brangus: 812 g/día (n=6)". Seis animales no son evidencia, y verlo escrito evita decisiones de $30 millones sobre seis novillos.
2. **Detección de grupos no comparables.** Si el grupo A pasó tres meses en el potrero 3 y el B en el 7, la diferencia puede ser el pasto. El sistema lo detecta y lo dice: *"Estos grupos no compartieron potrero — la diferencia puede no ser de la característica."*

Con menos de 10 animales por grupo, o con una diferencia menor a 50 g/día, la etiqueta es **"no concluyente"** en lugar de un ganador.

## 9. Identidad visual

La plataforma debe verse como una finca bien llevada, no como un software contable. Verde de pasto, tierra, cuero y papel; sin planillas grises.

### 9.1 Paleta

| Rol | Color | Uso |
|---|---|---|
| Verde pasto profundo | `#1B5E3F` | Color primario, encabezados, navegación |
| Verde pasto medio | `#2E8B57` | Acentos, estados positivos |
| Verde claro | `#A8D5BA` | Fondos de bloque, barras de progreso |
| Tierra / cuero | `#8B5E3C` | Acento cálido, bordes, iconografía |
| Crema hueso | `#F7F4EC` | Fondo general de la aplicación |
| Carbón | `#23201B` | Texto principal |
| Ámbar alerta | `#D98324` | Advertencias, datos viejos, proyecciones |
| Rojo tierra | `#A63D40` | Crítico, pérdidas, mortalidad |

El semáforo de GDP usa verde profundo, verde medio, verde claro, ámbar y rojo tierra, en ese orden.

### 9.2 Tipografía

- **Títulos:** una serif con carácter (Fraunces o Bitter). Da el tono de finca y no el de hoja de cálculo.
- **Datos e interfaz:** una sans neutra y legible (Inter).
- **Todos los números en cifras tabulares.** Las columnas de pesos y de dinero deben alinearse verticalmente; sin esto una tabla de 56 animales es ilegible.
- Pesos en kg con un decimal. Dinero en pesos colombianos sin decimales, con separador de miles.

### 9.3 Tono ganadero, con freno

Iconografía discreta: silueta de res, chapeta, poste y alambre, mata de pasto. Texturas suaves de papel o cuero en encabezados. Ilustración de una res únicamente en pantallas vacías y en la portada.

**El freno:** ninguna vaca de clip-art decorando tablas, ningún fondo con textura detrás de datos, ninguna serif en cifras. El carácter va en los bordes; el centro de la pantalla es información legible. Una tabla que hay que descifrar no se usa, por bonita que sea.

### 9.4 Reglas de lectura

- Los indicadores importantes en cifras grandes, con la unidad al lado y la comparación debajo ("+62 g/día contra el mes pasado").
- Lo proyectado se distingue de lo real por tratamiento visual explícito (línea punteada en gráficos, etiqueta "proyectado" en tarjetas), nunca solo por color.
- Contraste suficiente para leerse en un computador con luz de día. La finca no tiene oficina con cortinas.

## 10. Arquitectura técnica

**Aplicación:** Next.js con TypeScript. Una sola aplicación que sirve interfaz y datos, sin separar frontend y backend — con dos usuarios, esa separación es costo puro.

**Base de datos:** PostgreSQL administrado (Neon o equivalente), con Prisma como capa de acceso. El volumen cabe holgadamente en el plan gratuito.

**Autenticación:** correo y contraseña para dos cuentas fijas. Sin registro público, sin recuperación por SMS, sin OAuth.

**Hospedaje:** Vercel u opción equivalente. Costo esperado entre cero y quince dólares mensuales.

**Separación de capas:**
- Los cálculos de la sección 6 viven en módulos puros, sin acceso a base de datos ni a interfaz. Reciben datos y devuelven números. Es la única parte del sistema donde un error cuesta dinero real, y es la que debe poder probarse sola.
- El acceso a datos vive aparte de la interfaz.
- Cada pantalla es un módulo con una responsabilidad.

**Decisiones de precisión:**
- El dinero se guarda como entero en pesos. El peso colombiano no tiene centavos y los flotantes acumulan error.
- Los pesos en kg se guardan como decimal con un decimal.
- Todas las fechas se manejan en `America/Bogota`. Los cálculos de GDP dependen de contar días correctamente; un desfase de zona horaria produce divisiones por cero o por un día de más.

**Respaldos:** respaldo diario automático de la base de datos, con exportación manual a Excel disponible desde la plataforma. La finca no puede depender de que un proveedor de nube siga existiendo.

## 11. Errores y validaciones

El riesgo principal no es que el sistema se caiga; es que muestre un número equivocado con confianza.

**Se rechaza:**
- Un pesaje con fecha anterior al ingreso del animal.
- Dos pesajes del mismo animal el mismo día.
- Un movimiento a un potrero donde el lote ya está.
- Una venta de un animal ya vendido o muerto.
- Un valor negativo en peso o en dinero.

**Se advierte pero se permite** (con confirmación explícita):
- GDP resultante fuera del rango de 0 a 2.000 g/día.
- Pérdida de peso mayor al 10% entre pesajes.
- Un movimiento que deja el potrero sobre su capacidad.
- Un gasto que supera en más del 100% el promedio de su categoría.

**Se muestra sin bloquear:**
- Gastos recurrentes sin registrar del mes anterior.
- Lotes sin pesaje en más de 60 días.
- Datos de la finca sin actualizar en más de 30 días.

**Nada se borra de verdad.** Los registros se anulan con motivo y quedan visibles en el historial. Un animal muerto no desaparece: su costo sigue pesando en el ciclo, que es exactamente lo que pasó en la realidad.

## 12. Pruebas

**Los cálculos se prueban primero y con casos reales.** Se construye un juego de datos de prueba con los números conocidos de la finca (55 novillos, entrada a 150 kg, salida proyectada, gastos fijos del semestre) y se verifica que el sistema reproduce el margen por novillo, el break even y la exposición de caja que ya se calcularon a mano en el xlsx. Si el sistema no reproduce números verificados, no sirve.

Casos límite obligatorios: animal con un solo pesaje (no hay GDP entre pesajes), animal muerto a mitad de ciclo, lote con cero animales pesados, mes sin gastos registrados, división por cero de días, y venta parcial de un lote.

**Interfaz:** una prueba de extremo a extremo sobre la pantalla Digitar, que es donde un error se multiplica por 56.

## 13. Fuera de alcance en v1

| Fuera | Vuelve cuando |
|---|---|
| Rentabilidad por animal individual | Nunca — es precisión falsa sobre costos compartidos |
| Aforo de pastos por muestreo | Alguien esté dispuesto a cortar y pesar marcos de 1 m² |
| Presupuesto contra real por rubro | Haya 12 meses de gastos reales contra los cuales presupuestar |
| Cuentas por pagar | Los pagos dejen de ser de contado |
| Tareas y mantenimiento | La coordinación deje de resolverse por WhatsApp |
| Asistente de IA | Haya un ciclo completo de datos reales |
| Reportes en PDF | Alguien pida uno dos veces |
| Registro detallado de alimentación | La suplementación pase de sal y minerales |
| Inventarios con entradas, salidas y saldos | Haya bodega con volumen suficiente para que descuadre; hoy la sal y los medicamentos se compran y se gastan, y eso ya queda en Gastos |
| Permisos granulares | Entre una tercera persona a la operación |
| Aplicación móvil nativa | Nunca |

## 14. Riesgos

**El riesgo principal es la digitación.** Si el propietario deja de transcribir, la plataforma no se equivoca: simplemente envejece y deja de servir. Mitigaciones: captura por tandas en vez de formulario por formulario, frescura visible en la portada, y un sistema que sigue siendo útil con datos de hace tres semanas.

**Riesgo secundario: el dedazo.** Un peso mal digitado se propaga a la GDP, al costo por kg y al break even. Mitigación: validación en el momento de la captura, con la GDP resultante visible antes de guardar.

**Riesgo tercero: creerle a muestras pequeñas.** Con 55 animales y un lote, casi cualquier comparación es ruido. Mitigación: el n visible y la etiqueta "no concluyente" en el comparador.

## 15. Qué significa que esto funcione

Que en febrero de 2027 se pueda decir, con datos y sin abrir Excel:

> "El ciclo costó $X, produjo Y kg, cada kilo salió en $Z incluyendo gastos generales, la GDP promedio fue de N g/día, doce novillos rindieron por debajo de 500 y ya sabemos cuáles, y el margen cubrió el A% de los gastos de la finca."

En vez de: *"creo que la finca se está pagando."*
