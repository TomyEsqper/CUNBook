# Pruebas de la API en Postman

Endpoints del backend [ReservaEspacios](https://github.com/juandsalcedo/ReservaEspacios) que consume este frontend.

**URL base:** `http://localhost:5000/api`

## Cómo usarlas en Postman

1. Haz el **login** (`POST /auth/login`) y copia el valor de `token` de la respuesta.
2. En cada petición siguiente, en la pestaña **Authorization**, elige **Bearer Token** y pega el token. Solo el registro y el login funcionan sin token.
3. Para las peticiones con cuerpo: **Body**, **raw**, **JSON**, y pega el ejemplo.
4. Formatos que espera el backend:
   - Fechas: `yyyy-MM-dd`.
   - Horas: `HH:mm`.
   - Tipo de espacio: `Aula`, `Laboratorio`, `SalaEstudio`, `Ludico` o `Auditorio`.
   - Día de la semana, sin tildes: `Lunes`, `Martes`, `Miercoles`, `Jueves`, `Viernes`, `Sabado` o `Domingo`.

Cuenta de administrador que crea el backend: `admin@cun.edu.co` / `AdminCun2026*`.

Cambia el `1` de las URLs por el id real que devuelve el listado o la creación.

## Auth (sin token)

| Método | URL | Body |
|---|---|---|
| POST | `/auth/register` | `{"nombre":"Ana Gómez","email":"ana.gomez@cun.edu.co","password":"Cun2026*","telefono":"3001234567","facultad":"Sistemas"}` |
| POST | `/auth/login` | `{"email":"admin@cun.edu.co","password":"AdminCun2026*"}` |

## Usuarios

| Método | URL | Body |
|---|---|---|
| GET | `/users/profile` | — |
| PUT | `/users/profile` | `{"nombre":"Ana Gómez","telefono":"3001234567","facultad":"Sistemas"}` |
| POST | `/users/change-password` | `{"passwordActual":"Cun2026*","passwordNueva":"Nueva2026*"}` |

## Espacios

Crear, editar y borrar requieren token de administrador.

| Método | URL | Body |
|---|---|---|
| GET | `/spaces` | — |
| GET | `/spaces/1` | — |
| POST | `/spaces` | `{"nombre":"SALA 101","capacidad":8,"ubicacion":"Piso 1","tipo":"SalaEstudio","descripcion":"Sala silenciosa","horarioFuncionamiento":"Lunes a viernes 07:00-22:00","disponible":true}` |
| PUT | `/spaces/1` | Igual que el POST |
| DELETE | `/spaces/1` | — |

## Horarios de espacios

Crear, editar y borrar requieren token de administrador.

| Método | URL | Body |
|---|---|---|
| GET | `/space-horarios?spaceId=1` | — |
| GET | `/space-horarios/1` | — |
| POST | `/space-horarios` | `{"spaceId":1,"diaSemana":"Lunes","horaInicio":"07:00","horaFin":"22:00","estaDisponible":true}` |
| PUT | `/space-horarios/1` | `{"diaSemana":"Lunes","horaInicio":"08:00","horaFin":"20:00","estaDisponible":true}` |
| DELETE | `/space-horarios/1` | — |

## Reservas

Operan sobre las reservas del usuario dueño del token.

| Método | URL | Body |
|---|---|---|
| GET | `/reservations` | — |
| GET | `/reservations/1` | — |
| POST | `/reservations` | `{"spaceId":1,"fecha":"2026-10-08","horaInicio":"10:00","horaFin":"11:00"}` |
| PUT | `/reservations/1` | `{"fecha":"2026-10-08","horaInicio":"14:00","horaFin":"15:30"}` |
| DELETE | `/reservations/1` | — (cambia el estado a `Cancelada`) |

Al crear o modificar una reserva usa una fecha futura y una hora dentro del horario del espacio.

## Respuestas de error

Los errores llegan como `{ "error": "mensaje", "detalles": [...] }`. Casos útiles para probar:

| Prueba | Respuesta |
|---|---|
| Login con correo que no es `@cun.edu.co` | 400 `Solo se permiten correos universitarios (@cun.edu.co)` |
| Login con contraseña incorrecta | 401 `Correo o contraseña incorrectos.` |
| Cualquier petición sin token | 401 `No autorizado. Inicia sesión para continuar.` |
| Crear un espacio con token de estudiante | 403 `No tienes permiso para realizar esta acción.` |
| Registrar un correo que ya existe | 409 `Ya existe una cuenta con ese correo.` |
| Reserva que se cruza con otra activa | 400 `El espacio ya está ocupado en esa franja horaria.` |
| Reserva fuera del horario del espacio | 400 `El espacio no opera en la franja horaria solicitada...` |
| Reserva en una fecha u hora pasada | 400 `No se puede reservar una fecha u hora que ya pasó.` |
| Cancelar una reserva ya cancelada | 400 `La reserva ya está cancelada.` |
| Borrar un espacio que tiene reservas | 400 `No se puede eliminar el espacio porque tiene reservas asociadas.` |
