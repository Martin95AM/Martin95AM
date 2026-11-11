# Pedal de distorsión del cuarto de máquinas

El minijuego representa un circuito **educativo de recorte duro a 9 V**, inspirado en la arquitectura de pedales clásicos. Es un esquema funcional propio, no la réplica de un modelo comercial ni un plano de fabricación validado.

## Camino de señal

```text
J1 guitarra → C1 47 nF → U1A RC4558 → R3 10 kΩ → CLIP → C3 1 µF → P2 LEVEL → J2 amplificador
                         ↑                   │
                    P1 DRIVE 500 kΩ          ├─ D1 1N4148 → VREF
                    realimentación           ├─ D2 1N4148 ← VREF
                         │                   └─ C2 10 nF → VREF
                    R2 4,7 kΩ → VREF
```

- **VREF** es aproximadamente 4,5 V, generado por dos resistencias iguales desde la batería de 9 V y desacoplado con un capacitor. Permite que el amplificador operacional procese una señal alterna con alimentación simple.
- **R1 de 1 MΩ** referencia la entrada de U1A a VREF. C1 bloquea la componente continua de la guitarra.
- **P1 y R2** fijan la ganancia no inversora de U1A. R3 limita la corriente hacia los diodos.
- **D1 y D2** están en antiparalelo entre el nodo CLIP y VREF. Limitan los semiciclos positivo y negativo. La banda de cada diodo debe orientarse en sentido opuesto.
- **R3 y C2** forman un filtro pasabajos aproximado de 1,6 kHz, antes del capacitor de salida C3 y del control de nivel P2.

La placa del juego ya trae R1, R2, R3, el divisor de VREF, su desacoplo y P2. El jugador instala siete piezas y suelda sus **21 pines**. El osciloscopio y el tono sintetizado muestran el efecto de forma aproximada; no son una simulación SPICE ni una grabación de guitarra.

Referencias de diseño: [TI SideGig Guitar EVM, canal DRIVE](https://www.ti.com/lit/ug/slau714a/slau714a.pdf) describe una cadena con amplificador, control de ganancia, diodos de recorte y etapa de tono; [Analog Devices, diode clippers](https://wiki.analog.com/university/courses/electronics/text/chapter-7) explica el recorte por diodos en derivación; [Analog Devices, polarización de op amps con alimentación simple](https://www.analog.com/en/resources/app-notes/an-581.html) explica la referencia de media alimentación.
