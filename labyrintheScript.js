// script.js - Version corrigée et simplifiée en français (lógica de laberinto separada)

// Variables globales pour Leaflet
let map;
let kaamelottMarker, labyrinthMarker;
let waypoints = [];
let waypointMarkers = [];
let routingControl;
let customRoute;

// Variable pour le labyrinthe 3D (ahora importado desde labyrinthe.js)
let mazeGame3D;

// Coordonnées
const kaamelottCoords = [43.3124, -0.3668];
const labyrinthCoords = [43.2933, -0.3708];

const predefinedWaypoints = [
  [43.305, -0.365, "Place Verdun", "🏛️"],
  [43.298, -0.372, "Université de Pau", "🎓"],
  [43.31, -0.36, "Parc Lawrence", "🌳"],
  [43.3, -0.368, "Centre-ville de Pau", "🏪"],
  [43.315, -0.372, "Boulevard des Pyrénées", "🏔️"],
  [43.308, -0.359, "Stade du Hameau", "⚽"],
  [43.295, -0.375, "Gare SNCF de Pau", "🚂"],
];

// ============= INITIALISATION =============

window.onload = function () {
  console.log('Initialisation de l\'application...');
  initMap();
  setupMazeEventListeners();
};

// ============= FONCTIONS DE CARTE =============

function initMap() {
  map = L.map("map").setView([43.3028, -0.3678], 14);

  const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© Contributeurs OpenStreetMap",
      maxZoom: 19,
    }
  );

  const cartoLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: "© CARTO © Contributeurs OpenStreetMap",
      maxZoom: 19,
    }
  );

  osmLayer.addTo(map);

  const baseMaps = {
    OpenStreetMap: osmLayer,
    "CartoDB Voyager": cartoLayer,
  };
  L.control.layers(baseMaps).addTo(map);

  const kaamelottIcon = L.divIcon({
    html: '<div style="background: linear-gradient(45deg, #32CD32, #228B22); border: 3px solid #FFD700; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(50, 205, 50, 0.7);">🏰</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: "custom-marker",
  });

  const labyrinthIcon = L.divIcon({
    html: '<div style="background: linear-gradient(45deg, #FF6B6B, #FF4444); border: 3px solid #FFD700; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px rgba(255, 107, 107, 0.7);">🌀</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: "custom-marker",
  });

  kaamelottMarker = L.marker(kaamelottCoords, { icon: kaamelottIcon })
    .addTo(map)
    .bindPopup(`
      <div style="text-align: center;">
        <h3>🏰 Kaamelott</h3>
        <p><strong>Pôle Lahérrère, Pau</strong></p>
        <p>Point de départ de la quête</p>
      </div>
    `);

  labyrinthMarker = L.marker(labyrinthCoords, { icon: labyrinthIcon })
    .addTo(map)
    .bindPopup(`
      <div style="text-align: center;">
        <h3>🌀 Entrée du Labyrinthe</h3>
        <p><strong>Château de Pau</strong></p>
        <p>Destination finale</p>
      </div>
    `);

  L.circle(kaamelottCoords, {
    color: "#32CD32",
    fillColor: "#32CD32",
    fillOpacity: 0.1,
    radius: 200,
  }).addTo(map);

  L.circle(labyrinthCoords, {
    color: "#FF6B6B",
    fillColor: "#FF6B6B",
    fillOpacity: 0.1,
    radius: 200,
  }).addTo(map);

  predefinedWaypoints.slice(0, 3).forEach((wp) => {
    addWaypointAt(wp[0], wp[1], wp[2], wp[3]);
  });

  console.log('Carte initialisée correctement');
}

function showPhase(phase) {
  console.log('Changement vers la phase:', phase);
  
  document.querySelectorAll(".phase-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll('[id$="-container"]').forEach((container) => container.classList.remove("active"));

  event.target.classList.add("active");
  document.getElementById(phase + "-container").classList.add("active");

  if (phase === "map" && map) {
    setTimeout(() => map.invalidateSize(), 100);
  } else if (phase === "maze") {
    if (!mazeGame3D) {
      console.log('Initialisation du labyrinthe 3D pour la première fois...');
      initMaze3D();
    } else {
      console.log('Le labyrinthe 3D existe déjà');
    }
  }
}

function addWaypoint() {
  if (waypoints.length < predefinedWaypoints.length) {
    const wp = predefinedWaypoints[waypoints.length];
    addWaypointAt(wp[0], wp[1], wp[2], wp[3]);
    updateStatus("map", `Point de passage "${wp[2]}" ajouté !`, "success");
  } else {
    updateStatus("map", "Tous les points de passage ont été ajoutés !", "info");
  }
}

function addWaypointAt(lat, lng, name, emoji) {
  const waypointIcon = L.divIcon({
    html: `<div style="background: linear-gradient(45deg, #FFD700, #FFA500); border: 3px solid #DAA520; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 12px rgba(255, 215, 0, 0.7);">${emoji}</div>`,
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    className: "custom-marker",
  });

  const marker = L.marker([lat, lng], { icon: waypointIcon })
    .addTo(map)
    .bindPopup(`
      <div style="text-align: center;">
        <h4>${emoji} ${name}</h4>
        <p>Point de passage #${waypoints.length + 1}</p>
      </div>
    `);

  waypoints.push({ marker, coords: [lat, lng], name, emoji });
  waypointMarkers.push(marker);

  L.circle([lat, lng], {
    color: "#FFD700",
    fillColor: "#FFD700",
    fillOpacity: 0.1,
    radius: 100,
  }).addTo(map);
}

function findShortestPath() {
  if (waypoints.length === 0) {
    updateStatus("map", "Ajoutez au moins un point de passage !", "error");
    return;
  }

  updateStatus("map", "Calcul du chemin optimal...", "loading");
  clearPath();

  setTimeout(() => {
    let routeWaypoints = [L.latLng(kaamelottCoords[0], kaamelottCoords[1])];
    let unvisitedWaypoints = [...waypoints];
    let currentPos = kaamelottCoords;

    while (unvisitedWaypoints.length > 0) {
      let nearest = unvisitedWaypoints[0];
      let nearestIndex = 0;
      let minDistance = calculateDistance(currentPos, nearest.coords);

      for (let i = 1; i < unvisitedWaypoints.length; i++) {
        let distance = calculateDistance(currentPos, unvisitedWaypoints[i].coords);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = unvisitedWaypoints[i];
          nearestIndex = i;
        }
      }

      routeWaypoints.push(L.latLng(nearest.coords[0], nearest.coords[1]));
      currentPos = nearest.coords;
      unvisitedWaypoints.splice(nearestIndex, 1);
    }

    routeWaypoints.push(L.latLng(labyrinthCoords[0], labyrinthCoords[1]));

    routingControl = L.Routing.control({
      waypoints: routeWaypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: "#4169E1", weight: 6, opacity: 0.8, dashArray: "10, 5" }]
      },
      show: true,
      collapsible: true,
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
        profile: "walking"
      })
    }).addTo(map);

    routingControl.on("routesfound", (e) => {
      const routes = e.routes;
      const summary = routes[0].summary;
      const distance = (summary.totalDistance / 1000).toFixed(2);
      const time = Math.round(summary.totalTime / 60);
      updateStatus("map", `🎯 Chemin calculé ! Distance: ${distance} km | Temps: ${time} min`, "success");
    });

    routingControl.on("routingerror", () => {
      updateStatus("map", "Erreur - Utilisation du chemin direct", "error");
      createManualRoute(routeWaypoints);
    });
  }, 1000);
}

function createManualRoute(waypoints) {
  const pathCoords = waypoints.map((wp) => [wp.lat, wp.lng]);
  customRoute = L.polyline(pathCoords, {
    color: "#4169E1",
    weight: 6,
    opacity: 0.8,
    dashArray: "10, 5"
  }).addTo(map);

  let totalDistance = 0;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    totalDistance += calculateDistance(pathCoords[i], pathCoords[i + 1]);
  }
  updateStatus("map", `Chemin calculé ! Distance: ${totalDistance.toFixed(2)} km`, "success");
}

function clearPath() {
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  if (customRoute) {
    map.removeLayer(customRoute);
    customRoute = null;
  }
}

function calculateDistance(coord1, coord2) {
  const latlng1 = L.latLng(coord1[0], coord1[1]);
  const latlng2 = L.latLng(coord2[0], coord2[1]);
  return latlng1.distanceTo(latlng2) / 1000;
}

function centerOnKaamelott() {
  map.setView(kaamelottCoords, 15);
  kaamelottMarker.openPopup();
}

// ============= LABYRINTHE 3D - FUNCIONES DE INTERFAZ =============

function initMaze3D() {
  console.log('Appel à initMaze3D...');
  updateStatus("maze", "Chargement du labyrinthe 3D...", "loading");
  
  const mazeContainer = document.getElementById("maze");
  
  if (!mazeContainer) {
    console.error('Le conteneur #maze n\'a pas été trouvé');
    return;
  }
  
  try {
    // Verificar que la clase MazeGame3D esté disponible
    if (typeof MazeGame3D === 'undefined') {
      console.error('MazeGame3D no está disponible. ¿Se cargó labyrinthe.js?');
      updateStatus("maze", "Erreur : Classe MazeGame3D non trouvée", "error");
      return;
    }
    
    mazeGame3D = new MazeGame3D(mazeContainer);
    updateMazeControls();
    updateStatus("maze", "¡Labyrinthe 3D prêt ! Utilisez WASD pour vous déplacer", "success");
    console.log('Labyrinthe 3D initialisé correctement');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du labyrinthe:', error);
    updateStatus("maze", "Erreur lors du chargement du labyrinthe 3D", "error");
  }
}

function updateMazeControls() {
  const controlsContainer = document.querySelector('#maze-container .controls');
  if (!controlsContainer) return;
  
  controlsContainer.innerHTML = `
    <button class="control-btn" onclick="generateMaze()">🔄 Réinitialiser Niveau</button>
    <button class="control-btn" onclick="solveMaze()">🧭 Montrer Solution</button>
    <button class="control-btn" onclick="toggleCameraMode()">📷 Changer Vue</button>
    <button class="control-btn" onclick="nextLevel()" id="next-level-btn" style="display: none;">⏭️ Niveau Suivant</button>
    <button class="control-btn" onclick="resetProgress()">🗑️ Reset Progrès</button>
  `;

  updateMazeInfoPanel();
}

function updateMazeInfoPanel() {
  const infoPanelContainer = document.querySelector('#maze-container .info-panel');
  if (!infoPanelContainer) return;
  
  infoPanelContainer.innerHTML = `
    <div id="maze-status" class="status">¡Explorez le labyrinthe 3D ! Utilisez WASD ou les flèches pour vous déplacer</div>
    
    <div class="level-progress">
      <div class="progress-header">
        <span id="level-indicator">Niveau 1/5</span>
        <span id="coins-counter">💰 0/5</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progress-bar"></div>
      </div>
    </div>

    <div class="game-stats">
      <div class="stat-item">
        <span class="stat-label">Temps :</span>
        <span class="stat-value" id="timer">00:00</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Pièces totales :</span>
        <span class="stat-value" id="total-coins">0</span>
      </div>
    </div>

    <div class="controls-help">
      <h4>🎮 Contrôles</h4>
      <div class="control-item"><kbd>WASD</kbd> ou <kbd>↑↓←→</kbd> - Déplacer Arthur</div>
      <div class="control-item"><kbd>📷</kbd> - Changer vue (1ère personne / 3ème personne / Aérienne)</div>
    </div>

    <div class="legend">
      <div class="legend-item">
        <div class="legend-color" style="background: #FFD700;"></div>
        <span>Arthur / Pièces</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #00FF88;"></div>
        <span>Solution</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #8B4513;"></div>
        <span>Murs</span>
      </div>
    </div>
  `;
}

function generateMaze() {
  console.log('Appel à generateMaze...');
  if (mazeGame3D) {
    mazeGame3D.reset();
    updateStatus("maze", "¡Niveau réinitialisé !", "success");
  } else {
    initMaze3D();
  }
}

function solveMaze() {
  console.log('Appel à solveMaze...');
  if (mazeGame3D) {
    mazeGame3D.showSolution(true);
    updateStatus("maze", "Solution montrée en vert", "success");
    
    setTimeout(() => {
      mazeGame3D.showSolution(false);
      updateStatus("maze", "Solution cachée. Essayez maintenant !", "info");
    }, 5000);
  }
}

function toggleCameraMode() {
  console.log('Appel à toggleCameraMode...');
  if (mazeGame3D) {
    const currentMode = mazeGame3D.cameraMode;
    let newMode, modeText;
    
    // Cycle : première personne -> troisième personne -> vue aérienne -> première personne
    if (currentMode === 'firstPerson') {
      newMode = 'thirdPerson';
      modeText = '👤 Troisième Personne';
    } else if (currentMode === 'thirdPerson') {
      newMode = 'topDown';
      modeText = '🦅 Vue Aérienne';
    } else {
      newMode = 'firstPerson';
      modeText = '👁️ Première Personne';
    }
    
    mazeGame3D.setCameraMode(newMode);
    updateStatus("maze", `Vue changée vers ${modeText}`, "info");
  }
}

function nextLevel() {
  console.log('Appel à nextLevel...');
  if (mazeGame3D) {
    mazeGame3D.nextLevel();
    document.getElementById('next-level-btn').style.display = 'none';
  }
}

function resetProgress() {
  if (confirm('Êtes-vous sûr de réinitialiser tout le progrès ?')) {
    localStorage.removeItem('kaamelottMazeProgress');
    location.reload();
  }
}

// ============= ÉVÉNEMENTS =============

function setupMazeEventListeners() {
  console.log('Configuration des écouteurs d\'événements du labyrinthe...');
  
  window.addEventListener('mazeUIUpdate', (event) => {
    const data = event.detail;
    
    const levelIndicator = document.getElementById('level-indicator');
    const coinsCounter = document.getElementById('coins-counter');
    const totalCoins = document.getElementById('total-coins');
    const progressBar = document.getElementById('progress-bar');
    
    if (levelIndicator) levelIndicator.textContent = `Niveau ${data.currentLevel}/${data.maxLevel}`;
    if (coinsCounter) coinsCounter.textContent = `💰 ${data.coins}/${data.requiredCoins}`;
    if (totalCoins) totalCoins.textContent = data.totalCoins;
    if (progressBar) progressBar.style.width = `${(data.coins / data.requiredCoins) * 100}%`;
  });

  window.addEventListener('levelComplete', (event) => {
    const data = event.detail;
    updateStatus("maze", `🎉 Niveau ${data.level} complété en ${data.time}s !`, "success");
    
    const nextBtn = document.getElementById('next-level-btn');
    if (nextBtn) nextBtn.style.display = 'inline-block';
    
    setTimeout(() => nextLevel(), 3000);
  });

  window.addEventListener('treasureFound', (event) => {
    const data = event.detail;
    updateStatus("maze", `🏆 FÉLICITATIONS ! Vous avez complété tous les niveaux avec ${data.totalCoins} pièces !`, "success");
    showFinalVictoryMessage(data);
  });
}

function showFinalVictoryMessage(data) {
  const mazeStatus = document.getElementById('maze-status');
  if (!mazeStatus) return;
  
  mazeStatus.innerHTML = `
    <div class="final-victory">
      <h2>🏆 QUÊTE COMPLÈTE !</h2>
      <p>Arthur a trouvé le trésor de la Dame du Lac !</p>
      <div class="victory-stats">
        <div class="victory-stat"><strong>Temps :</strong> ${data.time}s</div>
        <div class="victory-stat"><strong>Pièces :</strong> ${data.totalCoins}</div>
        <div class="victory-stat"><strong>Niveaux :</strong> 5/5</div>
      </div>
      <button class="control-btn" onclick="resetProgress()">🔄 Rejouer</button>
    </div>
  `;
  mazeStatus.className = 'status victory';
}

let gameTimer;

function startGameTimer() {
  if (gameTimer) clearInterval(gameTimer);
  
  const startTime = Date.now();
  gameTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const displaySeconds = seconds % 60;
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

function updateStatus(phase, message, type = "info") {
  const statusElement = document.getElementById(phase + "-status");
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = "status " + type;
  }
  console.log(`Status [${phase}]:`, message);
}

window.addEventListener('mazeUIUpdate', () => {
  if (!gameTimer) startGameTimer();
});