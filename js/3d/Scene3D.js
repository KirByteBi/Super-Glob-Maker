/* Modo 3D (View): escena, luces, cielo, cámara, renderer. Construye los meshes del mundo
   (PRIMITIVAS por ahora: cajas/esferas con los colores del tema 2D). Dibuja cada frame.
   Requiere THREE ya cargado (lo garantiza Game3D antes de instanciar). */
(function (S) {
  'use strict';
  const G3 = S.G3;

  // Color del tema 2D (paleta pal) para reusar la identidad visual.
  function palette(themeId) {
    const t = (S.Model.Themes.list || []).find((x) => x.id === themeId) || S.Model.Themes.list[0];
    return (t && t.pal) || { skyTop: '#7fd3ff', skyBot: '#e6f8ff', ground: '#9a6440', top: '#00ff66', brick: '#ff7ac8' };
  }
  const col = (THREE, hex) => new THREE.Color(hex);

  class Scene3D {
    constructor(canvas, world) {
      const THREE = window.THREE;
      this.THREE = THREE; this.canvas = canvas; this.world = world;
      const pal = this.pal = palette(world.theme);

      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.setSize(canvas.clientWidth || S.VIEW_W, canvas.clientHeight || S.VIEW_H, false);

      this.scene = new THREE.Scene();
      // cielo en degradado (dos colores de la paleta) para que no sea un plano plano
      this.scene.background = this._skyTexture(THREE, pal.skyTop, pal.skyBot);
      this.scene.fog = new THREE.Fog(col(THREE, pal.skyBot), 55, 140);

      this.camera = new THREE.PerspectiveCamera(58, (canvas.clientWidth || S.VIEW_W) / (canvas.clientHeight || S.VIEW_H), 0.1, 500);
      this.camera.position.set(0, 8, 12);

      // luces: hemisférica (cielo/suelo), sol direccional con sombras, y un relleno suave
      this.scene.add(new THREE.HemisphereLight(col(THREE, pal.skyTop), col(THREE, pal.ground), 0.75));
      const sun = this.sun = new THREE.DirectionalLight(0xffffff, 1.05);
      sun.position.set(12, 26, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const sc = sun.shadow.camera; sc.near = 1; sc.far = 90; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40;
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-10, 8, -12); this.scene.add(fill);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.buildWorld();
      this.buildPyces();
      this.buildPlayer();

      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
    }

    // Cielo en degradado vertical como textura (dos colores de la paleta).
    _skyTexture(THREE, top, bot) {
      const c = document.createElement('canvas'); c.width = 4; c.height = 256;
      const g = c.getContext('2d'); const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, top); grad.addColorStop(1, bot);
      g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace || undefined;
      return tex;
    }

    buildWorld() {
      const THREE = this.THREE, pal = this.pal, w = this.world;
      const U = S.util;
      const group = this.worldGroup = new THREE.Group();
      // materiales por tipo de bloque: Phong para un brillo suave tipo juguete
      const mat = (hex, shiny) => new THREE.MeshPhongMaterial({ color: col(THREE, hex), shininess: shiny ? 40 : 8, specular: 0x222222, flatShading: false });
      const mats = {
        ground: mat(pal.ground, false),
        hard: mat(pal.brick || pal.groundDark || pal.ground, true),
        top: mat(pal.top, false)
      };
      // color de las aristas (líneas) para marcar los bloques y que no sean cajas "planas"
      const edgeMat = new THREE.LineBasicMaterial({ color: col(THREE, U.shade(pal.ground, -0.35)) });

      for (const b of w.blocks) {
        const bw = b.w || 1, bh = b.h || 1, bd = b.d || 1;
        const geo = new THREE.BoxGeometry(bw, bh, bd);
        const mesh = new THREE.Mesh(geo, mats[b.type] || mats.ground);
        mesh.position.set(b.x + bw / 2, b.y + bh / 2, b.z + bd / 2);
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
        // aristas finas
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
        edges.position.copy(mesh.position); group.add(edges);
        // "tapa" (césped) encima del suelo, con su propia arista
        if (b.type === 'ground' && bh >= 0.5) {
          const cg = new THREE.BoxGeometry(bw, 0.2, bd);
          const cap = new THREE.Mesh(cg, mats.top);
          cap.position.set(b.x + bw / 2, b.y + bh - 0.1, b.z + bd / 2);
          cap.castShadow = true; cap.receiveShadow = true;
          group.add(cap);
        }
      }
      this.scene.add(group);

      // Medallas: ESTRELLA de 5 puntas dorada (extruida), giratoria
      this.medalMeshes = [];
      const star = this._starGeometry(THREE, 0.55, 0.24, 0.16);
      const medalMat = new THREE.MeshPhongMaterial({ color: 0xffd23f, emissive: 0x7a5600, shininess: 90, specular: 0xffffcc });
      for (const m of w.medals) {
        const mesh = new THREE.Mesh(star, medalMat);
        mesh.position.set(m.x, m.y, m.z);
        mesh.castShadow = true; mesh.userData.medal = m;
        this.scene.add(mesh); this.medalMeshes.push(mesh);
        // halo suave
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe68a, transparent: true, opacity: 0.12 }));
        mesh.add(halo);
      }

      // Meta (portal): anillo brillante vertical
      if (w.goal) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.16, 14, 32), new THREE.MeshPhongMaterial({ color: col(THREE, pal.accent || '#ffffff'), emissive: col(THREE, U.shade(pal.accent || '#ffffff', -0.4)), shininess: 70 }));
        ring.position.set(w.goal.x, w.goal.y + 1.0, w.goal.z);
        ring.castShadow = true;
        this.scene.add(ring); this.goalMesh = ring;
      }
    }

    // Geometría de estrella de 5 puntas extruida (para las Medallas).
    _starGeometry(THREE, outer, inner, depth) {
      const shape = new THREE.Shape();
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / pts) * i - Math.PI / 2;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
      geo.center();
      return geo;
    }

    // CUBO REDONDEADO (squircle 3D): entre cubo y esfera. roundness 0 = cubo, 1 = esfera.
    // Los modelos viejos eran cubos; ahora son "cubos redonditos". sx/sy/sz = tamaños.
    _roundedCube(THREE, sx, sy, sz, roundness) {
      const geo = new THREE.SphereGeometry(1, 48, 36);
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      const p = THREE.MathUtils ? THREE.MathUtils.lerp(8, 2, roundness) : (8 + (2 - 8) * roundness); // exponente del superelipsoide
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // proyecta el punto de la esfera a la superficie de un superelipsoide (cubo redondeado)
        const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
        const d = Math.pow(Math.pow(ax, p) + Math.pow(ay, p) + Math.pow(az, p), 1 / p) || 1;
        v.multiplyScalar(1 / d);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      geo.scale(sx / 2, sy / 2, sz / 2);
      return geo;
    }

    // Cuadrado/rectángulo con esquinas redondeadas, extruido fino (ojos y boca del Glob).
    _roundedBox(THREE, w, h, depth, r) {
      r = Math.min(r, w / 2, h / 2);
      const s = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
      geo.center();
      return geo;
    }

    // Enemigos (Pyces). Fase 1: solo el BASE ('stupid'), modelado según su sprite:
    // caja redondeada azul con MARCO claro y CONTORNO negro, ojos azul oscuro (un cuadrado
    // y una "D"), patitas claras y bracitos negros. Patrulla de lado a lado.
    buildPyces() {
      const THREE = this.THREE;
      this.pyceMeshes = [];
      for (const p of (this.world.pyces || [])) {
        const mesh = this.buildPyce(THREE, p.type || 'stupid');
        mesh.position.set(p.x, p.y, p.z);
        this.scene.add(mesh); this.pyceMeshes.push(mesh);
      }
    }

    // Copia la posición/orientación de los modelos Pyce3D a sus meshes (misma lista/orden).
    // `t` para el contoneo al caminar. Oculta el mesh si el modelo murió.
    syncPyces(models, t) {
      const list = this.pyceMeshes || [];
      for (let i = 0; i < list.length; i++) {
        const mesh = list[i], m = models[i];
        if (!m) continue;
        if (m.dead) { mesh.visible = false; continue; }
        mesh.position.set(m.pos.x, m.pos.y, m.pos.z);
        mesh.rotation.y = m.facing;
        // contoneo suave al moverse por el suelo
        const moving = Math.abs(m.vel.x) + Math.abs(m.vel.z) > 0.1 && m.onGround;
        mesh.rotation.z = moving ? Math.sin(t * 9 + i) * 0.06 : 0;
        // parpadeo breve al recibir un golpe
        mesh.visible = !(m.hurtT > 0 && Math.floor(t * 20) % 2 === 0);
      }
    }

    // Pyce: cuerpo CREMA (cubo redondeado) con una PANTALLA AZUL en la cara, brazos y pies
    // cremas. La cara (ojos+boca) va DENTRO de la pantalla. Según el tipo cambia la cara:
    //   stupid -> ":D"   ·   pyce2 -> "^^" (mismos puntos pero ojos en circunflejo)
    //   resto  -> dos ojos redondos neutros.  Colores como el dibujo original (crema + azules).
    buildPyce(THREE, type) {
      const CREAM = 0xf3e9c8, SCREEN = 0x16a6ff, FACE = 0x0b3fd6;
      const g = new THREE.Group();
      const cream = THREE.MeshToonMaterial ? new THREE.MeshToonMaterial({ color: CREAM }) : new THREE.MeshPhongMaterial({ color: CREAM, shininess: 12 });

      // cuerpo cubo redondeado crema
      const body = new THREE.Mesh(this._roundedCube(THREE, 0.9, 0.92, 0.78, 0.35), cream);
      body.castShadow = true; g.add(body);

      // pantalla azul en la cara (+Z): un panel ligeramente hundido con marco
      const screenFrame = new THREE.Mesh(this._roundedBox(THREE, 0.66, 0.66, 0.04, 0.08), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
      screenFrame.position.set(0, 0.02, 0.4); g.add(screenFrame);
      const screen = new THREE.Mesh(this._roundedBox(THREE, 0.58, 0.58, 0.05, 0.07), new THREE.MeshBasicMaterial({ color: SCREEN }));
      screen.position.set(0, 0.02, 0.42); g.add(screen);

      // cara sobre la pantalla (z un pelín por delante)
      const faceMat = new THREE.MeshBasicMaterial({ color: FACE });
      const z = 0.455;
      if (type === 'pyce2') {
        // ojos en circunflejo "^ ^"
        this._chevron(THREE, g, faceMat, -0.13, 0.12, z);
        this._chevron(THREE, g, faceMat, 0.13, 0.12, z);
      } else {
        // ojos "puntos" (dos cuadraditos) por defecto y para stupid
        [-0.13, 0.13].forEach((dx) => {
          const eye = new THREE.Mesh(this._roundedBox(THREE, 0.12, 0.14, 0.04, 0.035), faceMat);
          eye.position.set(dx, 0.12, z); g.add(eye);
        });
      }
      // boca sonrisa (arco) tipo ":D" -> semicircunferencia abierta hacia arriba
      const smile = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20, Math.PI), faceMat);
      smile.position.set(0, -0.08, z); smile.rotation.z = Math.PI; g.add(smile);

      // pies cremas (dos zapatitos redondeados abajo)
      [-0.26, 0.26].forEach((dx) => {
        const foot = new THREE.Mesh(this._roundedCube(THREE, 0.34, 0.16, 0.42, 0.6), cream);
        foot.position.set(dx, -0.56, 0.08); foot.castShadow = true; g.add(foot);
      });
      // brazos cremas (muñones redondeados a los lados)
      [-0.52, 0.52].forEach((dx) => {
        const arm = new THREE.Mesh(this._roundedCube(THREE, 0.2, 0.2, 0.26, 0.6), cream);
        arm.position.set(dx, 0.02, 0.02); arm.castShadow = true; g.add(arm);
      });
      return g;
    }

    // Un "^" (circunflejo) hecho con dos barritas, para los ojos del Pyce2.
    _chevron(THREE, parent, mat, cx, cy, z) {
      [-1, 1].forEach((s) => {
        const bar = new THREE.Mesh(this._roundedBox(THREE, 0.11, 0.045, 0.04, 0.02), mat);
        bar.position.set(cx + s * 0.035, cy, z); bar.rotation.z = -s * 0.7; parent.add(bar);
      });
    }

    // El Glob según su SPRITE: montículo ANCHO y achatado (base plana, cima curva), con
    // CONTORNO negro grueso, dos OJOS cuadrados negros (uno mayor, descolocados) y una
    // BOCA de barra horizontal gruesa. Verde brillante plano. Mira hacia +Z (su "cara").
    buildPlayer() {
      const THREE = this.THREE, U = S.util;
      const char = S.Model.Characters.get(this.world._character || 'green') || {};
      const color = char.color || '#00ff66';
      const black = 0x0d0d0d;
      const g = new THREE.Group();

      // Glob = DOS cubos redondeados APILADOS (como el modelo viejo, pero redonditos):
      // una base ancha abajo + un bloque menor encima. Verde con CONTORNO negro.
      const bodyMat = THREE.MeshToonMaterial
        ? new THREE.MeshToonMaterial({ color: col(THREE, color) })
        : new THREE.MeshPhongMaterial({ color: col(THREE, color), shininess: 30, specular: 0x333333 });
      const outlineMat = new THREE.MeshBasicMaterial({ color: black, side: THREE.BackSide });
      const body = this.playerBody = new THREE.Group(); g.add(body);

      // tier(ancho, alto, fondo, y) -> añade cuerpo verde + su contorno negro
      const tier = (w, h, d, y) => {
        const geo = this._roundedCube(THREE, w, h, d, 0.4);
        const m = new THREE.Mesh(geo, bodyMat); m.position.y = y; m.castShadow = true; body.add(m);
        const o = new THREE.Mesh(this._roundedCube(THREE, w, h, d, 0.4), outlineMat);
        o.position.y = y; o.scale.set(1 + 0.1 / w, 1 + 0.1 / h, 1 + 0.1 / d); body.add(o);
        return m;
      };
      tier(1.0, 0.5, 0.86, -0.22);     // base ancha
      const top = tier(0.74, 0.5, 0.64, 0.22); // bloque superior (lleva la cara)

      // --- cara en el frente del bloque superior ---
      const face = this.playerFace = new THREE.Group();
      face.position.set(0, 0.22, 0); g.add(face);
      const blackFlat = new THREE.MeshBasicMaterial({ color: black });
      const zf = 0.34;
      // ojos: dos cuadrados redondeados negros, descolocados (como el sprite)
      const eyeL = new THREE.Mesh(this._roundedBox(THREE, 0.15, 0.17, 0.07, 0.05), blackFlat);
      eyeL.position.set(-0.16, 0.1, zf); face.add(eyeL);
      const eyeR = new THREE.Mesh(this._roundedBox(THREE, 0.17, 0.2, 0.07, 0.055), blackFlat);
      eyeR.position.set(0.05, -0.02, zf + 0.01); face.add(eyeR);
      // boca: barra horizontal gruesa
      const mouth = new THREE.Mesh(this._roundedBox(THREE, 0.3, 0.07, 0.06, 0.03), blackFlat);
      mouth.position.set(-0.06, -0.2, zf); face.add(mouth);

      this.playerMesh = g; this.scene.add(g);

      // sombra de contacto: un disco oscuro semitransparente que se proyecta bajo el Glob
      this.shadowBlob = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
      );
      this.shadowBlob.rotation.x = -Math.PI / 2;
      this.scene.add(this.shadowBlob);
    }

    // Sincroniza el mesh del jugador con el modelo (+ pequeño "squash" al andar y al caer)
    syncPlayer(player) {
      const g = this.playerMesh;
      g.position.set(player.pos.x, player.pos.y, player.pos.z);
      g.rotation.y = player.facing;
      // squash & stretch de TODO el Glob (cuerpo + contorno + cara juntos): estira al
      // subir, achata al caer rápido. El montículo ya trae su forma en la geometría.
      const vy = player.vel.y;
      const sy = 1 + Math.max(-0.16, Math.min(0.16, vy * 0.018));
      g.scale.set(1 + (1 - sy) * 0.4, sy, 1 + (1 - sy) * 0.4);
      // sombra de contacto: busca el bloque más alto justo debajo del Glob
      const gy = this._groundUnder(player.pos);
      if (gy !== null) {
        this.shadowBlob.visible = true;
        this.shadowBlob.position.set(player.pos.x, gy + 0.02, player.pos.z);
        const h = Math.max(0, player.pos.y - gy);
        const s = Math.max(0.35, 1 - h * 0.06);         // más pequeña y tenue cuanto más alto
        this.shadowBlob.scale.set(s, s, s);
        this.shadowBlob.material.opacity = 0.3 * s;
      } else { this.shadowBlob.visible = false; }
    }

    // Altura del bloque más alto situado bajo (x,z) del jugador (para la sombra de contacto).
    _groundUnder(pos) {
      let best = null;
      for (const b of this.world.blocks) {
        const bw = b.w || 1, bh = b.h || 1, bd = b.d || 1;
        if (pos.x >= b.x && pos.x <= b.x + bw && pos.z >= b.z && pos.z <= b.z + bd) {
          const top = b.y + bh;
          if (top <= pos.y + 0.001 && (best === null || top > best)) best = top;
        }
      }
      return best;
    }

    resize() {
      const w = this.canvas.clientWidth || S.VIEW_W, h = this.canvas.clientHeight || S.VIEW_H;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    }

    render(t) {
      // Medallas girando + flotando
      for (const m of this.medalMeshes) { m.rotation.y = t * 2; m.position.y = m.userData.medal.y + Math.sin(t * 3 + m.position.x) * 0.12; }
      if (this.goalMesh) this.goalMesh.rotation.z = t * 1.5;
      this.renderer.render(this.scene, this.camera);
    }

    removeMedal(mesh) { this.scene.remove(mesh); this.medalMeshes = this.medalMeshes.filter((m) => m !== mesh); }
    removePyce(mesh) { this.scene.remove(mesh); this.pyceMeshes = this.pyceMeshes.filter((m) => m !== mesh); }

    destroy() {
      window.removeEventListener('resize', this._onResize);
      this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const m = o.material; (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose && x.dispose()); } });
      if (this.scene.background && this.scene.background.dispose) this.scene.background.dispose();
      this.renderer.dispose();
    }
  }

  Scene3D.palette = palette;
  G3.View.Scene3D = Scene3D;
})(window.SGM);
