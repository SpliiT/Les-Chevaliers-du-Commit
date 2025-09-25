// labyrinthe.js - Versión mejorada con jugabilidad optimizada

class MazeGame3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Progression du jeu
    this.currentLevel = 1;
    this.maxLevel = 5;
    this.playerCoins = 0;
    this.levelProgress = {
      1: { coins: 0, required: 5, size: 15, unlocked: true, completed: false },
      2: { coins: 0, required: 8, size: 19, unlocked: false, completed: false },
      3: { coins: 0, required: 12, size: 23, unlocked: false, completed: false },
      4: { coins: 0, required: 15, size: 27, unlocked: false, completed: false },
      5: { coins: 0, required: 20, size: 31, unlocked: false, completed: false }
    };
    
    // Éléments du jeu
    this.maze = [];
    this.player = null;
    this.coins = [];
    this.solutionPath = [];
    this.currentSolutionPath = [];
    this.walls = [];
    this.torches = [];
    this.exitPortal = null;
    
    // Minimapa
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.minimapSize = 150;
    
    // Configuration de la caméra - MEJORADO
    this.cameraMode = 'firstPerson';
    this.cameraOffset = new THREE.Vector3(0, 8, 10);
    this.lastDirection = new THREE.Vector3(0, 0, -1);
    
    // Contrôles - VELOCIDADES DIFERENCIADAS
    this.keys = {};
    this.gameState = 'playing';
    
    // NUEVO: Diferentes velocidades por modo de cámara
    this.moveSpeeds = {
      firstPerson: 0.08,    // Más lento para primera persona
      thirdPerson: 0.15,    // Velocidad normal para tercera persona
      topDown: 0.12         // Velocidad media para vista aérea
    };
    
    // NUEVO: Configuración de cámara mejorada
    this.cameraConfig = {
      firstPerson: {
        smoothing: 0.15,     // Suavizado para primera persona
        bobIntensity: 0.05,  // Intensidad del balanceo al caminar
        eyeHeight: 1.2
      },
      thirdPerson: {
        smoothing: 0.1,
        distance: 10
      },
      topDown: {
        smoothing: 0.05,     // MUY lento para vista aérea estable
        height: 40,
        deadZone: 2          // NUEVO: Zona muerta para evitar micro-movimientos
      }
    };
    
    // NUEVO: Variables para suavizado de cámara
    this.cameraPosition = new THREE.Vector3();
    this.cameraTarget = new THREE.Vector3();
    this.walkBobTime = 0;
    this.lastPlayerPosition = new THREE.Vector3();
    
    // Chronomètre
    this.startTime = null;
    this.completionTimes = [];
    
    this.init();
  }

  async init() {
    console.log('Initialisation du labyrinthe 3D médiéval...');
    await this.loadThreeJS();
    this.setupScene();
    this.setupControls();
    this.setupMinimap();
    this.loadProgress();
    this.generateLevel(this.currentLevel);
  }

  async loadThreeJS() {
    if (typeof THREE === 'undefined') {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/three@0.157.0/build/three.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return Promise.resolve();
  }

  setupScene() {
    // Scène avec atmosphère médiévale
    this.scene = new THREE.Scene();
    
    // Mantener imagen de fondo si está disponible
    const loader = new THREE.TextureLoader();
    loader.load('background.jpg', (texture) => {
      this.scene.background = texture;
    }, undefined, () => {
      // Si no se puede cargar, usar color de fondo
      this.scene.background = new THREE.Color(0x1a1a2e);
    });
    
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);

    // Caméra
    this.camera = new THREE.PerspectiveCamera(
      75, 
      this.container.clientWidth / this.container.clientHeight, 
      0.1, 
      1000
    );
    
    // NUEVO: Inicializar posición de cámara suavizada
    this.camera.position.set(5, 10, 15);
    this.cameraPosition.copy(this.camera.position);
    this.cameraTarget.set(5, 2, 15);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0f0f23);
    
    // Nettoyer y ajouter le canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Éclairage médiéval
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffaa44, 0.8);
    mainLight.position.set(20, 30, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    this.torches = [];

    window.addEventListener('resize', () => this.onResize());
    this.animate();
    
    console.log('Scène 3D médiévale configurée avec jugabilidad mejorada');
  }

  createTorches() {
    const freeCells = [];
    for (let i = 2; i < this.mazeSize - 2; i += 3) {
      for (let j = 2; j < this.mazeSize - 2; j += 3) {
        if (this.maze[i][j] === 0) {
          freeCells.push({ x: i, y: j });
        }
      }
    }

    const torchCount = Math.min(8, Math.floor(freeCells.length / 3));
    const selectedCells = [];
    
    for (let i = 0; i < torchCount; i++) {
      const randomIndex = Math.floor(Math.random() * freeCells.length);
      const cell = freeCells[randomIndex];
      selectedCells.push(cell);
      freeCells.splice(randomIndex, 1);
    }

    selectedCells.forEach((pos, index) => {
      this.createTorch(pos.x * 2, pos.y * 2, index);
    });

    console.log(`${selectedCells.length} antorchas creadas en el laberinto`);
  }

  createTorch(x, z, index) {
    const torchGroup = new THREE.Group();
    
    const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.5);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    torchGroup.add(base);
    
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.12, 2);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 1.5;
    pole.castShadow = true;
    torchGroup.add(pole);
    
    const bowlGeometry = new THREE.CylinderGeometry(0.25, 0.2, 0.3);
    const bowlMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    bowl.position.y = 2.65;
    bowl.castShadow = true;
    torchGroup.add(bowl);
    
    const flameGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    const flameMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff4400,
      transparent: true,
      opacity: 0.8
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.y = 3.2;
    torchGroup.add(flame);
    
    const particleGeometry = new THREE.SphereGeometry(0.05);
    const particleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00,
      transparent: true,
      opacity: 0.6
    });
    
    const fireParticles = [];
    for (let i = 0; i < 5; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        (Math.random() - 0.5) * 0.4,
        3.2 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.4
      );
      fireParticles.push(particle);
      torchGroup.add(particle);
    }
    
    const torchLight = new THREE.PointLight(0xff6600, 2, 15);
    torchLight.position.set(0, 3.2, 0);
    torchLight.castShadow = true;
    torchLight.shadow.mapSize.width = 512;
    torchLight.shadow.mapSize.height = 512;
    torchGroup.add(torchLight);
    
    torchGroup.position.set(x, 0, z);
    
    torchGroup.userData = {
      flame: flame,
      particles: fireParticles,
      light: torchLight,
      index: index,
      originalIntensity: 2
    };
    
    this.torches.push(torchGroup);
    this.scene.add(torchGroup);
  }

  setupMinimap() {
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = this.minimapSize;
    this.minimapCanvas.height = this.minimapSize;
    this.minimapCanvas.style.position = 'absolute';
    this.minimapCanvas.style.top = '10px';
    this.minimapCanvas.style.right = '10px';
    this.minimapCanvas.style.border = '2px solid #8B4513';
    this.minimapCanvas.style.borderRadius = '8px';
    this.minimapCanvas.style.background = 'rgba(0, 0, 0, 0.7)';
    this.minimapCanvas.style.zIndex = '1000';
    
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.container.appendChild(this.minimapCanvas);
  }

  generateLevel(levelNumber) {
    console.log(`Génération du niveau médiéval ${levelNumber}...`);
    
    this.currentLevel = levelNumber;
    const levelConfig = this.levelProgress[levelNumber];
    
    if (!levelConfig.unlocked) {
      console.log(`Niveau ${levelNumber} verrouillé`);
      return;
    }

    this.clearLevel();
    this.generateMaze(levelConfig.size);
    this.createMedievalWalls();
    this.createStoneFloor();
    this.createPlayer();
    this.createTorches();
    this.createExitPortal();
    this.distributeCoins(levelConfig.required);
    this.findSolution();
    
    // NUEVO: Inicializar posición de cámara suavizada al generar nivel
    if (this.player) {
      this.lastPlayerPosition.copy(this.player.position);
    }
    
    this.updateCamera();
    this.startTime = Date.now();
    this.gameState = 'playing';
    this.updateUI();
    this.updateMinimap();
    
    console.log(`Niveau médiéval ${levelNumber} généré con jugabilidad mejorada: ${levelConfig.size}x${levelConfig.size}`);
  }

  generateMaze(size) {
    this.mazeSize = size;
    this.maze = [];

    for (let i = 0; i < size; i++) {
      this.maze[i] = [];
      for (let j = 0; j < size; j++) {
        this.maze[i][j] = 1;
      }
    }

    this.generateMazeRecursive(1, 1);
    this.maze[1][1] = 0;
    this.maze[size - 2][size - 2] = 2;
  }

  generateMazeRecursive(x, y) {
    const directions = [[2, 0], [0, 2], [-2, 0], [0, -2]];
    directions.sort(() => Math.random() - 0.5);

    this.maze[x][y] = 0;

    for (let [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 1 && nx < this.mazeSize - 1 && 
          ny >= 1 && ny < this.mazeSize - 1 && 
          this.maze[nx][ny] === 1) {
        
        this.maze[x + dx / 2][y + dy / 2] = 0;
        this.generateMazeRecursive(nx, ny);
      }
    }
  }

  createMedievalWalls() {
    const wallGeometry = new THREE.BoxGeometry(2, 4, 2);
    
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B7D6B,
      transparent: false
    });

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#8B7D6B';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.strokeStyle = '#A0927F';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
    
    ctx.fillStyle = '#6B5B4F';
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 2);

    const marbleWallMaterial = new THREE.MeshLambertMaterial({ 
      map: texture,
      bumpMap: texture,
      bumpScale: 0.1
    });

    this.walls = [];

    for (let i = 0; i < this.mazeSize; i++) {
      for (let j = 0; j < this.mazeSize; j++) {
        if (this.maze[i][j] === 1) {
          const wall = new THREE.Mesh(wallGeometry, marbleWallMaterial);
          wall.position.set(i * 2, 2, j * 2);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wall.scale.y = 0.8 + Math.random() * 0.4;
          
          this.walls.push(wall);
          this.scene.add(wall);
        }
      }
    }
  }

  createStoneFloor() {
    const floorGeometry = new THREE.PlaneGeometry(this.mazeSize * 2, this.mazeSize * 2);
    
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const floorCtx = floorCanvas.getContext('2d');
    
    floorCtx.fillStyle = '#2F2F2F';
    floorCtx.fillRect(0, 0, 512, 512);
    
    floorCtx.strokeStyle = '#1F1F1F';
    floorCtx.lineWidth = 2;
    for (let i = 0; i < 512; i += 64) {
      floorCtx.beginPath();
      floorCtx.moveTo(i, 0);
      floorCtx.lineTo(i, 512);
      floorCtx.moveTo(0, i);
      floorCtx.lineTo(512, i);
      floorCtx.stroke();
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(8, 8);
    
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      map: floorTexture
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((this.mazeSize - 1), 0, (this.mazeSize - 1));
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  createExitPortal() {
    const exitX = this.mazeSize - 2;
    const exitZ = this.mazeSize - 2;
    
    const portalGeometry = new THREE.CylinderGeometry(0.8, 0.8, 3, 8);
    const portalMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7
    });
    
    this.exitPortal = new THREE.Mesh(portalGeometry, portalMaterial);
    this.exitPortal.position.set(exitX * 2, 1.5, exitZ * 2);
    this.scene.add(this.exitPortal);
    
    const ringGeometry = new THREE.RingGeometry(1.2, 1.5, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x44ffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(exitX * 2, 0.1, exitZ * 2);
    this.scene.add(ring);
    
    const portalLight = new THREE.PointLight(0x00ffff, 1, 10);
    portalLight.position.set(exitX * 2, 3, exitZ * 2);
    this.scene.add(portalLight);
    
    console.log(`Portal de sortie créé en position (${exitX}, ${exitZ})`);
  }

  createPlayer() {
    const playerGeometry = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const playerMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFFF00,
      emissive: 0x444400
    });
    
    this.player = new THREE.Mesh(playerGeometry, playerMaterial);
    this.player.position.set(2, 0.8, 2);
    this.player.castShadow = true;
    
    const eyeGeometry = new THREE.SphereGeometry(0.08);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.2, 0.4);
    this.player.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.2, 0.4);
    this.player.add(rightEye);
    
    const glowGeometry = new THREE.SphereGeometry(0.7, 16, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF00,
      transparent: true,
      opacity: 0.1
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.player.add(glow);
    
    // NUEVO: Inicializar posición anterior del jugador
    this.lastPlayerPosition.copy(this.player.position);
    
    this.scene.add(this.player);
    
    console.log('Pacman créé à la position :', this.player.position);
  }

  distributeCoins(coinCount) {
    this.coins = [];
    
    const freeCells = [];
    for (let i = 1; i < this.mazeSize - 1; i++) {
      for (let j = 1; j < this.mazeSize - 1; j++) {
        if (this.maze[i][j] === 0 && 
            !(i === 1 && j === 1) && 
            !(i === this.mazeSize - 2 && j === this.mazeSize - 2)) {
          freeCells.push({ x: i, y: j });
        }
      }
    }

    const minDistance = Math.max(3, Math.floor(this.mazeSize / 8));
    const placedCoins = [];
    
    for (let attempts = 0; attempts < coinCount * 10 && placedCoins.length < coinCount; attempts++) {
      const randomCell = freeCells[Math.floor(Math.random() * freeCells.length)];
      
      let validPosition = true;
      for (let placed of placedCoins) {
        const distance = Math.abs(placed.x - randomCell.x) + Math.abs(placed.y - randomCell.y);
        if (distance < minDistance) {
          validPosition = false;
          break;
        }
      }
      
      if (validPosition) {
        placedCoins.push(randomCell);
      }
    }

    placedCoins.forEach((pos, index) => {
      const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      const coinMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xFFD700,
        emissive: 0x332200
      });
      
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.set(pos.x * 2, 0.5, pos.y * 2);
      coin.userData = { 
        id: index, 
        collected: false,
        originalY: 0.5
      };
      
      this.coins.push(coin);
      this.scene.add(coin);
    });

    console.log(`${placedCoins.length} pièces d'or placées`);
  }

  findSolution() {
    const start = { x: 1, y: 1 };
    const end = { x: this.mazeSize - 2, y: this.mazeSize - 2 };
    this.solutionPath = this.findPathAStar(start, end);
    console.log(`Solution complète trouvée : ${this.solutionPath.length} étapes`);
  }

  findSolutionFromCurrentPosition() {
    if (!this.player) return [];
    
    const currentGridX = Math.round(this.player.position.x / 2);
    const currentGridZ = Math.round(this.player.position.z / 2);
    const start = { x: currentGridX, y: currentGridZ };
    const end = { x: this.mazeSize - 2, y: this.mazeSize - 2 };
    
    this.currentSolutionPath = this.findPathAStar(start, end);
    console.log(`Solution depuis position actuelle : ${this.currentSolutionPath.length} étapes`);
    return this.currentSolutionPath;
  }

  findPathAStar(start, end) {
    const openSet = [start];
    const closedSet = [];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    gScore[`${start.x},${start.y}`] = 0;
    fScore[`${start.x},${start.y}`] = this.heuristic(start, end);

    while (openSet.length > 0) {
      let current = openSet[0];
      let currentIndex = 0;

      for (let i = 1; i < openSet.length; i++) {
        if (fScore[`${openSet[i].x},${openSet[i].y}`] < fScore[`${current.x},${current.y}`]) {
          current = openSet[i];
          currentIndex = i;
        }
      }

      if (current.x === end.x && current.y === end.y) {
        const path = [];
        let temp = current;
        while (temp) {
          path.push(temp);
          temp = cameFrom[`${temp.x},${temp.y}`];
        }
        return path.reverse();
      }

      openSet.splice(currentIndex, 1);
      closedSet.push(current);

      const neighbors = this.getNeighbors(current);
      
      for (let neighbor of neighbors) {
        if (closedSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
          continue;
        }

        const tentativeGScore = gScore[`${current.x},${current.y}`] + 1;

        if (!openSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
          openSet.push(neighbor);
        } else if (tentativeGScore >= (gScore[`${neighbor.x},${neighbor.y}`] || Infinity)) {
          continue;
        }

        cameFrom[`${neighbor.x},${neighbor.y}`] = current;
        gScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore;
        fScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore + this.heuristic(neighbor, end);
      }
    }

    return [];
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  getNeighbors(node) {
    const neighbors = [];
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];

    for (let [dx, dy] of directions) {
      const x = node.x + dx;
      const y = node.y + dy;

      if (x >= 0 && x < this.mazeSize && y >= 0 && y < this.mazeSize && 
          (this.maze[x][y] === 0 || this.maze[x][y] === 2)) {
        neighbors.push({ x, y });
      }
    }

    return neighbors;
  }

  showSolution(fromCurrentPosition = false) {
    this.scene.children = this.scene.children.filter(child => 
      !(child.userData && child.userData.isSolutionPath)
    );

    let pathToShow = [];
    if (fromCurrentPosition) {
      pathToShow = this.findSolutionFromCurrentPosition();
      this.showingSolution = true;
    } else {
      pathToShow = this.solutionPath;
    }

    if (pathToShow.length === 0) return;

    const pathMaterial = new THREE.MeshBasicMaterial({ 
      color: fromCurrentPosition ? 0xFF4444 : 0x00FF88,
      transparent: true,
      opacity: 0.8
    });

    pathToShow.forEach(({ x, y }, index) => {
      const pathGeometry = new THREE.RingGeometry(0.3, 0.8);
      const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
      pathMesh.position.set(x * 2, 0.05, y * 2);
      pathMesh.rotation.x = -Math.PI / 2;
      pathMesh.userData = { isSolutionPath: true };
      
      pathMesh.scale.set(0, 0, 0);
      setTimeout(() => {
        pathMesh.scale.set(1, 1, 1);
      }, index * 100);
      
      this.scene.add(pathMesh);
    });

    console.log('Solution affichée:', fromCurrentPosition ? 'depuis position actuelle' : 'complète');
  }

  hideSolution() {
    this.scene.children = this.scene.children.filter(child => 
      !(child.userData && child.userData.isSolutionPath)
    );
    this.showingSolution = false;
    console.log('Solution masquée');
  }

  updateMinimap() {
    if (!this.minimapCtx || !this.player) return;

    const ctx = this.minimapCtx;
    const cellSize = this.minimapSize / this.mazeSize;

    ctx.clearRect(0, 0, this.minimapSize, this.minimapSize);
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.minimapSize, this.minimapSize);

    for (let i = 0; i < this.mazeSize; i++) {
      for (let j = 0; j < this.mazeSize; j++) {
        const x = i * cellSize;
        const y = j * cellSize;

        if (this.maze[i][j] === 1) {
          ctx.fillStyle = '#8B7D6B';
          ctx.fillRect(x, y, cellSize, cellSize);
        } else if (this.maze[i][j] === 2) {
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#404040';
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    this.coins.forEach(coin => {
      if (!coin.userData.collected) {
        const gridX = Math.round(coin.position.x / 2);
        const gridZ = Math.round(coin.position.z / 2);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(
          gridX * cellSize + cellSize/2,
          gridZ * cellSize + cellSize/2,
          cellSize/4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });

    const playerGridX = Math.round(this.player.position.x / 2);
    const playerGridZ = Math.round(this.player.position.z / 2);
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      playerGridX * cellSize + cellSize/2,
      playerGridZ * cellSize + cellSize/2,
      cellSize/3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      playerGridX * cellSize + cellSize/2,
      playerGridZ * cellSize + cellSize/2
    );
    ctx.lineTo(
      playerGridX * cellSize + cellSize/2 + this.lastDirection.x * cellSize/2,
      playerGridZ * cellSize + cellSize/2 + this.lastDirection.z * cellSize/2
    );
    ctx.stroke();

    if (this.showingSolution && this.currentSolutionPath.length > 0) {
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      this.currentSolutionPath.forEach((point, index) => {
        const x = point.x * cellSize + cellSize/2;
        const y = point.y * cellSize + cellSize/2;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      if (e.code === 'KeyH') {
        if (this.showingSolution) {
          this.hideSolution();
        } else {
          this.showSolution(true);
        }
      }
      
      if (e.code === 'KeyM') {
        this.showSolution(false);
      }
      
      console.log('Touche appuyée :', e.code);
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    console.log('Contrôles configurés (H: aide depuis position, M: solution complète)');
  }

  // MÉTODO PRINCIPAL MEJORADO - Mejor jugabilidad
  update() {
    if (this.gameState !== 'playing' || !this.player) return;

    // Obtener la velocidad según el modo de cámara actual
    const currentMoveSpeed = this.moveSpeeds[this.cameraMode];

    const originalPos = this.player.position.clone();
    let moved = false;
    let moveDirection = new THREE.Vector3(0, 0, 0);

    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      this.player.position.z -= currentMoveSpeed;
      moveDirection.z = -1;
      moved = true;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      this.player.position.z += currentMoveSpeed;
      moveDirection.z = 1;
      moved = true;
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      this.player.position.x -= currentMoveSpeed;
      moveDirection.x = -1;
      moved = true;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      this.player.position.x += currentMoveSpeed;
      moveDirection.x = 1;
      moved = true;
    }

    // NUEVO: Actualizar el tiempo de balanceo para primera persona
    if (moved && this.cameraMode === 'firstPerson') {
      this.walkBobTime += 0.1;
    }

    if (moved && (moveDirection.x !== 0 || moveDirection.z !== 0)) {
      this.lastDirection.copy(moveDirection.normalize());
      
      if (this.player) {
        let targetRotation = 0;
        if (moveDirection.x > 0) targetRotation = Math.PI / 2;
        else if (moveDirection.x < 0) targetRotation = -Math.PI / 2;
        else if (moveDirection.z > 0) targetRotation = Math.PI;
        else if (moveDirection.z < 0) targetRotation = 0;
        
        this.player.rotation.y = targetRotation;
      }
    }

    if (moved) {
      if (this.checkCollision()) {
        this.player.position.copy(originalPos);
      } else {
        // NUEVO: Actualizar posición anterior solo cuando el movimiento es exitoso
        this.lastPlayerPosition.copy(this.player.position);
        this.updateMinimap();
        
        if (this.showingSolution) {
          this.showSolution(true);
        }
      }
    }

    // NUEVO: Actualizar cámara con suavizado mejorado
    this.updateCameraSmooth();

    this.checkCoinCollisions();
    this.animateCoins();
    this.animateExitPortal();
    this.animateTorches();
    this.checkLevelCompletion();
  }

  // NUEVO MÉTODO: Actualización de cámara suavizada
  updateCameraSmooth() {
    if (!this.player) return;

    const config = this.cameraConfig[this.cameraMode];
    const targetPos = this.player.position.clone();
    
    if (this.cameraMode === 'firstPerson') {
      this.player.visible = false;
      
      const eyeHeight = config.eyeHeight;
      
      // NUEVO: Efecto de balanceo al caminar
      const bobOffset = Math.sin(this.walkBobTime) * config.bobIntensity;
      
      const targetCameraPos = new THREE.Vector3(
        targetPos.x,
        targetPos.y + eyeHeight + bobOffset,
        targetPos.z
      );
      
      // Suavizado de la posición de la cámara
      this.cameraPosition.lerp(targetCameraPos, config.smoothing);
      this.camera.position.copy(this.cameraPosition);
      
      // Suavizado del objetivo de visión
      const targetLookAt = new THREE.Vector3(
        targetPos.x + this.lastDirection.x * 5,
        targetPos.y + eyeHeight + bobOffset,
        targetPos.z + this.lastDirection.z * 5
      );
      
      this.cameraTarget.lerp(targetLookAt, config.smoothing);
      this.camera.lookAt(this.cameraTarget);
      
    } else if (this.cameraMode === 'thirdPerson') {
      this.player.visible = true;
      
      const targetCameraPos = new THREE.Vector3(
        targetPos.x + this.cameraOffset.x,
        targetPos.y + this.cameraOffset.y,
        targetPos.z + this.cameraOffset.z
      );
      
      this.cameraPosition.lerp(targetCameraPos, config.smoothing);
      this.camera.position.copy(this.cameraPosition);
      this.camera.lookAt(targetPos);
      
    } else if (this.cameraMode === 'topDown') {
      this.player.visible = true;
      
      // NUEVO: Zona muerta para evitar micro-movimientos en vista aérea
      const playerMovement = this.player.position.distanceTo(this.lastPlayerPosition);
      
      if (playerMovement > config.deadZone) {
        const targetCameraPos = new THREE.Vector3(
          targetPos.x, 
          targetPos.y + config.height, 
          targetPos.z
        );
        
        // Suavizado MUY lento para vista aérea estable
        this.cameraPosition.lerp(targetCameraPos, config.smoothing);
        this.camera.position.copy(this.cameraPosition);
        
        // Target suavizado también
        this.cameraTarget.lerp(targetPos, config.smoothing);
        this.camera.lookAt(this.cameraTarget);
        
        // Actualizar última posición significativa
        this.lastPlayerPosition.copy(this.player.position);
      }
    }
  }

  animateTorches() {
    this.torches.forEach(torch => {
      const userData = torch.userData;
      const time = Date.now() * 0.005;
      
      if (userData.flame) {
        userData.flame.rotation.y = time + userData.index;
        userData.flame.scale.y = 1 + Math.sin(time * 2 + userData.index) * 0.1;
        userData.flame.scale.x = 1 + Math.sin(time * 3 + userData.index) * 0.05;
        userData.flame.scale.z = 1 + Math.sin(time * 3 + userData.index) * 0.05;
        
        const intensity = 0.8 + Math.sin(time * 4 + userData.index) * 0.2;
        userData.flame.material.opacity = intensity;
      }
      
      if (userData.particles) {
        userData.particles.forEach((particle, pIndex) => {
          const particleTime = time + userData.index + pIndex;
          particle.position.y = 3.2 + Math.sin(particleTime * 2) * 0.3 + Math.random() * 0.1;
          particle.position.x = Math.sin(particleTime) * 0.2 + (Math.random() - 0.5) * 0.1;
          particle.position.z = Math.cos(particleTime) * 0.2 + (Math.random() - 0.5) * 0.1;
          particle.material.opacity = 0.4 + Math.sin(particleTime * 3) * 0.3;
        });
      }
      
      if (userData.light) {
        const lightIntensity = userData.originalIntensity + Math.sin(time * 6 + userData.index) * 0.3;
        userData.light.intensity = Math.max(0.5, lightIntensity);
      }
    });
  }

  animateExitPortal() {
    if (this.exitPortal) {
      this.exitPortal.rotation.y += 0.02;
      this.exitPortal.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.2;
    }
  }

  checkCollision() {
    const gridX = Math.round(this.player.position.x / 2);
    const gridZ = Math.round(this.player.position.z / 2);
    
    if (gridX < 0 || gridX >= this.mazeSize || 
        gridZ < 0 || gridZ >= this.mazeSize || 
        this.maze[gridX][gridZ] === 1) {
      return true;
    }
    
    return false;
  }

  checkCoinCollisions() {
    this.coins.forEach(coin => {
      if (!coin.userData.collected) {
        const distance = this.player.position.distanceTo(coin.position);
        if (distance < 1.2) {
          this.collectCoin(coin);
        }
      }
    });
  }

  collectCoin(coin) {
    coin.userData.collected = true;
    this.playerCoins++;
    this.levelProgress[this.currentLevel].coins++;
    
    this.createCoinCollectionEffect(coin.position);
    this.scene.remove(coin);
    
    this.updateUI();
    this.updateMinimap();
    
    console.log(`Pièce d'or collectée ! Total : ${this.playerCoins}`);
  }

  createCoinCollectionEffect(position) {
    for (let i = 0; i < 8; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.05);
      const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFD700,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      
      particle.userData = { velocity, life: 60 };
      this.scene.add(particle);
      
      const animateParticle = () => {
        particle.position.add(particle.userData.velocity.multiplyScalar(0.95));
        particle.userData.velocity.y -= 0.02;
        particle.userData.life--;
        particle.material.opacity = particle.userData.life / 60;
        
        if (particle.userData.life > 0) {
          requestAnimationFrame(animateParticle);
        } else {
          this.scene.remove(particle);
        }
      };
      
      requestAnimationFrame(animateParticle);
    }
  }

  animateCoins() {
    this.coins.forEach(coin => {
      if (!coin.userData.collected) {
        coin.rotation.y += 0.03;
        coin.position.y = coin.userData.originalY + Math.sin(Date.now() * 0.003 + coin.userData.id) * 0.15;
      }
    });
  }

  checkLevelCompletion() {
    const levelConfig = this.levelProgress[this.currentLevel];
    const hasRequiredCoins = levelConfig.coins >= levelConfig.required;
    const gridX = Math.round(this.player.position.x / 2);
    const gridZ = Math.round(this.player.position.z / 2);
    const isAtExit = gridX === this.mazeSize - 2 && gridZ === this.mazeSize - 2;
    
    if (hasRequiredCoins && isAtExit && !levelConfig.completed) {
      this.completeLevel();
    }
  }

  completeLevel() {
    const completionTime = Date.now() - this.startTime;
    this.completionTimes.push(completionTime);
    
    const levelConfig = this.levelProgress[this.currentLevel];
    levelConfig.completed = true;
    
    if (this.currentLevel < this.maxLevel) {
      this.levelProgress[this.currentLevel + 1].unlocked = true;
    }
    
    this.gameState = 'completed';
    this.hideSolution();
    this.saveProgress();
    
    this.showLevelCompleteMessage(completionTime);
    
    console.log(`Niveau médiéval ${this.currentLevel} complété en ${(completionTime / 1000).toFixed(1)}s`);
  }

  showLevelCompleteMessage(time) {
    const timeStr = (time / 1000).toFixed(1);
    const isLastLevel = this.currentLevel === this.maxLevel;
    
    if (isLastLevel) {
      window.dispatchEvent(new CustomEvent('treasureFound', {
        detail: {
          level: this.currentLevel,
          time: timeStr,
          totalCoins: this.playerCoins
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('levelComplete', {
        detail: {
          level: this.currentLevel,
          time: timeStr,
          nextLevel: this.currentLevel + 1
        }
      }));
    }
  }

  nextLevel() {
    if (this.currentLevel < this.maxLevel && this.levelProgress[this.currentLevel + 1].unlocked) {
      this.generateLevel(this.currentLevel + 1);
    }
  }

  // MÉTODO DEPRECADO: Reemplazado por updateCameraSmooth()
  updateCamera() {
    // Este método ahora es llamado por updateCameraSmooth()
    // Mantenido para compatibilidad
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    
    // NUEVO: Reinicializar posiciones de cámara al cambiar modo
    if (this.player) {
      this.lastPlayerPosition.copy(this.player.position);
      this.walkBobTime = 0;
    }
    
    console.log('Mode de caméra :', mode, `- Vitesse: ${this.moveSpeeds[mode]}`);
  }

  clearLevel() {
    const objectsToRemove = [];
    this.scene.traverse(child => {
      if (child.isMesh && child !== this.player) {
        objectsToRemove.push(child);
      }
    });
    
    objectsToRemove.forEach(obj => {
      this.scene.remove(obj);
    });
    
    this.coins = [];
    this.solutionPath = [];
    this.currentSolutionPath = [];
    this.walls = [];
    this.torches = [];
    this.exitPortal = null;
    this.showingSolution = false;
  }

  saveProgress() {
    localStorage.setItem('medievalMazeProgress', JSON.stringify({
      levelProgress: this.levelProgress,
      currentLevel: this.currentLevel,
      playerCoins: this.playerCoins,
      completionTimes: this.completionTimes
    }));
  }

  loadProgress() {
    const saved = localStorage.getItem('medievalMazeProgress');
    if (saved) {
      const data = JSON.parse(saved);
      this.levelProgress = data.levelProgress || this.levelProgress;
      this.currentLevel = data.currentLevel || 1;
      this.playerCoins = data.playerCoins || 0;
      this.completionTimes = data.completionTimes || [];
    }
  }

  updateUI() {
    const event = new CustomEvent('mazeUIUpdate', {
      detail: {
        currentLevel: this.currentLevel,
        maxLevel: this.maxLevel,
        coins: this.levelProgress[this.currentLevel].coins,
        requiredCoins: this.levelProgress[this.currentLevel].required,
        totalCoins: this.playerCoins,
        levelProgress: this.levelProgress
      }
    });
    window.dispatchEvent(event);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    this.update();
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  reset() {
    this.generateLevel(this.currentLevel);
  }
}

// Exporter para uso global
window.MazeGame3D = MazeGame3D;