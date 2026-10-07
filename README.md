# CunBook - Frontend (Angular 21 + Angular Material)

Plataforma de reserva de espacios universitarios. Este proyecto es solo el frontend; consume por HTTP la API REST de ASP.NET Core ([ReservaEspacios](https://github.com/juandsalcedo/ReservaEspacios)), que vive en otro repositorio.

## Ejecutar

El front consume el backend desplegado en Render (`https://reservaespacios-z1av.onrender.com/api`). Está en el plan gratuito: si lleva un rato sin uso, el primer request tarda 30-50 segundos mientras despierta, y el login muestra un aviso.

Para usar un backend local, cambia `apiUrl` a `http://localhost:5000/api` en `src/environments/environment.development.ts`.

```bash
npm install
ng serve
```

Abrir http://localhost:4200

Cuenta creada por el backend: `admin@cun.edu.co` / `AdminCun2026*`. Las cuentas nuevas se crean desde "Registrarse" (siempre como Estudiante).

## Configuración

En `src/environments/environment.development.ts` (y `environment.ts` para producción):

- `apiUrl`: URL base de la API (`https://reservaespacios-z1av.onrender.com/api`).
- `useMocks`: `false` consume la API real; `true` simula el backend en el navegador (localStorage), útil para trabajar sin servidor. Cuentas mock: `estudiante@`, `docente@` y `admin@cun.edu.co`, contraseña `demo123`.

El token JWT se envía automáticamente en `Authorization: Bearer <token>` (`core/interceptors/jwt-interceptor.ts`).

## Integración con la API

La traducción entre los DTO del backend y los modelos del front está en `src/app/core/api/backend.ts` (enums de tipo de espacio y día sin tildes, reservas planas, login sin perfil completo). Errores con el formato `{ error, detalles? }`.

| Método | Ruta | Uso en el front |
| --- | --- | --- |
| POST | `/auth/login` | Login; luego `GET /users/profile` para el perfil completo |
| POST | `/auth/register` | Registro; luego login automático |
| GET / PUT | `/users/profile` | Perfil del usuario autenticado |
| GET | `/spaces` | Lista (búsqueda y filtros se aplican en el front) |
| GET | `/spaces/{id}` | Detalle con `horarios` |
| POST / PUT | `/spaces`, `/spaces/{id}` | Crear / editar espacio (admin); "Desactivar" hace PUT con `disponible: false` |
| POST / DELETE | `/space-horarios`, `/space-horarios/{id}` | Horarios del espacio, se reemplazan al guardar |
| GET / POST | `/reservations` | Reservas del usuario / crear reserva |
| GET / PUT / DELETE | `/reservations/{id}` | Detalle / modificar fecha y horas / cancelar |

Para probar la API directamente en Postman, ver [README-API.md](README-API.md).

### Pendiente en el backend

Estas funciones solo están en el modo mock; con la API real se ocultan o muestran un aviso:

- Ocupación de un espacio por todos los usuarios (`GET /spaces/{id}/availability`): el calendario solo marca las reservas propias, y los cruces con otras los rechaza el backend al guardar.
- Registro como Docente (el backend registra a todos como Estudiante).
- Recuperar contraseña, notificaciones, reportes, listado de todas las reservas, cancelación administrativa, listado de usuarios y cambio de rol.

## CI/CD y despliegue

- **CI** (`.github/workflows/ci-cd.yml`): en cada push y pull request a `main` instala dependencias (`npm ci`) y hace el build de producción. Si falla, el PR queda marcado en rojo.
- **CD**: en cada push a `main`, si pasa el build, despliega a Vercel en producción. Necesita estos secretos en GitHub (*Settings > Secrets and variables > Actions*):
  - `VERCEL_TOKEN`: se crea en vercel.com > Account Settings > Tokens.
  - `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`: aparecen en `.vercel/project.json` después de correr `npx vercel link` en esta carpeta.

  Si no están los secretos, el job de despliegue se omite. En ese caso puedes usar la integración Git de Vercel (importar el repositorio en Vercel), que despliega sola en cada push. No uses las dos a la vez o cada push se desplegará dos veces.
- `vercel.json` redirige todas las rutas a `index.html`, para que recargar `/home` o abrir un enlace directo no dé 404.
- Antes de desplegar, cambia `apiUrl` en `src/environments/environment.ts` por la URL **https** del backend publicado.

## Estructura

```
src/app/
  core/        api (contrato del backend), modelos, servicios (API + mock), interceptores, guards, utilidades
  layout/      public-layout (login/registro/ayuda), shell (app con sesión), logo y footer CUN
  features/
    home/          panel principal: espacios destacados, notificaciones, próximas reservas
    help/          preguntas frecuentes
    auth/          login, registro, perfil
    spaces/        listado con filtros, detalle con horarios
    reservations/  crear/modificar, mis reservas, calendario semanal
    admin/         gestión de espacios, usuarios, reportes
    shared/        diálogo de confirmación
```
