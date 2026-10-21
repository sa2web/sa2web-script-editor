# Sa2web Plugin Editor

[English](README.md) · [简体中文](README.zh.md) · [Español](README.es.md) · [Français](README.fr.md) · [हिन्दी](README.hi.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Sa2web Plugin Editor es una aplicación de escritorio para editar plugins completos de sitios sa2web. Permite configurar el plugin y sus scripts con Monaco y sugerencias `api.`, depurarlo en un sitio desplegado y exportarlo como JSON.

## Depuración en línea

1. En la plataforma sa2web desplegada, abra **Plugins** del sitio, cree un plugin con el mismo nombre que usará en el editor y genere un **token de depuración**. Guárdelo de forma segura.
2. En el editor, introduzca el mismo **nombre del plugin** y **token**, además de una **URL de prueba** HTTP(S) del sitio. Edite la configuración y los scripts; el borrador se guarda localmente.
3. Pulse **Launch**. En la ventana nueva, inicie sesión como administrador del sitio si es necesario. Las cookies persisten para los siguientes lanzamientos.
4. Al llegar a `/app/index`, el editor sincroniza el borrador con el plugin que coincida en nombre y token. Si no coincide, muestra un error; si funciona, aparece un aviso durante cinco segundos en esa ventana.
5. Pruebe el sitio en esa ventana. Solo su sesión recibe la configuración de depuración; los visitantes sin token no la cargan. Pulse **Launch** otra vez para sincronizar los cambios.

## Exportar

Introduzca **nombre**, **versión** (`ver`) y **descripción** (`remark`), y pulse **Export**. El JSON contiene los metadatos, la configuración y los scripts.

## Licencia

Distribuido bajo la [Licencia Apache 2.0](LICENSE).
