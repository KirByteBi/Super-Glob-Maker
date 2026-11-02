/* Vista: imagenes de los Pyces. GENERADO por tools/PyceBounds.ps1 (no editar a mano).
   box = zona visible [x, y, ancho, alto] dentro de la imagen original.
   Los dibujos originales miran a la derecha: el juego los voltea al ir a la izquierda.
   Campos MANUALES de orientación (no los genera el script, hay que volver a ponerlos
   si se regenera este archivo con tools/PyceBounds.ps1):
     faceLeft: true  -> el dibujo original mira a la IZQUIERDA
     rot: grados      -> corrección de ángulo si el arte viene inclinado (p. ej. cannon) */
(function (S) {
  'use strict';
  S.View.PyceArt = {
    stupid: { src: 'Enemigos/Stupid_Pyce.png', w: 229, h: 174, box: [0, 20, 229, 151] },
    so: { src: 'Enemigos/SO_Pyce.png', w: 1679, h: 1465, box: [38, 91, 1596, 1273] },
    symbol: { src: 'Enemigos/Symbol_Pyce.png', w: 1080, h: 1080, box: [26, 161, 1047, 828] },
    pyce2: { src: 'Enemigos/Pyce2.png', w: 1080, h: 1080, box: [47, 208, 990, 828] },
    guest: { src: 'Enemigos/Guest_Pyce.png', w: 773, h: 773, box: [76, 13, 601, 727] },
    noob: { src: 'Enemigos/Noob_Pyce.png', w: 241, h: 194, box: [6, 15, 232, 174] },
    crystal: { src: 'Enemigos/Crystal Pyce.png', w: 1080, h: 1080, box: [47, 51, 990, 985] },
    hacker: { src: 'Enemigos/1x1x1x1_Pyce.png', w: 212, h: 235, box: [0, 5, 204, 214] },
    motions: { src: 'Enemigos/4motions_Pyce.png', w: 223, h: 264, box: [15, 28, 199, 214] },
    flower: { src: 'Enemigos/Flower_Pyce.png', w: 1080, h: 1080, box: [180, 36, 721, 1035] },
    moonstar: { src: 'Enemigos/MoonStar_Pyce.png', w: 1080, h: 1080, box: [139, 22, 870, 1058] },
    noeye: { src: 'Enemigos/NOeye_Pyce.png', w: 1080, h: 1080, box: [58, 235, 968, 703] },
    noir: { src: 'Enemigos/NOIRrupt Pyce.png', w: 1080, h: 1080, box: [64, 152, 967, 923] },
    nosense: { src: 'Enemigos/NOsense Pyce.png', w: 1080, h: 1080, box: [65, 152, 965, 872] },
    axolotl: { src: 'Enemigos/Pyces/Axolotl Pyce.png', w: 552, h: 575, box: [21, 16, 507, 541] },
    bomb: { src: 'Enemigos/Pyces/Bomb Pyce.png', w: 1080, h: 1080, box: [6, 25, 1007, 1053] },
    cannon: { src: 'Enemigos/Pyces/Cannon Pycer.png', w: 1080, h: 1080, box: [85, 129, 945, 947], faceLeft: true, rot: -22 },
    clownpysh: { src: 'Enemigos/Pyces/Clown Pysh.png', w: 1080, h: 1080, box: [51, 105, 951, 947] },
    elf: { src: 'Enemigos/Pyces/Elf Pyce.png', w: 1080, h: 1080, box: [29, 102, 983, 971] },
    festive: { src: 'Enemigos/Pyces/Festive Pyce.png', w: 1080, h: 1080, box: [20, 167, 996, 888] },
    ghost: { src: 'Enemigos/Pyces/Ghost Pyce.png', w: 1080, h: 1080, box: [38, 108, 1005, 934] },
    holo: { src: 'Enemigos/Pyces/HoloPyce.png', w: 1080, h: 1080, box: [46, 171, 985, 847] },
    knight: { src: 'Enemigos/Pyces/Knight Pyce.png', w: 1080, h: 1080, box: [4, 311, 1070, 732] },
    pysh: { src: 'Enemigos/Pyces/Pysh.png', w: 1080, h: 1080, box: [59, 42, 971, 1012] },
    rebel: { src: 'Enemigos/Pyces/Rebel Pyce.png', w: 1080, h: 1080, box: [59, 33, 923, 1033] },
    shark: { src: 'Enemigos/Pyces/Shark Pyce.png', w: 569, h: 473, box: [16, 26, 529, 427] },
    skelebone: { src: 'Enemigos/Pyces/SkeleBone Pyce (RW).png', w: 1080, h: 1080, box: [21, 433, 1059, 630] },
    snowcap: { src: 'Enemigos/Pyces/SnowCapaule Pyce.png', w: 1080, h: 1080, box: [43, 201, 979, 831] },
    strechy: { src: 'Enemigos/Pyces/Strechy Pyce.png', w: 1080, h: 1080, box: [216, 17, 720, 1039] },
    toybomb: { src: 'Enemigos/Pyces/ToyBomb Pyce.png', w: 1080, h: 1080, box: [57, 36, 971, 1042] },
    umbrella: { src: 'Enemigos/Pyces/Umbrella Pyce.png', w: 1080, h: 1080, box: [28, 39, 978, 967] },
    wingel: { src: 'Enemigos/Pyces/Wingel Pyce.png', w: 1080, h: 1080, box: [71, 46, 909, 971] },
    zom: { src: 'Enemigos/Pyces/ZomPyce.png', w: 1080, h: 1080, box: [45, 13, 1007, 1061] },
    mimic: { src: 'Enemigos/Mimic Pyce (ENEMY-SKIN)/Mimic Pyce.png', w: 1080, h: 1080, box: [112, 30, 783, 1038] },
    dirty: { src: 'Enemigos/Mimic Pyce (ENEMY-SKIN)/Dirty Pyce (SK-EVO2).png', w: 1080, h: 1080, box: [203, 14, 660, 1052] },
    nomic: { src: 'Enemigos/Mimic Pyce (ENEMY-SKIN)/NOmic Pyce (SK-EVO3).png', w: 1080, h: 1080, box: [167, 25, 783, 1038] },
    goldmimic: { src: 'Enemigos/Mimic Pyce (ENEMY-SKIN)/Golden MimicPyce (SK-EVO4).png', w: 1080, h: 1080, box: [41, 30, 998, 1038] }
  };
})(window.SGM);
