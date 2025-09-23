// Variables globales pour Leaflet
let map;
let kaamelottMarker, labyrinthMarker;
let waypoints = [];
let waypointMarkers = [];
let routingControl;
let customRoute;
let maze = [];
let mazeSize = 21;
let arthurPosition = null;
let solutionPath = [];

// Coordonnées réelles (format Leaflet: [lat, lng])
const kaamelottCoords = [43.3124, -0.3668]; // Pôle Lahérrère, Pau
const labyrinthCoords = [43.2933, -0.3708]; // Château de Pau

// Points de passage prédéfinis autour de Pau avec coordonnées réelles
const predefinedWaypoints = [
  [43.305, -0.365, "Place Verdun", "🏛️"],
  [43.298, -0.372, "Université de Pau", "🎓"],
  [43.31, -0.36, "Parc Lawrence", "🌳"],
  [43.3, -0.368, "Centre-ville de Pau", "🏪"],
  [43.315, -0.372, "Boulevard des Pyrénées", "🏔️"],
  [43.308, -0.359, "Stade du Hameau", "⚽"],
  [43.295, -0.375, "Gare SNCF de Pau", "🚂"],
];

// Initialisation
window.onload = function () {
  initMap();
  generateMaze();
};

function initMap() {
  // Initialiser la carte Leaflet avec une vue centrée sur Pau
  map = L.map("map").setView([43.3028, -0.3678], 14);

  // Ajouter plusieurs couches de tuiles pour plus de richesse
  const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }
  );

  const cartoLayer = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: "© CARTO © OpenStreetMap contributors",
      maxZoom: 19,
    }
  );

  // Ajouter la couche par défaut
  osmLayer.addTo(map);

  // Contrôleur de couches
  const baseMaps = {
    OpenStreetMap: osmLayer,
    "CartoDB Voyager": cartoLayer,
  };
  L.control.layers(baseMaps).addTo(map);

  // Créer des icônes personnalisées avec Leaflet
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

  // Marqueur Kaamelott avec popup enrichi
  kaamelottMarker = L.marker(kaamelottCoords, { icon: kaamelottIcon })
    .addTo(map)
    .bindPopup(
      `
                    <div style="text-align: center;">
                        <h3>🏰 Kaamelott</h3>
                        <p><strong>Pôle Lahérrère, Pau</strong></p>
                        <p>Point de départ de la quête</p>
                        <p><em>Coords: ${kaamelottCoords[0]}, ${kaamelottCoords[1]}</em></p>
                    </div>
                `,
      {
        maxWidth: 250,
      }
    );

  // Marqueur Labyrinthe avec popup enrichi
  labyrinthMarker = L.marker(labyrinthCoords, { icon: labyrinthIcon })
    .addTo(map)
    .bindPopup(
      `
                    <div style="text-align: center;">
                        <h3>🌀 Entrée du Labyrinthe</h3>
                        <p><strong>Château de Pau</strong></p>
                        <p>Destination finale</p>
                        <p><em>Coords: ${labyrinthCoords[0]}, ${labyrinthCoords[1]}</em></p>
                    </div>
                `,
      {
        maxWidth: 250,
      }
    );

  // Ajouter des cercles pour visualiser les zones
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

  // Ajouter les premiers points de passage par défaut
  predefinedWaypoints.slice(0, 3).forEach((wp, index) => {
    addWaypointAt(wp[0], wp[1], wp[2], wp[3]);
  });
}

function showPhase(phase) {
  document
    .querySelectorAll(".phase-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll('[id$="-container"]')
    .forEach((container) => container.classList.remove("active"));

  event.target.classList.add("active");
  document.getElementById(phase + "-container").classList.add("active");

  if (phase === "map" && map) {
    setTimeout(() => map.invalidateSize(), 100);
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
    .bindPopup(
      `
                    <div style="text-align: center;">
                        <h4>${emoji} ${name}</h4>
                        <p>Point de passage #${waypoints.length + 1}</p>
                        <p><em>Coords: ${lat.toFixed(4)}, ${lng.toFixed(
        4
      )}</em></p>
                    </div>
                `,
      {
        maxWidth: 200,
      }
    );

  waypoints.push({
    marker: marker,
    coords: [lat, lng],
    name: name,
    emoji: emoji,
  });
  waypointMarkers.push(marker);

  // Ajouter un cercle autour du point
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

  updateStatus(
    "map",
    "Calcul du chemin optimal avec Leaflet Routing...",
    "loading"
  );

  // Supprimer l'ancien routage s'il existe
  clearPath();

  setTimeout(() => {
    // Construire la liste des waypoints pour le routage
    let routeWaypoints = [L.latLng(kaamelottCoords[0], kaamelottCoords[1])];

    // Algorithme du plus proche voisin pour optimiser l'ordre des waypoints
    let unvisitedWaypoints = [...waypoints];
    let currentPos = kaamelottCoords;

    while (unvisitedWaypoints.length > 0) {
      let nearest = unvisitedWaypoints[0];
      let nearestIndex = 0;
      let minDistance = calculateDistance(currentPos, nearest.coords);

      for (let i = 1; i < unvisitedWaypoints.length; i++) {
        let distance = calculateDistance(
          currentPos,
          unvisitedWaypoints[i].coords
        );
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

    // Ajouter la destination finale
    routeWaypoints.push(L.latLng(labyrinthCoords[0], labyrinthCoords[1]));

    // Créer le contrôle de routage Leaflet
    routingControl = L.Routing.control({
      waypoints: routeWaypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: function () {
        return null;
      }, // Pas de marqueurs supplémentaires
      lineOptions: {
        styles: [
          {
            color: "#4169E1",
            weight: 6,
            opacity: 0.8,
            dashArray: "10, 5",
          },
        ],
      },
      show: true,
      collapsible: true,
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
        profile: "walking", // Utiliser le profil piéton
      }),
    }).addTo(map);

    // Écouter l'événement de routage terminé
    routingControl.on("routesfound", function (e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      const distance = (summary.totalDistance / 1000).toFixed(2);
      const time = Math.round(summary.totalTime / 60);

      updateStatus(
        "map",
        `🎯 Chemin optimal calculé ! Distance: ${distance} km | Temps de marche: ${time} min`,
        "success"
      );
    });

    routingControl.on("routingerror", function (e) {
      updateStatus(
        "map",
        "Erreur lors du calcul du chemin. Utilisation du chemin direct.",
        "error"
      );
      // Fallback vers notre méthode manuelle
      createManualRoute(routeWaypoints);
    });
  }, 1000);
}

function createManualRoute(waypoints) {
  // Créer une ligne manuelle si le routage OSRM échoue
  const pathCoords = waypoints.map((wp) => [wp.lat, wp.lng]);

  customRoute = L.polyline(pathCoords, {
    color: "#4169E1",
    weight: 6,
    opacity: 0.8,
    dashArray: "10, 5",
  }).addTo(map);

  // Calculer la distance totale
  let totalDistance = 0;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    totalDistance += calculateDistance(pathCoords[i], pathCoords[i + 1]);
  }

  updateStatus(
    "map",
    `Chemin direct calculé ! Distance estimée: ${totalDistance.toFixed(2)} km`,
    "success"
  );
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
  // Utiliser la méthode de distance de Leaflet (plus précise)
  const latlng1 = L.latLng(coord1[0], coord1[1]);
  const latlng2 = L.latLng(coord2[0], coord2[1]);
  return latlng1.distanceTo(latlng2) / 1000; // Convertir en kilomètres
}

function centerOnKaamelott() {
  map.setView(kaamelottCoords, 15);
  kaamelottMarker.openPopup();
}

// Génération du labyrinthe
function generateMaze() {
  updateStatus("maze", "Génération du labyrinthe mystérieux...", "loading");

  setTimeout(() => {
    maze = [];

    // Initialiser avec des murs
    for (let i = 0; i < mazeSize; i++) {
      maze[i] = [];
      for (let j = 0; j < mazeSize; j++) {
        maze[i][j] = 1; // 1 = mur, 0 = chemin
      }
    }

    // Algorithme de génération (DFS avec backtracking)
    generateMazeRecursive(1, 1);

    // Assurer l'entrée et la sortie
    maze[1][1] = 0; // Entrée
    maze[mazeSize - 2][mazeSize - 2] = 0; // Sortie

    renderMaze();
    updateStatus(
      "maze",
      "Labyrinthe généré ! Résolvez-le pour trouver le trésor.",
      "success"
    );
  }, 1000);
}

function generateMazeRecursive(x, y) {
  const directions = [
    [2, 0],
    [0, 2],
    [-2, 0],
    [0, -2],
  ];
  directions.sort(() => Math.random() - 0.5); // Mélanger

  maze[x][y] = 0;

  for (let [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    if (
      nx >= 1 &&
      nx < mazeSize - 1 &&
      ny >= 1 &&
      ny < mazeSize - 1 &&
      maze[nx][ny] === 1
    ) {
      maze[x + dx / 2][y + dy / 2] = 0; // Casser le mur entre
      generateMazeRecursive(nx, ny);
    }
  }
}

function renderMaze() {
  const mazeElement = document.getElementById("maze");
  mazeElement.innerHTML = "";
  mazeElement.style.gridTemplateColumns = `repeat(${mazeSize}, 25px)`;

  for (let i = 0; i < mazeSize; i++) {
    for (let j = 0; j < mazeSize; j++) {
      const cell = document.createElement("div");
      cell.className = "maze-cell";
      cell.dataset.x = i;
      cell.dataset.y = j;

      if (maze[i][j] === 1) {
        cell.classList.add("wall");
      } else {
        cell.classList.add("path");
      }

      if (i === 1 && j === 1) {
        cell.classList.add("start");
      } else if (i === mazeSize - 2 && j === mazeSize - 2) {
        cell.classList.add("end");
      }

      mazeElement.appendChild(cell);
    }
  }
}

function solveMaze() {
  updateStatus("maze", "Résolution du labyrinthe en cours...", "loading");

  setTimeout(() => {
    // Algorithme A* pour résoudre le labyrinthe
    const start = { x: 1, y: 1 };
    const end = { x: mazeSize - 2, y: mazeSize - 2 };

    solutionPath = findPathAStar(start, end);

    if (solutionPath.length > 0) {
      // Afficher la solution
      solutionPath.forEach(({ x, y }) => {
        const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (
          cell &&
          !cell.classList.contains("start") &&
          !cell.classList.contains("end")
        ) {
          cell.classList.add("solution");
        }
      });

      updateStatus(
        "maze",
        `Solution trouvée ! Chemin de ${solutionPath.length} cases.`,
        "success"
      );
    } else {
      updateStatus(
        "maze",
        "Aucune solution trouvée ! Générez un nouveau labyrinthe.",
        "error"
      );
    }
  }, 1000);
}

function findPathAStar(start, end) {
  const openSet = [start];
  const closedSet = [];
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  gScore[`${start.x},${start.y}`] = 0;
  fScore[`${start.x},${start.y}`] = heuristic(start, end);

  while (openSet.length > 0) {
    // Trouver le nœud avec le plus petit fScore
    let current = openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      if (
        fScore[`${openSet[i].x},${openSet[i].y}`] <
        fScore[`${current.x},${current.y}`]
      ) {
        current = openSet[i];
        currentIndex = i;
      }
    }

    if (current.x === end.x && current.y === end.y) {
      // Reconstruire le chemin
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

    const neighbors = getNeighbors(current);

    for (let neighbor of neighbors) {
      if (
        closedSet.some((node) => node.x === neighbor.x && node.y === neighbor.y)
      ) {
        continue;
      }

      const tentativeGScore = gScore[`${current.x},${current.y}`] + 1;

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
        tentativeGScore + heuristic(neighbor, end);
    }
  }

  return [];
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node) {
  const neighbors = [];
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  for (let [dx, dy] of directions) {
    const x = node.x + dx;
    const y = node.y + dy;

    if (x >= 0 && x < mazeSize && y >= 0 && y < mazeSize && maze[x][y] === 0) {
      neighbors.push({ x, y });
    }
  }

  return neighbors;
}

function startArthurJourney() {
  if (solutionPath.length === 0) {
    updateStatus("maze", "Résolvez d'abord le labyrinthe !", "error");
    return;
  }

  resetMaze();
  arthurPosition = { x: 1, y: 1 };

  const cell = document.querySelector(`[data-x="1"][data-y="1"]`);
  cell.classList.add("arthur");

  updateStatus(
    "maze",
    "Arthur commence son périple vers le trésor...",
    "loading"
  );

  // Animer le déplacement d'Arthur
  let stepIndex = 1;
  const interval = setInterval(() => {
    if (stepIndex >= solutionPath.length) {
      clearInterval(interval);
      updateStatus(
        "maze",
        "🎉 Félicitations ! Arthur a trouvé le trésor ! 🎉",
        "success"
      );
      return;
    }

    // Enlever Arthur de sa position actuelle
    const oldCell = document.querySelector(
      `[data-x="${arthurPosition.x}"][data-y="${arthurPosition.y}"]`
    );
    oldCell.classList.remove("arthur");
    oldCell.classList.add("visited");

    // Déplacer Arthur
    arthurPosition = solutionPath[stepIndex];
    const newCell = document.querySelector(
      `[data-x="${arthurPosition.x}"][data-y="${arthurPosition.y}"]`
    );
    newCell.classList.add("arthur");

    stepIndex++;
  }, 500);
}

function resetMaze() {
  document.querySelectorAll(".maze-cell").forEach((cell) => {
    cell.classList.remove("arthur", "visited", "solution");
  });
  solutionPath = [];
  arthurPosition = null;
}

function updateStatus(phase, message, type = "info") {
  const statusElement = document.getElementById(phase + "-status");
  statusElement.textContent = message;
  statusElement.className = "status " + type;
}
