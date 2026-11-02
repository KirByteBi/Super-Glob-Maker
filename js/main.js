/* Punto de entrada: arranca el controlador principal */
(function (S) {
  'use strict';
  window.addEventListener('DOMContentLoaded', () => {
    S.app = new S.Controller.AppController();
    S.app.start();
  });
})(window.SGM);
