(() => {
  const CONFIG = {
    containerId: 'workspace-3d',
    camera: {
      fov: 45,
      position: { x: 3, y: 2, z: 4 },
      lookAt: { x: 0, y: 0.7, z: 0 },
      zoomPosition: { x: 1, y: 1.2, z: 1.8 },
      zoomLookAt: { x: 0, y: 1, z: -0.3 }
    }
  };

  const C = {
    bg: 0x080810,
    deskWood: 0x1e1e2a,
    deskEdge: 0x00ff41,
    metal: 0x2a2a3a,
    metalDark: 0x1a1a28,
    pcCase: 0x0f0f18,
    pcGlass: 0x1a1a2a,
    monitor: 0x0a0a12,
    screen: 0x0a0a0f,
    keyboard: 0x15151f,
    mouse: 0x1a1a28,
    mug: 0x2d2d3d,
    coffee: 0x1a0f08,
    neonGreen: 0x00ff41,
    neonCyan: 0x00f0ff,
    neonPink: 0xff00ff,
    neonPurple: 0xa855f7,
    white: 0xffffff
  };

  let scene, camera, renderer;
  let desk, monitor, keyboard, mouse, mug, pc;
  let steamParticles = [];
  let codeTexture, codeCanvas, codeCtx;
  let raycaster, pointer;
  let hoveredObject = null;
  let steamActive = false;
  let targetCamPos, targetLookAt, currentLookAt;
  let clock;
  let isInit = false;
  let container;
  let animId = null;

  const codeLines = [
    '#include <iostream>',
    '#include <vector>',
    '#include <memory>',
    '',
    'class Engine {',
    'private:',
    '  std::vector<int> data;',
    '  bool running = true;',
    '',
    'public:',
    '  void start() {',
    '    while(running) {',
    '      process();',
    '    }',
    '  }',
    '',
    '  void process() {',
    '    for(auto& d : data) {',
    '      d *= 2;',
    '    }',
    '  }',
    '};',
    '',
    'int main() {',
    '  auto eng = Engine();',
    '  eng.start();',
    '  return 0;',
    '}'
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }

  function createCodeTexture() {
    codeCanvas = document.createElement('canvas');
    codeCanvas.width = 512;
    codeCanvas.height = 320;
    codeCtx = codeCanvas.getContext('2d');
    renderCode(0);
    codeTexture = new THREE.CanvasTexture(codeCanvas);
    codeTexture.minFilter = THREE.LinearFilter;
    return codeTexture;
  }

  function renderCode(offset) {
    const ctx = codeCtx;
    const w = codeCanvas.width, h = codeCanvas.height;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#111118';
    ctx.fillRect(0, 0, 40, h);

    const fs = 14, lh = 20;
    ctx.font = `${fs}px "Fira Code", monospace`;
    const lines = Math.ceil(h / lh) + 2;
    const start = Math.floor(offset / lh);
    const oy = -(offset % lh);

    for (let i = 0; i < lines; i++) {
      const idx = (start + i) % codeLines.length;
      const y = oy + i * lh + 16;
      ctx.fillStyle = '#4a4a5a';
      ctx.textAlign = 'right';
      ctx.fillText(String(idx + 1).padStart(2, ' '), 35, y);
      ctx.textAlign = 'left';
      highlightLine(ctx, codeLines[idx], 50, y);
    }
    if (codeTexture) codeTexture.needsUpdate = true;
  }

  function highlightLine(ctx, line, x, y) {
    const kw = ['#include', 'class', 'public', 'private', 'return', 'for', 'while', 'if', 'auto', 'void', 'int', 'bool', 'true', 'false'];
    const types = ['std', 'vector', 'memory', 'Engine', 'string'];
    let cx = x;
    const parts = line.split(/(\s+|[<>(){}\[\];:,&*])/g).filter(p => p);
    for (const p of parts) {
      if (p.startsWith('#')) ctx.fillStyle = '#ff00ff';
      else if (kw.includes(p)) ctx.fillStyle = '#ff00ff';
      else if (types.some(t => p.includes(t))) ctx.fillStyle = '#00f0ff';
      else if (/^\d+$/.test(p) || p.startsWith('"')) ctx.fillStyle = '#00ff41';
      else if (['[', ']', '{', '}', '(', ')', '<', '>', ';', ':', ',', '*', '&'].includes(p)) ctx.fillStyle = '#555';
      else ctx.fillStyle = '#d0d0d0';
      ctx.fillText(p, cx, y);
      cx += ctx.measureText(p).width;
    }
  }

  function createDesk() {
    const g = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: C.deskWood, roughness: 0.6, metalness: 0.05 });
    const metalMat = new THREE.MeshStandardMaterial({ color: C.metal, roughness: 0.3, metalness: 0.7 });

    const topGeo = new THREE.BoxGeometry(2.8, 0.06, 1.4);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.75;
    top.receiveShadow = true;
    top.castShadow = true;
    g.add(top);

    const edgeGeo = new THREE.BoxGeometry(2.82, 0.015, 1.42);
    const edgeMat = new THREE.MeshBasicMaterial({ color: C.deskEdge, transparent: true, opacity: 0.35 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.79;
    g.add(edge);

    const legGeo = new THREE.BoxGeometry(0.05, 0.75, 0.05);
    [[-1.3, 0.375, -0.6], [1.3, 0.375, -0.6], [-1.3, 0.375, 0.6], [1.3, 0.375, 0.6]].forEach(p => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(...p);
      leg.castShadow = true;
      g.add(leg);
    });

    const crossGeo = new THREE.BoxGeometry(2.6, 0.03, 0.03);
    const crossBack = new THREE.Mesh(crossGeo, metalMat);
    crossBack.position.set(0, 0.15, -0.6);
    g.add(crossBack);
    const crossFront = new THREE.Mesh(crossGeo, metalMat);
    crossFront.position.set(0, 0.15, 0.6);
    g.add(crossFront);

    return g;
  }

  function createPC() {
    const g = new THREE.Group();
    g.name = 'pc';
    const caseMat = new THREE.MeshStandardMaterial({ color: C.pcCase, roughness: 0.4, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: C.pcGlass, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.6 });

    const caseGeo = new THREE.BoxGeometry(0.22, 0.45, 0.4);
    const pcCase = new THREE.Mesh(caseGeo, caseMat);
    pcCase.castShadow = true;
    g.add(pcCase);

    const glassGeo = new THREE.PlaneGeometry(0.18, 0.4);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(-0.112, 0, 0);
    glass.rotation.y = -Math.PI / 2;
    g.add(glass);

    const stripGeo = new THREE.BoxGeometry(0.005, 0.42, 0.005);
    const stripMat = new THREE.MeshBasicMaterial({ color: C.neonCyan, transparent: true, opacity: 0.8 });
    const strip1 = new THREE.Mesh(stripGeo, stripMat);
    strip1.position.set(-0.115, 0, -0.18);
    g.add(strip1);
    const strip2 = new THREE.Mesh(stripGeo, stripMat);
    strip2.position.set(-0.115, 0, 0.18);
    g.add(strip2);

    const fanGeo = new THREE.RingGeometry(0.04, 0.06, 16);
    const fanMat = new THREE.MeshBasicMaterial({ color: C.neonPurple, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const fan1 = new THREE.Mesh(fanGeo, fanMat);
    fan1.position.set(-0.113, 0.1, 0);
    fan1.rotation.y = Math.PI / 2;
    g.add(fan1);
    const fan2 = new THREE.Mesh(fanGeo, fanMat);
    fan2.position.set(-0.113, -0.1, 0);
    fan2.rotation.y = Math.PI / 2;
    g.add(fan2);

    const powerGeo = new THREE.CircleGeometry(0.008, 16);
    const powerMat = new THREE.MeshBasicMaterial({ color: C.neonGreen });
    const power = new THREE.Mesh(powerGeo, powerMat);
    power.position.set(0.112, 0.18, 0);
    power.rotation.y = Math.PI / 2;
    g.add(power);

    g.position.set(1.15, 1.005, -0.35);
    return g;
  }

  function createMonitor() {
    const g = new THREE.Group();
    g.name = 'monitor';
    const frameMat = new THREE.MeshStandardMaterial({ color: C.monitor, roughness: 0.5, metalness: 0.2 });

    const frameGeo = new THREE.BoxGeometry(1.1, 0.65, 0.04);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.castShadow = true;
    g.add(frame);

    const bezelGeo = new THREE.BoxGeometry(1.12, 0.67, 0.01);
    const bezelMat = new THREE.MeshBasicMaterial({ color: C.neonGreen, transparent: true, opacity: 0.12 });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.z = 0.026;
    g.add(bezel);

    const tex = createCodeTexture();
    const screenGeo = new THREE.PlaneGeometry(1.02, 0.58);
    const screenMat = new THREE.MeshBasicMaterial({ map: tex });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.022;
    g.add(screen);

    const standNeckGeo = new THREE.BoxGeometry(0.06, 0.2, 0.06);
    const standNeck = new THREE.Mesh(standNeckGeo, frameMat);
    standNeck.position.set(0, -0.425, -0.02);
    standNeck.castShadow = true;
    g.add(standNeck);

    const standBaseGeo = new THREE.BoxGeometry(0.35, 0.02, 0.2);
    const standBase = new THREE.Mesh(standBaseGeo, frameMat);
    standBase.position.set(0, -0.535, 0);
    standBase.receiveShadow = true;
    g.add(standBase);

    const logoGeo = new THREE.CircleGeometry(0.015, 16);
    const logoMat = new THREE.MeshBasicMaterial({ color: C.neonGreen });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, -0.28, 0.022);
    g.add(logo);

    g.position.set(-0.15, 1.32, -0.45);
    return g;
  }

  function createKeyboard() {
    const g = new THREE.Group();
    g.name = 'keyboard';
    const baseMat = new THREE.MeshStandardMaterial({ color: C.keyboard, roughness: 0.7, metalness: 0.1 });

    const baseGeo = new THREE.BoxGeometry(0.55, 0.02, 0.18);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.receiveShadow = true;
    g.add(base);

    const keyGeo = new THREE.BoxGeometry(0.032, 0.012, 0.032);
    const keyMat = new THREE.MeshStandardMaterial({ color: C.metal, roughness: 0.8 });

    for (let r = 0; r < 4; r++) {
      const cols = r === 3 ? 9 : 14;
      const sx = -0.24 + (r === 3 ? 0.06 : 0);
      for (let c = 0; c < cols; c++) {
        const key = new THREE.Mesh(keyGeo, keyMat);
        key.position.set(sx + c * 0.037, 0.016, -0.06 + r * 0.04);
        g.add(key);
      }
    }

    const wMat = new THREE.MeshBasicMaterial({ color: C.neonGreen, transparent: true, opacity: 0.6 });
    ['w', 'a', 's', 'd'].forEach((k, i) => {
      const key = new THREE.Mesh(keyGeo, wMat);
      const pos = [[0, -0.06], [-0.037, -0.02], [0, -0.02], [0.037, -0.02]][i];
      key.position.set(-0.13 + pos[0], 0.018, pos[1]);
      g.add(key);
    });

    g.position.set(-0.15, 0.79, 0.15);
    return g;
  }

  function createMouse() {
    const g = new THREE.Group();
    g.name = 'mouse';
    const mat = new THREE.MeshStandardMaterial({ color: C.mouse, roughness: 0.4, metalness: 0.2 });

    const bodyGeo = new THREE.CapsuleGeometry(0.025, 0.035, 8, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1, 1, 0.5);
    body.castShadow = true;
    g.add(body);

    const wheelGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.012, 8);
    const wheelMat = new THREE.MeshBasicMaterial({ color: C.neonCyan });
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(0, 0.015, -0.012);
    g.add(wheel);

    const stripGeo = new THREE.BoxGeometry(0.003, 0.008, 0.05);
    const stripMat = new THREE.MeshBasicMaterial({ color: C.neonPurple, transparent: true, opacity: 0.5 });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 0.018, 0);
    g.add(strip);

    g.position.set(0.25, 0.8, 0.18);
    return g;
  }

  function createMug() {
    const g = new THREE.Group();
    g.name = 'mug';
    const mat = new THREE.MeshStandardMaterial({ color: C.mug, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });

    const outerGeo = new THREE.CylinderGeometry(0.045, 0.038, 0.1, 20, 1, true);
    const outer = new THREE.Mesh(outerGeo, mat);
    outer.castShadow = true;
    g.add(outer);

    const bottomGeo = new THREE.CircleGeometry(0.038, 20);
    const bottom = new THREE.Mesh(bottomGeo, mat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -0.05;
    g.add(bottom);

    const rimGeo = new THREE.TorusGeometry(0.045, 0.006, 8, 20);
    const rim = new THREE.Mesh(rimGeo, mat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    g.add(rim);

    const coffeeGeo = new THREE.CircleGeometry(0.04, 20);
    const coffeeMat = new THREE.MeshStandardMaterial({ color: C.coffee, roughness: 0.3 });
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.035;
    g.add(coffee);

    const handlePath = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.045, 0.02, 0),
      new THREE.Vector3(0.085, 0, 0),
      new THREE.Vector3(0.045, -0.02, 0)
    );
    const handleGeo = new THREE.TubeGeometry(handlePath, 12, 0.008, 8, false);
    const handle = new THREE.Mesh(handleGeo, mat);
    handle.castShadow = true;
    g.add(handle);

    const glowGeo = new THREE.TorusGeometry(0.048, 0.004, 8, 24);
    const glowMat = new THREE.MeshBasicMaterial({ color: C.neonCyan, transparent: true, opacity: 0.7 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.052;
    g.add(glow);

    g.position.set(-0.95, 0.83, 0.25);
    return g;
  }

  function createSteam() {
    const particles = [];
    const geo = new THREE.SphereGeometry(0.01, 6, 6);
    for (let i = 0; i < 35; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: C.white, transparent: true, opacity: 0 });
      const p = new THREE.Mesh(geo, mat);
      p.userData = {
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.003, 0.006 + Math.random() * 0.006, (Math.random() - 0.5) * 0.003),
        life: Math.random() * 2,
        maxLife: 1.8 + Math.random()
      };
      p.visible = false;
      scene.add(p);
      particles.push(p);
    }
    return particles;
  }

  function updateSteam(dt) {
    if (!mug) return;
    const pos = new THREE.Vector3();
    mug.getWorldPosition(pos);
    pos.y += 0.1;

    steamParticles.forEach(p => {
      if (steamActive) {
        p.userData.life += dt;
        if (p.userData.life >= p.userData.maxLife) {
          p.position.copy(pos);
          p.position.x += (Math.random() - 0.5) * 0.04;
          p.position.z += (Math.random() - 0.5) * 0.04;
          p.userData.life = 0;
          p.userData.vel.set((Math.random() - 0.5) * 0.003, 0.006 + Math.random() * 0.006, (Math.random() - 0.5) * 0.003);
          p.visible = true;
        }
        p.position.add(p.userData.vel);
        p.userData.vel.x += (Math.random() - 0.5) * 0.0006;
        p.userData.vel.z += (Math.random() - 0.5) * 0.0006;
        const r = p.userData.life / p.userData.maxLife;
        p.material.opacity = r < 0.2 ? r / 0.2 * 0.45 : r > 0.65 ? (1 - r) / 0.35 * 0.45 : 0.45;
        p.scale.setScalar(0.7 + r * 1.8);
      } else {
        p.material.opacity = Math.max(0, p.material.opacity - dt * 2.5);
        if (p.material.opacity <= 0) p.visible = false;
      }
    });
  }

  function setupLights() {
    scene.add(new THREE.AmbientLight(0x101020, 0.5));

    const main = new THREE.DirectionalLight(0xffffff, 0.7);
    main.position.set(3, 5, 4);
    main.castShadow = true;
    main.shadow.mapSize.set(1024, 1024);
    main.shadow.camera.near = 1;
    main.shadow.camera.far = 15;
    main.shadow.camera.left = -4;
    main.shadow.camera.right = 4;
    main.shadow.camera.top = 4;
    main.shadow.camera.bottom = -2;
    scene.add(main);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.2);
    fill.position.set(-3, 2, 2);
    scene.add(fill);

    const monitorLight = new THREE.PointLight(C.neonGreen, 0.4, 2.5);
    monitorLight.position.set(-0.2, 1.5, 0.2);
    scene.add(monitorLight);

    const pcLight = new THREE.PointLight(C.neonCyan, 0.5, 2);
    pcLight.position.set(1.1, 1.1, -0.2);
    scene.add(pcLight);

    const mugLight = new THREE.PointLight(C.neonCyan, 0.3, 1.5);
    mugLight.position.set(-0.9, 1, 0.3);
    scene.add(mugLight);

    const accent = new THREE.PointLight(C.neonPurple, 0.25, 3);
    accent.position.set(0, 0.5, 1.5);
    scene.add(accent);
  }

  function onPointerMove(e) {
    if (!container || !raycaster || !camera) return;
    const rect = container.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);

    let hovered = null;
    for (const h of hits) {
      let obj = h.object;
      while (obj.parent && !obj.name) obj = obj.parent;
      if (['monitor', 'mug', 'pc'].includes(obj.name)) {
        hovered = obj.name;
        break;
      }
    }

    if (hovered !== hoveredObject) {
      hoveredObject = hovered;
      if (hovered === 'monitor' || hovered === 'pc') {
        targetCamPos = { ...CONFIG.camera.zoomPosition };
        targetLookAt = { ...CONFIG.camera.zoomLookAt };
        container.style.cursor = 'pointer';
        steamActive = false;
      } else if (hovered === 'mug') {
        targetCamPos = { ...CONFIG.camera.position };
        targetLookAt = { ...CONFIG.camera.lookAt };
        steamActive = true;
        container.style.cursor = 'pointer';
      } else {
        targetCamPos = { ...CONFIG.camera.position };
        targetLookAt = { ...CONFIG.camera.lookAt };
        steamActive = false;
        container.style.cursor = 'grab';
      }
    }
  }

  function onPointerLeave() {
    hoveredObject = null;
    targetCamPos = { ...CONFIG.camera.position };
    targetLookAt = { ...CONFIG.camera.lookAt };
    steamActive = false;
    if (container) container.style.cursor = 'grab';
  }

  let codeScroll = 0;
  let fanAngle = 0;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    const f = Math.min(1, dt * 3.5);
    camera.position.x = lerp(camera.position.x, targetCamPos.x, f);
    camera.position.y = lerp(camera.position.y, targetCamPos.y, f);
    camera.position.z = lerp(camera.position.z, targetCamPos.z, f);
    currentLookAt.x = lerp(currentLookAt.x, targetLookAt.x, f);
    currentLookAt.y = lerp(currentLookAt.y, targetLookAt.y, f);
    currentLookAt.z = lerp(currentLookAt.z, targetLookAt.z, f);
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    codeScroll += dt * 18;
    if (codeScroll > codeLines.length * 20) codeScroll = 0;
    renderCode(codeScroll);

    updateSteam(dt);

    if (desk?.children[1]) desk.children[1].material.opacity = 0.3 + Math.sin(t * 2) * 0.1;

    if (pc) {
      fanAngle += dt * 8;
      const fan1 = pc.children[4];
      const fan2 = pc.children[5];
      if (fan1) fan1.rotation.z = fanAngle;
      if (fan2) fan2.rotation.z = -fanAngle;
      
      const strips = [pc.children[2], pc.children[3]];
      strips.forEach((s, i) => {
        if (s) s.material.opacity = 0.6 + Math.sin(t * 3 + i) * 0.3;
      });
    }

    if (mug?.children[5]) mug.children[5].material.opacity = 0.5 + Math.sin(t * 2.5) * 0.25;

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function init() {
    if (isInit) return;
    container = document.getElementById(CONFIG.containerId);
    if (!container) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const low = document.documentElement.dataset.lowperf === '1';
    if (reduced || low) {
      container.innerHTML = '<div class="workspace-fallback"><span>3D отключена для производительности</span></div>';
      return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.FogExp2(C.bg, 0.08);

    camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(CONFIG.camera.position.x, CONFIG.camera.position.y, CONFIG.camera.position.z);
    targetCamPos = { ...CONFIG.camera.position };
    targetLookAt = { ...CONFIG.camera.lookAt };
    currentLookAt = { ...CONFIG.camera.lookAt };
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x080810, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    desk = createDesk();
    scene.add(desk);

    pc = createPC();
    scene.add(pc);

    monitor = createMonitor();
    scene.add(monitor);

    keyboard = createKeyboard();
    scene.add(keyboard);

    mouse = createMouse();
    scene.add(mouse);

    mug = createMug();
    scene.add(mug);

    setupLights();
    steamParticles = createSteam();

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    clock = new THREE.Clock();

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    container.style.cursor = 'grab';
    isInit = true;
    animate();
  }

  function dispose() {
    if (animId) cancelAnimationFrame(animId);
    container?.removeEventListener('pointermove', onPointerMove);
    container?.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', onResize);
    renderer?.dispose();
    isInit = false;
  }

  function loadThree() {
    return new Promise((res, rej) => {
      if (window.THREE) return res();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !isInit) loadThree().then(init).catch(console.error);
    });
  }, { rootMargin: '200px' });

  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById(CONFIG.containerId);
    if (c) io.observe(c);
  });

  window.addEventListener('pagehide', dispose);
  window.Workspace3D = { init, dispose };
})();
