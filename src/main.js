import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { gsap } from "gsap";

const canvas = document.getElementById("game");
const menuPanel = document.getElementById("menu");
const settingsPanel = document.getElementById("settings");
const startBtn = document.getElementById("startBtn");
const settingsBtn = document.getElementById("settingsBtn");
const backBtn = document.getElementById("backBtn");
const applySettingsBtn = document.getElementById("applySettings");
const qualityInput = document.getElementById("quality");
const resolutionInput = document.getElementById("resolution");
const sensitivityInput = document.getElementById("sensitivity");
const bloomInput = document.getElementById("bloom");
const touchInput = document.getElementById("touch");
const difficultyInput = document.getElementById("difficulty");
const gyroInput = document.getElementById("gyro");
const touchControls = document.getElementById("touchControls");
const leftPad = document.getElementById("leftPad");
const rightPad = document.getElementById("rightPad");
const shootBtn = document.getElementById("shootBtn");
const jumpBtn = document.getElementById("jumpBtn");
const reloadBtn = document.getElementById("reloadBtn");
const hpEl = document.getElementById("hp");
const armorEl = document.getElementById("armor");
const ammoEl = document.getElementById("ammo");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const modeEl = document.getElementById("mode");
const killFeedEl = document.getElementById("killFeed");
const deathScreen = document.getElementById("deathScreen");
const respawnCountEl = document.getElementById("respawnCount");
const levelInfoEl = document.getElementById("levelInfo");
const levelProgressEl = document.getElementById("levelProgress");
const levelProgressFillEl = document.getElementById("levelProgressFill");
const levelCompleteEl = document.getElementById("levelComplete");
const levelCompleteTitleEl = document.getElementById("levelCompleteTitle");
const levelCompleteDescEl = document.getElementById("levelCompleteDesc");
const levelContinueBtn = document.getElementById("levelContinue");
const hpBarEl = document.getElementById("hpBar");
const armorBarEl = document.getElementById("armorBar");
const resLabel = document.getElementById("resLabel");
const senLabel = document.getElementById("senLabel");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9ab2ca, 0.006);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.08, 900);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 14;
ssaoPass.minDistance = 0.0025;
ssaoPass.maxDistance = 0.06;
composer.addPass(ssaoPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.65, 0.42, 0.9);
composer.addPass(bloomPass);
const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
composer.addPass(smaaPass);

const texLoader = new THREE.TextureLoader();
const rgbeLoader = new RGBELoader();
const gltfLoader = new GLTFLoader();
const clock = new THREE.Clock();

const world = {
  colliders: [],
  bots: [],
  pickups: [],
  tracers: [],
  particles: [],
  heartParts: [],
  muzzleFlash: null
};

const profiles = {
  ultra: { pixelRatio: 1.45, shadows: true, ssao: true, bloom: true, botCount: 8, shadowMap: 2048 },
  high: { pixelRatio: 1.15, shadows: true, ssao: true, bloom: true, botCount: 6, shadowMap: 1024 },
  medium: { pixelRatio: 1.0, shadows: true, ssao: false, bloom: true, botCount: 4, shadowMap: 768 },
  mobile: { pixelRatio: 0.78, shadows: false, ssao: false, bloom: false, botCount: 3, shadowMap: 256 }
};

const game = {
  started: false,
  paused: true,
  pointerLocked: false,
  roundTime: 180,
  maxRoundTime: 180,
  playerScore: 0,
  botScore: 0,
  quality: "high",
  isDead: false,
  respawnTimer: 0,
  spawnProtection: 0,
  levelIndex: 0,
  killsThisLevel: 0,
  killsNeeded: 10,
  levelPopupTimer: 0,
  fxScale: 1,
  botMultiplier: 1,
  usePost: true,
  basePixelRatio: 1,
  dynamicScale: 1,
  fpsAvg: 60,
  perfTimer: 0
};

const levelDefs = [
  { name: "Easy", kills: 10, botCount: 6, botHp: 85, accuracy: [0.38, 0.52], speed: [2.6, 3.2], dmg: [5, 9] },
  { name: "Medium", kills: 20, botCount: 10, botHp: 95, accuracy: [0.48, 0.62], speed: [3.1, 3.7], dmg: [6, 11] },
  { name: "Hard", kills: 50, botCount: 14, botHp: 110, accuracy: [0.58, 0.7], speed: [3.4, 4.1], dmg: [7, 13] }
];

const player = {
  body: null,
  gun: null,
  pos: new THREE.Vector3(0, 1.75, 22),
  spawn: new THREE.Vector3(0, 1.75, 22),
  velocity: new THREE.Vector3(),
  yaw: Math.PI,
  pitch: -0.16,
  grounded: false,
  health: 100,
  armor: 50,
  moveSpeed: 7.9,
  sprintSpeed: 11.2,
  jumpForce: 6.8,
  gravity: 22,
  weaponCooldown: 0,
  reloadTimer: 0,
  ammoClip: 30,
  ammoReserve: 90,
  recoil: 0,
  sensitivity: 1.2,
  thirdPerson: false,
  step: 0
};

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  sprint: false,
  reload: false,
  fire: false
};

const touchState = {
  enabled: false,
  force: false,
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  firing: false,
  jumping: false
};

const gyroState = {
  enabled: false,
  supported: "DeviceOrientationEvent" in window,
  lookX: 0,
  lookY: 0,
  targetX: 0,
  targetY: 0,
  baseGamma: 0,
  baseBeta: 0,
  hasBase: false
};

const touchZones = {
  leftId: null,
  rightId: null,
  leftStart: { x: 0, y: 0 },
  rightStart: { x: 0, y: 0 }
};

const mouseDelta = { x: 0, y: 0 };

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function setHealthBars() {
  const hp = clamp(player.health, 0, 100);
  const armor = clamp(player.armor, 0, 100);
  hpBarEl.style.width = `${hp}%`;
  armorBarEl.style.width = `${armor}%`;
  if (hp > 60) hpBarEl.style.background = "#48d66e";
  else if (hp > 30) hpBarEl.style.background = "#f0a030";
  else hpBarEl.style.background = "#e83050";
}

function addFeed(text, color = "#f4d7a5") {
  const item = document.createElement("div");
  item.className = "feed-item";
  item.style.borderLeftColor = color;
  item.textContent = text;
  killFeedEl.prepend(item);
  while (killFeedEl.children.length > 6) killFeedEl.removeChild(killFeedEl.lastChild);
  gsap.fromTo(item, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.22 });
  gsap.to(item, { opacity: 0, duration: 0.35, delay: 3.2, onComplete: () => item.remove() });
}

function createSkyAndLights() {
  scene.add(new THREE.HemisphereLight(0xb3d0ff, 0x4f3f2e, 0.65));

  const sun = new THREE.DirectionalLight(0xffe8cc, 2.2);
  sun.position.set(55, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.bias = -0.00006;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8ec2ff, 0.35);
  fill.position.set(-60, 40, -50);
  scene.add(fill);

  rgbeLoader.load("https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/equirectangular/venice_sunset_1k.hdr", (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
  });

  const skyGeo = new THREE.SphereGeometry(850, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x1a3a6e) },
      bottomColor: { value: new THREE.Color(0xc46b3a) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    },
    vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + offset).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent),0.0)), 1.0); }`
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
}

function buildGround() {
  const gTex = texLoader.load("https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/terrain/grasslight-big.jpg");
  gTex.wrapS = THREE.RepeatWrapping;
  gTex.wrapT = THREE.RepeatWrapping;
  gTex.repeat.set(80, 80);
  gTex.colorSpace = THREE.SRGBColorSpace;

  const gNrm = texLoader.load("https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/terrain/grasslight-big-nm.jpg");
  gNrm.wrapS = THREE.RepeatWrapping;
  gNrm.wrapT = THREE.RepeatWrapping;
  gNrm.repeat.set(80, 80);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: gTex, normalMap: gNrm, roughness: 0.95, metalness: 0.02 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 420), new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.92, metalness: 0.06 }));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  scene.add(road);

  for (const sx of [-17, 17]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(7, 420), new THREE.MeshStandardMaterial({ color: 0x8c8680, roughness: 0.88 }));
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(sx, 0.03, 0);
    sw.receiveShadow = true;
    scene.add(sw);

    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 420), new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.75 }));
    kerb.position.set(sx + (sx > 0 ? -3.6 : 3.6), 0.09, 0);
    kerb.receiveShadow = true;
    scene.add(kerb);
  }

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e45a });
  for (let z = -205; z < 205; z += 12) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 6.5), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.06, z);
    scene.add(dash);
  }

  for (const lx of [-5, 5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 410), new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.55, transparent: true }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(lx, 0.045, 0);
    scene.add(line);
  }
}

function buildWindow() {
  return new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.45, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x7ab8e8, transmission: 0.7, transparent: true, opacity: 0.6, roughness: 0.08, metalness: 0.2 }));
}

function buildDoor() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.5, 0.14), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.3, 0.06), new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 0.75 }));
  panel.position.z = 0.04;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0xd4a843, roughness: 0.2, metalness: 0.9 }));
  knob.position.set(0.35, -0.1, 0.12);
  g.add(frame, panel, knob);
  return g;
}

function createBuilding(x, z, opts = {}) {
  const floors = opts.floors ?? 3;
  const width = opts.width ?? 12;
  const depth = opts.depth ?? 14;
  const wallColor = opts.wallColor ?? 0xcfc0a8;
  const hasBal = opts.hasBal ?? true;
  const floorH = 3.2;
  const totalH = floors * floorH;

  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.87, metalness: 0.02 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 0.6, metalness: 0.12 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, totalH, depth), wallMat);
  body.position.y = totalH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (let f = 1; f < floors; f += 1) {
    const sep = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.25, depth + 0.4), trimMat);
    sep.position.y = f * floorH;
    group.add(sep);
  }

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.45, depth + 0.6), new THREE.MeshStandardMaterial({ color: 0x3d2f2f, roughness: 0.7, metalness: 0.05 }));
  roof.position.y = totalH + 0.22;
  group.add(roof);

  const cols = Math.max(1, Math.floor(width / 3.2));
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      const wx = (c - (cols - 1) / 2) * 3.0;
      const wy = f * floorH + floorH * 0.55;
      const wf = buildWindow();
      wf.position.set(wx, wy, depth / 2 + 0.05);
      group.add(wf);
      const wb = buildWindow();
      wb.position.set(wx, wy, -depth / 2 - 0.05);
      group.add(wb);
    }
  }

  const door = buildDoor();
  door.position.set(0, 1.2, depth / 2 + 0.1);
  group.add(door);

  if (hasBal && floors >= 2) {
    for (let f = 1; f < floors; f += 1) {
      const by = f * floorH + 0.25;
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 1.3), new THREE.MeshStandardMaterial({ color: 0x9e927f, roughness: 0.8 }));
      balcony.position.set(0, by, depth / 2 + 0.75);
      group.add(balcony);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.06, 0.06), trimMat);
      rail.position.set(0, by + 0.85, depth / 2 + 1.3);
      group.add(rail);
    }
  }

  group.position.set(x, 0, z);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(group);

  world.colliders.push(new THREE.Box3(new THREE.Vector3(x - width / 2 - 0.8, 0, z - depth / 2 - 0.8), new THREE.Vector3(x + width / 2 + 0.8, totalH + 2, z + depth / 2 + 0.8)));
}

function buildNeighborhood() {
  const defs = [
    [30, -180, { floors: 4, width: 14, depth: 16, wallColor: 0xcbbfb2 }],
    [30, -150, { floors: 2, width: 10, depth: 12, wallColor: 0xd6c8a8, hasBal: false }],
    [30, -120, { floors: 5, width: 16, depth: 18, wallColor: 0xb8aea5 }],
    [30, -90, { floors: 3, width: 12, depth: 14, wallColor: 0xc9bda3 }],
    [30, -60, { floors: 2, width: 10, depth: 12, wallColor: 0xd1c4a8, hasBal: false }],
    [30, -30, { floors: 4, width: 14, depth: 16, wallColor: 0xb5ab9c }],
    [30, 0, { floors: 3, width: 11, depth: 13, wallColor: 0xcabfab }],
    [30, 30, { floors: 5, width: 15, depth: 17, wallColor: 0xc2b4a2 }],
    [30, 60, { floors: 2, width: 10, depth: 11, wallColor: 0xd4c9b5, hasBal: false }],
    [30, 90, { floors: 4, width: 13, depth: 15, wallColor: 0xcbb8a2 }],
    [30, 120, { floors: 3, width: 11, depth: 13, wallColor: 0xbeb09d }],
    [30, 150, { floors: 5, width: 15, depth: 17, wallColor: 0xc2b4a2 }],
    [30, 180, { floors: 2, width: 10, depth: 11, wallColor: 0xd4c9b5, hasBal: false }],
    [-30, -180, { floors: 3, width: 12, depth: 14, wallColor: 0xbfb5a5 }],
    [-30, -150, { floors: 5, width: 16, depth: 18, wallColor: 0xc4b8a3 }],
    [-30, -120, { floors: 2, width: 10, depth: 12, wallColor: 0xd3c9b5, hasBal: false }],
    [-30, -90, { floors: 4, width: 14, depth: 16, wallColor: 0xbcb0a2 }],
    [-30, -60, { floors: 3, width: 11, depth: 14, wallColor: 0xc8bfa8 }],
    [-30, -30, { floors: 2, width: 10, depth: 12, wallColor: 0xd0c6b3, hasBal: false }],
    [-30, 0, { floors: 5, width: 15, depth: 18, wallColor: 0xb9b0a1 }],
    [-30, 30, { floors: 3, width: 12, depth: 14, wallColor: 0xc5bba6 }],
    [-30, 60, { floors: 4, width: 14, depth: 16, wallColor: 0xbdaf9e }],
    [-30, 90, { floors: 2, width: 10, depth: 12, wallColor: 0xd0c6b3, hasBal: false }],
    [-30, 120, { floors: 5, width: 15, depth: 18, wallColor: 0xb9b0a1 }],
    [-30, 150, { floors: 3, width: 12, depth: 14, wallColor: 0xc5bba6 }],
    [-30, 180, { floors: 4, width: 14, depth: 16, wallColor: 0xbdaf9e }],
    [62, -120, { floors: 6, width: 18, depth: 20, wallColor: 0xaaa099 }],
    [62, 60, { floors: 7, width: 20, depth: 22, wallColor: 0xa09890 }],
    [-62, -120, { floors: 6, width: 18, depth: 20, wallColor: 0xaaa099 }],
    [-62, 60, { floors: 7, width: 20, depth: 22, wallColor: 0xa09890 }]
  ];
  defs.forEach(([x, z, o]) => createBuilding(x, z, o));
}

function buildStreetFurniture() {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e2126, roughness: 0.65, metalness: 0.7 });
  const globeMat = new THREE.MeshBasicMaterial({ color: 0xfde0a0 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x294d20, roughness: 0.95 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.9 });

  for (let z = -200; z <= 200; z += 20) {
    for (const sx of [-13.5, 13.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 9, 8), poleMat);
      pole.position.set(sx, 4.5, z);
      pole.castShadow = true;
      scene.add(pole);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(sx + (sx > 0 ? -1.2 : 1.2), 8.8, z);
      scene.add(arm);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), globeMat);
      globe.position.set(sx + (sx > 0 ? -2.4 : 2.4), 8.8, z);
      scene.add(globe);

      const lamp = new THREE.PointLight(0xffd39f, 18, 28, 2.2);
      lamp.position.copy(globe.position);
      scene.add(lamp);
    }

    if (z % 40 === 0) {
      for (const tx of [-21, 21]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 3.5, 9), trunkMat);
        trunk.position.set(tx, 1.75, z + (Math.random() - 0.5) * 4);
        trunk.castShadow = true;
        scene.add(trunk);

        for (let layer = 0; layer < 3; layer += 1) {
          const leaves = new THREE.Mesh(new THREE.SphereGeometry(3.2 - layer * 0.7, 10, 8), leafMat.clone());
          leaves.material.color.setHSL(0.29 + Math.random() * 0.06, 0.65, 0.25 + layer * 0.04);
          leaves.position.set(tx, 4.5 + layer * 1.8, trunk.position.z);
          leaves.castShadow = true;
          scene.add(leaves);
        }
      }
    }
  }
}

function buildCoverProps() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 0.88, metalness: 0.04 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x556370, roughness: 0.55, metalness: 0.65 });

  for (let i = 0; i < 60; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5 + Math.random() * 0.8, 1.2 + Math.random() * 0.8, 1.5 + Math.random() * 0.8), Math.random() > 0.5 ? wood : metal);
    crate.position.set((Math.random() - 0.5) * 22, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 190);
    crate.rotation.y = (Math.random() - 0.5) * 0.8;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
    world.colliders.push(new THREE.Box3().setFromObject(crate));
  }

  const healthMat = new THREE.MeshStandardMaterial({ color: 0x34d06f, roughness: 0.5, emissive: 0x1a5d34, emissiveIntensity: 0.6 });
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  for (let i = 0; i < 6; i += 1) {
    const pack = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), healthMat);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.75), crossMat);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.2), crossMat);
    cross.position.y = 0.05;
    cross2.position.y = 0.05;
    pack.add(box, cross, cross2);
    pack.position.set((Math.random() - 0.5) * 60, 1.05, (Math.random() - 0.5) * 200);
    scene.add(pack);
    world.pickups.push({ object: pack, type: "health", amount: 40, spin: 0.9 });
  }

  gltfLoader.load("https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb", (gltf) => {
    const h = gltf.scene;
    h.position.set(-5, 1.5, -18);
    h.scale.setScalar(1.8);
    h.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(h);
    world.pickups.push({ object: h, type: "armor", amount: 35, spin: 1.4 });
  });

  gltfLoader.load("https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF-Binary/FlightHelmet.glb", (gltf) => {
    const h = gltf.scene;
    h.position.set(6, 1.4, 14);
    h.scale.setScalar(2.8);
    h.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(h);
    world.pickups.push({ object: h, type: "ammo", amount: 60, spin: -1.2 });
  });
}

function buildHeartSymbol() {
  const group = new THREE.Group();

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.2, 1.6, 32), new THREE.MeshStandardMaterial({ color: 0x1e1215, roughness: 0.7, metalness: 0.15 }));
  pedestal.position.y = 0.8;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const shape = new THREE.Shape();
  const s = 0.5;
  shape.moveTo(0 * s, 2 * s);
  shape.bezierCurveTo(-0.5 * s, 3.5 * s, -3 * s, 3.5 * s, -3 * s, 1.5 * s);
  shape.bezierCurveTo(-3 * s, 0.2 * s, -2 * s, -0.8 * s, 0 * s, -2.5 * s);
  shape.bezierCurveTo(2 * s, -0.8 * s, 3 * s, 0.2 * s, 3 * s, 1.5 * s);
  shape.bezierCurveTo(3 * s, 3.5 * s, 0.5 * s, 3.5 * s, 0 * s, 2 * s);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: true, bevelSize: 0.18, bevelThickness: 0.18, bevelSegments: 4 });

  const left = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8b1a28, roughness: 0.3, metalness: 0.25, emissive: 0x300509, emissiveIntensity: 0.8 }));
  left.scale.set(-1, 1, 1);
  left.position.set(-0.15, 2.2, -0.6);
  left.castShadow = true;

  const right = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4d0e17, roughness: 0.35, metalness: 0.2, emissive: 0x1a0205, emissiveIntensity: 0.5 }));
  right.position.set(0.15, 2.2, -0.6);
  right.castShadow = true;

  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.5, 1.8), new THREE.MeshStandardMaterial({ color: 0x0a0304, roughness: 1.0 }));
  crack.position.set(0, 3.4, -0.6);
  crack.rotation.z = 0.06;

  group.add(left, right, crack);

  const glow = new THREE.PointLight(0xff2040, 14, 18, 2.0);
  glow.position.set(0, 4.5, 0);
  group.add(glow);
  world.heartParts.push({ type: "glow", light: glow, base: 14 });

  const count = 280;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r = 3.5 + Math.random() * 4;
    const h = 1.5 + Math.random() * 6;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = h;
    positions[i * 3 + 2] = Math.sin(a) * r;
    colors[i * 3] = 0.8 + Math.random() * 0.2;
    colors[i * 3 + 1] = Math.random() * 0.25;
    colors[i * 3 + 2] = Math.random() * 0.15;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const embers = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(embers);
  world.heartParts.push({ type: "embers", object: embers });

  scene.add(group);
  world.heartParts.push({ type: "group", object: group });
}

function createGunMesh() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e2128, roughness: 0.35, metalness: 0.88 });
  const tan = new THREE.MeshStandardMaterial({ color: 0x7a6848, roughness: 0.72, metalness: 0.1 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x1a1007, roughness: 0.9, metalness: 0.05 });

  const recv = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.75), dark);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -0.71);
  const hg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42), tan);
  hg.position.set(0, 0, -0.42);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.28), tan);
  stock.position.set(0, -0.014, 0.52);
  const gp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.1), grip);
  gp.position.set(0, -0.165, 0.2);
  gp.rotation.x = -0.28;
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.072), dark);
  mag.position.set(0, -0.21, 0.07);
  mag.rotation.x = -0.2;
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.09), dark);
  sight.position.set(0, 0.13, -0.06);

  g.add(recv, barrel, hg, stock, gp, mag, sight);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

function createPlayerBody() {
  const body = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.75, 5, 12), new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.55, metalness: 0.2 }));
  torso.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), new THREE.MeshStandardMaterial({ color: 0xe8c99a, roughness: 0.7 }));
  head.position.y = 1.75;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), new THREE.MeshStandardMaterial({ color: 0x252a30, roughness: 0.4, metalness: 0.6 }));
  helmet.position.set(0, 1.87, -0.04);
  helmet.scale.y = 0.82;

  const gun = createGunMesh();
  gun.position.set(0.42, 1.05, -0.55);
  player.gun = gun;

  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flash.position.set(0, 0, -1.35);
  gun.add(flash);
  world.muzzleFlash = flash;

  body.add(torso, head, helmet, gun);
  body.position.copy(player.pos);
  body.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  scene.add(body);
  player.body = body;
}

const botNames = ["Ghost", "Reaper", "Viper", "Phantom", "Jackal", "Raven", "Saber", "Frost", "Blaze", "Nova"];

function spawnBots(count, levelConfig = null) {
  const cfg = levelConfig ?? levelDefs[game.levelIndex] ?? levelDefs[0];
  world.bots.forEach((b) => scene.remove(b.group));
  world.bots = [];

  for (let i = 0; i < count; i += 1) {
    const group = new THREE.Group();
    const color = new THREE.Color().setHSL(0.01 + Math.random() * 0.03, 0.62, 0.38);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2, emissive: 0x100406, emissiveIntensity: 0.25 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.7, metalness: 0.15 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a87a, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.38), bodyMat);
    torso.position.y = 1.25;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.4), bodyMat);
    chest.position.y = 1.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), headMat);
    head.position.y = 2.05;

    const hip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.3), limbMat);
    hip.position.y = 0.86;

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 10), limbMat);
    legL.position.set(-0.16, 0.4, 0);
    const legR = legL.clone();
    legR.position.x = 0.16;

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.75, 10), limbMat);
    armL.position.set(-0.48, 1.4, 0);
    armL.rotation.z = 0.15;
    const armR = armL.clone();
    armR.position.x = 0.48;
    armR.rotation.z = -0.15;

    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.72), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.8 }));
    gun.position.set(0.34, 1.45, -0.5);

    group.add(torso, chest, hip, head, legL, legR, armL, armR, gun);

    group.position.set((Math.random() - 0.5) * 70, 1.5, (Math.random() - 0.5) * 200);
    group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(group);

    world.bots.push({
      id: i,
      name: botNames[i % botNames.length],
      group,
      hp: cfg.botHp,
      hpMax: cfg.botHp,
      armor: 20,
      speed: cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]),
      cooldown: 0.8 + Math.random() * 1.2,
      accuracy: cfg.accuracy[0] + Math.random() * (cfg.accuracy[1] - cfg.accuracy[0]),
      dmgMin: cfg.dmg[0],
      dmgMax: cfg.dmg[1],
      patrolTarget: new THREE.Vector3((Math.random() - 0.5) * 70, 1.5, (Math.random() - 0.5) * 200),
      deadTimer: 0,
      strafe: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 1 + Math.random() * 2
    });
  }
}

function setLevel(index) {
  game.levelIndex = index;
  const cfg = levelDefs[Math.min(index, levelDefs.length - 1)];
  game.killsThisLevel = 0;
  game.killsNeeded = cfg.kills;
  const scaledBots = Math.max(2, Math.round(cfg.botCount * game.botMultiplier));
  spawnBots(scaledBots, cfg);
  if (levelInfoEl) {
    levelInfoEl.textContent = `LEVEL ${index + 1} / ${cfg.name.toUpperCase()} (0/${cfg.kills})`;
  }
  if (levelProgressFillEl) {
    levelProgressFillEl.style.width = "0%";
  }
}

function advanceLevel() {
  if (game.levelIndex < levelDefs.length - 1) {
    const nextIndex = game.levelIndex + 1;
    showLevelComplete(levelDefs[game.levelIndex].name, levelDefs[nextIndex].name);
    setLevel(nextIndex);
  } else {
    game.killsThisLevel = 0;
    game.killsNeeded += 10;
    const cfg = levelDefs[levelDefs.length - 1];
    const scaledBots = Math.max(3, Math.round((cfg.botCount + 2) * game.botMultiplier));
    spawnBots(scaledBots, cfg);
    addFeed("Hard+ engaged. More bots inbound.", "#ff9a9a");
  }
}

function showLevelComplete(fromName, toName) {
  if (!levelCompleteEl) return;
  game.paused = true;
  game.levelPopupTimer = 1.8;
  levelCompleteTitleEl.textContent = `Level Complete: ${fromName.toUpperCase()}`;
  levelCompleteDescEl.textContent = `Next: ${toName.toUpperCase()}`;
  levelCompleteEl.classList.remove("hidden");
}

function hideLevelComplete() {
  if (!levelCompleteEl) return;
  levelCompleteEl.classList.add("hidden");
  game.paused = false;
  if (!touchState.enabled) canvas.requestPointerLock();
}

function shouldUseTouch() {
  return touchState.force || ("ontouchstart" in window && window.innerWidth < 1100);
}

function applySettings() {
  game.quality = qualityInput.value;
  const p = profiles[game.quality];

  player.sensitivity = Number(sensitivityInput.value);
  touchState.force = touchInput.checked;
  touchState.enabled = shouldUseTouch();

  game.usePost = game.quality !== "mobile";
  game.dynamicScale = game.quality === "mobile" ? 0.75 : 1;
  game.basePixelRatio = clamp(window.devicePixelRatio * p.pixelRatio * Number(resolutionInput.value), 0.55, 2.4);
  renderer.setPixelRatio(game.basePixelRatio * game.dynamicScale);
  renderer.shadowMap.enabled = p.shadows;

  const sun = scene.children.find((c) => c.isDirectionalLight);
  if (sun) sun.shadow.mapSize.set(p.shadowMap, p.shadowMap);

  ssaoPass.enabled = p.ssao && game.usePost;
  bloomPass.enabled = p.bloom && bloomInput.checked && game.usePost;
  smaaPass.enabled = game.usePost;

  game.fxScale = game.quality === "mobile" ? 0.45 : game.quality === "medium" ? 0.7 : 1;
  game.botMultiplier = game.quality === "mobile" ? 0.65 : game.quality === "medium" ? 0.85 : 1;

  if (gyroInput) {
    toggleGyro(gyroInput.checked);
  }

  touchControls.classList.toggle("hidden", !touchState.enabled);
  touchControls.classList.toggle("split", touchState.enabled);

  const chosenLevel = Number(difficultyInput?.value ?? game.levelIndex);
  setLevel(Number.isFinite(chosenLevel) ? chosenLevel : 0);
  onResize();
}

function onGyro(e) {
  if (!gyroState.enabled) return;
  const gamma = e.gamma ?? 0;
  const beta = e.beta ?? 0;
  if (!gyroState.hasBase) {
    gyroState.baseGamma = gamma;
    gyroState.baseBeta = beta;
    gyroState.hasBase = true;
    return;
  }
  const relGamma = gamma - gyroState.baseGamma;
  const relBeta = beta - gyroState.baseBeta;
  const yaw = clamp(relGamma / 45, -1, 1);
  const pitch = clamp(relBeta / 45, -1, 1);
  const dz = 0.06;
  const yawOut = Math.abs(yaw) < dz ? 0 : yaw;
  const pitchOut = Math.abs(pitch) < dz ? 0 : pitch;
  gyroState.targetX = yawOut * 0.9;
  gyroState.targetY = pitchOut * 0.75;
}

async function toggleGyro(enable) {
  if (!gyroState.supported) return;
  if (enable) {
    gyroState.hasBase = false;
    gyroState.lookX = 0;
    gyroState.lookY = 0;
    gyroState.targetX = 0;
    gyroState.targetY = 0;
    if (typeof DeviceOrientationEvent?.requestPermission === "function") {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") return;
    }
    gyroState.enabled = true;
    window.addEventListener("deviceorientation", onGyro, true);
  } else {
    gyroState.enabled = false;
    gyroState.lookX = 0;
    gyroState.lookY = 0;
    window.removeEventListener("deviceorientation", onGyro, true);
  }
}

function setPanel(panel, open) {
  panel.classList.toggle("open", open);
}

function setupTouchPad(pad, onMove) {
  const stick = pad.querySelector(".stick");
  let activeId = null;

  function reset() {
    stick.style.left = "37px";
    stick.style.top = "37px";
    onMove(0, 0);
  }

  function updateTouch(touch) {
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const max = rect.width * 0.32;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    stick.style.left = `${37 + dx}px`;
    stick.style.top = `${37 + dy}px`;
    onMove(dx / max, dy / max);
  }

  pad.addEventListener("touchstart", (e) => {
    if (!touchState.enabled) return;
    const t = e.changedTouches[0];
    activeId = t.identifier;
    updateTouch(t);
  });

  pad.addEventListener("touchmove", (e) => {
    if (activeId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier === activeId) {
        updateTouch(t);
        break;
      }
    }
  });

  function endTouch(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === activeId) {
        activeId = null;
        reset();
        break;
      }
    }
  }

  pad.addEventListener("touchend", endTouch);
  pad.addEventListener("touchcancel", endTouch);
}

function setupInput() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyW") keys.forward = true;
    if (e.code === "KeyS") keys.backward = true;
    if (e.code === "KeyA") keys.left = true;
    if (e.code === "KeyD") keys.right = true;
    if (e.code === "Space") keys.jump = true;
    if (e.code === "ShiftLeft") keys.sprint = true;
    if (e.code === "KeyR") keys.reload = true;
    if (e.code === "KeyV") {
      player.thirdPerson = !player.thirdPerson;
      modeEl.textContent = `${player.thirdPerson ? "Third" : "First"} Person Tactical`;
    }
    if (e.code === "Escape" && game.started) {
      game.paused = true;
      setPanel(menuPanel, true);
      document.exitPointerLock?.();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") keys.forward = false;
    if (e.code === "KeyS") keys.backward = false;
    if (e.code === "KeyA") keys.left = false;
    if (e.code === "KeyD") keys.right = false;
    if (e.code === "Space") keys.jump = false;
    if (e.code === "ShiftLeft") keys.sprint = false;
    if (e.code === "KeyR") keys.reload = false;
  });

  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) keys.fire = true;
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) keys.fire = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!game.pointerLocked || game.paused) return;
    mouseDelta.x += e.movementX;
    mouseDelta.y += e.movementY;
  });

  canvas.addEventListener("click", () => {
    if (!game.paused && !touchState.enabled) canvas.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    game.pointerLocked = document.pointerLockElement === canvas;
    if (!game.pointerLocked) {
      keys.fire = false;
      touchState.firing = false;
    }
  });

  window.addEventListener("blur", () => {
    keys.fire = false;
    touchState.firing = false;
  });

  const touchMax = 90;
  function resetTouchZone(id) {
    if (touchZones.leftId === id) {
      touchZones.leftId = null;
      touchState.moveX = 0;
      touchState.moveY = 0;
    }
    if (touchZones.rightId === id) {
      touchZones.rightId = null;
      touchState.lookX = 0;
      touchState.lookY = 0;
    }
  }

  window.addEventListener("touchstart", (e) => {
    if (!touchState.enabled) return;
    const half = window.innerWidth / 2;
    for (const t of e.changedTouches) {
      if (t.clientX < half && touchZones.leftId === null) {
        touchZones.leftId = t.identifier;
        touchZones.leftStart.x = t.clientX;
        touchZones.leftStart.y = t.clientY;
      } else if (t.clientX >= half && touchZones.rightId === null) {
        touchZones.rightId = t.identifier;
        touchZones.rightStart.x = t.clientX;
        touchZones.rightStart.y = t.clientY;
      }
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!touchState.enabled) return;
    for (const t of e.changedTouches) {
      if (t.identifier === touchZones.leftId) {
        const dx = clamp((t.clientX - touchZones.leftStart.x) / touchMax, -1, 1);
        const dy = clamp((touchZones.leftStart.y - t.clientY) / touchMax, -1, 1);
        touchState.moveX = dx;
        touchState.moveY = dy;
      }
      if (t.identifier === touchZones.rightId) {
        const dx = clamp((t.clientX - touchZones.rightStart.x) / touchMax, -1, 1);
        const dy = clamp((touchZones.rightStart.y - t.clientY) / touchMax, -1, 1);
        touchState.lookX = dx;
        touchState.lookY = dy;
      }
    }
  }, { passive: true });

  window.addEventListener("touchend", (e) => {
    for (const t of e.changedTouches) resetTouchZone(t.identifier);
  });
  window.addEventListener("touchcancel", (e) => {
    for (const t of e.changedTouches) resetTouchZone(t.identifier);
  });

  setupTouchPad(leftPad, (x, y) => {
    touchState.moveX = x;
    touchState.moveY = -y;
  });
  setupTouchPad(rightPad, (x, y) => {
    touchState.lookX = x;
    touchState.lookY = y;
  });

  shootBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchState.firing = true;
  }, { passive: false });
  shootBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchState.firing = false;
  }, { passive: false });
  jumpBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchState.jumping = true;
  }, { passive: false });
  jumpBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchState.jumping = false;
  }, { passive: false });

  reloadBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys.reload = true;
  }, { passive: false });

  shootBtn.addEventListener("mousedown", () => {
    keys.fire = true;
  });
  shootBtn.addEventListener("mouseup", () => {
    keys.fire = false;
  });

  resolutionInput.addEventListener("input", () => {
    resLabel.textContent = `${Number(resolutionInput.value).toFixed(2)}x`;
  });
  sensitivityInput.addEventListener("input", () => {
    senLabel.textContent = Number(sensitivityInput.value).toFixed(2);
  });
}

function setupUI() {
  settingsBtn.addEventListener("click", () => {
    setPanel(menuPanel, false);
    setPanel(settingsPanel, true);
    touchControls.classList.add("hidden");
  });

  backBtn.addEventListener("click", () => {
    setPanel(settingsPanel, false);
    setPanel(menuPanel, true);
    touchControls.classList.toggle("hidden", !touchState.enabled);
  });

  applySettingsBtn.addEventListener("click", () => {
    applySettings();
    setPanel(settingsPanel, false);
    setPanel(menuPanel, true);
    touchControls.classList.toggle("hidden", !touchState.enabled);
  });

  startBtn.addEventListener("click", () => {
    game.started = true;
    game.paused = false;
    game.playerScore = 0;
    game.botScore = 0;
    const chosenLevel = Number(difficultyInput?.value ?? 0);
    setLevel(Number.isFinite(chosenLevel) ? chosenLevel : 0);
    setPanel(menuPanel, false);
    if (!touchState.enabled) canvas.requestPointerLock();
    gsap.fromTo("#topHud, #bottomHud", { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.5 });
    addFeed("Round live. Hold angles, burst fire, survive.", "#e7bc71");
    addFeed("A broken heart became your battlefield.", "#f09a9d");
  });

  levelContinueBtn?.addEventListener("click", () => {
    hideLevelComplete();
  });

  gyroInput?.addEventListener("change", (e) => {
    toggleGyro(e.target.checked);
  });
}

function tryReload() {
  if (player.reloadTimer > 0) return;
  if (player.ammoClip >= 30 || player.ammoReserve <= 0) return;
  player.reloadTimer = 1.85;
  addFeed("Reloading...", "#9fd9ff");
}

function completeReload() {
  const need = 30 - player.ammoClip;
  const take = Math.min(need, player.ammoReserve);
  player.ammoClip += take;
  player.ammoReserve -= take;
}

function triggerMuzzleFlash() {
  if (!world.muzzleFlash) return;
  world.muzzleFlash.material.opacity = 0.9;
  world.muzzleFlash.scale.setScalar(0.8 + Math.random() * 0.45);
  gsap.to(world.muzzleFlash.material, { opacity: 0, duration: 0.06 });
}

function spawnTracer(origin, direction, length, color) {
  const end = origin.clone().addScaledVector(direction, length);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, end]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending }));
  scene.add(line);
  world.tracers.push({ line, life: 0.12 });
}

function spawnParticles(point, color = 0xffa855, count = 18) {
  const scaledCount = Math.max(6, Math.round(count * game.fxScale));
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(scaledCount * 3);
  const vel = [];
  for (let i = 0; i < scaledCount; i += 1) {
    arr[i * 3] = point.x;
    arr[i * 3 + 1] = point.y;
    arr[i * 3 + 2] = point.z;
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 3.2, Math.random() * 2.8 + 0.3, (Math.random() - 0.5) * 3.2));
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.1, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pts);
  world.particles.push({ points: pts, vel, life: 0.6 });
}

function damageBot(bot, amount) {
  let dmg = amount;
  if (bot.armor > 0) {
    const absorb = Math.min(bot.armor, dmg * 0.42);
    bot.armor -= absorb;
    dmg -= absorb;
  }
  bot.hp -= dmg;

  if (bot.hp <= 0) {
    bot.hp = 0;
    bot.deadTimer = 5;
    bot.group.visible = false;
    game.playerScore += 1;
    game.killsThisLevel += 1;
    addFeed(`You eliminated ${bot.name}`, "#ffd172");
    if (game.killsThisLevel >= game.killsNeeded) {
      advanceLevel();
    }
  }
}

function startDeath() {
  game.isDead = true;
  game.respawnTimer = 3.5;
  deathScreen.classList.remove("hidden");
  gsap.fromTo(deathScreen, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  document.exitPointerLock?.();
}

function respawnPlayer() {
  game.isDead = false;
  game.spawnProtection = 2.2;
  gsap.to(deathScreen, { opacity: 0, duration: 0.4, onComplete: () => deathScreen.classList.add("hidden") });
  player.pos.copy(player.spawn);
  player.velocity.set(0, 0, 0);
  player.health = 100;
  player.armor = 70;
  player.ammoClip = 30;
  player.ammoReserve = 90;
  player.recoil = 0;
  addFeed("Respawn protection active (2s)", "#8ad6ff");
  if (!touchState.enabled) canvas.requestPointerLock();
}

function applyDamageToPlayer(amount, bot) {
  if (game.spawnProtection > 0) return;

  let dmg = amount;
  if (player.armor > 0) {
    const absorb = Math.min(player.armor, dmg * 0.38);
    player.armor -= absorb;
    dmg -= absorb;
  }
  player.health -= dmg;

  gsap.fromTo(".vignette", { opacity: 0.22 }, { opacity: 0, duration: 0.45 });

  if (player.health <= 0) {
    player.health = 0;
    game.botScore += 1;
    addFeed(`${bot.name} fragged you`, "#ff8a8a");
    startDeath();
  }
}

function performShoot(fromBot = null) {
  if (fromBot) {
    const origin = fromBot.group.position.clone();
    origin.y += 1.15;
    const target = player.pos.clone().add(new THREE.Vector3(0, 0.8, 0));
    const dir = target.clone().sub(origin).normalize();
    const dist = origin.distanceTo(player.pos);
    const playerSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    const movingPenalty = playerSpeed > 6.5 ? 0.2 : playerSpeed > 2.5 ? 0.1 : 0;
    const baseChance = dist < 10 ? 0.45 : dist < 22 ? 0.3 : dist < 36 ? 0.18 : 0.1;
    const chance = Math.max(0.05, (baseChance - movingPenalty) * fromBot.accuracy);

    spawnTracer(origin, dir, 50, 0xff5544);

    if (Math.random() < chance) {
      applyDamageToPlayer(fromBot.dmgMin + Math.random() * (fromBot.dmgMax - fromBot.dmgMin), fromBot);
    }
    return;
  }

  if (player.weaponCooldown > 0 || player.reloadTimer > 0) return;
  if (player.ammoClip <= 0) {
    tryReload();
    return;
  }

  const eye = camera.position.clone();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const spread = 0.008 + player.recoil * 0.012;
  dir.x += (Math.random() - 0.5) * spread;
  dir.y += (Math.random() - 0.5) * spread;
  dir.z += (Math.random() - 0.5) * spread;
  dir.normalize();

  player.ammoClip -= 1;
  player.weaponCooldown = 0.09;
  player.recoil = clamp(player.recoil + 0.14, 0, 2.0);

  spawnTracer(eye, dir, 90, 0xffeecc);
  triggerMuzzleFlash();

  const ray = new THREE.Ray(eye, dir);
  let bestBot = null;
  let bestDist = Infinity;
  let bestHit = "none";

  for (const bot of world.bots) {
    if (bot.hp <= 0) continue;
    const headCenter = bot.group.position.clone().add(new THREE.Vector3(0, 2.05, 0));
    const bodyCenter = bot.group.position.clone().add(new THREE.Vector3(0, 1.35, 0));
    const headSphere = new THREE.Sphere(headCenter, 0.22);
    const bodySphere = new THREE.Sphere(bodyCenter, 0.6);

    const headHit = ray.intersectSphere(headSphere, new THREE.Vector3());
    const bodyHit = ray.intersectSphere(bodySphere, new THREE.Vector3());

    if (headHit) {
      const dist = eye.distanceTo(headHit);
      if (dist < bestDist) {
        bestDist = dist;
        bestBot = bot;
        bestHit = "head";
      }
    }

    if (bodyHit) {
      const dist = eye.distanceTo(bodyHit);
      if (dist < bestDist) {
        bestDist = dist;
        bestBot = bot;
        bestHit = "body";
      }
    }
  }

  if (bestBot) {
    const headshot = bestHit === "head";
    const dmg = headshot ? 110 : 28 + Math.random() * 10;
    damageBot(bestBot, dmg);
    spawnParticles(bestBot.group.position.clone().add(new THREE.Vector3(0, headshot ? 1.7 : 1.1, 0)), 0x990010, 14);
    addFeed(headshot ? `Headshot - ${bestBot.name} dropped` : `${bestBot.name} body hit`, "#ffcab2");
  } else {
    const hit = eye.clone().addScaledVector(dir, 35);
    spawnParticles(hit, 0xffa855, 12);
  }
}

function isColliding(pos, radius) {
  for (const box of world.colliders) {
    const expanded = box.clone().expandByScalar(radius);
    if (expanded.containsPoint(pos)) return true;
  }
  return false;
}

function hasLineOfSight(from, to) {
  const dir = to.clone().sub(from);
  const dist = dir.length();
  dir.normalize();
  const ray = new THREE.Ray(from, dir);
  for (const box of world.colliders) {
    const hit = ray.intersectBox(box, new THREE.Vector3());
    if (hit && from.distanceTo(hit) < dist - 0.4) return false;
  }
  return true;
}

function updatePlayer(dt) {
  if (game.spawnProtection > 0) {
    game.spawnProtection = Math.max(0, game.spawnProtection - dt);
  }

  if (game.isDead) {
    game.respawnTimer -= dt;
    respawnCountEl.textContent = Math.ceil(Math.max(0, game.respawnTimer)).toString();
    if (game.respawnTimer <= 0) respawnPlayer();
    return;
  }

  const gp = navigator.getGamepads?.()[0] ?? null;
  let moveX = 0;
  let moveZ = 0;
  let lookX = 0;
  let lookY = 0;
  let shoot = keys.fire;
  let jump = keys.jump;

  if (keys.forward) moveZ -= 1;
  if (keys.backward) moveZ += 1;
  if (keys.left) moveX -= 1;
  if (keys.right) moveX += 1;

  if (touchState.enabled) {
    const dz = 0.08;
    const mx = Math.abs(touchState.moveX) < dz ? 0 : touchState.moveX;
    const my = Math.abs(touchState.moveY) < dz ? 0 : touchState.moveY;
    moveX += mx;
    moveZ += my;
    lookX += touchState.lookX * 2.1;
    lookY += touchState.lookY * 2.1;
    shoot = shoot || touchState.firing;
    jump = jump || touchState.jumping;
  }

  if (gp) {
    moveX += gp.axes[0] || 0;
    moveZ += -(gp.axes[1] || 0);
    lookX += (gp.axes[2] || 0) * 1.6;
    lookY += (gp.axes[3] || 0) * 1.6;
    shoot = shoot || gp.buttons[7]?.pressed;
    jump = jump || gp.buttons[0]?.pressed;
    if (gp.buttons[2]?.pressed) tryReload();
    if (gp.buttons[4]?.pressed) player.thirdPerson = !player.thirdPerson;
    modeEl.textContent = `${player.thirdPerson ? "Third" : "First"} Person + Controller`;
  } else {
    modeEl.textContent = `${player.thirdPerson ? "Third" : "First"} Person Tactical`;
  }

  if (gyroState.enabled) {
    gyroState.lookX = lerp(gyroState.lookX, gyroState.targetX, 0.12);
    gyroState.lookY = lerp(gyroState.lookY, gyroState.targetY, 0.12);
    lookX += gyroState.lookX;
    lookY += gyroState.lookY;
  }

  player.yaw -= (mouseDelta.x * 0.001 + lookX * 0.048) * player.sensitivity;
  player.pitch -= (mouseDelta.y * 0.001 + lookY * 0.032) * player.sensitivity;
  player.pitch = clamp(player.pitch, -1.18, 1.12);
  mouseDelta.x = 0;
  mouseDelta.y = 0;

  const speed = keys.sprint ? player.sprintSpeed : player.moveSpeed;
  const local = new THREE.Vector3(moveX, 0, moveZ);
  if (local.lengthSq() > 1) local.normalize();

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const moveDir = forward.clone().multiplyScalar(local.z).add(right.multiplyScalar(local.x));
  if (moveDir.lengthSq() > 0.0001) moveDir.normalize();

  player.velocity.x = moveDir.x * speed;
  player.velocity.z = moveDir.z * speed;

  if (!player.grounded) player.velocity.y -= player.gravity * dt;

  if (jump && player.grounded) {
    player.velocity.y = player.jumpForce;
    player.grounded = false;
  }

  if (keys.reload) {
    tryReload();
    keys.reload = false;
  }

  player.weaponCooldown = Math.max(0, player.weaponCooldown - dt);
  player.recoil = Math.max(0, player.recoil - dt * 2.2);

  if (player.reloadTimer > 0) {
    player.reloadTimer -= dt;
    if (player.reloadTimer <= 0) {
      player.reloadTimer = 0;
      completeReload();
    }
  }

  if (shoot && (touchState.enabled || game.pointerLocked || gp)) performShoot();

  const nx = player.pos.clone();
  nx.x += player.velocity.x * dt;
  if (!isColliding(nx, 0.44)) player.pos.x = nx.x;

  const nz = player.pos.clone();
  nz.z += player.velocity.z * dt;
  if (!isColliding(nz, 0.44)) player.pos.z = nz.z;

  player.pos.y += player.velocity.y * dt;
  if (player.pos.y <= 1.75) {
    player.pos.y = 1.75;
    player.velocity.y = 0;
    player.grounded = true;
  }

  player.pos.x = clamp(player.pos.x, -260, 260);
  player.pos.z = clamp(player.pos.z, -250, 250);

  player.body.position.copy(player.pos);
  player.body.rotation.y = player.yaw;

  for (const pu of world.pickups) {
    const t = performance.now() * 0.001;
    pu.object.rotation.y += dt * pu.spin;
    pu.object.position.y = 1.45 + Math.sin(t * 1.4) * 0.18;
    if (pu.object.position.distanceTo(player.pos) < 2.6) {
      if (pu.type === "health") player.health = clamp(player.health + pu.amount, 0, 100);
      if (pu.type === "armor") player.armor = clamp(player.armor + pu.amount, 0, 100);
      if (pu.type === "ammo") player.ammoReserve = clamp(player.ammoReserve + pu.amount, 0, 180);
      addFeed(`${pu.type.toUpperCase()} +${pu.amount}`, "#9cedbf");
      pu.object.position.set((Math.random() - 0.5) * 90, 1.45, (Math.random() - 0.5) * 220);
    }
  }
}

function updateBots(dt) {
  for (const bot of world.bots) {
    if (bot.hp <= 0) {
      bot.deadTimer -= dt;
      if (bot.deadTimer <= 0) {
        bot.hp = bot.hpMax ?? 100;
        bot.armor = 20;
        bot.group.visible = true;
        bot.group.position.set((Math.random() - 0.5) * 90, 1.5, (Math.random() - 0.5) * 230);
      }
      continue;
    }

    const botEye = bot.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const playerHead = player.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
    const toPlayer = playerHead.clone().sub(botEye);
    const distance = toPlayer.length();
    const sees = distance < 85 && !game.isDead && hasLineOfSight(botEye, playerHead);

    bot.strafeTimer -= dt;
    if (bot.strafeTimer <= 0) {
      bot.strafe *= -1;
      bot.strafeTimer = 1 + Math.random() * 2.5;
    }

    if (sees) {
      const chase = toPlayer.clone().setY(0).normalize();
      const side = new THREE.Vector3(-chase.z, 0, chase.x).multiplyScalar(bot.strafe * 0.38);
      const advance = distance > 22 ? 0.6 : 0;
      const move = chase.multiplyScalar(advance).add(side);
      if (move.lengthSq() > 0.001) move.normalize().multiplyScalar(bot.speed * dt);

      const p = bot.group.position.clone().add(move);
      p.y = 1.5;
      if (!isColliding(p, 0.52)) {
        bot.group.position.x = p.x;
        bot.group.position.z = p.z;
      }

      bot.group.lookAt(player.pos.x, bot.group.position.y, player.pos.z);
      bot.cooldown -= dt;
      if (bot.cooldown <= 0) {
        if (Math.random() < 0.72) {
          performShoot(bot);
        }
        bot.cooldown = 0.75 + Math.random() * 1.15;
      }
    } else {
      const toPatrol = bot.patrolTarget.clone().sub(bot.group.position).setY(0);
      if (toPatrol.length() < 2) {
        bot.patrolTarget.set((Math.random() - 0.5) * 70, 1.5, (Math.random() - 0.5) * 200);
      } else {
        const move = toPatrol.normalize().multiplyScalar(bot.speed * 0.45 * dt);
        const p = bot.group.position.clone().add(move);
        p.y = 1.5;
        if (!isColliding(p, 0.52)) {
          bot.group.position.x = p.x;
          bot.group.position.z = p.z;
        }
        bot.group.lookAt(bot.patrolTarget.x, bot.group.position.y, bot.patrolTarget.z);
      }
    }
  }
}

function updateCamera(dt) {
  const look = player.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
  if (player.thirdPerson) {
    const offset = new THREE.Vector3(0.6, 1.85, 4.6);
    offset.applyEuler(new THREE.Euler(player.pitch * 0.38, player.yaw + Math.PI, 0, "YXZ"));
    const desired = player.pos.clone().add(offset);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
    camera.lookAt(look);
    player.body.visible = true;
  } else {
    const eye = player.pos.clone().add(new THREE.Vector3(0, 0.62, 0));
    camera.position.lerp(eye, 1 - Math.exp(-dt * 22));
    camera.rotation.set(player.pitch + player.recoil * 0.022, player.yaw, 0, "YXZ");
    player.body.visible = false;
  }
}

function updateVFX(dt) {
  const t = performance.now() * 0.001;

  for (let i = world.tracers.length - 1; i >= 0; i -= 1) {
    const tr = world.tracers[i];
    tr.life -= dt;
    tr.line.material.opacity = Math.max(0, tr.life * 7);
    if (tr.life <= 0) {
      scene.remove(tr.line);
      tr.line.geometry.dispose();
      tr.line.material.dispose();
      world.tracers.splice(i, 1);
    }
  }

  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.life -= dt;
    const arr = p.points.geometry.attributes.position.array;
    for (let j = 0; j < p.vel.length; j += 1) {
      p.vel[j].y -= 9 * dt;
      arr[j * 3] += p.vel[j].x * dt;
      arr[j * 3 + 1] += p.vel[j].y * dt;
      arr[j * 3 + 2] += p.vel[j].z * dt;
    }
    p.points.geometry.attributes.position.needsUpdate = true;
    p.points.material.opacity = Math.max(0, (p.life / 0.6) * 0.9);
    if (p.life <= 0) {
      scene.remove(p.points);
      p.points.geometry.dispose();
      p.points.material.dispose();
      world.particles.splice(i, 1);
    }
  }

  for (const hp of world.heartParts) {
    if (hp.type === "glow") hp.light.intensity = hp.base + Math.sin(t * 2.3) * 4;
    if (hp.type === "embers") hp.object.rotation.y += dt * 0.22;
    if (hp.type === "group") hp.object.rotation.y += dt * 0.08;
  }
}

function updateRound(dt) {
  if (!game.started || game.paused || game.isDead) return;

  game.roundTime -= dt;
  if (game.roundTime <= 0) {
    game.roundTime = game.maxRoundTime;
    addFeed("Round reset. New engagement.", "#ffdc96");
    world.bots.forEach((bot) => {
      bot.hp = bot.hpMax ?? 100;
      bot.armor = 20;
      bot.group.visible = true;
      bot.group.position.set((Math.random() - 0.5) * 90, 1.5, (Math.random() - 0.5) * 230);
    });
  }

  const mins = Math.floor(game.roundTime / 60).toString().padStart(2, "0");
  const secs = Math.floor(game.roundTime % 60).toString().padStart(2, "0");
  timerEl.textContent = `${mins}:${secs}`;
  scoreEl.textContent = `YOU ${game.playerScore} : ${game.botScore} BOTS`;
  hpEl.textContent = Math.ceil(player.health).toString();
  armorEl.textContent = Math.ceil(player.armor).toString();
  ammoEl.textContent = `${player.ammoClip} / ${player.ammoReserve}`;
  if (levelInfoEl) {
    const cfg = levelDefs[Math.min(game.levelIndex, levelDefs.length - 1)];
    levelInfoEl.textContent = `LEVEL ${game.levelIndex + 1} / ${cfg.name.toUpperCase()} (${game.killsThisLevel}/${game.killsNeeded})`;
  }
  if (levelProgressFillEl) {
    const pct = Math.min(1, game.killsThisLevel / Math.max(1, game.killsNeeded));
    levelProgressFillEl.style.width = `${Math.round(pct * 100)}%`;
  }
  setHealthBars();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  ssaoPass.setSize(w, h);
  smaaPass.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  game.fpsAvg = lerp(game.fpsAvg, 1 / Math.max(0.001, dt), 0.05);
  game.perfTimer += dt;
  if (game.perfTimer > 0.6 && game.quality === "mobile") {
    game.perfTimer = 0;
    if (game.fpsAvg < 52 && game.dynamicScale > 0.6) {
      game.dynamicScale = Math.max(0.6, game.dynamicScale - 0.05);
      renderer.setPixelRatio(game.basePixelRatio * game.dynamicScale);
    } else if (game.fpsAvg > 58 && game.dynamicScale < 1) {
      game.dynamicScale = Math.min(1, game.dynamicScale + 0.02);
      renderer.setPixelRatio(game.basePixelRatio * game.dynamicScale);
    }
  }

  if (game.levelPopupTimer > 0) {
    game.levelPopupTimer = Math.max(0, game.levelPopupTimer - dt);
    if (game.levelPopupTimer === 0) {
      hideLevelComplete();
    }
  }

  if (!game.paused) {
    updatePlayer(dt);
    if (!game.isDead) updateBots(dt);
    updateCamera(dt);
    updateVFX(dt);
    updateRound(dt);
  } else {
    keys.fire = false;
    touchState.firing = false;
  }

  if (game.usePost) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function init() {
  createSkyAndLights();
  buildGround();
  buildNeighborhood();
  buildStreetFurniture();
  buildCoverProps();
  buildHeartSymbol();
  createPlayerBody();
  setupInput();
  setupUI();
  applySettings();
  onResize();
  setHealthBars();
  window.addEventListener("resize", onResize);

  gsap.fromTo(".brand h1", { opacity: 0, y: -22, letterSpacing: "8px" }, { opacity: 1, y: 0, letterSpacing: "3px", duration: 1.1, ease: "power2.out" });
  gsap.fromTo(".brand p", { opacity: 0 }, { opacity: 0.8, duration: 0.8, delay: 0.5 });

  addFeed("A broken heart became your battlefield. - Sakshyam", "#f09a9d");
  if (window.location.protocol === "file:") {
    addFeed("Open via http://localhost:5500 (file:// won't run module assets reliably)", "#ffad7a");
  }

  animate();
}

init();
