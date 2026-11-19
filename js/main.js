/* © 2026 KirByte_Bi · OWNER: KirByte_Bi · Todos los derechos reservados. Ver LICENSE. */
/* Punto de entrada: arranca el controlador principal */
(function (S) {
  'use strict';
  window.addEventListener('DOMContentLoaded', () => {
    S.app = new S.Controller.AppController();
    S.app.start();
  });
})(window.SGM);
