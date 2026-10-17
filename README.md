# carluchiclothes 🎀

Armario digital PWA en español, con estilo clean girl rosa empolvado y crema.

## Funciones incluidas

- Añadir, editar y eliminar prendas con foto, categoría, color y notas.
- Galería de prendas con búsqueda, filtros por categoría/color y filtro de favoritas.
- Probador vertical por piezas: parte de arriba, parte de abajo, zapatos y accesorios. Puedes cambiar cada categoría por separado.
- Generador aleatorio de outfits.
- Guardar looks favoritos y reutilizarlos.
- Planificador semanal de looks.
- Estadísticas básicas de prendas, looks y usos registrados.
- Exportar e importar copia de seguridad JSON con fotografías incluidas.
- Almacenamiento persistente local con IndexedDB.
- PWA instalable y caché básica para abrir la app después de la primera carga.

## Publicar gratis en GitHub Pages

1. Descomprime `carluchiclothes.zip` en tu ordenador.
2. Entra en GitHub y crea un repositorio nuevo, por ejemplo `carluchiclothes`.
3. Sube **el contenido de esta carpeta** al nivel principal del repositorio. `index.html` debe quedar en la raíz, no dentro de una segunda carpeta.
4. Abre **Settings → Pages**.
5. En “Build and deployment”, selecciona “Deploy from a branch”.
6. Elige la rama `main` y la carpeta `/(root)`, y pulsa Save.
7. Espera a que GitHub Pages publique la web. La dirección suele tener el formato `https://TU-USUARIO.github.io/carluchiclothes/`.

No se necesita un proceso de compilación ni una API de pago.

## Instalar en iPhone

1. Abre la URL publicada en **Safari**.
2. Pulsa el botón Compartir.
3. Selecciona **Añadir a pantalla de inicio**.
4. Confirma el nombre y pulsa Añadir.
5. Abre carluchiclothes desde el icono.

En Android, abre la URL en Chrome y usa “Instalar aplicación” o “Añadir a pantalla de inicio”, según lo que muestre el navegador.

## Datos, fotos y copias de seguridad

- Las prendas, imágenes, looks, favoritos, calendario y usos se guardan en IndexedDB en ese navegador y dispositivo.
- No hay cuentas, servidor de sincronización ni sincronización automática entre dispositivos.
- Exporta periódicamente desde **Más → Exportar copia de seguridad**. El archivo JSON contiene las fotos incluidas como datos y puede crecer bastante si hay muchas prendas.
- Para restaurar, abre **Más → Importar copia** y elige el JSON exportado. La restauración reemplaza los datos actuales; exporta primero una copia de lo que haya en ese dispositivo.
- No borres los datos del sitio/navegador ni desinstales la app pensando que eso preservará la información. La copia exportada es la protección principal.
- El navegador puede eliminar almacenamiento local bajo ciertas condiciones, y el dispositivo puede perderse o dañarse. Guarda la copia en otro lugar seguro (por ejemplo, un ordenador o una nube personal).
- Las fotografías se reducen de tamaño al añadirlas para ayudar a ahorrar espacio. No hay un límite exacto garantizado para el tamaño total; depende del navegador y del dispositivo.

## Comprobación

- Archivos referenciados: `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, iconos en `assets/`.
- No utiliza dependencias externas ni servicios de pago.
- Las rutas usan rutas relativas para permitir GitHub Pages en un repositorio de proyecto.
- Las funciones de almacenamiento necesitan un navegador moderno con IndexedDB y deben probarse desde HTTPS (por ejemplo, GitHub Pages), no abriendo `index.html` como archivo local.
- La cámara/selección de imagen depende de las opciones que ofrezca el navegador y el dispositivo.
- El probador combina fotos de prendas en paneles; no simula un cambio de ropa realista sobre un cuerpo mediante IA.
