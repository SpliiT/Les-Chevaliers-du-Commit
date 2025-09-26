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

// Variables pour contrôles fluides et caméra 3ème personne
let keys = {};
let isMoving = false;
let moveSpeed = 0.25;
let cameraRotation = { x: 0, y: 0 };
let thirdPersonRotation = { x: 0, y: 0 };
let isMouseLocked = false;

// Variables pour la minimap
let minimapCamera, minimapRenderer, minimapContainer;

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

  // Initialiser la minimap
  initMinimap();

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
// Initialisation de la minimap
// =============================================
function initMinimap() {
  // Créer le conteneur de la minimap
  minimapContainer = document.createElement("div");
  minimapContainer.id = "minimap-container";
  minimapContainer.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 200px;
    height: 200px;
    border: 3px solid #ffd700;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    z-index: 1000;
  `;

  const container = document.getElementById("maze3d-container");
  container.appendChild(minimapContainer);

  // Créer la caméra de la minimap
  minimapCamera = new THREE.OrthographicCamera(
    -mazeSize3D / 2,
    mazeSize3D / 2,
    mazeSize3D / 2,
    -mazeSize3D / 2,
    1,
    1000
  );
  minimapCamera.position.set(0, 50, 0);
  minimapCamera.lookAt(0, 0, 0);

  // Créer le renderer de la minimap
  minimapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  minimapRenderer.setSize(200, 200);
  minimapRenderer.setClearColor(0x000000, 0.8);
  minimapContainer.appendChild(minimapRenderer.domElement);
}

// =============================================
// Configuration de l'éclairage luxueux
// =============================================
function setupLighting() {
  // Lumière ambiante dorée subtile
  ambientLight = new THREE.AmbientLight(0xffd700, 0.15);
  scene.add(ambientLight);

  // Lumière directionnelle principale (blanche)
  directionalLight = new THREE.DirectionalLight(0xffffff, 10);
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
// Création d'Arthur avec modèle 3D
// =============================================
function createArthur() {
  if (arthurMesh) {
    scene.remove(arthurMesh);
  }

  // Créer un groupe pour Arthur
  arthurMesh = new THREE.Group();

  // Charger le modèle 3D
  const loader = new THREE.GLTFLoader();
  loader.load(
    "/models/knight3d.glb",
    function (gltf) {
      const model = gltf.scene;

      // Calculer la taille du modèle
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);

      // Redimensionner le modèle
      const targetHeight = 1.8;
      const scale = targetHeight / maxDimension;
      model.scale.setScalar(scale);

      // Centrer le modèle
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // Positionner le modèle au sol
      const minY = box.min.y * scale;
      model.position.y = -minY;

      // Configurer les ombres
      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.needsUpdate = true;
          }
        }
      });

      // Ajouter le modèle au groupe Arthur
      arthurMesh.add(model);

      // Stocker une référence au modèle avec l'état d'animation
      arthurMesh.userData.model = model;
      arthurMesh.userData.model.userData = {
        isAnimating: true,
      };

      console.log("Modèle Arthur chargé avec succès");
    },
    function (progress) {
      console.log(
        "Chargement du modèle Arthur:",
        (progress.loaded / progress.total) * 100 + "%"
      );
    },
    function (error) {
      console.error("Erreur lors du chargement du modèle Arthur:", error);
      createFallbackArthur();
    }
  );

  // Ajouter le groupe à la scène
  scene.add(arthurMesh);
  updateArthurPosition();
}

// Fonction de fallback en cas d'échec du chargement
function createFallbackArthur() {
  console.log("Utilisation du modèle Arthur de fallback");

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
}

// =============================================
// Création du trésor luxueux
// =============================================
function createTreasure() {
  if (treasureGroup) {
    scene.remove(treasureGroup);
  }

  treasureGroup = new THREE.Group();

  // Charger le modèle 3D du coffre
  const loader = new THREE.GLTFLoader();
  loader.load(
    "/models/chest.glb",
    function (gltf) {
      const model = gltf.scene;

      // Calculer la taille du modèle
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);

      // Redimensionner le modèle
      const targetHeight = 0.9; // Hauteur cible
      const scale = targetHeight / maxDimension;
      model.scale.setScalar(scale);

      // Centrer le modèle
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // Positionner le modèle au sol
      const minY = box.min.y * scale;
      model.position.y = -minY + 0.25;

      // Configurer les ombres
      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.needsUpdate = true;
          }
        }
      });

      // Ajouter le modèle au groupe
      treasureGroup.add(model);

      // Stocker une référence au modèle pour l'animation
      treasureGroup.userData.model = model;

      // Positionner le groupe trésor
      const treasureX = mazeSize3D - 2;
      const treasureZ = mazeSize3D - 2;
      treasureGroup.position.set(
        treasureX - mazeSize3D / 2,
        0,
        treasureZ - mazeSize3D / 2
      );

      scene.add(treasureGroup);

      // Animation d'ouverture/fermeture du coffre
      animateChestOpening();

      console.log("Modèle de trésor chargé avec succès");
    },
    function (progress) {
      console.log(
        "Chargement du modèle de trésor:",
        (progress.loaded / progress.total) * 100 + "%"
      );
    },
    function (error) {
      console.error("Erreur lors du chargement du modèle de trésor:", error);
      createFallbackTreasure();
    }
  );
}

// Fonction d'animation du coffre
function animateChestOpening() {
  if (!treasureGroup || !treasureGroup.userData.model) return;

  const model = treasureGroup.userData.model;
  const lid = model.getObjectByName("lid"); // Remplacez "lid" par le nom de l'objet dans votre modèle

  if (lid) {
    // Animation d'ouverture/fermeture avec GSAP
    gsap.to(lid.rotation, {
      x: 0.8, // Angle d'ouverture (ajustez selon votre modèle)
      duration: 2,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
      delay: 1,
    });

    // Animation de scintillement des particules
    model.traverse(function (child) {
      if (child.name.includes("gem") || child.name.includes("particle")) {
        gsap.to(child.position, {
          y: "+=0.1",
          duration: 2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 2,
        });

        gsap.to(child.scale, {
          x: 1.1,
          y: 1.1,
          z: 1.1,
          duration: 1.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 1.5,
        });
      }
    });
  }
}

// =============================================
// Gestion des modes de vue
// =============================================
function setViewMode(mode) {
  viewMode = mode;
  cameraRotation = { x: 0, y: 0 };
  thirdPersonRotation = { x: 0, y: 0 };

  const canvas = document.getElementById("maze3d-canvas");
  const fpsInstructions = document.querySelector(".fps-instructions");
  const viewIndicator = document.querySelector(".view-indicator");

  // Mettre à jour l'indicateur de vue
  if (viewIndicator) {
    viewIndicator.textContent = mode.toUpperCase().replace("PERSON", " PERSON");
  }

  // Gérer la minimap
  if (minimapContainer) {
    minimapContainer.style.display = mode === "firstperson" ? "block" : "none";
  }

  // Gérer la visibilité d'Arthur
  if (arthurMesh) {
    arthurMesh.visible = mode !== "firstperson";
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
    camera.fov = mode === "topdown" ? 55 : 65;
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
      const distance = 5;
      const height = 3;
      const yaw = thirdPersonRotation.y;
      const pitch = thirdPersonRotation.x;

      const x = arthurPos.x + distance * Math.cos(pitch) * Math.sin(yaw);
      const y = arthurPos.y + height + distance * Math.sin(pitch);
      const z = arthurPos.z + distance * Math.cos(pitch) * Math.cos(yaw);

      camera.position.set(x, y, z);
      camera.lookAt(arthurPos.x, arthurPos.y + 1, arthurPos.z);
      break;

    case "firstperson":
      camera.position.set(arthurPos.x, arthurPos.y + 1.6, arthurPos.z);

      // Rotation directe sans roll
      const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        cameraRotation.y
      );
      const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        cameraRotation.x
      );

      camera.quaternion.copy(yawQuaternion.multiply(pitchQuaternion));
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

  // Orienter Arthur vers la direction de mouvement
  orientArthurToDirection(direction);

  // Calculer la nouvelle position selon la vue actuelle
  if (viewMode === "firstperson") {
    // Mouvement basé sur l'orientation de la caméra en première personne
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);

    forward.normalize();
    right.normalize();

    switch (direction) {
      case "forward":
        newX = Math.round(arthurPosition3D.x + forward.x);
        newZ = Math.round(arthurPosition3D.z + forward.z);
        break;
      case "backward":
        newX = Math.round(arthurPosition3D.x - forward.x);
        newZ = Math.round(arthurPosition3D.z - forward.z);
        break;
      case "left":
        newX = Math.round(arthurPosition3D.x - right.x);
        newZ = Math.round(arthurPosition3D.z - right.z);
        break;
      case "right":
        newX = Math.round(arthurPosition3D.x + right.x);
        newZ = Math.round(arthurPosition3D.z + right.z);
        break;
    }
  } else {
    // Mouvement classique pour les autres vues
    switch (direction) {
      case "forward":
        newZ = arthurPosition3D.z - 1;
        break;
      case "backward":
        newZ = arthurPosition3D.z + 1;
        break;
      case "left":
        newX = arthurPosition3D.x - 1;
        break;
      case "right":
        newX = arthurPosition3D.x + 1;
        break;
    }
  }

  // Vérifier si la nouvelle position est valide
  if (
    newX >= 0 &&
    newX < mazeSize3D &&
    newZ >= 0 &&
    newZ < mazeSize3D &&
    maze3D[newX][newZ] === 0
  ) {
    targetPosition3D = { x: newX, z: newZ };
    isMoving = true;
    animateMovement();
  }
}

function animateMovement() {
  if (
    !arthurMesh ||
    !isMoving ||
    arthurMesh.userData.model.userData?.isAnimating === false
  )
    return;

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
  document.addEventListener("keydown", (e) => {
    if (e.key === "f") {
      if (solutionMeshes.length > 0) {
        clearSolution3D();
        updateStatus("maze", "🧭 Solution masquée", "info");
      } else {
        solveMaze3D();
      }
    }
    // Ajout pour la touche Espace
    else if (e.key === " ") {
      toggleArthurAnimation();
    }
  });

  document.addEventListener("keydown", (event) => {
    keys[event.code] = true;

    // Changement de vue avec la touche G
    if (event.code === "KeyG") {
      cycleViewMode();
    }
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
      rotateFirstPersonCamera(event.movementX || 0, event.movementY || 0);
    } else if (
      viewMode === "thirdperson" &&
      (event.buttons === 1 || event.buttons === 2)
    ) {
      rotateThirdPersonCamera(event.movementX || 0, event.movementY || 0);
    }
  });

  // Rotation de la caméra en 3ème personne avec clic droit
  const canvas = document.getElementById("maze3d-canvas");
  if (canvas) {
    canvas.addEventListener("mousedown", (event) => {
      if (
        viewMode === "thirdperson" &&
        (event.button === 0 || event.button === 2)
      ) {
        canvas.style.cursor = "grabbing";
      }
    });

    canvas.addEventListener("mouseup", () => {
      if (viewMode === "thirdperson") {
        canvas.style.cursor = "grab";
      }
    });

    canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }
}

function rotateFirstPersonCamera(deltaX, deltaY) {
  const sensitivity = 0.002;

  cameraRotation.y -= deltaX * sensitivity;
  cameraRotation.x -= deltaY * sensitivity;
  cameraRotation.x = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, cameraRotation.x)
  );

  updateCameraForViewMode();
}

function rotateThirdPersonCamera(deltaX, deltaY) {
  const sensitivity = 0.005;

  thirdPersonRotation.y -= deltaX * sensitivity;
  thirdPersonRotation.x -= deltaY * sensitivity;
  thirdPersonRotation.x = Math.max(
    -Math.PI / 3,
    Math.min(Math.PI / 4, thirdPersonRotation.x)
  );

  updateCameraForViewMode();
}

function lockPointer() {
  const canvas = document.getElementById("maze3d-canvas");
  if (canvas && viewMode === "firstperson") {
    canvas.requestPointerLock();
  }
}
function toggleArthurAnimation() {
  if (!arthurMesh || !arthurMesh.userData.model) return;

  const model = arthurMesh.userData.model;

  // Vérifier si des animations sont en cours
  if (model.userData?.isAnimating) {
    // Arrêter toutes les animations
    gsap.killTweensOf(model.rotation);
    gsap.killTweensOf(model.position);

    // Réinitialiser l'état
    model.userData.isAnimating = false;
    updateStatus("maze", "🛑 Animation d'Arthur arrêtée", "info");
  } else {
    // Reprendre les animations
    model.userData.isAnimating = true;
    updateStatus("maze", "▶️ Animation d'Arthur reprise", "info");

    // Réappliquer l'animation de mouvement si nécessaire
    if (isMoving) {
      animateMovement();
    }
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
// Animation continue avec minimap
// =============================================
function animate3D() {
  requestAnimationFrame(animate3D);

  updateMovement();
  animateSolution();

  // Animation du coffre
  if (treasureGroup && treasureGroup.userData.model) {
    const model = treasureGroup.userData.model;

    // Rotation lente du coffre
    model.rotation.y += 0.002;

    // Indicateur visuel pour l'animation d'Arthur
    if (arthurMesh && arthurMesh.userData.model) {
      const model = arthurMesh.userData.model;
      if (model.userData.isAnimating === false) {
        // Ajouter un effet visuel pour indiquer que l'animation est arrêtée
        // Par exemple, faire clignoter légèrement le modèle
        const time = Date.now() * 0.005;
        model.traverse(function (child) {
          if (child.isMesh) {
            child.material.emissiveIntensity = 0.5 + Math.sin(time) * 0.5;
          }
        });
      }
    }

    // Animation des particules (si elles existent)
    model.traverse(function (child) {
      if (child.name.includes("gem") || child.name.includes("particle")) {
        const time = Date.now() * 0.003;
        child.position.y =
          0.6 + Math.sin(time + parseFloat(child.userData?.delay || 0)) * 0.1;
        child.rotation.y = time * 0.5 + parseFloat(child.userData?.delay || 0);
      }
    });
  }

  // Rendu de la scène
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  // Rendu de la minimap en première personne
  if (viewMode === "firstperson" && minimapRenderer && minimapCamera) {
    minimapRenderer.render(scene, minimapCamera);
  }
}

function cycleViewMode() {
  const viewModes = ["topdown", "thirdperson", "firstperson"];
  const currentIndex = viewModes.indexOf(viewMode);
  const nextIndex = (currentIndex + 1) % viewModes.length;
  setViewMode(viewModes[nextIndex]);
}
// =============================================
// Génération du labyrinthe
// =============================================
function generateMaze3D() {
  clearMaze3D();
  maze3D = generateMazeWithSolution();
  mazeSize3D = maze3D.length;

  // Mettre à jour la caméra de la minimap
  if (minimapCamera) {
    minimapCamera.left = -mazeSize3D / 2;
    minimapCamera.right = mazeSize3D / 2;
    minimapCamera.top = mazeSize3D / 2;
    minimapCamera.bottom = -mazeSize3D / 2;
    minimapCamera.updateProjectionMatrix();
  }

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

  // Vérifier si Arthur est proche du trésor (ajustez la distance selon votre modèle)
  const distance = Math.sqrt(
    Math.pow(arthurPosition3D.x - treasureX, 2) +
      Math.pow(arthurPosition3D.z - treasureZ, 2)
  );

  if (distance < 1.5) {
    // Distance de détection
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
// Résolution du labyrinthe avec chemin visible
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

// Modifiez la gestion de la touche F dans le document.addEventListener
document.addEventListener("keydown", (e) => {
  if (e.key === "f") {
    if (solutionMeshes.length > 0) {
      // Masquer la solution
      clearSolution3D();
      updateStatus("maze", "🧭 Solution masquée", "info");
    } else {
      // Afficher la solution
      solveMaze3D();
    }
  }
});

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
  // Chemin plus visible avec des sphères brillantes
  const solutionMaterial = new THREE.MeshPhongMaterial({
    color: 0xff4444,
    emissive: 0x440000,
    transparent: true,
    opacity: 0.9,
    shininess: 150,
  });
  const pathGeometry = new THREE.SphereGeometry(0.15, 12, 12);

  for (let i = 0; i < solutionPath3D.length; i++) {
    const point = solutionPath3D[i];
    const pathMesh = new THREE.Mesh(pathGeometry, solutionMaterial);
    pathMesh.position.set(
      point.x - mazeSize3D / 2,
      0.3,
      point.y - mazeSize3D / 2
    );

    // Animation pulsante pour rendre le chemin plus visible
    const delay = i * 0.1;
    pathMesh.userData = { delay, originalScale: 1 };

    scene.add(pathMesh);
    solutionMeshes.push(pathMesh);
  }
}

// =============================================
// Orientation d'Arthur vers la direction de mouvement
// =============================================
// Remplacez la fonction orientArthurToDirection par cette version
function orientArthurToDirection(direction) {
  if (!arthurMesh || !arthurMesh.userData.model) return;

  // Si l'animation est arrêtée, ne rien faire
  if (arthurMesh.userData.model.userData?.isAnimating === false) return;

  let targetRotation = 0;

  switch (direction) {
    case "forward":
      targetRotation = 0; // Face au nord
      break;
    case "backward":
      targetRotation = Math.PI; // Face au sud
      break;
    case "left":
      targetRotation = Math.PI / 2; // Face à l'ouest
      break;
    case "right":
      targetRotation = -Math.PI / 2; // Face à l'est
      break;
  }

  // Animation fluide de rotation
  const model = arthurMesh.userData.model;
  if (model) {
    gsap.to(model.rotation, {
      y: targetRotation,
      duration: 0.3,
      ease: "power2.out",
    });
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
  cameraRotation = { x: 0, y: 0 };
  thirdPersonRotation = { x: 0, y: 0 };
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

// Animation du chemin de solution avec pulsation
function animateSolution() {
  if (solutionMeshes.length > 0) {
    const time = Date.now() * 0.005;
    solutionMeshes.forEach((mesh, index) => {
      if (mesh.userData) {
        const wave = Math.sin(time + mesh.userData.delay) * 0.3 + 1;
        mesh.scale.setScalar(wave);
        mesh.material.emissiveIntensity = wave * 0.3;
      }
    });
  }
}

// Mettre à jour la boucle d'animation pour inclure l'animation de solution
const originalAnimate3D = animate3D;
animate3D = function () {
  requestAnimationFrame(animate3D);

  updateMovement();
  animateSolution();

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

  // Rendu de la minimap en première personne
  if (viewMode === "firstperson" && minimapRenderer && minimapCamera) {
    minimapRenderer.render(scene, minimapCamera);
  }
};

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
