# Portfolio de Benjamín García

Landing personal bilingüe (ES / EN) en HTML, CSS y JavaScript vanilla. Se publica directamente en Netlify; no necesita instalación de paquetes ni proceso de build.

## Archivos

- `index.html`: contenido completo en español, estructura semántica y metadatos.
- `styles/style.css`: diseño oscuro, componentes y breakpoints responsive.
- `scripts/translations.js`: diccionario de traducciones al inglés.
- `scripts/main.js`: selector de idioma, preferencia persistente, menú móvil y navegación activa.
- `media/benjamin-cv.pdf`: CV original facilitado por el propietario, sin modificaciones.
- `media/favicon.svg`: favicon local.
- `media/photo.jpg`: fotografía original conservada. No se carga en la landing para evitar descargar sus 3.7 MB.
- `tests/browser.cjs`: comprobaciones de navegador opcionales; no forman parte de la ejecución del sitio.

## Idiomas

Español es el idioma inicial. El selector ES / EN cambia textos, etiquetas de accesibilidad, `html[lang]` y metadatos. La preferencia se guarda en `localStorage`; si el navegador bloquea el almacenamiento, el selector sigue funcionando.

Se puede compartir una selección mediante `?lang=en` o `?lang=es`. La URL tiene prioridad sobre la preferencia guardada. Sin JavaScript, permanecen disponibles el contenido y la navegación en español, los proyectos y el PDF.

Para editar un texto, cambia su versión española en `index.html` y la entrada con la misma clave `data-i18n` en `scripts/translations.js`. Usa `data-i18n-aria` para etiquetas de accesibilidad. Conserva las claves al traducir. Nombres de productos y tecnologías se mantienen como nombres propios.

La traducción ocurre en el navegador: esto no crea páginas indexables independientes por idioma. El HTML inicial y la URL canónica corresponden a la página principal. Si se necesita SEO independiente por idioma, habrá que generar versiones HTML separadas.

## CV y enlaces

Para actualizar el CV, reemplaza `media/benjamin-cv.pdf` conservando el nombre. Los dos botones de descarga apuntan a ese mismo archivo. El PDF compartido está en inglés y se descarga sin cambiar al alternar el idioma del sitio.

El email, teléfono y GitHub proceden del portfolio original. LinkedIn y la URL canónica se actualizaron con los enlaces incluidos en el CV proporcionado. Todos los enlaces de proyectos se conservaron; el proyecto confidencial sigue sin enlace público. Los diagramas de las tarjetas son ilustraciones, no capturas de las aplicaciones.

## Vista local y Netlify

Puedes abrir `index.html` directamente. Para revisar el sitio mediante HTTP, sirve esta carpeta con cualquier servidor estático; por ejemplo, si tienes Python instalado:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Abre `http://127.0.0.1:4173`. En Netlify, publica la raíz del repositorio (`.`) con el comando de build vacío. Si cambia el dominio público, actualiza `canonical` y `og:url` en `index.html`. Esta modernización no publica automáticamente los cambios.

## Validación opcional

Requiere Node.js y Playwright disponibles en el entorno, con Chromium instalado. No son dependencias del portfolio publicado.

```sh
node tests/browser.cjs
```

Para usar Chrome ya instalado, define `BROWSER_CHANNEL=chrome` (en PowerShell: `$env:BROWSER_CHANNEL='chrome'`). El script inicia y cierra su servidor local y comprueba idiomas, persistencia, navegación con teclado, enlaces internos, descarga íntegra del PDF, funcionamiento sin JavaScript y sin almacenamiento, errores de consola y desbordamiento entre 320 y 1440 px. Guarda capturas en `tmp/qa/`, excluido de Git.
