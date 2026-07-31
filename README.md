# Vidriería — Registro de Compras y Ventas

Aplicación web simple para llevar el registro de compras y ventas de la vidriería. No requiere instalación, servidor ni conexión a internet.

## Cómo usarla

Abrí el archivo `index.html` con doble clic (se abre en tu navegador).

## Funciones

- **Ventas**: registrar cliente y uno o varios productos (descripción, cantidad y precio unitario) en una misma venta con el botón **+ Agregar producto**. El total se calcula solo.
- **Compras**: igual que ventas, pero por proveedor.
- **Clientes**: se arma solo a partir de las ventas cargadas. Agrupa por nombre (sin importar mayúsculas o acentos) y muestra cuántas compras hizo cada cliente, cuánto gastó en total y su última compra. Al cargar una venta, el campo Cliente sugiere nombres ya cargados para evitar duplicados.
- **Resumen**: totales de ventas, compras y balance (ganancia o pérdida).
- **Exportar CSV**: cada tabla se puede exportar a un archivo `.csv` (una fila por producto) para abrir en Excel u otra planilla de cálculo.

## Dónde se guardan los datos

Los datos se guardan en el almacenamiento local del navegador (`localStorage`), en la misma computadora y el mismo navegador donde abriste `index.html`. Si necesitás un respaldo, usá el botón **Exportar CSV** de cada sección.
