# Astro Luna — Documento del juego

## Concepto
Astro Luna es un juego de plataformas en 2D hecho con HTML5 Canvas y JavaScript puro
(sin librerías externas). Es una reinterpretación con temática lunar del Nivel 1-1 de
Super Mario Bros, desarrollada como parte de la Actividad Participativa de
Tecnologías de Creación Digital.

## Cómo jugar
Abre `index.html` en un navegador (Chrome, Firefox o Edge). No necesita servidor ni
instalación: funciona haciendo doble clic en el archivo.

- **Flecha izquierda / A:** moverse a la izquierda
- **Flecha derecha / D:** moverse a la derecha
- **Flecha arriba / ESPACIO / W:** saltar
- **P:** pausar / reanudar

## Objetivo
Recorrer la superficie lunar, bajar por el cráter al mundo de queso dentro de la luna,
recolectar cristales, evitar o derrotar a los enemigos, y llegar a la bandera junto al
cohete antes de quedarse sin oxígeno, para completar el nivel.

## Equivalencias con el Nivel 1-1 original
| Elemento original (Mario) | Elemento en Astro Luna |
|---|---|
| Mario | Astronauta |
| Monedas | Cristales |
| Tiempo | Oxígeno |
| Goomba | Alien de roca |
| Tortuga | Robot cangrejo / Ratón espacial (mundo de queso) |
| Tubo verde | Cráter |
| Subterráneo | Mundo de queso dentro de la luna |
| Bloque de pregunta "?" | Asteroide con signo de pregunta |
| Bloque de ladrillo | Asteroide de roca |
| Castillo | Cohete sobre su plataforma de lanzamiento |

## Estructura de carpetas
```
AstroLuna/
├── index.html          Punto de entrada del juego
├── general/             Este documento y notas del proyecto
├── css/
│   └── style.css        Estilos de la interfaz y el HUD
├── js/
│   └── game.js           Lógica del juego (física, colisiones, escenas, IA simple)
└── assets/
    ├── img/              Sprites e imágenes (PNG, fondo transparente)
    ├── audio/             Efectos de sonido (WAV)
    └── video/             Carpeta reservada para material audiovisual futuro
```

## Escenas del juego
1. **Superficie lunar:** asteroides flotantes, un alien de roca y la entrada al cráter.
2. **Mundo de queso:** cueva de queso con cristales en arco y un ratón espacial.
3. **Final del nivel:** bandera y cohete; al llegar, el astronauta sube el mástil,
   se cuenta la puntuación y el cohete despega.

## Mecánicas
- Física simple de salto y gravedad.
- Los asteroides con "?" dan un cristal y 200 puntos la primera vez que se golpean
  desde abajo; después quedan vacíos.
- Saltar sobre un enemigo lo derrota (+100 puntos); tocarlo de costado quita una vida.
- El oxígeno baja con el tiempo, como el contador de tiempo del juego original;
  si llega a 0, se pierde una vida.
- 3 vidas iniciales. Al perder todas, aparece la pantalla de Game Over con la
  puntuación final.

## Crédito
Concepto y producción: actividad de clase (Tecnologías de Creación Digital).
Código, sprites y efectos de sonido generados para este proyecto.
