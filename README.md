# SimplyTemplate

Portal de plantillas institucionales. Cada instalación atiende una entidad. Los folios guardan quién cambió cada casilla, por qué, con qué soportes y con qué constancia.

## Requisitos

- Docker y Docker Compose
- En el servidor: 2 CPU, 4 GB de RAM y disco según los soportes

## Instalación

1. Copie `.env.example` a `.env` y cambie `AUTH_SECRET` por una clave larga.
2. En Windows, deje `127.0.0.1` en las URLs de desarrollo. Dentro de Compose, la aplicación usa los nombres `postgres` y `mongo`.
3. Levante las bases y la aplicación:

```bash
docker compose up -d --build
```

4. Abra el navegador en el puerto 3000 y entre a **Primera instalación de la entidad**.

Si el servidor no tiene internet, cargue las imágenes con `docker load` y luego `docker compose up -d`.

El perfil `proxy` publica Caddy en los puertos 80 y 443:

```bash
docker compose --profile proxy up -d
```

## Copia de seguridad

`scripts/backup.ps1` en Windows y `scripts/backup.sh` en Linux escriben un directorio con `pg_dump` y `mongodump`. Restaurar es volver a cargar esos dos respaldos y levantar los mismos contenedores.

## Desarrollo en esta máquina

```bash
docker compose up -d postgres mongo
npm install
npx prisma migrate deploy
npm run dev
```

`npm test` comprueba fórmulas, combinadas, la cadena de huellas, los avisos, la vigencia y la presencia.

`npm run demo` carga una alcaldía de ejemplo si todavía no hay entidad. Las contraseñas de demostración son `Demo1234`.

## Licencia

El uso lo rige `LICENCIA.md`. Los derechos patrimoniales permanecen en el licenciante.
