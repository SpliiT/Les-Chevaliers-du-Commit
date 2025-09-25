// =============================================
// Variables globales pour le labyrinthe 3D
// =============================================
let scene, camera, renderer;
let maze3D = [];
let mazeSize3D = 21;
let arthurMesh, treasureMesh;
let arthurPosition3D = { x: 1, z: 1 };
let targetPosition3D = { x: 1, z: 1 };
let solutionPath3D = [];
let viewMode = "topdown";
let wallMeshes = [];
let pathMeshes = [];
let solutionMeshes = [];
let treasureGroup;
let directionalLight, ambientLight;

// Variables pour contrôles fluides
let keys = {};
let isMoving = false;
let moveSpeed = 0.25; // Vitesse très augmentée
let cameraRotation = { x: 0, y: 0 };
let isMouseLocked = false;

// =============================================
// Initialisation du labyrinthe 3D
// =============================================
function initMaze3D() {
  const container = document.getElementById("maze3d-container");
  if (!container) {
    console.error("Container maze3d-container non trouvé");
    return;
  }

  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    setTimeout(() => initMaze3D(), 100);
    return;
  }

  // Créer la scène
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.Fog(0x0a0a0a, 5, 35);

  // Créer la caméra avec FOV adaptée
  const aspect = container.offsetWidth / container.offsetHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

  // Créer le renderer
  const canvas = document.getElementById("maze3d-canvas") || createCanvas();
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0a0a0a, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Éclairage
  setupLighting();

  // Générer le labyrinthe initial
  generateMaze3D();

  // Configurer la vue par défaut
  setViewMode("topdown");

  // Gestionnaires d'événements
  setupEventListeners();

  console.log("Labyrinthe 3D initialisé");
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.id = "maze3d-canvas";
  const container = document.getElementById("maze3d-container");
  container.appendChild(canvas);
  return canvas;
}

// =============================================
// Configuration de l'éclairage luxueux
// =============================================
function setupLighting() {
  // Lumière ambiante dorée subtile
  ambientLight = new THREE.AmbientLight(0xffd700, 0.15);
  scene.add(ambientLight);

  // Lumière directionnelle principale (blanche)
  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(30, 40, 20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -25;
  directionalLight.shadow.camera.right = 25;
  directionalLight.shadow.camera.top = 25;
  directionalLight.shadow.camera.bottom = -25;
  directionalLight.shadow.bias = -0.0001;
  scene.add(directionalLight);

  // Lumières d'accentuation dorées
  const goldLight1 = new THREE.PointLight(0xffd700, 0.3, 20);
  goldLight1.position.set(-8, 8, -8);
  scene.add(goldLight1);

  const goldLight2 = new THREE.PointLight(0xffd700, 0.3, 20);
  goldLight2.position.set(8, 8, 8);
  scene.add(goldLight2);
}

// =============================================
// Construction du labyrinthe 3D luxueux
// =============================================
function buildMaze3D() {
  if (!scene) {
    console.error("Scene not initialized");
    return;
  }

  // Matériaux luxueux
  const wallMaterial = new THREE.MeshPhongMaterial({
    color: 0x1a1a1a,
    shininess: 30,
    specular: 0x444444,
  });

  const pathMaterial = new THREE.MeshPhongMaterial({
    color: 0xf5f5f5,
    shininess: 100,
    specular: 0xffffff,
  });

  const wallGeometry = new THREE.BoxGeometry(1, 2.5, 1);
  const pathGeometry = new THREE.BoxGeometry(1, 0.05, 1);

  for (let i = 0; i < mazeSize3D; i++) {
    for (let j = 0; j < mazeSize3D; j++) {
      // Sol blanc luxueux
      const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
      pathMesh.position.set(i - mazeSize3D / 2, 0, j - mazeSize3D / 2);
      pathMesh.receiveShadow = true;
      scene.add(pathMesh);
      pathMeshes.push(pathMesh);

      // Murs noirs luxueux
      if (maze3D[i][j] === 1) {
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.set(i - mazeSize3D / 2, 1.25, j - mazeSize3D / 2);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);
        wallMeshes.push(wallMesh);
      }
    }
  }
}

// =============================================
// Création d'Arthur luxueux
// =============================================
function createArthur() {
  if (arthurMesh) {
    scene.remove(arthurMesh);
  }

  arthurMesh = new THREE.Group();

  // Corps doré
  const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1.4, 12);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd700,
    shininess: 100,
    specular: 0xffffff,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.7;
  body.castShadow = true;
  arthurMesh.add(body);

  // Tête blanche
  const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
  const headMaterial = new THREE.MeshPhongMaterial({
    color: 0xf5f5f5,
    shininess: 80,
    specular: 0xcccccc,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.6;
  head.castShadow = true;
  arthurMesh.add(head);

  // Couronne dorée
  const crownGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 8);
  const crownMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd700,
    shininess: 150,
    specular: 0xffffff,
    emissive: 0x111100,
  });
  const crown = new THREE.Mesh(crownGeometry, crownMaterial);
  crown.position.y = 1.95;
  crown.castShadow = true;
  arthurMesh.add(crown);

  scene.add(arthurMesh);
  updateArthurPosition();
}

// =============================================
// Création du trésor luxueux
// =============================================
function createTreasure() {
  if (treasureGroup) {
    scene.remove(treasureGroup);
  }

  treasureGroup = new THREE.Group();

  // Coffre noir luxueux
  const chestGeometry = new THREE.BoxGeometry(0.7, 0.4, 0.5);
  const chestMaterial = new THREE.MeshPhongMaterial({
    color: 0x1a1a1a,
    shininess: 80,
    specular: 0x666666,
  });
  const chest = new THREE.Mesh(chestGeometry, chestMaterial);
  chest.position.y = 0.2;
  chest.castShadow = true;
  treasureGroup.add(chest);

  // Couvercle avec bordures dorées
  const lidGeometry = new THREE.BoxGeometry(0.7, 0.08, 0.5);
  const lidMaterial = new THREE.MeshPhongMaterial({
    color: 0x2a2a2a,
    shininess: 100,
    specular: 0x888888,
  });
  const lid = new THREE.Mesh(lidGeometry, lidMaterial);
  lid.position.y = 0.44;
  lid.castShadow = true;
  treasureGroup.add(lid);

  // Bordures dorées
  const borderGeometry = new THREE.BoxGeometry(0.72, 0.1, 0.52);
  const borderMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd700,
    shininess: 150,
    specular: 0xffffff,
    emissive: 0x221100,
  });
  const border = new THREE.Mesh(borderGeometry, borderMaterial);
  border.position.y = 0.48;
  border.castShadow = true;
  treasureGroup.add(border);

  // Particules dorées flottantes
  for (let i = 0; i < 12; i++) {
    const gemGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const gemMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      shininess: 200,
      specular: 0xffffff,
      emissive: 0xffd700,
      transparent: true,
      opacity: 0.9,
    });
    const gem = new THREE.Mesh(gemGeometry, gemMaterial);
    const angle = (i / 12) * Math.PI * 2;
    gem.position.set(
      Math.cos(angle) * 1.0,
      0.6 + Math.sin(angle * 3) * 0.15,
      Math.sin(angle) * 1.0
    );
    treasureGroup.add(gem);
  }

  const treasureX = mazeSize3D - 2;
  const treasureZ = mazeSize3D - 2;
  treasureGroup.position.set(
    treasureX - mazeSize3D / 2,
    0,
    treasureZ - mazeSize3D / 2
  );

  scene.add(treasureGroup);
}

// =============================================
// Gestion des modes de vue
// =============================================
function setViewMode(mode) {
  viewMode = mode;
  cameraRotation = { x: 0, y: 0 };

  const canvas = document.getElementById("maze3d-canvas");
  const fpsInstructions = document.querySelector(".fps-instructions");
  const viewIndicator = document.querySelector(".view-indicator");

  // Mettre à jour l'indicateur de vue
  if (viewIndicator) {
    viewIndicator.textContent = mode.toUpperCase().replace("PERSON", " PERSON");
  }

  if (mode === "firstperson") {
    camera.fov = 90;
    if (canvas) {
      canvas.style.cursor = "none";
      canvas.addEventListener("click", lockPointer);
    }
    if (fpsInstructions) {
      fpsInstructions.classList.add("visible");
    }
  } else {
    camera.fov = mode === "topdown" ? 45 : 65;
    if (canvas) {
      canvas.style.cursor = "default";
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    }
    if (fpsInstructions) {
      fpsInstructions.classList.remove("visible");
    }
  }

  camera.updateProjectionMatrix();
  updateCameraForViewMode();

  // Mettre à jour les boutons actifs
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.view === mode) {
      btn.classList.add("active");
    }
  });
}

// =============================================
// Mise à jour de la caméra selon le mode
// =============================================
function updateCameraForViewMode() {
  if (!camera || !arthurMesh) return;

  const arthurPos = arthurMesh.position;

  switch (viewMode) {
    case "topdown":
      camera.position.set(0, 22, 2);
      camera.lookAt(0, 0, 0);
      break;

    case "thirdperson":
      camera.position.set(arthurPos.x - 3, arthurPos.y + 4, arthurPos.z + 3);
      camera.lookAt(arthurPos.x, arthurPos.y + 1, arthurPos.z);
      break;

    case "firstperson":
      camera.position.set(arthurPos.x, arthurPos.y + 1.6, arthurPos.z);
      camera.rotation.set(cameraRotation.x, cameraRotation.y, 0);
      break;
  }
}

// =============================================
// Système de mouvement fluide et rapide
// =============================================
function updateMovement() {
  if (isMoving) return;

  let direction = null;

  if (keys["KeyW"] || keys["KeyZ"] || keys["ArrowUp"]) {
    direction = "forward";
  } else if (keys["KeyS"] || keys["ArrowDown"]) {
    direction = "backward";
  } else if (keys["KeyA"] || keys["KeyQ"] || keys["ArrowLeft"]) {
    direction = "left";
  } else if (keys["KeyD"] || keys["ArrowRight"]) {
    direction = "right";
  }

  if (direction) {
    startMovement(direction);
  }
}

function startMovement(direction) {
  if (isMoving) return;

  let newX = arthurPosition3D.x;
  let newZ = arthurPosition3D.z;

  if (viewMode === "firstperson") {
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

    switch (direction) {
      case "forward":
        newX += Math.round(forward.x);
        newZ += Math.round(forward.z);
        break;
      case "backward":
        newX -= Math.round(forward.x);
        newZ -= Math.round(forward.z);
        break;
      case "left":
        newX -= Math.round(right.x);
        newZ -= Math.round(right.z);
        break;
      case "right":
        newX += Math.round(right.x);
        newZ += Math.round(right.z);
        break;
    }
  } else {
    switch (direction) {
      case "forward":
        newZ--;
        break;
      case "backward":
        newZ++;
        break;
      case "left":
        newX--;
        break;
      case "right":
        newX++;
        break;
    }
  }

  if (
    newX >= 0 &&
    newX < mazeSize3D &&
    newZ >= 0 &&
    newZ < mazeSize3D &&
    maze3D[newX][newZ] === 0
  ) {
    isMoving = true;
    targetPosition3D = { x: newX, z: newZ };
    animateMovement();
  }
}

function animateMovement() {
  if (!arthurMesh || !isMoving) return;

  const currentPos = arthurMesh.position;
  const targetWorldPos = {
    x: targetPosition3D.x - mazeSize3D / 2,
    z: targetPosition3D.z - mazeSize3D / 2,
  };

  const deltaX = targetWorldPos.x - currentPos.x;
  const deltaZ = targetWorldPos.z - currentPos.z;

  if (Math.abs(deltaX) < 0.02 && Math.abs(deltaZ) < 0.02) {
    arthurPosition3D = { x: targetPosition3D.x, z: targetPosition3D.z };
    arthurMesh.position.x = targetWorldPos.x;
    arthurMesh.position.z = targetWorldPos.z;
    isMoving = false;
    updateCameraForViewMode();
    checkVictory();
    return;
  }

  arthurMesh.position.x += deltaX * moveSpeed;
  arthurMesh.position.z += deltaZ * moveSpeed;

  updateCameraForViewMode();
  requestAnimationFrame(animateMovement);
}

// =============================================
// Gestionnaires d'événements
// =============================================
function setupEventListeners() {
  window.addEventListener("resize", onWindowResize);

  document.addEventListener("keydown", (event) => {
    keys[event.code] = true;
    event.preventDefault();
  });

  document.addEventListener("keyup", (event) => {
    keys[event.code] = false;
    event.preventDefault();
  });

  document.addEventListener("pointerlockchange", () => {
    isMouseLocked =
      document.pointerLockElement === document.getElementById("maze3d-canvas");
  });

  document.addEventListener("mousemove", (event) => {
    if (isMouseLocked && viewMode === "firstperson") {
      rotateCamera(event.movementX || 0, event.movementY || 0);
    }
  });
}

function rotateCamera(deltaX, deltaY) {
  if (viewMode !== "firstperson") return;

  const sensitivity = 0.003;

  cameraRotation.y -= deltaX * sensitivity;
  cameraRotation.x -= deltaY * sensitivity;
  cameraRotation.x = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, cameraRotation.x)
  );

  updateCameraForViewMode();
}

function lockPointer() {
  const canvas = document.getElementById("maze3d-canvas");
  if (canvas && viewMode === "firstperson") {
    canvas.requestPointerLock();
  }
}

function updateArthurPosition() {
  if (arthurMesh) {
    arthurMesh.position.set(
      arthurPosition3D.x - mazeSize3D / 2,
      0,
      arthurPosition3D.z - mazeSize3D / 2
    );
  }
  updateCameraForViewMode();
}

// =============================================
// Animation continue
// =============================================
function animate3D() {
  requestAnimationFrame(animate3D);

  updateMovement();

  if (treasureGroup) {
    treasureGroup.rotation.y += 0.02;

    treasureGroup.children.forEach((child, index) => {
      if (index > 2) {
        const time = Date.now() * 0.003;
        child.position.y = 0.6 + Math.sin(time + index * 0.5) * 0.1;
        child.rotation.y = time * 2 + index;
      }
    });
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// =============================================
// Génération du labyrinthe
// =============================================
function generateMaze3D() {
  clearMaze3D();
  maze3D = generateMazeWithSolution();
  mazeSize3D = maze3D.length;
  buildMaze3D();
  createArthur();
  createTreasure();

  arthurPosition3D = { x: 1, z: 1 };
  targetPosition3D = { x: 1, z: 1 };
  updateArthurPosition();

  updateStatus("maze", "✨ Nouveau labyrinthe généré !", "success");
}

function generateMazeWithSolution() {
  const size = 21;
  const maze = Array(size)
    .fill()
    .map(() => Array(size).fill(1));

  function carveMaze(x, y, maze) {
    maze[x][y] = 0;

    const directions = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
    ];

    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (let [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (
        nx >= 1 &&
        nx < size - 1 &&
        ny >= 1 &&
        ny < size - 1 &&
        maze[nx][ny] === 1
      ) {
        maze[x + dx / 2][y + dy / 2] = 0;
        carveMaze(nx, ny, maze);
      }
    }
  }

  carveMaze(1, 1, maze);
  maze[1][1] = 0;
  maze[size - 2][size - 2] = 0;

  return maze;
}

function checkVictory() {
  const treasureX = mazeSize3D - 2;
  const treasureZ = mazeSize3D - 2;

  if (arthurPosition3D.x === treasureX && arthurPosition3D.z === treasureZ) {
    updateStatus(
      "maze",
      "🏆 Félicitations ! Arthur a trouvé le trésor !",
      "success"
    );
    createVictoryEffect();
  }
}

function createVictoryEffect() {
  // Effet de particules dorées
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 200;
  const positions = new Float32Array(particlesCount * 3);
  const colors = new Float32Array(particlesCount * 3);

  const treasurePos = treasureGroup.position;

  for (let i = 0; i < particlesCount * 3; i += 3) {
    positions[i] = treasurePos.x + (Math.random() - 0.5) * 6;
    positions[i + 1] = treasurePos.y + Math.random() * 6;
    positions[i + 2] = treasurePos.z + (Math.random() - 0.5) * 6;

    colors[i] = 1;
    colors[i + 1] = Math.random() * 0.5 + 0.5;
    colors[i + 2] = 0;
  }

  particlesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 1,
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  setTimeout(() => scene.remove(particles), 5000);
}

// =============================================
// Résolution du labyrinthe
// =============================================
function solveMaze3D() {
  clearSolution3D();

  const start = { x: 1, y: 1 };
  const end = { x: mazeSize3D - 2, y: mazeSize3D - 2 };

  solutionPath3D = findPath3D(start, end);

  if (solutionPath3D.length > 0) {
    displaySolution3D();
    updateStatus("maze", "🧭 Solution trouvée !", "success");
  }
}

function findPath3D(start, end) {
  const openSet = [start];
  const closedSet = [];
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  gScore[`${start.x},${start.y}`] = 0;
  fScore[`${start.x},${start.y}`] =
    Math.abs(start.x - end.x) + Math.abs(start.y - end.y);

  while (openSet.length > 0) {
    let current = openSet.reduce((a, b) =>
      (fScore[`${a.x},${a.y}`] || Infinity) <
      (fScore[`${b.x},${b.y}`] || Infinity)
        ? a
        : b
    );

    if (current.x === end.x && current.y === end.y) {
      const path = [];
      let temp = current;
      while (temp) {
        path.push(temp);
        temp = cameFrom[`${temp.x},${temp.y}`];
      }
      return path.reverse();
    }

    openSet.splice(openSet.indexOf(current), 1);
    closedSet.push(current);

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (let neighbor of neighbors) {
      if (
        neighbor.x < 0 ||
        neighbor.x >= mazeSize3D ||
        neighbor.y < 0 ||
        neighbor.y >= mazeSize3D ||
        maze3D[neighbor.x][neighbor.y] === 1 ||
        closedSet.some((node) => node.x === neighbor.x && node.y === neighbor.y)
      ) {
        continue;
      }

      const tentativeGScore = (gScore[`${current.x},${current.y}`] || 0) + 1;

      if (
        !openSet.some((node) => node.x === neighbor.x && node.y === neighbor.y)
      ) {
        openSet.push(neighbor);
      } else if (
        tentativeGScore >= (gScore[`${neighbor.x},${neighbor.y}`] || Infinity)
      ) {
        continue;
      }

      cameFrom[`${neighbor.x},${neighbor.y}`] = current;
      gScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore;
      fScore[`${neighbor.x},${neighbor.y}`] =
        tentativeGScore +
        Math.abs(neighbor.x - end.x) +
        Math.abs(neighbor.y - end.y);
    }
  }

  return [];
}

function displaySolution3D() {
  const solutionMaterial = new THREE.MeshPhongMaterial({
    color: 0xffd700,
    emissive: 0x332200,
    transparent: true,
    opacity: 0.8,
    shininess: 100,
  });
  const pathGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);

  for (let point of solutionPath3D) {
    const pathMesh = new THREE.Mesh(pathGeometry, solutionMaterial);
    pathMesh.position.set(
      point.x - mazeSize3D / 2,
      0.2,
      point.y - mazeSize3D / 2
    );
    scene.add(pathMesh);
    solutionMeshes.push(pathMesh);
  }
}

function clearSolution3D() {
  solutionMeshes.forEach((mesh) => scene.remove(mesh));
  solutionMeshes = [];
  solutionPath3D = [];
}

function startArthurJourney3D() {
  if (solutionPath3D.length === 0) {
    updateStatus("maze", "Résolvez d'abord le labyrinthe !", "error");
    return;
  }

  let currentStep = 0;

  function moveToNextStep() {
    if (currentStep < solutionPath3D.length) {
      const target = solutionPath3D[currentStep];
      targetPosition3D = { x: target.x, z: target.y };

      if (!isMoving) {
        isMoving = true;
        animateMovement();
      }

      currentStep++;
      setTimeout(moveToNextStep, 200);
    }
  }

  moveToNextStep();
}

function resetMaze3D() {
  clearSolution3D();
  arthurPosition3D = { x: 1, z: 1 };
  targetPosition3D = { x: 1, z: 1 };
  isMoving = false;
  updateArthurPosition();
  updateStatus("maze", "🔄 Labyrinthe réinitialisé.", "info");
}

function clearMaze3D() {
  [...wallMeshes, ...pathMeshes, ...solutionMeshes].forEach((mesh) => {
    if (mesh && mesh.parent) {
      scene.remove(mesh);
    }
  });

  wallMeshes = [];
  pathMeshes = [];
  solutionMeshes = [];

  if (arthurMesh) {
    scene.remove(arthurMesh);
    arthurMesh = null;
  }

  if (treasureGroup) {
    scene.remove(treasureGroup);
    treasureGroup = null;
  }
}

function onWindowResize() {
  const container = document.getElementById("maze3d-container");
  if (container && camera && renderer) {
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
  }
}

// =============================================
// Fonctions d'interface
// =============================================
function generateMaze() {
  generateMaze3D();
}
function solveMaze() {
  solveMaze3D();
}
function startArthurJourney() {
  startArthurJourney3D();
}
function resetMaze() {
  resetMaze3D();
}

// =============================================
// Initialisation automatique
// =============================================
document.addEventListener("DOMContentLoaded", function () {
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        const target = mutation.target;
        if (
          target.id === "maze-container" &&
          target.classList.contains("active")
        ) {
          setTimeout(() => {
            if (!scene) {
              initMaze3D();
              animate3D();
            }
          }, 100);
        }
      }
    });
  });

  const mazeContainer = document.getElementById("maze-container");
  if (mazeContainer) {
    observer.observe(mazeContainer, { attributes: true });
  }
});
