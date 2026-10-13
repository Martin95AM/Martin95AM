# Entrenamiento en el dojo

El Sensei practica una secuencia de bloqueos, puñetazos y patadas en cuatro
direcciones. Las katas son una demostración: solo golpea a Martín al pulsar M.

| Tecla | Acción |
| --- | --- |
| WASD / flechas | Moverse y orientar el golpe |
| P | Puñetazo de Martín |
| O | Patada de Martín, de mayor alcance y recuperación más lenta |
| M | Pedir un golpe al Sensei estando cerca; elige puño o patada según la distancia |
| F | Activar o detener las flexiones (antes estaban en P) |
| E | Hablar / interactuar |
| Q | Pasar por la puerta al otro escenario |

Los golpes se comprueban al terminar la preparación: se pueden esquivar
alejándose. Para acertar hay que estar cerca y mirar hacia el rival.
Cada ataque cuenta un solo acierto; mantener o repetir rápidamente una tecla
no evita la recuperación. Un destello señala los impactos y Martín retrocede
brevemente cuando recibe uno. El marcador se reinicia al volver al dojo.

Las poses se dibujan en código a partir de la cabeza y el uniforme originales;
no requieren descargar nuevas imágenes.

## Ejecución y comprobación

Desde la raíz del repositorio:

```sh
npm ci
npm run dev
node --test frontend/src/combat/rules.test.mjs
npm run build
```

Comprobación manual: probar P y O mirando hacia el Sensei y de espaldas,
presionar M cerca y lejos, esquivar durante la preparación, alternar F con P,
y salir al estudio con Q y volver al dojo para repetir los controles.
