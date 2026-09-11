# Vidriería — Registro de Compras y Ventas

Aplicación web simple para llevar el registro de compras y ventas de la vidriería. No requiere instalación, servidor ni conexión a internet.

## Cómo usarla

Abrí el archivo `index.html` con doble clic (se abre en tu navegador).

## Funciones

- **Cotizador**: para que el equipo cotice sin depender del dueño. Se elige el producto (vidrio/DVH, PVC de catálogo o PVC por medida), se ingresa ancho y alto en centímetros y la app calcula el precio solo, con las mismas reglas del tarifario de la vidriería (redondeo a múltiplo de 5 cm, área mínima cobrable, mínimo por visita, km adicionales, y el costeo completo de ventanas/puertas de PVC por perfil + herrajes + vidrio + horas). Las cotizaciones se pueden guardar, imprimir (Archivo ▸ Imprimir ▸ Guardar como PDF) y convertir directamente en una venta registrada. Los precios (vidrio, PVC, reglas y parámetros avanzados de PVC) se editan desde **Configuración de precios**, al final de la pestaña, sin tocar Excel.
- **Ventas**: registrar cliente y uno o varios productos (descripción, cantidad y precio unitario) en una misma venta con el botón **+ Agregar producto**. El total se calcula solo.
- **Compras**: igual que ventas, pero por proveedor.
- **Clientes**: se arma solo a partir de las ventas cargadas. Agrupa por nombre (sin importar mayúsculas o acentos) y muestra cuántas compras hizo cada cliente, cuánto gastó en total y su última compra. Al cargar una venta, el campo Cliente sugiere nombres ya cargados para evitar duplicados.
- **Resumen**: totales de ventas, compras y balance (ganancia o pérdida).
- **Exportar CSV**: cada tabla se puede exportar a un archivo `.csv` (una fila por producto) para abrir en Excel u otra planilla de cálculo.

## Dónde se guardan los datos

Los datos se guardan en el almacenamiento local del navegador (`localStorage`), en la misma computadora y el mismo navegador donde abriste `index.html`. Si necesitás un respaldo, usá el botón **Exportar CSV** de cada sección.

Para que **todo el equipo** use el mismo cotizador con las mismas cotizaciones guardadas, hay que abrirlo desde una sola computadora/navegador compartido, o publicarlo en un hosting simple (por ejemplo GitHub Pages, que ya está configurado) para que cada quien lo abra desde su propio celular o computadora — en ese caso cada dispositivo va a guardar sus propias cotizaciones por separado, ya que no hay una base de datos central.
