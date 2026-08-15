/* <fit-stage> — bridal dummy on a rotating podium with a parametric gown.
   Attributes: gown (0|1|2), bust, waist, hip (cm). Requires global THREE (r128). */
(function () {
  if (window.customElements && customElements.get('fit-stage')) return;

  const GOWNS = [
    { hem: 0.40, flareStart: 0.00, power: 1.15, train: 0.55, bow: false, lace: 0.9, sleeve: 'puff' },  // klasična princes
    { hem: 0.26, flareStart: 0.62, power: 2.2, train: 0.34, bow: false, lace: 0.75, sleeve: 'long' },  // elegantna riblja kost
    { hem: 0.18, flareStart: 0.10, power: 1.0, train: 0.26, bow: true, lace: 0.15, sleeve: 'strap' }   // moderna prava linija
  ];

  const rad = cm => cm / (2 * Math.PI) / 100;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  function laceTexture(T, density) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 512, 512);
    const petals = Math.round(140 * density) + 20;
    for (let i = 0; i < petals; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = 6 + Math.random() * 14;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,.75)');
      grd.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 900 * density; i++) {
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, Math.random() * 1.6, 0, Math.PI * 2); g.fill();
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(3, 4);
    return tex;
  }

  class FitStage extends HTMLElement {
    static get observedAttributes() { return ['gown', 'bust', 'waist', 'hip']; }

    connectedCallback() {
      if (this._built) { this._start(); return; }
      this._built = true;
      Object.assign(this.style, { display: 'block', width: '100%', height: '100%', cursor: 'grab' });

      if (!window.THREE) { this._built = false; this._retry = setTimeout(() => this.connectedCallback(), 200); return; }
      const T = window.THREE;

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, 0.1, 60);
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      if (T.sRGBEncoding !== undefined) renderer.outputEncoding = T.sRGBEncoding;
      if (T.ACESFilmicToneMapping !== undefined) { renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08; }
      this.appendChild(renderer.domElement);
      Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });

      scene.add(new T.HemisphereLight(0xfff6e8, 0x2a241f, 0.9));
      const key = new T.DirectionalLight(0xfff3e2, 1.05);
      key.position.set(2.2, 3.6, 2.8);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
      key.shadow.camera.top = 3.4; key.shadow.camera.bottom = -0.6;
      scene.add(key);
      const rim = new T.DirectionalLight(0xd8bb8a, 0.5);
      rim.position.set(-2.6, 1.8, -2.2);
      scene.add(rim);
      const fill = new T.DirectionalLight(0xfff8ee, 0.3);
      fill.position.set(-1.2, 1.4, 3);
      scene.add(fill);

      const floor = new T.Mesh(new T.CircleGeometry(6, 64), new T.MeshStandardMaterial({ color: 0x2a241f, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      const backdrop = new T.Mesh(
        new T.CylinderGeometry(5, 5, 7, 48, 1, true),
        new T.MeshStandardMaterial({ color: 0x574a40, roughness: 1, side: T.BackSide })
      );
      backdrop.position.y = 2.4;
      scene.add(backdrop);

      const turntable = new T.Group();
      scene.add(turntable);

      const podiumH = 0.12;
      const podium = new T.Mesh(new T.CylinderGeometry(0.62, 0.68, podiumH, 72),
        new T.MeshStandardMaterial({ color: 0xe6d8c2, roughness: 0.65 }));
      podium.position.y = podiumH / 2;
      podium.castShadow = true; podium.receiveShadow = true;
      turntable.add(podium);
      // gilt marks on the podium edge so the rotation is legible
      const markMat = new T.MeshStandardMaterial({ color: 0xc8ab77, roughness: 0.3, metalness: 0.8 });
      for (let i = 0; i < 12; i++) {
        const m = new T.Mesh(new T.BoxGeometry(0.02, 0.005, 0.07), markMat);
        const a = (i / 12) * Math.PI * 2;
        m.position.set(Math.cos(a) * 0.55, podiumH + 0.002, Math.sin(a) * 0.55);
        m.rotation.y = -a;
        turntable.add(m);
      }
      const ring = new T.Mesh(new T.TorusGeometry(0.63, 0.01, 10, 90), markMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = podiumH;
      turntable.add(ring);

      const skinMat = new T.MeshStandardMaterial({ color: 0xe9dcc9, roughness: 0.78, metalness: 0.02 });
      const metalMat = new T.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.35, metalness: 0.8 });

      const body = new T.Group();
      body.position.y = podiumH;
      turntable.add(body);

      let figureMesh = null, gownMesh = null, headMesh = null, neckMesh = null, details = null, gownMat = null;

      const figureProfile = (bust, waist, hip) => {
        const rb = rad(bust), rw = rad(waist), rh = rad(hip);
        const shoulder = rb * 1.06;
        const nodes = [
          [0.00, rh * 0.40], [0.30, rh * 0.46], [0.62, rh * 0.62], [0.80, rh * 0.90],
          [0.90, rh], [1.00, lerp(rw, rh, 0.45)], [1.08, rw], [1.18, lerp(rw, rb, 0.7)],
          [1.26, rb], [1.36, shoulder * 0.96], [1.44, shoulder], [1.50, shoulder * 0.46], [1.55, 0.052]
        ];
        const pts = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          const [y0, r0] = nodes[i], [y1, r1] = nodes[i + 1];
          for (let s = 0; s < 8; s++) {
            const t = s / 8;
            pts.push(new T.Vector2(Math.max(0.02, lerp(r0, r1, smooth(t))), lerp(y0, y1, t)));
          }
        }
        pts.push(new T.Vector2(0.052, 1.55));
        return pts;
      };

      const gownProfile = (bust, waist, hip, cfg) => {
        const rb = rad(bust), rw = rad(waist), rh = rad(hip);
        const hipY = 0.90, waistY = 1.08, topY = 1.30;
        const pts = [new T.Vector2(0.004, -0.005)];
        for (let i = 0; i <= 36; i++) {                    // hem -> hip
          const t = i / 36, y = lerp(0, hipY, t), k = 1 - t;
          const f = k <= cfg.flareStart ? 0 : Math.pow((k - cfg.flareStart) / (1 - cfg.flareStart), cfg.power);
          pts.push(new T.Vector2(lerp(rh + 0.018, cfg.hem, f), y));
        }
        for (let i = 1; i <= 14; i++) {                    // hip -> waist
          const t = i / 14;
          pts.push(new T.Vector2(lerp(rh + 0.018, rw + 0.012, smooth(t)), lerp(hipY, waistY, t)));
        }
        for (let i = 1; i <= 14; i++) {                    // waist -> bust
          const t = i / 14;
          pts.push(new T.Vector2(lerp(rw + 0.012, rb + 0.014, smooth(t)), lerp(waistY, topY, t)));
        }
        return pts;
      };

      // asymmetric shaping: train sweeps to the back, back neckline dips lower
      const shapeGown = (geo, cfg) => {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          const back = Math.max(0, -z) / (Math.hypot(x, z) || 1);   // 1 straight back, 0 front/side
          if (y < 0.55) {
            const t = 1 - y / 0.55;
            const push = cfg.train * t * t * back;
            pos.setZ(i, z - push);
            pos.setY(i, y - 0.02 * push);
          }
          if (y > 1.18) {                                          // lower back neckline
            const t = (y - 1.18) / 0.16;
            pos.setY(i, y - 0.1 * t * back);
          }
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
      };

      // tapered segment between two points
      const limb = (from, to, r1, r2, mat, seg) => {
        const dir = new T.Vector3().subVectors(to, from);
        const len = dir.length();
        const geo = new T.CylinderGeometry(r2, r1, len, seg || 20, 1, false);
        const m = new T.Mesh(geo, mat);
        m.position.copy(from).add(to).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
        m.castShadow = true;
        return m;
      };

      const buildArms = (bust, cfg, group) => {
        const rb = rad(bust);
        const shoulderR = rb * 1.06;
        const armR = 0.036 + rb * 0.06;
        [-1, 1].forEach(side => {
          const sx = side * (shoulderR + armR * 0.35);
          const shoulder = new T.Vector3(sx, 1.39, 0);
          const elbow = new T.Vector3(side * (shoulderR + armR * 1.75), 1.05, 0.02);
          const wrist = new T.Vector3(side * (shoulderR + armR * 1.55), 0.74, 0.10);

          const cap = new T.Mesh(new T.SphereGeometry(armR * 1.25, 20, 16), skinMat);
          cap.position.copy(shoulder);
          cap.castShadow = true;
          group.add(cap);
          group.add(limb(shoulder, elbow, armR * 1.1, armR * 0.85, skinMat));
          group.add(limb(elbow, wrist, armR * 0.85, armR * 0.62, skinMat));

          const hand = new T.Mesh(new T.SphereGeometry(armR * 0.8, 18, 14), skinMat);
          hand.scale.set(0.8, 1.5, 0.55);
          hand.position.copy(wrist).add(new T.Vector3(0, -0.055, 0.012));
          hand.castShadow = true;
          group.add(hand);

          if (cfg.sleeve === 'puff') {                     // off-shoulder puff
            const puff = new T.Mesh(new T.SphereGeometry(armR * 2.5, 24, 18), gownMat);
            puff.scale.set(1, 0.82, 1);
            puff.position.set(side * (shoulderR + armR * 0.5), 1.29, 0);
            puff.castShadow = true;
            group.add(puff);
            const band = limb(
              new T.Vector3(side * (shoulderR + armR * 0.75), 1.19, 0.004),
              new T.Vector3(side * (shoulderR + armR * 1.2), 1.10, 0.014),
              armR * 1.35, armR * 1.2, gownMat, 24
            );
            group.add(band);
          } else if (cfg.sleeve === 'long') {              // long lace sleeve
            group.add(limb(
              new T.Vector3(sx, 1.43, 0),
              new T.Vector3(side * (shoulderR + armR * 1.75), 1.04, 0.02),
              armR * 1.55, armR * 1.12, gownMat, 24
            ));
            group.add(limb(
              new T.Vector3(side * (shoulderR + armR * 1.75), 1.05, 0.02),
              new T.Vector3(side * (shoulderR + armR * 1.55), 0.72, 0.10),
              armR * 1.12, armR * 0.9, gownMat, 24
            ));
          } else {                                          // thin straps
            group.add(limb(
              new T.Vector3(side * (rb * 0.55), 1.30, 0.055),
              new T.Vector3(side * (rb * 0.72), 1.44, -0.02),
              0.011, 0.011, gownMat, 10
            ));
            group.add(limb(
              new T.Vector3(side * (rb * 0.72), 1.44, -0.02),
              new T.Vector3(side * (rb * 0.6), 1.24, -0.07),
              0.011, 0.011, gownMat, 10
            ));
          }
        });
      };

      const rebuild = () => {
        const bust = +(this.getAttribute('bust') || 90);
        const waist = +(this.getAttribute('waist') || 72);
        const hip = +(this.getAttribute('hip') || 98);
        const g = +(this.getAttribute('gown') || 0);
        const cfg = GOWNS[g] || GOWNS[0];

        if (figureMesh) { body.remove(figureMesh); figureMesh.geometry.dispose(); }
        figureMesh = new T.Mesh(new T.LatheGeometry(figureProfile(bust, waist, hip), 64), skinMat);
        figureMesh.castShadow = true;
        body.add(figureMesh);

        if (!neckMesh) {
          neckMesh = new T.Mesh(new T.CylinderGeometry(0.045, 0.058, 0.13, 24), skinMat);
          neckMesh.position.y = 1.60;
          neckMesh.castShadow = true;
          body.add(neckMesh);
          headMesh = new T.Mesh(new T.SphereGeometry(0.088, 32, 24), skinMat);
          headMesh.scale.set(0.9, 1.24, 0.96);
          headMesh.position.y = 1.76;
          headMesh.castShadow = true;
          body.add(headMesh);
          const knob = new T.Mesh(new T.SphereGeometry(0.028, 20, 14), metalMat);
          knob.position.y = 1.9;
          body.add(knob);
        }

        if (gownMesh) { body.remove(gownMesh); gownMesh.geometry.dispose(); }
        if (details) { body.remove(details); }
        if (!gownMat || gownMat._lace !== cfg.lace) {
          const tex = laceTexture(T, cfg.lace);
          gownMat = new T.MeshStandardMaterial({
            color: 0xfaf4ea, roughness: 0.52, metalness: 0.05,
            side: T.DoubleSide, bumpMap: tex, bumpScale: 0.012
          });
          gownMat._lace = cfg.lace;
        }
        const geo = new T.LatheGeometry(gownProfile(bust, waist, hip, cfg), 120);
        shapeGown(geo, cfg);
        gownMesh = new T.Mesh(geo, gownMat);
        gownMesh.castShadow = true;
        gownMesh.receiveShadow = true;
        body.add(gownMesh);

        // arms, sleeves and back details
        details = new T.Group();
        buildArms(bust, cfg, details);
        const rw = rad(waist), rb = rad(bust);
        const buttonMat = new T.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.35 });
        for (let i = 0; i < 9; i++) {
          const y = lerp(1.26, 1.04, i / 8);
          const r = lerp(rb, rw, i / 8) + 0.02;
          const b = new T.Mesh(new T.SphereGeometry(0.012, 12, 10), buttonMat);
          b.position.set(0, y, -r);
          details.add(b);
        }
        if (cfg.bow) {
          const bowMat = new T.MeshStandardMaterial({ color: 0xfdf8f0, roughness: 0.4, side: T.DoubleSide });
          const r = rw + 0.03;
          [-1, 1].forEach(s => {
            const loop = new T.Mesh(new T.SphereGeometry(0.075, 20, 14), bowMat);
            loop.scale.set(1, 0.72, 0.28);
            loop.position.set(s * 0.075, 1.06, -r);
            loop.rotation.z = s * 0.25;
            loop.castShadow = true;
            details.add(loop);
          });
          const knot = new T.Mesh(new T.SphereGeometry(0.03, 16, 12), bowMat);
          knot.scale.set(1, 1.1, 0.6);
          knot.position.set(0, 1.06, -r);
          details.add(knot);
          const tail = new T.Mesh(new T.PlaneGeometry(0.11, 0.42), bowMat);
          tail.position.set(0, 0.86, -r - 0.01);
          tail.rotation.x = 0.06;
          details.add(tail);
        }
        body.add(details);
      };
      this._rebuild = rebuild;
      rebuild();

      const resize = () => {
        const w = this.clientWidth || 640, h = this.clientHeight || 460;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.set(0, 1.42, w < 640 ? 5.6 : 4.6);
        camera.lookAt(0, 0.92, 0);
        camera.updateProjectionMatrix();
      };
      resize();
      this._resize = resize;
      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);

      let dragging = false, lastX = 0, manual = 0;
      const down = e => { dragging = true; lastX = e.clientX; this.style.cursor = 'grabbing'; };
      const move = e => { if (!dragging) return; manual += (e.clientX - lastX) * 0.012; lastX = e.clientX; };
      const up = () => { dragging = false; this.style.cursor = 'grab'; };
      this.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      this._cleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };

      let last = performance.now();
      const step = () => {
        if (!this.isConnected) return;
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (!dragging) turntable.rotation.y += 0.32 * dt;
        turntable.rotation.y += manual * 0.3; manual *= 0.8;
        renderer.render(scene, camera);
      };
      this._start = () => {
        if (this._timer) return;
        last = performance.now();
        if (this._ro) { try { this._ro.observe(this); } catch (e) {} }
        this._resize();
        step();
        this._timer = setInterval(step, 1000 / 40);
      };
      this._stop = () => { clearInterval(this._timer); this._timer = null; };
      this._start();
    }

    attributeChangedCallback() { if (this._rebuild) this._rebuild(); }

    disconnectedCallback() {
      if (this._retry) clearTimeout(this._retry);
      if (this._ro) this._ro.disconnect();
      if (this._stop) this._stop();
    }
  }

  customElements.define('fit-stage', FitStage);
})();
