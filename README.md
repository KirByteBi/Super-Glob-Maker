# Super Glob Maker

Creador de niveles 2D estilo *Super Mario Maker*, ambientado en el universo de
**Glob Defenders**. Diseña tus propios niveles de plataformas con Globs, Pyces y
decenas de mecanismos, juégalos, enlázalos en un Modo Historia con mapamundi y
(si vinculas tu cuenta de Glob Defenders) guárdalos en la nube y compártelos.

Super Glob Maker es el proyecto *companion* oficial de Glob Defenders: comparte
sus personajes, recursos y cuenta.

> English version: see [`README.en.md`](README.en.md).

---

## Cómo jugar

No necesita instalación ni servidor. Basta con abrir el juego en el navegador:

1. Abre `index.html` (o el juego en web) con un navegador moderno (Chrome, Edge o Firefox).
2. Desde el menú puedes jugar el **Modo Historia**, crear niveles en el
   **Editor** o abrir **Mis niveles**.

> Consejo: si tu navegador bloquea algún recurso al abrir el archivo
> directamente, sirve la carpeta con un servidor local sencillo, por ejemplo
> `python -m http.server` y entra en `http://localhost:8000`.

---

## Controles

| Acción            | Teclas                              |
|-------------------|-------------------------------------|
| Mover             | Flechas ← → (o A / D)               |
| Saltar            | Z · W · Flecha arriba               |
| Correr            | X · Shift                           |
| Disparar          | Espacio · C                         |
| Entrar en tubería | Flecha abajo (encima de la tubería) |

En el **editor**:

- **Clic** coloca el elemento seleccionado; **clic derecho / borrador** lo quita.
- **Clic otra vez** sobre un objeto con recorrido (setas, plataformas, barra
  estelar) cambia su tamaño.
- **R** gira las tuberías (vertical ↔ horizontal).
- **Ctrl+P** prueba el nivel; **Esc** vuelve al editor.

> En móvil se muestran controles táctiles. En el editor, usa el botón de la
> mano para arrastrar y mover la cámara con un dedo; también puedes desplazarla
> con dos dedos. Los gestos táctiles no amplían la página accidentalmente.

---

## Qué incluye

- **Modo Historia** con mapamundi al estilo de los supermundos de SMM2: mundos,
  sendas, castillos y metas ocultas.
- **Editor** con paleta por categorías (Terreno, Bloques, Pyces, Pyces raros,
  Objetos, Mecanismos, Especial) y 3 modos de inicio (Clásico, Aireado, Campo
  de Pruebas).
- **Subzonas**: zona base + hasta 2 subzonas, enlazadas con tuberías y puertas
  (normales o con llave).
- **Mecanismos**: bloques A/B, interruptor P (monedas ↔ bloques), interruptores
  y bloques "!", pendientes, rosquillas, bloque Nota, bloque POW, barra estelar,
  muelles, plataformas sobre raíles, cápsulas de personaje, cajas, monedas rojas
  y más.
- **Más de una docena de mapas** con paleta de día/noche y su variante
  **Corrupto** (cada mapa cambia una regla del nivel).
- **Enemigos Pyce** completos: terrestres, voladores, acuáticos (familia Pysh),
  raros y jefes.
- **Condiciones de victoria** configurables (ninguna, sin saltar, matar X
  enemigos, juntar X monedas, monedas rojas) con progreso en el HUD.
- **Cuenta Glob Defenders** (en integración): guardar en la nube, publicar y
  compartir niveles usando tu misma cuenta de GlD.

---

## Estructura del proyecto

Arquitectura **MVC** en JavaScript vanilla (sin frameworks ni build). El modelo
emite eventos y las vistas solo dibujan sobre `<canvas>`.

```
Super Glob Maker/
├── index.html              Punto de entrada (carga todos los scripts)
├── css/style.css           Estilos de la interfaz
├── js/
│   ├── core/               Núcleo (sgm.js, i18n.js)
│   ├── model/              Lógica del juego
│   │   ├── Catalog.js        Catálogo de tiles / objetos
│   │   ├── Level.js          Representación del nivel
│   │   ├── Physics.js        Física (pendientes, A/B, colisiones)
│   │   ├── Player.js         Jugador
│   │   ├── GameModel.js      Estado de partida
│   │   ├── EditorModel.js    Estado del editor
│   │   ├── StoryMap.js       Mapamundi del Modo Historia
│   │   ├── entities/         Enemigos y objetos
│   │   └── ...
│   ├── view/               Dibujo sobre canvas
│   │   ├── Sprites.js        Tiles y entidades
│   │   ├── GroundStyles.js   Estilos de suelo por mapa
│   │   ├── Decorations.js    Decoraciones de terreno
│   │   ├── BackgroundView.js Fondos con parallax
│   │   ├── WorldRenderer.js  Render del mundo
│   │   ├── MenuView.js       Menús
│   │   └── ...
│   └── controller/         Entrada y flujo
│       ├── InputController.js
│       ├── GameController.js
│       ├── MapController.js  Mapamundi
│       ├── EditorController.js
│       └── AppController.js
├── Globs/                  Sprites de los Globs (personajes)
├── Enemigos/               Sprites de los Pyces (enemigos)
├── miniaturas/             Capturas / miniaturas
├── niveles_kirodev/        Niveles de ejemplo
└── kiro/                   Documentos de diseño (PLANNING, HISTORIA, etc.)
```

---

## Estado

En desarrollo activo. La mecánica base (jugar, editar, guardar, Modo Historia,
mapas y modo Corrupto) está operativa. Pendientes principales: redibujo de Pyces
de perfil, semisólidos temáticos, mapas nuevos, integración completa de la cuenta
GlD (nube, publicación, social) y controles móviles. El detalle vive en
`kiro/PLANNING.txt` y `kiro/FALTANTES.txt`.

---

## Créditos y licencia

Creado por **KirByte_Bi**. Personajes, Globs, Pyces y recursos compartidos con
Glob Defenders. Consulta el archivo [`LICENSE`](LICENSE) para los créditos
completos y las condiciones de uso.

Proyecto fan inspirado en la saga *Super Mario Maker* (© Nintendo), sin ánimo de
lucro. Todas las marcas pertenecen a sus respectivos dueños.

Super Glob Maker © 2026 KirByte_Bi. Todos los derechos reservados.
