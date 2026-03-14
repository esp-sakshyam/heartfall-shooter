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
const menuWeatherInput = document.getElementById("menuWeather");
const menuMapInput = document.getElementById("menuMap");
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
const driveBtn = document.getElementById("driveBtn");
const carLeftBtn = document.getElementById("carLeftBtn");
const carRightBtn = document.getElementById("carRightBtn");
const carGasBtn = document.getElementById("carGasBtn");
const carBrakeBtn = document.getElementById("carBrakeBtn");
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
const rotateHintEl = document.getElementById("rotateHint");
const hpBarEl = document.getElementById("hpBar");
const armorBarEl = document.getElementById("armorBar");
const resLabel = document.getElementById("resLabel");
const senLabel = document.getElementById("senLabel");
const modToggleBtn = document.getElementById("modToggle");
const modMenuEl = document.getElementById("modMenu");
const modGodInput = document.getElementById("modGod");
const modAmmoInput = document.getElementById("modAmmo");
const modFreezeInput = document.getElementById("modFreeze");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9ab2ca, 0.006);

const envGroup = new THREE.Group();
const mapGroup = new THREE.Group();
scene.add(envGroup);
scene.add(mapGroup);

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

const assetCache = {
  groundColor: null,
  groundNormal: null,
  hdr: null,
  hdrLoading: false
};

const world = {
  colliders: [],
  bots: [],
  pickups: [],
  tracers: [],
  particles: [],
  heartParts: [],
  muzzleFlash: null,
  sunLight: null,
  hemiLight: null,
  fillLight: null,
  skyMesh: null,
  weatherFx: null,
  dynamicLights: [],
  fogBase: 0.006,
  buildToken: 0,
  boundsX: 260,
  boundsZ: 250,
  botSpawnX: 90,
  botSpawnZ: 230,
  patrolX: 70,
  patrolZ: 200,
  pickupX: 90,
  pickupZ: 220,
  nepalFlags: [],
  nepalWheels: [],
  nepalFogPatches: [],
  nepalMarkers: [],
  nepalSilhouettes: [],
  nepalCar: null,
  bellZones: [],
  ambientZones: [],
  bellTimer: 0,
  ambientTimer: 0,
  nepalMission: null,
  audioCtx: null,
  bellGain: null,
  weather: "clear",
  map: "city"
};

const mods = {
  godMode: false,
  infiniteAmmo: false,
  freezeBots: false
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
  perfTimer: 0,
  perfMode: "normal",
  ssaoWanted: true,
  botUpdateAcc: 0,
  botUpdateStep: 1 / 45,
  botLodTick: 0
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
  driving: false,
  thirdPersonBeforeDrive: false,
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
  jumping: false,
  driveLeft: false,
  driveRight: false,
  driveGas: false,
  driveBrake: false
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
  baseAlpha: 0,
  hasBase: false
};

const touchZones = {
  leftId: null,
  rightId: null,
  leftStart: { x: 0, y: 0 },
  rightStart: { x: 0, y: 0 }
};

const mouseDelta = { x: 0, y: 0 };
const gamepadState = {
  viewHeld: false
};
const fireTouch = {
  id: null,
  x: 0,
  y: 0
};
const tmpCollisionBox = new THREE.Box3();
const tmpRayHit = new THREE.Vector3();

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function normalizeAngle(deg) {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

function randCentered(range) {
  return (Math.random() - 0.5) * range;
}

function randomBotSpawn() {
  return new THREE.Vector3(randCentered(world.botSpawnX), 1.5, randCentered(world.botSpawnZ));
}

function randomPatrolTarget() {
  return new THREE.Vector3(randCentered(world.patrolX), 1.5, randCentered(world.patrolZ));
}

function randomSpawnAround(center, radius) {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.sqrt(Math.random()) * radius;
  return new THREE.Vector3(center.x + Math.cos(angle) * dist, 1.5, center.z + Math.sin(angle) * dist);
}

function buildNepalMissionWaves(levelConfig) {
  const cfg = levelConfig ?? levelDefs[Math.min(game.levelIndex, levelDefs.length - 1)] ?? levelDefs[0];
  const mobileLike = game.quality === "mobile" || touchState.enabled;
  const base = Math.max(6, Math.round(cfg.botCount * Math.max(0.72, game.botMultiplier)));
  return [
    {
      id: "himalaya",
      name: "Himalaya Ridge Wave",
      center: new THREE.Vector3(-360, 1.5, -420),
      spawnRadius: mobileLike ? 70 : 95,
      spawnCount: base + 1,
      requiredKills: base + 1
    },
    {
      id: "lumbini",
      name: "Lumbini Wave",
      center: new THREE.Vector3(-140, 1.5, 170),
      spawnRadius: mobileLike ? 64 : 88,
      spawnCount: base + 2,
      requiredKills: base + 2
    },
    {
      id: "flag",
      name: "Flag Plaza Wave",
      center: new THREE.Vector3(140, 1.5, -160),
      spawnRadius: mobileLike ? 60 : 84,
      spawnCount: base + 3,
      requiredKills: base + 3
    }
  ];
}

function initNepalMission(levelConfig) {
  world.nepalMission = {
    waves: buildNepalMissionWaves(levelConfig),
    activeWaveIndex: -1,
    nextWaveIndex: 0,
    killsInWave: 0,
    requiredInWave: 0,
    intermission: 0,
    complete: false
  };
}

function startNepalWave(levelConfig, waveIndex, intermission = 0) {
  if (!world.nepalMission) return;
  const wave = world.nepalMission.waves[waveIndex];
  if (!wave) return;
  world.nepalMission.activeWaveIndex = waveIndex;
  world.nepalMission.nextWaveIndex = waveIndex;
  world.nepalMission.killsInWave = 0;
  world.nepalMission.requiredInWave = wave.requiredKills;
  world.nepalMission.intermission = intermission;

  const waveDistance = player.pos.distanceTo(wave.center);
  const spawnCenter = waveDistance > 260 ? player.pos.clone() : wave.center.clone();
  const spawnRadius = waveDistance > 260 ? Math.max(34, wave.spawnRadius * 0.52) : wave.spawnRadius;

  spawnBots(wave.spawnCount, levelConfig, {
    clearExisting: true,
    spawnCenter,
    spawnRadius,
    patrolCenter: spawnCenter,
    patrolRadius: wave.spawnRadius * 1.15,
    waveId: wave.id,
    canRespawn: false
  });

  addFeed(`${wave.name} started`, "#ffd38a");
  if (waveDistance > 260) {
    addFeed(`${wave.name}: enemies pushed to your sector`, "#9be0ff");
  }
  addFeed(`Objective: eliminate ${wave.requiredKills} hostiles`, "#9be0ff");
}

function updateNepalMission(dt, levelConfig) {
  if (world.map !== "nepal" || !world.nepalMission || world.nepalMission.complete) return;

  if (world.nepalMission.activeWaveIndex >= 0) {
    const activeWave = world.nepalMission.waves[world.nepalMission.activeWaveIndex];
    if (!activeWave) return;

    const aliveInWave = world.bots.filter((b) => b.hp > 0 && b.waveId === activeWave.id).length;
    const remaining = world.nepalMission.requiredInWave - world.nepalMission.killsInWave;
    if (aliveInWave === 0 && remaining > 0) {
      const distToWave = player.pos.distanceTo(activeWave.center);
      const spawnCenter = distToWave > 260 ? player.pos.clone() : activeWave.center.clone();
      spawnBots(remaining, levelConfig, {
        clearExisting: false,
        spawnCenter,
        spawnRadius: Math.max(34, activeWave.spawnRadius * 0.7),
        patrolCenter: spawnCenter,
        patrolRadius: activeWave.spawnRadius,
        waveId: activeWave.id,
        canRespawn: false
      });
      addFeed(`${activeWave.name}: reinforcements deployed`, "#ffd38a");
    }
    return;
  }

  world.nepalMission.intermission = Math.max(0, world.nepalMission.intermission - dt);
  if (world.nepalMission.intermission > 0) return;

  const nextIndex = world.nepalMission.nextWaveIndex;
  if (nextIndex < world.nepalMission.waves.length) {
    startNepalWave(levelConfig, nextIndex, 0);
    return;
  }

  world.nepalMission.complete = true;
  addFeed("Nepal campaign sector secured. Hold this line.", "#9dffb8");
}

function updateOrientationHint() {
  if (!rotateHintEl) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  rotateHintEl.classList.toggle("active", isPortrait);
}

function clearGroup(group) {
  while (group.children.length > 0) {
    const obj = group.children[group.children.length - 1];
    group.remove(obj);
    obj.traverse?.((child) => {
      if (child.isMesh || child.isPoints || child.isLine) {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose?.());
        } else {
          child.material?.dispose?.();
        }
      }
    });
  }
}

function clearDynamicEffects() {
  for (const tr of world.tracers) {
    scene.remove(tr.line);
    tr.line.geometry?.dispose?.();
    tr.line.material?.dispose?.();
  }
  world.tracers = [];

  for (const p of world.particles) {
    scene.remove(p.points);
    p.points.geometry?.dispose?.();
    p.points.material?.dispose?.();
  }
  world.particles = [];

  world.weatherFx = null;
}

function updateDynamicLightQuality() {
  const isMobile = game.quality === "mobile";
  const isMedium = game.quality === "medium";
  for (let i = 0; i < world.dynamicLights.length; i += 1) {
    const lamp = world.dynamicLights[i];
    if (isMobile) {
      lamp.visible = i % 4 === 0;
      lamp.intensity = 6;
      lamp.distance = 16;
    } else if (isMedium) {
      lamp.visible = i % 2 === 0;
      lamp.intensity = 12;
      lamp.distance = 22;
    } else {
      lamp.visible = true;
      lamp.intensity = 18;
      lamp.distance = 28;
    }
  }
}

function getGroundTextures() {
  if (!assetCache.groundColor) {
    const gTex = texLoader.load("https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/terrain/grasslight-big.jpg");
    gTex.wrapS = THREE.RepeatWrapping;
    gTex.wrapT = THREE.RepeatWrapping;
    gTex.repeat.set(80, 80);
    gTex.colorSpace = THREE.SRGBColorSpace;
    assetCache.groundColor = gTex;
  }

  if (!assetCache.groundNormal) {
    const gNrm = texLoader.load("https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/terrain/grasslight-big-nm.jpg");
    gNrm.wrapS = THREE.RepeatWrapping;
    gNrm.wrapT = THREE.RepeatWrapping;
    gNrm.repeat.set(80, 80);
    assetCache.groundNormal = gNrm;
  }

  return { gTex: assetCache.groundColor, gNrm: assetCache.groundNormal };
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

function ensureAudioContext() {
  if (world.audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  world.audioCtx = new Ctx();
  world.bellGain = world.audioCtx.createGain();
  world.bellGain.gain.value = 0.08;
  world.bellGain.connect(world.audioCtx.destination);
}

function playTempleBell(intensity = 1) {
  if (!world.audioCtx || !world.bellGain) return;
  const now = world.audioCtx.currentTime;

  const osc1 = world.audioCtx.createOscillator();
  const osc2 = world.audioCtx.createOscillator();
  const gain = world.audioCtx.createGain();

  osc1.type = "triangle";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(420, now);
  osc2.frequency.setValueAtTime(628, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1 * intensity, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(world.bellGain);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.65);
  osc2.stop(now + 1.65);
}

function playAmbientChant(intensity = 1) {
  if (!world.audioCtx || !world.bellGain) return;
  const now = world.audioCtx.currentTime;
  const osc = world.audioCtx.createOscillator();
  const gain = world.audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(198, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035 * intensity, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
  osc.connect(gain);
  gain.connect(world.bellGain);
  osc.start(now);
  osc.stop(now + 2.45);
}

function playAmbientDrum(intensity = 1) {
  if (!world.audioCtx || !world.bellGain) return;
  const now = world.audioCtx.currentTime;
  const osc = world.audioCtx.createOscillator();
  const gain = world.audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(82, now);
  osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08 * intensity, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  osc.connect(gain);
  gain.connect(world.bellGain);
  osc.start(now);
  osc.stop(now + 0.36);
}

function createPoiMarker(text) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(10,16,28,0.76)";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(255,230,190,0.8)";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = "#ffe8c7";
  ctx.font = "700 42px Space Grotesk";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.width / 2, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.4),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  return plane;
}

const weatherPresets = {
  clear: {
    top: 0x7fb8ff,
    bottom: 0xf4efe8,
    fog: 0xe3edf6,
    fogDensity: 0.006,
    sunColor: 0xfff0d6,
    sunIntensity: 2.2,
    hemiSky: 0xbad6ff,
    hemiGround: 0x6c5c4a,
    hemiIntensity: 0.7,
    fill: 0x8fbef0,
    fillIntensity: 0.4,
    rain: false
  },
  cloudy: {
    top: 0x7a8ea2,
    bottom: 0xcfd7de,
    fog: 0xc2cdd7,
    fogDensity: 0.008,
    sunColor: 0xf4efe6,
    sunIntensity: 1.6,
    hemiSky: 0xa8b5c4,
    hemiGround: 0x5a4f45,
    hemiIntensity: 0.6,
    fill: 0x92a6bc,
    fillIntensity: 0.35,
    rain: false
  },
  rain: {
    top: 0x4d5b6a,
    bottom: 0x9babb9,
    fog: 0x93a2b0,
    fogDensity: 0.012,
    sunColor: 0xdfe7f0,
    sunIntensity: 0.95,
    hemiSky: 0x6f8091,
    hemiGround: 0x4e4a45,
    hemiIntensity: 0.55,
    fill: 0x7f93a8,
    fillIntensity: 0.28,
    rain: true
  }
};

function createRainFx() {
  const count = Math.round(1200 * game.fxScale);
  const area = 220;
  const height = 90;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    arr[i * 3] = (Math.random() - 0.5) * area;
    arr[i * 3 + 1] = 8 + Math.random() * height;
    arr[i * 3 + 2] = (Math.random() - 0.5) * area;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color: 0xcfd6dd, size: 0.08, transparent: true, opacity: 0.8, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  envGroup.add(points);
  world.weatherFx = { type: "rain", points, speed: 34, area, height };
}

function createSkyAndLights(weather = "clear") {
  const preset = weatherPresets[weather] ?? weatherPresets.clear;

  const hemi = new THREE.HemisphereLight(preset.hemiSky, preset.hemiGround, preset.hemiIntensity);
  envGroup.add(hemi);

  const sun = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.bias = -0.00006;
  envGroup.add(sun);

  const fill = new THREE.DirectionalLight(preset.fill, preset.fillIntensity);
  fill.position.set(-60, 45, -50);
  envGroup.add(fill);

  world.sunLight = sun;
  world.hemiLight = hemi;
  world.fillLight = fill;
  world.fogBase = preset.fogDensity;
  scene.fog.color.set(preset.fog);
  scene.fog.density = preset.fogDensity;

  if (assetCache.hdr) {
    scene.environment = assetCache.hdr;
  } else if (!assetCache.hdrLoading) {
    assetCache.hdrLoading = true;
    rgbeLoader.load("https://cdn.jsdelivr.net/npm/three@0.165.0/examples/textures/equirectangular/royal_esplanade_1k.hdr", (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      assetCache.hdr = hdr;
      assetCache.hdrLoading = false;
      scene.environment = hdr;
    });
  }

  const skyGeo = new THREE.SphereGeometry(850, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(preset.top) },
      bottomColor: { value: new THREE.Color(preset.bottom) },
      offset: { value: 34 },
      exponent: { value: 0.55 }
    },
    vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent),0.0)), 1.0); }`
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  envGroup.add(sky);
  world.skyMesh = sky;

  if (world.map === "nepal") {
    sky.material.uniforms.exponent.value = 0.48;
  }

  if (preset.rain) {
    createRainFx();
  }
}

function buildGround() {
  const { gTex, gNrm } = getGroundTextures();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ map: gTex, normalMap: gNrm, roughness: 0.95, metalness: 0.02 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  mapGroup.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 420), new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.92, metalness: 0.06 }));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  mapGroup.add(road);

  for (const sx of [-17, 17]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(7, 420), new THREE.MeshStandardMaterial({ color: 0x8c8680, roughness: 0.88 }));
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(sx, 0.03, 0);
    sw.receiveShadow = true;
    mapGroup.add(sw);

    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 420), new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.75 }));
    kerb.position.set(sx + (sx > 0 ? -3.6 : 3.6), 0.09, 0);
    kerb.receiveShadow = true;
    mapGroup.add(kerb);
  }

  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e45a });
  for (let z = -205; z < 205; z += 12) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 6.5), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.06, z);
    mapGroup.add(dash);
  }

  for (const lx of [-5, 5]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 410), new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.55, transparent: true }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(lx, 0.045, 0);
    mapGroup.add(line);
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
  mapGroup.add(group);

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

  const streetStep = game.quality === "ultra" ? 20 : game.quality === "high" ? 22 : game.quality === "medium" ? 28 : 34;
  const treeStep = streetStep * 2;

  for (let z = -200; z <= 200; z += streetStep) {
    for (const sx of [-13.5, 13.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 9, 8), poleMat);
      pole.position.set(sx, 4.5, z);
      pole.castShadow = true;
      mapGroup.add(pole);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), poleMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(sx + (sx > 0 ? -1.2 : 1.2), 8.8, z);
      mapGroup.add(arm);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), globeMat);
      globe.position.set(sx + (sx > 0 ? -2.4 : 2.4), 8.8, z);
      mapGroup.add(globe);

      const lamp = new THREE.PointLight(0xffd39f, 18, 28, 2.2);
      lamp.position.copy(globe.position);
      mapGroup.add(lamp);
      world.dynamicLights.push(lamp);
    }

    if (z % treeStep === 0) {
      for (const tx of [-21, 21]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 3.5, 9), trunkMat);
        trunk.position.set(tx, 1.75, z + (Math.random() - 0.5) * 4);
        trunk.castShadow = true;
        mapGroup.add(trunk);

        for (let layer = 0; layer < 3; layer += 1) {
          const leaves = new THREE.Mesh(new THREE.SphereGeometry(3.2 - layer * 0.7, 10, 8), leafMat.clone());
          leaves.material.color.setHSL(0.29 + Math.random() * 0.06, 0.65, 0.25 + layer * 0.04);
          leaves.position.set(tx, 4.5 + layer * 1.8, trunk.position.z);
          leaves.castShadow = true;
          mapGroup.add(leaves);
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
    mapGroup.add(crate);
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
    mapGroup.add(pack);
    world.pickups.push({ object: pack, type: "health", amount: 40, spin: 0.9 });
  }

  const token = world.buildToken;
  gltfLoader.load("https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb", (gltf) => {
    if (token !== world.buildToken) return;
    const h = gltf.scene;
    h.position.set(-5, 1.5, -18);
    h.scale.setScalar(1.8);
    h.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    mapGroup.add(h);
    world.pickups.push({ object: h, type: "armor", amount: 35, spin: 1.4 });
  });

  gltfLoader.load("https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF-Binary/FlightHelmet.glb", (gltf) => {
    if (token !== world.buildToken) return;
    const h = gltf.scene;
    h.position.set(6, 1.4, 14);
    h.scale.setScalar(2.8);
    h.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    mapGroup.add(h);
    world.pickups.push({ object: h, type: "ammo", amount: 60, spin: -1.2 });
  });
}

function buildHeartSymbol(x = 0, z = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

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

  mapGroup.add(group);
  world.heartParts.push({ type: "group", object: group });
}

function buildOutpostGround() {
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xd9c4a2, roughness: 0.96, metalness: 0.02 });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.receiveShadow = true;
  mapGroup.add(sand);

  const track = new THREE.Mesh(new THREE.PlaneGeometry(36, 360), new THREE.MeshStandardMaterial({ color: 0xbfa787, roughness: 0.9, metalness: 0.02 }));
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.02;
  mapGroup.add(track);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.3, 24), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.8 }));
  pad.position.set(-28, 0.2, 40);
  pad.castShadow = true;
  pad.receiveShadow = true;
  mapGroup.add(pad);
}

function buildOutpostStructures() {
  const metal = new THREE.MeshStandardMaterial({ color: 0x59626d, roughness: 0.62, metalness: 0.6 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x705248, roughness: 0.7, metalness: 0.45 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xb6a48a, roughness: 0.9, metalness: 0.05 });

  const containers = [
    { x: 16, z: -40, h: 1 },
    { x: 22, z: -32, h: 2 },
    { x: -18, z: -55, h: 2 },
    { x: -26, z: -35, h: 1 }
  ];
  for (const c of containers) {
    for (let y = 0; y < c.h; y += 1) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.6), Math.random() > 0.5 ? metal : rust);
      box.position.set(c.x, 1.3 + y * 2.7, c.z);
      box.castShadow = true;
      box.receiveShadow = true;
      mapGroup.add(box);
      world.colliders.push(new THREE.Box3().setFromObject(box));
    }
  }

  for (let i = 0; i < 8; i += 1) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 1.2), wallMat);
    wall.position.set((Math.random() - 0.5) * 60, 0.6, (Math.random() - 0.5) * 160);
    wall.rotation.y = Math.random() * Math.PI;
    wall.castShadow = true;
    wall.receiveShadow = true;
    mapGroup.add(wall);
    world.colliders.push(new THREE.Box3().setFromObject(wall));
  }

  const tower = new THREE.Group();
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4e535b, roughness: 0.7, metalness: 0.6 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 8.5, 8), legMat);
      leg.position.set(sx * 1.2, 4.25, sz * 1.2);
      leg.castShadow = true;
      tower.add(leg);
    }
  }
  const platform = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 4.5), metal);
  platform.position.set(0, 8.8, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  tower.add(platform);
  tower.position.set(-40, 0, -10);
  mapGroup.add(tower);
  world.colliders.push(new THREE.Box3().setFromObject(tower));
}

function buildOutpostProps() {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8c7f6a, roughness: 1.0 });
  const rockCount = game.quality === "ultra" ? 14 : game.quality === "high" ? 12 : game.quality === "medium" ? 9 : 7;
  for (let i = 0; i < rockCount; i += 1) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + Math.random() * 1.6, 0), rockMat);
    rock.position.set((Math.random() - 0.5) * 120, 0.9, (Math.random() - 0.5) * 200);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    mapGroup.add(rock);
    world.colliders.push(new THREE.Box3().setFromObject(rock));
  }

  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x4d4f55, roughness: 0.6, metalness: 0.65 });
  const barrelCount = game.quality === "ultra" ? 10 : game.quality === "high" ? 8 : game.quality === "medium" ? 6 : 4;
  for (let i = 0; i < barrelCount; i += 1) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12), barrelMat);
    barrel.position.set((Math.random() - 0.5) * 70, 0.6, (Math.random() - 0.5) * 170);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    mapGroup.add(barrel);
    world.colliders.push(new THREE.Box3().setFromObject(barrel));
  }
}

function buildCityWorld() {
  buildGround();
  buildNeighborhood();
  buildStreetFurniture();
  buildCoverProps();
  buildHeartSymbol(0, 0);
}

function buildOutpostWorld() {
  buildOutpostGround();
  buildOutpostStructures();
  buildOutpostProps();
  buildCoverProps();
  buildHeartSymbol(0, -30);
}

function buildNepalGround() {
  const valley = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.MeshStandardMaterial({ color: 0x88a66e, roughness: 0.95, metalness: 0.02 })
  );
  valley.rotation.x = -Math.PI / 2;
  valley.receiveShadow = true;
  mapGroup.add(valley);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 860),
    new THREE.MeshStandardMaterial({ color: 0x4f4b47, roughness: 0.9, metalness: 0.05 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.03;
  road.receiveShadow = true;
  mapGroup.add(road);

  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 900),
    new THREE.MeshStandardMaterial({ color: 0x4f8fb9, roughness: 0.24, metalness: 0.1, transparent: true, opacity: 0.78 })
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(70, 0.02, 0);
  river.receiveShadow = true;
  mapGroup.add(river);

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.8, 34),
    new THREE.MeshStandardMaterial({ color: 0x7c5d42, roughness: 0.86, metalness: 0.05 })
  );
  bridge.position.set(70, 0.45, -80);
  bridge.castShadow = true;
  bridge.receiveShadow = true;
  mapGroup.add(bridge);
  world.colliders.push(new THREE.Box3().setFromObject(bridge));
}

function buildNepalVillage() {
  const palette = [0xd36f44, 0xe2b66a, 0xd95a5d, 0xc0a06e, 0xd4896b, 0xbd6b52];
  const rows = [-380, -320, -260, -200, -140, -80, -20, 40, 100, 160, 220, 280, 340];
  for (const z of rows) {
    const colorA = palette[Math.floor(Math.random() * palette.length)];
    const colorB = palette[Math.floor(Math.random() * palette.length)];
    const colorC = palette[Math.floor(Math.random() * palette.length)];
    createBuilding(42, z, { floors: 2 + Math.floor(Math.random() * 3), width: 12, depth: 13, wallColor: colorA, hasBal: true });
    createBuilding(-42, z + (Math.random() - 0.5) * 10, { floors: 2 + Math.floor(Math.random() * 3), width: 11, depth: 12, wallColor: colorB, hasBal: true });
    if (Math.random() > 0.3) {
      createBuilding(78, z + (Math.random() - 0.5) * 18, { floors: 2 + Math.floor(Math.random() * 2), width: 9, depth: 10, wallColor: colorC, hasBal: false });
    }
  }

  const stupa = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(10, 12, 2.8, 28), new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.86 }));
  base.position.y = 1.4;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7.4, 30, 18), new THREE.MeshStandardMaterial({ color: 0xf6f2e9, roughness: 0.7 }));
  dome.position.y = 6.4;
  dome.scale.y = 0.6;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7.5, 10), new THREE.MeshStandardMaterial({ color: 0xd5b153, roughness: 0.5, metalness: 0.2 }));
  spire.position.y = 11;
  stupa.add(base, dome, spire);
  stupa.position.set(0, 0, -240);
  stupa.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  mapGroup.add(stupa);
  world.colliders.push(new THREE.Box3().setFromObject(stupa));
}

function buildNepalRoadNetwork() {
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xb29b78, roughness: 0.93, metalness: 0.02 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7d6751, roughness: 0.9, metalness: 0.02 });

  for (let i = 0; i < 11; i += 1) {
    const z = -400 + i * 80;
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(170, 6), pathMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(-8, 0.035, z);
    lane.receiveShadow = true;
    mapGroup.add(lane);

    const curbL = new THREE.Mesh(new THREE.BoxGeometry(170, 0.22, 0.5), wallMat);
    curbL.position.set(-8, 0.12, z - 3.2);
    const curbR = curbL.clone();
    curbR.position.z = z + 3.2;
    mapGroup.add(curbL, curbR);
  }

  for (let i = 0; i < 8; i += 1) {
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(88, 5.5), pathMat);
    slope.rotation.x = -Math.PI / 2;
    slope.rotation.z = 0.14;
    slope.position.set(-95 + i * 24, 0.04, -300 + i * 74);
    slope.receiveShadow = true;
    mapGroup.add(slope);
  }
}

function buildNepalCourtyard() {
  const tile = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 24, 0.35, 40),
    new THREE.MeshStandardMaterial({ color: 0xd7c2a0, roughness: 0.88, metalness: 0.04 })
  );
  tile.position.set(0, 0.2, -240);
  tile.receiveShadow = true;
  mapGroup.add(tile);

  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4d, roughness: 0.85, metalness: 0.05 });
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const x = Math.cos(a) * 14;
    const z = Math.sin(a) * 14;
    const wheelBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), ringMat);
    wheelBase.position.set(x, 0.5, z - 240);
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.52, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9a142, roughness: 0.45, metalness: 0.35 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 1.2, z - 240);
    mapGroup.add(wheelBase, wheel);
    world.nepalWheels.push({ wheel, baseRot: wheel.rotation.x, phase: Math.random() * Math.PI * 2 });
  }

  world.bellZones.push({ position: new THREE.Vector3(0, 2, -240), radius: 170, cooldown: 0 });
}

function buildNepalVibes() {
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x7f8a78, roughness: 0.98 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef3f8, roughness: 0.82, metalness: 0.03 });
  for (let i = 0; i < 22; i += 1) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(26 + Math.random() * 35, 85 + Math.random() * 80, 6), mountainMat);
    const ring = 360 + Math.random() * 180;
    const a = Math.random() * Math.PI * 2;
    const h = m.geometry.parameters.height;
    m.position.set(Math.cos(a) * ring, h / 2 - 3, Math.sin(a) * ring);
    m.castShadow = true;
    m.receiveShadow = true;
    mapGroup.add(m);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(m.geometry.parameters.radius * 0.35, h * 0.22, 6), snowMat);
    cap.position.set(m.position.x, h * 0.9, m.position.z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    mapGroup.add(cap);
  }

  const colors = [0xef4444, 0xf59e0b, 0x2563eb, 0xf97316, 0xffffff];
  for (let i = 0; i < 24; i += 1) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 30, 6), new THREE.MeshStandardMaterial({ color: 0x3f2a1f, roughness: 0.95 }));
    rope.rotation.z = Math.PI / 2;
    rope.position.set(-12 + (Math.random() - 0.5) * 18, 9 + Math.random() * 6, -300 + i * 26);
    mapGroup.add(rope);
    for (let j = 0; j < 9; j += 1) {
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: colors[j % colors.length], side: THREE.DoubleSide }));
      flag.position.set(rope.position.x - 14 + j * 3.4, rope.position.y - 0.45, rope.position.z + Math.sin(j * 0.5) * 0.3);
      flag.rotation.y = 0.4;
      mapGroup.add(flag);
      world.nepalFlags.push({ flag, baseX: flag.position.x, baseY: flag.position.y, baseZ: flag.position.z, phase: Math.random() * Math.PI * 2 });
    }
  }

  const fogLayers = 10;
  for (let i = 0; i < fogLayers; i += 1) {
    const fogPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(120 + Math.random() * 80, 40 + Math.random() * 18),
      new THREE.MeshBasicMaterial({
        color: 0xf1f7ff,
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      })
    );
    fogPatch.position.set(randCentered(700), 28 + Math.random() * 34, randCentered(760));
    fogPatch.rotation.y = Math.random() * Math.PI;
    mapGroup.add(fogPatch);
    world.nepalFogPatches.push({ fogPatch, baseX: fogPatch.position.x, baseZ: fogPatch.position.z, phase: Math.random() * Math.PI * 2 });
  }

  world.bellZones.push({ position: new THREE.Vector3(70, 1.5, -80), radius: 120, cooldown: 0 });
}

function buildHimalayaRange() {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6f7d84, roughness: 0.97 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf5f9ff, roughness: 0.82, metalness: 0.03 });
  for (let i = 0; i < 11; i += 1) {
    const h = 180 + Math.random() * 110;
    const r = 52 + Math.random() * 36;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockMat);
    peak.position.set(-520 + i * 104, h * 0.5 - 18, -560 + Math.random() * 70);
    peak.castShadow = true;
    peak.receiveShadow = true;
    mapGroup.add(peak);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.25, 7), snowMat);
    cap.position.set(peak.position.x, h * 0.9, peak.position.z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    mapGroup.add(cap);
  }
}

function createNepalFlagMesh() {
  const makeShape = (inset = 0) => {
    const s = new THREE.Shape();
    s.moveTo(0 + inset, 0 + inset * 0.4);
    s.lineTo(0 + inset, 2.8 - inset);
    s.lineTo(2.3 - inset, 2.1 - inset * 0.5);
    s.lineTo(0 + inset, 1.3);
    s.lineTo(2.7 - inset, 0.4 + inset * 0.25);
    s.lineTo(0 + inset, 0 + inset * 0.4);
    return s;
  };

  const group = new THREE.Group();
  const border = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeShape(0), { depth: 0.07, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0x153f9f, roughness: 0.45, metalness: 0.12 })
  );
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeShape(0.18), { depth: 0.08, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0xce1c2f, roughness: 0.42, metalness: 0.08 })
  );
  body.position.z = 0.01;

  const moonOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
  moonOuter.rotation.x = Math.PI / 2;
  moonOuter.position.set(0.9, 1.88, 0.11);
  const moonInner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 18), new THREE.MeshStandardMaterial({ color: 0xce1c2f, roughness: 0.4 }));
  moonInner.rotation.x = Math.PI / 2;
  moonInner.position.set(0.98, 1.95, 0.115);

  const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
  sun.rotation.x = Math.PI / 2;
  sun.position.set(1.0, 0.78, 0.11);

  group.add(border, body, moonOuter, moonInner, sun);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}

function buildNepalFlagMonument() {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.24, 22, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8c6d6, roughness: 0.45, metalness: 0.55 })
  );
  pole.position.set(140, 11, -160);
  pole.castShadow = true;
  mapGroup.add(pole);

  const flag = createNepalFlagMesh();
  flag.position.set(140.2, 15.4, -160.2);
  flag.rotation.y = Math.PI;
  mapGroup.add(flag);
  world.nepalFlags.push({ flag, baseX: flag.position.x, baseY: flag.position.y, baseZ: flag.position.z, phase: Math.random() * Math.PI * 2 });
}

function buildLumbiniComplex() {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(34, 1.2, 24),
    new THREE.MeshStandardMaterial({ color: 0xe6decf, roughness: 0.9, metalness: 0.02 })
  );
  base.position.set(-140, 0.6, 170);
  base.receiveShadow = true;
  base.castShadow = true;
  mapGroup.add(base);

  const shrine = new THREE.Mesh(
    new THREE.BoxGeometry(18, 7.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.82, metalness: 0.03 })
  );
  shrine.position.set(-140, 4.6, 170);
  shrine.castShadow = true;
  shrine.receiveShadow = true;
  mapGroup.add(shrine);

  const pond = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 18),
    new THREE.MeshStandardMaterial({ color: 0x6aa4c7, roughness: 0.22, metalness: 0.12, transparent: true, opacity: 0.8 })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-140, 0.03, 145);
  mapGroup.add(pond);

  world.colliders.push(new THREE.Box3().setFromObject(base));
  world.colliders.push(new THREE.Box3().setFromObject(shrine));
}

function buildNepalMapLogo() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.6, 0.4);
  shape.lineTo(-1.4, 1.4);
  shape.lineTo(0.1, 1.3);
  shape.lineTo(1.1, 1.9);
  shape.lineTo(2.5, 1.2);
  shape.lineTo(2.2, 0.1);
  shape.lineTo(0.9, -0.5);
  shape.lineTo(-0.4, -0.4);
  shape.lineTo(-1.6, -0.9);
  shape.lineTo(-2.6, -0.2);
  shape.lineTo(-2.6, 0.4);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false });
  const logo = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0xcc2532, roughness: 0.35, metalness: 0.2, emissive: 0x240709, emissiveIntensity: 0.35 })
  );
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(120, 1.1, 120);
  logo.scale.setScalar(8.5);
  logo.castShadow = true;
  logo.receiveShadow = true;
  mapGroup.add(logo);
  world.colliders.push(new THREE.Box3().setFromObject(logo));
}

function buildStupaCluster() {
  const matA = new THREE.MeshStandardMaterial({ color: 0xf2efe7, roughness: 0.8, metalness: 0.02 });
  const matB = new THREE.MeshStandardMaterial({ color: 0xd5b45b, roughness: 0.48, metalness: 0.18 });
  const spots = [
    [-220, -120],
    [-255, -170],
    [-180, -210],
    [-280, -240],
    [-120, -250],
    [-70, -180],
    [-300, -90],
    [-245, -60],
    [-100, -95],
    [-36, -130]
  ];
  for (const [x, z] of spots) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 1.2, 20), matA);
    base.position.y = 0.6;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 14), matA);
    dome.position.y = 2.5;
    dome.scale.y = 0.68;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 10), matB);
    top.position.y = 4.1;
    g.add(base, dome, top);
    g.position.set(x, 0, z);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    mapGroup.add(g);
    world.colliders.push(new THREE.Box3().setFromObject(g));
  }
}

function buildNepalPoiMarkers() {
  const markers = [
    { text: "Himalaya Ridge", pos: new THREE.Vector3(-360, 36, -420) },
    { text: "Lumbini Complex", pos: new THREE.Vector3(-140, 8, 196) },
    { text: "Flag Plaza", pos: new THREE.Vector3(140, 20, -140) },
    { text: "Stupa Circle", pos: new THREE.Vector3(-220, 10, -180) }
  ];

  for (const m of markers) {
    const marker = createPoiMarker(m.text);
    marker.position.copy(m.pos);
    mapGroup.add(marker);
    world.nepalMarkers.push(marker);
  }
}

function buildNepalCrowdSilhouettes() {
  const spots = [
    [-155, 170],
    [-130, 178],
    [-120, 160],
    [-235, -185],
    [-208, -145],
    [12, -222]
  ];

  for (let i = 0; i < spots.length; i += 1) {
    const [x, z] = spots[i];
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.95, metalness: 0.02 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.88, 4, 8), mat);
    body.position.y = 1.0;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), mat);
    head.position.y = 1.78;
    g.add(body, head);
    g.position.set(x + (Math.random() - 0.5) * 3, 0, z + (Math.random() - 0.5) * 3);
    g.rotation.y = Math.random() * Math.PI * 2;
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    mapGroup.add(g);
    world.nepalSilhouettes.push({ group: g, baseY: g.position.y, phase: Math.random() * Math.PI * 2 });
  }

  world.ambientZones.push({ type: "chant", position: new THREE.Vector3(-140, 1.5, 170), radius: 210 });
  world.ambientZones.push({ type: "drum", position: new THREE.Vector3(-220, 1.5, -170), radius: 190 });
}

function createFallbackSuperCar() {
  const car = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.9, 7.2),
    new THREE.MeshStandardMaterial({ color: 0xbf162e, roughness: 0.28, metalness: 0.72 })
  );
  shell.position.y = 1.3;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.65, 3.3),
    new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.22, metalness: 0.78 })
  );
  roof.position.set(0, 1.95, -0.5);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.5, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xca1d3a, roughness: 0.3, metalness: 0.68 })
  );
  nose.position.set(0, 1.0, -3.3);
  car.add(shell, roof, nose);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.85, metalness: 0.1 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, roughness: 0.35, metalness: 0.82 });
  const wheels = [];
  const wheelSpots = [
    [-1.45, 0.7, -2.35],
    [1.45, 0.7, -2.35],
    [-1.45, 0.7, 2.35],
    [1.45, 0.7, 2.35]
  ];
  for (const [x, y, z] of wheelSpots) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.42, 18), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.43, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(wheel.position);
    car.add(wheel, rim);
    wheels.push(wheel);
  }

  car.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { model: car, wheels };
}

function buildNepalSuperCar() {
  const token = world.buildToken;
  const carRoot = new THREE.Group();
  carRoot.position.set(95, 0, 18);
  carRoot.rotation.y = Math.PI;
  mapGroup.add(carRoot);

  world.nepalCar = {
    group: carRoot,
    wheels: [],
    speed: 0,
    steer: 0,
    yaw: carRoot.rotation.y,
    maxSpeed: 30,
    accel: 26,
    brake: 30,
    drag: 10,
    turnRate: 1.45,
    seatOffset: new THREE.Vector3(0, 1.5, -0.25),
    exitOffset: new THREE.Vector3(2.6, 0, 0),
    modelReady: false
  };

  const fallback = () => {
    if (token !== world.buildToken || !world.nepalCar) return;
    const built = createFallbackSuperCar();
    carRoot.add(built.model);
    world.nepalCar.wheels = built.wheels;
    world.nepalCar.modelReady = true;
    addFeed("Supercar loaded (fallback chassis)", "#ffd38a");
  };

  gltfLoader.load(
    "https://rawcdn.githack.com/mrdoob/three.js/r165/examples/models/gltf/ferrari.glb",
    (gltf) => {
      if (token !== world.buildToken || !world.nepalCar) return;
      const model = gltf.scene;
      model.scale.setScalar(0.0165);
      model.position.y = 0.05;
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      carRoot.add(model);
      world.nepalCar.wheels = [];
      model.traverse((o) => {
        if (!o.isMesh || !o.name) return;
        const n = o.name.toLowerCase();
        if (n.includes("wheel") || n.includes("tire")) {
          world.nepalCar.wheels.push(o);
        }
      });
      world.nepalCar.modelReady = true;
      addFeed("Supercar drop ready. Press F near it to drive.", "#9be0ff");
    },
    undefined,
    () => fallback()
  );
}

function toggleNepalCarDrive() {
  if (world.map !== "nepal" || !world.nepalCar?.group) return;
  const car = world.nepalCar;
  const seatPos = car.group.position.clone().add(car.seatOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw));

  if (player.driving) {
    player.driving = false;
    player.thirdPerson = player.thirdPersonBeforeDrive;
    touchState.driveLeft = false;
    touchState.driveRight = false;
    touchState.driveGas = false;
    touchState.driveBrake = false;
    const exit = car.exitOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw);
    player.pos.copy(car.group.position).add(exit).setY(1.75);
    player.velocity.set(0, 0, 0);
    setDrivingTouchUi(false);
    modeEl.textContent = `${player.thirdPerson ? "Third" : "First"} Person Tactical`;
    addFeed("Exited supercar", "#9be0ff");
    return;
  }

  if (player.pos.distanceTo(seatPos) > 4.6) {
    addFeed("Move closer to the supercar to enter (F)", "#ffd38a");
    return;
  }

  player.driving = true;
  player.thirdPersonBeforeDrive = player.thirdPerson;
  player.thirdPerson = true;
  player.velocity.set(0, 0, 0);
  player.pos.copy(seatPos);
  setDrivingTouchUi(touchState.enabled);
  addFeed("Driving mode engaged", "#9dffb8");
}

function buildNepalWorld() {
  buildNepalGround();
  buildNepalRoadNetwork();
  buildNepalVillage();
  buildNepalCourtyard();
  buildNepalVibes();
  buildHimalayaRange();
  buildLumbiniComplex();
  buildNepalFlagMonument();
  buildNepalMapLogo();
  buildStupaCluster();
  buildNepalPoiMarkers();
  buildNepalCrowdSilhouettes();
  buildNepalSuperCar();
  buildCoverProps();
  buildHeartSymbol(0, -120);
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
  gun.rotation.x = -0.08;
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

function spawnBots(count, levelConfig = null, options = {}) {
  const cfg = levelConfig ?? levelDefs[game.levelIndex] ?? levelDefs[0];
  const {
    clearExisting = true,
    spawnCenter = null,
    spawnRadius = 40,
    patrolCenter = null,
    patrolRadius = 48,
    waveId = null,
    canRespawn = true
  } = options;

  if (clearExisting) {
    world.bots.forEach((b) => scene.remove(b.group));
    world.bots = [];
  }

  const startId = world.bots.length;

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

    const spawnPos = spawnCenter ? randomSpawnAround(spawnCenter, spawnRadius) : randomBotSpawn();
    group.position.copy(spawnPos);
    group.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(group);

    world.bots.push({
      id: startId + i,
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
      patrolTarget: patrolCenter ? randomSpawnAround(patrolCenter, patrolRadius) : randomPatrolTarget(),
      deadTimer: 0,
      canRespawn,
      waveId,
      strafe: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 1 + Math.random() * 2,
      animPhase: Math.random() * Math.PI * 2,
      legL,
      legR,
      armL,
      armR,
      torso,
      chest
    });
  }
}

function setLevel(index) {
  game.levelIndex = index;
  const cfg = levelDefs[Math.min(index, levelDefs.length - 1)];
  game.killsThisLevel = 0;
  game.killsNeeded = cfg.kills;
  const mapBotBoost = world.map === "nepal" ? 1.9 : 1;
  const scaledBots = Math.max(2, Math.round(cfg.botCount * game.botMultiplier * mapBotBoost));
  if (world.map === "nepal") {
    initNepalMission(cfg);
    addFeed("Campaign objective: Himalaya Ridge -> Lumbini -> Flag Plaza", "#9be0ff");
    startNepalWave(cfg, 0);
    world.nepalMission.nextWaveIndex = 1;
  } else {
    spawnBots(scaledBots, cfg);
  }
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
    const mapBotBoost = world.map === "nepal" ? 1.9 : 1;
    const scaledBots = Math.max(3, Math.round((cfg.botCount + 2) * game.botMultiplier * mapBotBoost));
    if (world.map === "nepal") {
      initNepalMission(cfg);
      startNepalWave(cfg, 0);
      world.nepalMission.nextWaveIndex = 1;
    } else {
      spawnBots(scaledBots, cfg);
    }
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
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  if (!hasTouch || !coarsePointer) return false;
  return touchState.force || window.innerWidth < 1100;
}

function isLikelyMobileDevice() {
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const smallViewport = Math.max(window.innerWidth, window.innerHeight) <= 1200;
  return hasTouch && coarsePointer && smallViewport;
}

function applyDevicePresetDefaults() {
  const mobile = isLikelyMobileDevice();
  qualityInput.value = mobile ? "mobile" : "high";
  touchInput.checked = mobile;
  if (!mobile) {
    gyroInput.checked = false;
  }
  resolutionInput.value = mobile ? "0.78" : "0.65";
  resLabel.textContent = `${Number(resolutionInput.value).toFixed(2)}x`;
}

function setDrivingTouchUi(active) {
  touchControls?.classList.toggle("driving", !!active);
  if (driveBtn) {
    driveBtn.textContent = active ? "EXIT" : "DRIVE";
  }
}

function rebuildWorld(mapId, weatherId) {
  world.buildToken += 1;
  clearDynamicEffects();
  clearGroup(envGroup);
  clearGroup(mapGroup);
  world.colliders = [];
  world.pickups = [];
  world.heartParts = [];
  world.dynamicLights = [];
  world.nepalFlags = [];
  world.nepalWheels = [];
  world.nepalFogPatches = [];
  world.nepalMarkers = [];
  world.nepalSilhouettes = [];
  world.nepalCar = null;
  world.bellZones = [];
  world.ambientZones = [];
  world.bellTimer = 0;
  world.ambientTimer = 0;
  world.nepalMission = null;

  world.map = mapId;
  world.weather = weatherId;
  createSkyAndLights(weatherId);

  if (mapId === "outpost") {
    buildOutpostWorld();
    player.spawn.set(0, 1.75, 45);
    world.boundsX = 300;
    world.boundsZ = 320;
    world.botSpawnX = 130;
    world.botSpawnZ = 280;
    world.patrolX = 110;
    world.patrolZ = 240;
    world.pickupX = 150;
    world.pickupZ = 280;
  } else if (mapId === "nepal") {
    buildNepalWorld();
    player.spawn.set(0, 1.75, -80);
    world.boundsX = 620;
    world.boundsZ = 640;
    world.botSpawnX = 360;
    world.botSpawnZ = 520;
    world.patrolX = 330;
    world.patrolZ = 470;
    world.pickupX = 390;
    world.pickupZ = 540;
  } else {
    buildCityWorld();
    player.spawn.set(0, 1.75, 22);
    world.boundsX = 260;
    world.boundsZ = 250;
    world.botSpawnX = 90;
    world.botSpawnZ = 230;
    world.patrolX = 70;
    world.patrolZ = 200;
    world.pickupX = 90;
    world.pickupZ = 220;
  }

  if (mapId === "nepal") {
    const fogBoost = world.weather === "rain" ? 1.1 : 1.18;
    scene.fog.density = world.fogBase * fogBoost;
  }

  updateDynamicLightQuality();

  if (!game.started || game.paused) {
    player.pos.copy(player.spawn);
    player.velocity.set(0, 0, 0);
    player.driving = false;
    player.thirdPersonBeforeDrive = player.thirdPerson;
  }
}

function applyWorldSelection(force = false) {
  const nextWeather = menuWeatherInput?.value ?? world.weather;
  const rawMap = (menuMapInput?.value ?? world.map ?? "city").toLowerCase().trim();
  const nextMap = rawMap === "nepal" || rawMap === "outpost" ? rawMap : "city";
  if (force || nextWeather !== world.weather || nextMap !== world.map || !world.sunLight) {
    rebuildWorld(nextMap, nextWeather);
    const mapLabel = nextMap === "nepal" ? "Nepal Highlands" : nextMap === "outpost" ? "Desert Outpost" : "Heartfall City";
    addFeed(`Map loaded: ${mapLabel}`, "#9be0ff");
  }
}

function applySettings() {
  game.quality = qualityInput.value;
  const p = profiles[game.quality];

  player.sensitivity = Number(sensitivityInput.value);
  touchState.force = touchInput.checked;
  touchState.enabled = shouldUseTouch();

  game.usePost = game.quality !== "mobile";
  game.dynamicScale = game.quality === "mobile" ? 0.9 : 1;
  game.basePixelRatio = clamp(window.devicePixelRatio * p.pixelRatio * Number(resolutionInput.value), 0.7, 2.4);
  renderer.setPixelRatio(game.basePixelRatio * game.dynamicScale);
  renderer.shadowMap.enabled = p.shadows;

  if (world.sunLight) world.sunLight.shadow.mapSize.set(p.shadowMap, p.shadowMap);

  game.ssaoWanted = false;
  ssaoPass.enabled = false;
  bloomPass.enabled = p.bloom && bloomInput.checked && game.usePost;
  smaaPass.enabled = game.usePost;

  game.fxScale = game.quality === "mobile" ? 0.4 : game.quality === "medium" ? 0.7 : 1;
  game.botMultiplier = game.quality === "mobile" ? 0.6 : game.quality === "medium" ? 0.85 : 1;
  const baseFog = world.fogBase ?? 0.006;
  scene.fog.density = game.quality === "mobile" ? baseFog * 1.35 : baseFog;
  updateDynamicLightQuality();

  game.botUpdateStep = game.quality === "mobile" ? 1 / 25 : 1 / 35;
  game.perfMode = "normal";

  if (gyroInput) {
    toggleGyro(gyroInput.checked);
  }

  touchControls.classList.toggle("hidden", !touchState.enabled);
  touchControls.classList.toggle("split", touchState.enabled);
  setDrivingTouchUi(player.driving && touchState.enabled);

  const chosenLevel = Number(difficultyInput?.value ?? game.levelIndex);
  const nextLevel = Number.isFinite(chosenLevel) ? chosenLevel : 0;
  if (!game.started || nextLevel !== game.levelIndex) {
    setLevel(nextLevel);
  }
  applyWorldSelection();
  onResize();
}

function onGyro(e) {
  if (!gyroState.enabled) return;
  const gamma = e.gamma ?? 0;
  const beta = e.beta ?? 0;
  if (!gyroState.hasBase) {
    gyroState.baseGamma = gamma;
    gyroState.baseBeta = beta;
    gyroState.baseAlpha = e.alpha ?? 0;
    gyroState.hasBase = true;
    return;
  }
  const alpha = e.alpha ?? 0;
  const relYaw = normalizeAngle(alpha - (gyroState.baseAlpha ?? alpha));
  const relPitch = beta - gyroState.baseBeta;
  const yaw = clamp(relYaw / 55, -1, 1);
  const pitch = clamp(-relPitch / 28, -1, 1);
  const dz = 0.04;
  const yawOut = Math.abs(yaw) < dz ? 0 : yaw;
  const pitchOut = Math.abs(pitch) < dz ? 0 : pitch;
  gyroState.targetX = yawOut * 1.1;
  gyroState.targetY = pitchOut * 0.9;
}

async function toggleGyro(enable) {
  if (!gyroState.supported) return;
  if (enable) {
    gyroState.hasBase = false;
    gyroState.lookX = 0;
    gyroState.lookY = 0;
    gyroState.targetX = 0;
    gyroState.targetY = 0;
    gyroState.baseAlpha = undefined;
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
  const center = 43;

  function reset() {
    stick.style.left = `${center}px`;
    stick.style.top = `${center}px`;
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
    stick.style.left = `${center + dx}px`;
    stick.style.top = `${center + dy}px`;
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
    if (e.code === "KeyF" && game.started && !game.isDead) {
      toggleNepalCarDrive();
    }
    if (e.code === "KeyM" && game.started) {
      modMenuEl?.classList.toggle("hidden");
    }
    if (e.code === "KeyV" && !player.driving) {
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
    if (!touchState.enabled || game.paused) return;
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
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (!touchState.enabled || game.paused) return;
    e.preventDefault();
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
  }, { passive: false });

  window.addEventListener("touchend", (e) => {
    if (game.paused) return;
    for (const t of e.changedTouches) resetTouchZone(t.identifier);
  });
  window.addEventListener("touchcancel", (e) => {
    if (game.paused) return;
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
    const t = e.changedTouches?.[0];
    if (t) {
      fireTouch.id = t.identifier;
      fireTouch.x = t.clientX;
      fireTouch.y = t.clientY;
    }
    touchState.firing = true;
  }, { passive: false });

  shootBtn.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (fireTouch.id !== null && t.identifier === fireTouch.id) {
        const dx = clamp((t.clientX - fireTouch.x) / 56, -1, 1);
        const dy = clamp((fireTouch.y - t.clientY) / 56, -1, 1);
        touchState.lookX = dx;
        touchState.lookY = dy;
        fireTouch.x = t.clientX;
        fireTouch.y = t.clientY;
        break;
      }
    }
  }, { passive: false });

  shootBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === fireTouch.id) {
        fireTouch.id = null;
        break;
      }
    }
    touchState.firing = false;
  }, { passive: false });
  shootBtn.addEventListener("touchcancel", () => {
    fireTouch.id = null;
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

  driveBtn?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.started && !game.isDead) {
      toggleNepalCarDrive();
    }
  }, { passive: false });

  driveBtn?.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (game.started && !game.isDead) {
      toggleNepalCarDrive();
    }
  });

  function bindCarHoldButton(el, prop) {
    if (!el) return;
    const on = (e) => {
      e.preventDefault();
      touchState[prop] = true;
    };
    const off = (e) => {
      e.preventDefault();
      touchState[prop] = false;
    };
    el.addEventListener("touchstart", on, { passive: false });
    el.addEventListener("touchend", off, { passive: false });
    el.addEventListener("touchcancel", off, { passive: false });
    el.addEventListener("mousedown", on);
    el.addEventListener("mouseup", off);
    el.addEventListener("mouseleave", off);
  }

  bindCarHoldButton(carLeftBtn, "driveLeft");
  bindCarHoldButton(carRightBtn, "driveRight");
  bindCarHoldButton(carGasBtn, "driveGas");
  bindCarHoldButton(carBrakeBtn, "driveBrake");

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
  menuMapInput?.addEventListener("change", () => {
    if (!game.started) {
      applyWorldSelection(true);
    }
  });

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
    ensureAudioContext();
    world.audioCtx?.resume?.();
    applyWorldSelection(true);
    game.started = true;
    game.paused = false;
    game.playerScore = 0;
    game.botScore = 0;
    const chosenLevel = Number(difficultyInput?.value ?? 0);
    setLevel(Number.isFinite(chosenLevel) ? chosenLevel : 0);
    setPanel(menuPanel, false);
    modToggleBtn?.classList.remove("hidden");
    modMenuEl?.classList.add("hidden");
    if (!touchState.enabled) canvas.requestPointerLock();
    if (screen.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
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

  modToggleBtn?.addEventListener("click", () => {
    modMenuEl?.classList.toggle("hidden");
  });

  modGodInput?.addEventListener("change", () => {
    mods.godMode = !!modGodInput.checked;
    if (mods.godMode) {
      player.health = 100;
      player.armor = 100;
    }
    addFeed(mods.godMode ? "Mod: Unlimited Health ON" : "Mod: Unlimited Health OFF", "#8fe6ff");
  });

  modAmmoInput?.addEventListener("change", () => {
    mods.infiniteAmmo = !!modAmmoInput.checked;
    if (mods.infiniteAmmo) {
      player.ammoClip = 30;
      player.ammoReserve = 180;
    }
    addFeed(mods.infiniteAmmo ? "Mod: Unlimited Ammo ON" : "Mod: Unlimited Ammo OFF", "#8fe6ff");
  });

  modFreezeInput?.addEventListener("change", () => {
    mods.freezeBots = !!modFreezeInput.checked;
    addFeed(mods.freezeBots ? "Mod: Freeze Bots ON" : "Mod: Freeze Bots OFF", "#8fe6ff");
  });
}

function tryReload() {
  if (mods.infiniteAmmo) {
    player.ammoClip = 30;
    player.ammoReserve = 180;
    return;
  }
  if (player.reloadTimer > 0) return;
  if (player.ammoClip >= 30 || player.ammoReserve <= 0) return;
  player.reloadTimer = 1.85;
  addFeed("Reloading...", "#9fd9ff");
}

function completeReload() {
  if (mods.infiniteAmmo) {
    player.ammoClip = 30;
    player.ammoReserve = 180;
    return;
  }
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

    if (world.map === "nepal" && world.nepalMission && world.nepalMission.activeWaveIndex >= 0) {
      const activeWave = world.nepalMission.waves[world.nepalMission.activeWaveIndex];
      if (activeWave && bot.waveId === activeWave.id) {
        world.nepalMission.killsInWave += 1;
        const left = world.nepalMission.requiredInWave - world.nepalMission.killsInWave;
        if (left === 3 || left === 1) {
          addFeed(`${activeWave.name}: ${left} hostile${left === 1 ? "" : "s"} left`, "#ffd38a");
        }
        if (world.nepalMission.killsInWave >= world.nepalMission.requiredInWave) {
          addFeed(`${activeWave.name} cleared`, "#9dffb8");
          world.nepalMission.activeWaveIndex = -1;
          world.nepalMission.nextWaveIndex += 1;
          world.nepalMission.intermission = 3.2;
        }
      }
    }

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
  if (game.spawnProtection > 0 || mods.godMode) return;

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

  if (!mods.infiniteAmmo) player.ammoClip -= 1;
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
    const expanded = tmpCollisionBox.copy(box).expandByScalar(radius);
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
    const hit = ray.intersectBox(box, tmpRayHit);
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

  if (mods.godMode) {
    player.health = 100;
    player.armor = Math.max(player.armor, 100);
  }
  if (mods.infiniteAmmo) {
    player.ammoClip = 30;
    player.ammoReserve = 180;
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
    moveZ -= my;
    lookX += touchState.lookX * 2.1;
    lookY -= touchState.lookY * 2.1;
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
    const viewPressed = !!gp.buttons[4]?.pressed;
    if (viewPressed && !gamepadState.viewHeld) {
      player.thirdPerson = !player.thirdPerson;
    }
    gamepadState.viewHeld = viewPressed;
    modeEl.textContent = `${player.thirdPerson ? "Third" : "First"} Person + Controller`;
  } else {
    gamepadState.viewHeld = false;
    modeEl.textContent = `${player.thirdPerson ? "Third" : "First"} Person Tactical`;
  }

  if (gyroState.enabled) {
    gyroState.lookX = lerp(gyroState.lookX, gyroState.targetX, 0.35);
    gyroState.lookY = lerp(gyroState.lookY, gyroState.targetY, 0.35);
    lookX += gyroState.lookX;
    lookY += gyroState.lookY;
  }

  player.yaw -= (mouseDelta.x * 0.001 + lookX * 0.048) * player.sensitivity;
  player.pitch -= (mouseDelta.y * 0.001 + lookY * 0.032) * player.sensitivity;
  player.pitch = clamp(player.pitch, -1.18, 1.12);
  mouseDelta.x = 0;
  mouseDelta.y = 0;

  if (player.driving && (!world.nepalCar?.group || world.map !== "nepal")) {
    player.driving = false;
    setDrivingTouchUi(false);
  }

  if (player.driving && world.nepalCar?.group) {
    const car = world.nepalCar;
    const touchThrottle = (touchState.driveGas ? 1 : 0) - (touchState.driveBrake ? 1 : 0);
    const touchSteer = (touchState.driveLeft ? 1 : 0) - (touchState.driveRight ? 1 : 0);
    const throttle = clamp(-moveZ + touchThrottle, -1, 1);
    const steerInput = clamp(-moveX + touchSteer, -1, 1);
    const targetSpeed = throttle * car.maxSpeed;
    const accel = Math.abs(targetSpeed) > Math.abs(car.speed) ? car.accel : car.brake;
    car.speed = lerp(car.speed, targetSpeed, clamp(dt * accel * 0.12, 0, 1));
    if (Math.abs(throttle) < 0.05) {
      car.speed = lerp(car.speed, 0, clamp(dt * car.drag * 0.1, 0, 1));
    }

    car.steer = lerp(car.steer, steerInput, clamp(dt * 8, 0, 1));
    const speedFactor = clamp(Math.abs(car.speed) / car.maxSpeed, 0.18, 1);
    car.yaw += car.steer * car.turnRate * speedFactor * dt * (car.speed >= 0 ? 1 : -1);

    const driveDir = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
    car.group.position.addScaledVector(driveDir, car.speed * dt);
    car.group.position.x = clamp(car.group.position.x, -world.boundsX + 5, world.boundsX - 5);
    car.group.position.z = clamp(car.group.position.z, -world.boundsZ + 5, world.boundsZ - 5);
    car.group.rotation.y = car.yaw;

    const wheelSpin = (car.speed * dt) / 0.55;
    for (const w of car.wheels) {
      w.rotation.x -= wheelSpin;
    }

    const seat = car.seatOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw);
    player.pos.copy(car.group.position).add(seat);
    player.velocity.set(0, 0, 0);
    player.grounded = true;
    modeEl.textContent = "Vehicle Mode: Supercar";
    setDrivingTouchUi(touchState.enabled);

    if (keys.reload) keys.reload = false;
    player.weaponCooldown = Math.max(0, player.weaponCooldown - dt);
    player.recoil = Math.max(0, player.recoil - dt * 3);
    return;
  }

  const speed = keys.sprint ? player.sprintSpeed : player.moveSpeed;
  const local = new THREE.Vector3(moveX, 0, moveZ);
  if (local.lengthSq() > 1) local.normalize();

  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
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

  if (!player.driving && shoot && (touchState.enabled || game.pointerLocked || gp)) performShoot();

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

  player.pos.x = clamp(player.pos.x, -world.boundsX, world.boundsX);
  player.pos.z = clamp(player.pos.z, -world.boundsZ, world.boundsZ);

  player.body.position.copy(player.pos);
  player.body.rotation.y = player.yaw;

  const pickupTime = performance.now() * 0.001;
  for (const pu of world.pickups) {
    pu.object.rotation.y += dt * pu.spin;
    pu.object.position.y = 1.45 + Math.sin(pickupTime * 1.4) * 0.18;
    if (pu.object.position.distanceTo(player.pos) < 2.6) {
      if (pu.type === "health") player.health = clamp(player.health + pu.amount, 0, 100);
      if (pu.type === "armor") player.armor = clamp(player.armor + pu.amount, 0, 100);
      if (pu.type === "ammo") player.ammoReserve = clamp(player.ammoReserve + pu.amount, 0, 180);
      addFeed(`${pu.type.toUpperCase()} +${pu.amount}`, "#9cedbf");
      pu.object.position.set(randCentered(world.pickupX), 1.45, randCentered(world.pickupZ));
    }
  }
}

function updateBots(dt) {
  if (mods.freezeBots) {
    for (const bot of world.bots) {
      if (bot.hp <= 0) continue;
      bot.legL.rotation.x *= 0.86;
      bot.legR.rotation.x *= 0.86;
      bot.armL.rotation.x *= 0.86;
      bot.armR.rotation.x *= 0.86;
      bot.chest.rotation.z *= 0.86;
      bot.torso.rotation.z *= 0.86;
    }
    return;
  }

  game.botLodTick += 1;
  for (const bot of world.bots) {
    if (bot.hp <= 0) {
      bot.deadTimer -= dt;
      if (bot.deadTimer <= 0) {
        if (!bot.canRespawn) continue;
        bot.hp = bot.hpMax ?? 100;
        bot.armor = 20;
        bot.group.visible = true;
        bot.group.position.copy(randomBotSpawn());
      }
      continue;
    }

    const botEye = bot.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const playerHead = player.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
    const toPlayer = playerHead.clone().sub(botEye);
    const distance = toPlayer.length();

    const lodStep = distance > 72 ? 3 : distance > 42 ? 2 : 1;
    if ((game.botLodTick + bot.id) % lodStep !== 0) {
      bot.animPhase += dt * 2.1;
      bot.legL.rotation.x *= 0.9;
      bot.legR.rotation.x *= 0.9;
      bot.armL.rotation.x *= 0.9;
      bot.armR.rotation.x *= 0.9;
      bot.chest.rotation.z *= 0.9;
      bot.torso.rotation.z *= 0.9;
      continue;
    }

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
      const movingNow = move.lengthSq() > 0.0001;

      const p = bot.group.position.clone().add(move);
      p.y = 1.5;
      if (!isColliding(p, 0.52)) {
        bot.group.position.x = p.x;
        bot.group.position.z = p.z;
      }

      bot.animPhase += dt * (movingNow ? 9.5 : 3.2);
      const step = Math.sin(bot.animPhase);
      const stepAmp = movingNow ? 0.65 : 0.18;
      bot.legL.rotation.x = step * stepAmp;
      bot.legR.rotation.x = -step * stepAmp;
      bot.armL.rotation.x = -step * stepAmp * 0.82;
      bot.armR.rotation.x = step * stepAmp * 0.82;
      bot.chest.rotation.z = step * 0.06;
      bot.torso.rotation.z = step * 0.04;

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
        bot.patrolTarget.copy(randomPatrolTarget());
      } else {
        const move = toPatrol.normalize().multiplyScalar(bot.speed * 0.45 * dt);
        const movingNow = move.lengthSq() > 0.0001;
        const p = bot.group.position.clone().add(move);
        p.y = 1.5;
        if (!isColliding(p, 0.52)) {
          bot.group.position.x = p.x;
          bot.group.position.z = p.z;
        }

        bot.animPhase += dt * (movingNow ? 7.8 : 2.6);
        const step = Math.sin(bot.animPhase);
        const stepAmp = movingNow ? 0.48 : 0.14;
        bot.legL.rotation.x = step * stepAmp;
        bot.legR.rotation.x = -step * stepAmp;
        bot.armL.rotation.x = -step * stepAmp * 0.72;
        bot.armR.rotation.x = step * stepAmp * 0.72;
        bot.chest.rotation.z = step * 0.05;
        bot.torso.rotation.z = step * 0.035;

        bot.group.lookAt(bot.patrolTarget.x, bot.group.position.y, bot.patrolTarget.z);
      }

      if (toPatrol.length() < 2) {
        bot.legL.rotation.x *= 0.8;
        bot.legR.rotation.x *= 0.8;
        bot.armL.rotation.x *= 0.8;
        bot.armR.rotation.x *= 0.8;
      }
    }
  }
}

function updateCamera(dt) {
  if (player.driving && world.nepalCar?.group) {
    const car = world.nepalCar;
    const follow = new THREE.Vector3(0, 3.2, 8.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.yaw + Math.PI);
    const desired = car.group.position.clone().add(follow);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 7.5));
    const lookAt = car.group.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    camera.lookAt(lookAt);
    player.body.visible = false;
    return;
  }

  const look = player.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
  if (player.thirdPerson) {
    const offset = new THREE.Vector3(0.6, 1.85, 4.6);
    offset.applyEuler(new THREE.Euler(player.pitch * 0.38, player.yaw + Math.PI, 0, "YXZ"));
    const desired = player.pos.clone().add(offset);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
    camera.lookAt(look);
    player.body.visible = true;

    if (player.gun) {
      const t = 1 - Math.exp(-dt * 14);
      player.gun.position.x = lerp(player.gun.position.x, 0.42, t);
      player.gun.position.y = lerp(player.gun.position.y, 1.05, t);
      player.gun.rotation.x = lerp(player.gun.rotation.x, -0.08, t);
      player.gun.rotation.y = lerp(player.gun.rotation.y, 0, t);
    }
  } else {
    const eye = player.pos.clone().add(new THREE.Vector3(0, 0.62, 0));
    camera.position.lerp(eye, 1 - Math.exp(-dt * 22));
    camera.rotation.set(player.pitch + player.recoil * 0.022, player.yaw, 0, "YXZ");
    player.body.visible = false;

    if (player.gun) {
      const moveMag = Math.hypot(player.velocity.x, player.velocity.z);
      const bobWeight = clamp(moveMag / player.sprintSpeed, 0, 1) * (player.grounded ? 1 : 0.25);
      player.step += dt * (keys.sprint ? 12.5 : 8.8) * (moveMag > 0.2 ? 1 : 0.3);
      const bobX = Math.sin(player.step) * 0.015 * bobWeight;
      const bobY = Math.abs(Math.cos(player.step * 2.0)) * 0.018 * bobWeight;
      const recoilKick = player.recoil * 0.03;
      const t = 1 - Math.exp(-dt * 18);
      player.gun.position.x = lerp(player.gun.position.x, 0.42 + bobX, t);
      player.gun.position.y = lerp(player.gun.position.y, 1.05 + bobY - recoilKick, t);
      player.gun.rotation.x = lerp(player.gun.rotation.x, -0.08 - player.recoil * 0.06 + bobY * 0.8, t);
      player.gun.rotation.y = lerp(player.gun.rotation.y, bobX * 2.4, t);
    }
  }
}

function updateVFX(dt) {
  const t = performance.now() * 0.001;

  if (world.map === "nepal") {
    if (world.sunLight && world.skyMesh?.material?.uniforms) {
      const cycle = t * 0.05;
      const sunY = 86 + Math.sin(cycle) * 20;
      const sunX = 62 + Math.cos(cycle) * 16;
      world.sunLight.position.set(sunX, sunY, 44);

      const dayLerp = 0.5 + Math.sin(cycle) * 0.5;
      world.sunLight.intensity = lerp(1.55, 2.55, dayLerp);
      const top = new THREE.Color(0x5f8fcb).lerp(new THREE.Color(0xf2aa64), 1 - dayLerp);
      const bottom = new THREE.Color(0xe0edf9).lerp(new THREE.Color(0xf6d3a9), 1 - dayLerp);
      world.skyMesh.material.uniforms.topColor.value.copy(top);
      world.skyMesh.material.uniforms.bottomColor.value.copy(bottom);
    }

    for (const f of world.nepalFlags) {
      const sway = Math.sin(t * 3.2 + f.phase) * 0.22;
      f.flag.rotation.y = 0.35 + sway;
      f.flag.position.y = f.baseY + Math.sin(t * 2.4 + f.phase) * 0.1;
      f.flag.position.z = f.baseZ + Math.cos(t * 1.9 + f.phase) * 0.08;
    }

    for (const w of world.nepalWheels) {
      w.wheel.rotation.x = w.baseRot + Math.sin(t * 2.2 + w.phase) * 0.08;
      w.wheel.rotation.y += dt * 0.8;
    }

    for (const fp of world.nepalFogPatches) {
      fp.fogPatch.position.x = fp.baseX + Math.sin(t * 0.15 + fp.phase) * 6;
      fp.fogPatch.position.z = fp.baseZ + Math.cos(t * 0.15 + fp.phase) * 5;
      fp.fogPatch.material.opacity = 0.024 + Math.sin(t * 0.6 + fp.phase) * 0.01;
    }

    for (const marker of world.nepalMarkers) {
      marker.quaternion.copy(camera.quaternion);
    }

    for (const s of world.nepalSilhouettes) {
      s.group.position.y = s.baseY + Math.sin(t * 1.6 + s.phase) * 0.06;
      s.group.rotation.y += dt * 0.08;
    }

    if (game.started && !game.paused && !game.isDead) {
      world.bellTimer += dt;
      world.ambientTimer += dt;
      if (world.bellTimer > 4.6) {
        world.bellTimer = 0;
        let best = null;
        for (const zone of world.bellZones) {
          const d = zone.position.distanceTo(player.pos);
          if (d < zone.radius) {
            const intensity = clamp(1 - d / zone.radius, 0.15, 1);
            if (!best || intensity > best.intensity) best = { intensity };
          }
        }
        if (best) playTempleBell(best.intensity);
      }

      if (world.ambientTimer > 3.2) {
        world.ambientTimer = 0;
        let bestZone = null;
        for (const zone of world.ambientZones) {
          const d = zone.position.distanceTo(player.pos);
          if (d < zone.radius) {
            const intensity = clamp(1 - d / zone.radius, 0.15, 1);
            if (!bestZone || intensity > bestZone.intensity) {
              bestZone = { type: zone.type, intensity };
            }
          }
        }
        if (bestZone) {
          if (bestZone.type === "chant") playAmbientChant(bestZone.intensity);
          if (bestZone.type === "drum") playAmbientDrum(bestZone.intensity);
        }
      }
    }
  }

  if (world.weatherFx?.type === "rain") {
    const fx = world.weatherFx;
    const arr = fx.points.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= fx.speed * dt;
      if (arr[i + 1] < 0.4) {
        arr[i] = (Math.random() - 0.5) * fx.area;
        arr[i + 1] = 6 + Math.random() * fx.height;
        arr[i + 2] = (Math.random() - 0.5) * fx.area;
      }
    }
    fx.points.geometry.attributes.position.needsUpdate = true;
  }

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

  const levelCfg = levelDefs[Math.min(game.levelIndex, levelDefs.length - 1)] ?? levelDefs[0];
  updateNepalMission(dt, levelCfg);

  game.roundTime -= dt;
  if (game.roundTime <= 0) {
    game.roundTime = game.maxRoundTime;
    addFeed("Round reset. New engagement.", "#ffdc96");
    if (world.map === "nepal") {
      initNepalMission(levelCfg);
      startNepalWave(levelCfg, 0);
      world.nepalMission.nextWaveIndex = 1;
    } else {
      world.bots.forEach((bot) => {
        bot.hp = bot.hpMax ?? 100;
        bot.armor = 20;
        bot.group.visible = true;
        bot.group.position.copy(randomBotSpawn());
      });
    }
  }

  const mins = Math.floor(game.roundTime / 60).toString().padStart(2, "0");
  const secs = Math.floor(game.roundTime % 60).toString().padStart(2, "0");
  timerEl.textContent = `${mins}:${secs}`;
  scoreEl.textContent = `YOU ${game.playerScore} : ${game.botScore} BOTS`;
  hpEl.textContent = Math.ceil(player.health).toString();
  armorEl.textContent = Math.ceil(player.armor).toString();
  ammoEl.textContent = `${player.ammoClip} / ${player.ammoReserve}`;
  if (levelInfoEl) {
    const cfg = levelCfg;
    if (world.map === "nepal" && world.nepalMission) {
      const activeWave = world.nepalMission.activeWaveIndex >= 0 ? world.nepalMission.waves[world.nepalMission.activeWaveIndex] : null;
      if (activeWave) {
        levelInfoEl.textContent = `${activeWave.name.toUpperCase()} (${world.nepalMission.killsInWave}/${world.nepalMission.requiredInWave})`;
      } else if (!world.nepalMission.complete) {
        levelInfoEl.textContent = "REDEPLOY WINDOW - NEXT WAVE INBOUND";
      } else {
        levelInfoEl.textContent = `LEVEL ${game.levelIndex + 1} / ${cfg.name.toUpperCase()} (${game.killsThisLevel}/${game.killsNeeded})`;
      }
    } else {
      levelInfoEl.textContent = `LEVEL ${game.levelIndex + 1} / ${cfg.name.toUpperCase()} (${game.killsThisLevel}/${game.killsNeeded})`;
    }
  }
  if (levelProgressFillEl) {
    let pct = Math.min(1, game.killsThisLevel / Math.max(1, game.killsNeeded));
    if (world.map === "nepal" && world.nepalMission && world.nepalMission.activeWaveIndex >= 0) {
      pct = Math.min(1, world.nepalMission.killsInWave / Math.max(1, world.nepalMission.requiredInWave));
    }
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
  updateOrientationHint();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  game.fpsAvg = lerp(game.fpsAvg, 1 / Math.max(0.001, dt), 0.05);
  game.perfTimer += dt;
  if (game.perfTimer > 0.6 && game.quality === "mobile") {
    game.perfTimer = 0;
    if (game.fpsAvg < 52 && game.dynamicScale > 0.8) {
      game.dynamicScale = Math.max(0.8, game.dynamicScale - 0.04);
      renderer.setPixelRatio(game.basePixelRatio * game.dynamicScale);
      if (game.perfMode === "normal" && game.fpsAvg < 45) {
        ssaoPass.enabled = false;
        bloomPass.enabled = false;
        smaaPass.enabled = false;
        renderer.shadowMap.enabled = false;
        game.perfMode = "low";
      }
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
    game.botUpdateAcc += dt;
    if (!game.isDead && game.botUpdateAcc >= game.botUpdateStep) {
      updateBots(game.botUpdateAcc);
      game.botUpdateAcc = 0;
    }
    updateCamera(dt);
    updateVFX(dt);
    updateRound(dt);
  } else {
    keys.fire = false;
    touchState.firing = false;
  }

  if (game.usePost) {
    ssaoPass.enabled = false;
  }

  if (game.usePost) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function init() {
  applyDevicePresetDefaults();
  applyWorldSelection(true);
  createPlayerBody();
  setupInput();
  setupUI();
  applySettings();
  onResize();
  setHealthBars();
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", updateOrientationHint);
  updateOrientationHint();

  gsap.fromTo(".brand h1", { opacity: 0, y: -22, letterSpacing: "8px" }, { opacity: 1, y: 0, letterSpacing: "3px", duration: 1.1, ease: "power2.out" });
  gsap.fromTo(".brand p", { opacity: 0 }, { opacity: 0.8, duration: 0.8, delay: 0.5 });

  addFeed("A broken heart became your battlefield. - Sakshyam", "#f09a9d");
  if (window.location.protocol === "file:") {
    addFeed("Open via http://localhost:5500 (file:// won't run module assets reliably)", "#ffad7a");
  }

  animate();
}

init();
