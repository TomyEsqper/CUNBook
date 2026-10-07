# CunBook - Frontend (Angular 21 + Angular Material)

Plataforma de reserva de espacios universitarios. Este proyecto es solo el frontend; consume por HTTP la API REST de ASP.NET Core ([ReservaEspacios](https://github.com/juandsalcedo/ReservaEspacios)), que vive en otro repositorio.

## Ejecutar

1. Levantar el backend (por defecto en `http://localhost:5000`, Swagger en `/swagger`).
2. Levantar el front:

```bash
npm install
ng serve
```

Abrir http://localhost:4200

Cuenta creada por el backend: `admin@cun.edu.co` / `AdminCun2026*`. Las cuentas nuevas se crean desde "Registrarse" (siempre como Estudiante).

## Configuración

En `src/environments/environment.development.ts` (y `environment.ts` para producción):

- `apiUrl`: URL base de la API (`http://localhost:5000/api`).
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
