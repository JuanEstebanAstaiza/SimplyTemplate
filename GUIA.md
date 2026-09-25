# Guía de uso de SimplyTemplate

Esta guía sirve para instalar SimplyTemplate y para volver a abrirlo en este equipo cuando se olvide el procedimiento.

La carpeta del proyecto es:

`C:\Users\akali\OneDrive\Escritorio\SimplyTemplate`

La aplicación en este equipo se abre en [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Qué tiene que estar instalado

- Node.js 22 o posterior
- npm, que viene con Node.js
- Docker Desktop, con el motor en marcha

Para comprobarlo, en PowerShell:

```powershell
node -v
npm -v
docker version
```

## Correrlo en este equipo

Abra PowerShell, entre a la carpeta y levante las dos bases. Después arranque la aplicación.

```powershell
cd C:\Users\akali\OneDrive\Escritorio\SimplyTemplate
docker compose up -d postgres mongo
npm run dev
```

Deje esa ventana abierta. Cuando aparezca `Ready`, entre a [http://127.0.0.1:3000](http://127.0.0.1:3000).

Para apagar solo la aplicación, pulse `Ctrl+C` en esa ventana. Las bases siguen guardadas. Para apagarlas también:

```powershell
docker compose stop
```

Al día siguiente basta con repetir `docker compose up -d postgres mongo` y `npm run dev`.

## Primera vez en este equipo

Haga esto una sola vez, o cuando la carpeta esté recién copiada.

```powershell
cd C:\Users\akali\OneDrive\Escritorio\SimplyTemplate
copy .env.example .env
npm install
docker compose up -d postgres mongo
npx prisma migrate deploy
npm run demo
npm run dev
```

`npm run demo` crea la Alcaldía de Ejemplo solo si todavía no hay una entidad. Si ya existe, el comando no borra nada.

En `.env` las direcciones usan `127.0.0.1`. En Windows, `localhost` a veces no llega a Docker. Dentro de un servidor con `docker compose`, la aplicación usa los nombres `postgres` y `mongo`; eso ya está escrito en `docker-compose.yml`.

## Usuarios de la demostración

La contraseña de los cuatro es `Demo1234`.

| Cédula | Nombre | Para qué entra |
| --- | --- | --- |
| 1000000001 | Ana Administradora | Crea funcionarios, plantillas y asigna columnas |
| 1000000002 | Luis Editor | Edita la hoja |
| 1000000003 | María Revisor | Autoriza la subida de la tabla y puede devolver un folio |
| 1000000004 | Pedro Auditor | Consulta la auditoría |

Si la base está vacía y no corrió la demostración, en la pantalla de entrada use **Primera instalación de la entidad** y cree el administrador.

## Uso diario de la hoja

1. Entre con la cédula.
2. Abra una plantilla. La primera fila es solo el título de cada columna.
3. Edite en la cuadrícula, o pase a **Por títulos** y busque la columna por su nombre.
4. Un clic selecciona. Doble clic abre la casilla. Arrastre, o use Mayús, para elegir varias.
5. Cuando termine, pulse **Radicar cambios**. El formulario sale en una ventana. Ahí van el resumen y la cédula y contraseña de un revisor.
6. **Auditoría** muestra el árbol de folios. Cada título de columna que cambió sale como una rama.
7. **Configuración rápida**, en el menú lateral, cambia las teclas de negrita, número, porcentaje y el resto. `Ctrl+B` es negrita.

## Instalarlo en el servidor de una entidad

En el servidor hacen falta Docker y Docker Compose, 2 CPU, 4 GB de RAM y disco según los documentos que se vayan a guardar.

```bash
cp .env.example .env
```

Cambie `AUTH_SECRET` por una clave larga y distinta. Luego:

```bash
docker compose up -d --build
```

Abra el puerto 3000 y complete **Primera instalación de la entidad**.

Si el servidor no tiene internet, cargue antes las imágenes con `docker load` y después ejecute `docker compose up -d`.

Para publicar por el puerto 80:

```bash
docker compose --profile proxy up -d
```

## Copia de seguridad

En este equipo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
```

En Linux:

```bash
sh scripts/backup.sh
```

El respaldo queda en `backups\` con la fecha del momento. Conserva el volcado de PostgreSQL y el de MongoDB. Para volver atrás, restaure esos dos archivos y levante los mismos contenedores.

## Si algo no abre

- Docker Desktop tiene que estar encendido antes de `docker compose`.
- Si el puerto 3000 ya está ocupado, cierre la ventana anterior donde sigue `npm run dev`.
- Si `npx prisma migrate deploy` dice que no llega a la base, revise que `.env` use `127.0.0.1` y que `docker compose ps` muestre `postgres` y `mongo` en marcha.
- Si al regenerar Prisma aparece `EPERM` sobre `query_engine-windows.dll.node`, pare `npm run dev` y vuelva a ejecutar el comando.

## Licencia

El uso del programa está en `LICENCIA.md`. Los derechos patrimoniales permanecen en el licenciante.
