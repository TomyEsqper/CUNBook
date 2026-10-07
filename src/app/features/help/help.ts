import { Component, inject } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MAX_HORAS_RESERVA, MAX_RESERVAS_ACTIVAS } from '../../core/models/reservation';
import { AuthService } from '../../core/services/auth';

interface Faq {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-help',
  imports: [MatExpansionModule, MatIconModule, RouterLink],
  templateUrl: './help.html',
  styleUrl: './help.css',
})
export class Help {
  protected readonly auth = inject(AuthService);

  protected readonly faqs: Faq[] = [
    {
      question: '¿Quién puede usar RESERVAS CUN?',
      answer:
        'Estudiantes y docentes de la CUN con correo institucional @cun.edu.co. Regístrate con tus datos y empieza a reservar.',
    },
    {
      question: '¿Cómo reservo un espacio?',
      answer:
        'Entra a Espacios o al calendario, elige el espacio, la fecha y la franja horaria libre, y confirma. Recibirás un número de reserva y un correo de confirmación.',
    },
    {
      question: '¿Puedo modificar o cancelar una reserva?',
      answer:
        'Sí, desde Mis Reservas puedes cambiar la fecha u hora o cancelarla hasta una hora antes de su inicio. Una reserva cancelada no se puede reactivar.',
    },
    {
      question: '¿Cuántas reservas puedo tener al tiempo?',
      answer: `Puedes tener hasta ${MAX_RESERVAS_ACTIVAS} reservas activas simultáneamente.`,
    },
    {
      question: '¿Cuánto puede durar una reserva?',
      answer: `Máximo ${MAX_HORAS_RESERVA} horas, en bloques de 30 minutos, dentro del horario de funcionamiento del espacio.`,
    },
    {
      question: '¿Recibiré recordatorios?',
      answer:
        'Sí. Te enviamos la confirmación al reservar, un recordatorio 24 horas antes y un aviso si la reserva se cancela.',
    },
    {
      question: '¿Por qué no puedo reservar en cierto horario?',
      answer:
        'Puede que el espacio ya esté ocupado, que no opere en esa franja o que esté en mantenimiento. El calendario muestra en verde las franjas disponibles.',
    },
  ];
}
