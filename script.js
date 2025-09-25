// =============================================
// Variables globales pour la gestion de la carte et du labyrinthe
// =============================================
let map; // Instance de la carte Leaflet
let kaamelottMarker, labyrinthMarker; // Marqueurs pour les lieux principaux
let waypoints = []; // Liste des points de passage
let waypointMarkers = []; // Liste des marqueurs des points de passage
let routingControl; // Contrôleur de routage Leaflet
let customRoute; // Route personnalisée si le routage échoue
let maze = []; // Tableau 2D représentant le labyrinthe
let mazeSize = 21; // Taille par défaut du labyrinthe
let arthurPosition = null; // Position actuelle d'Arthur dans le labyrinthe
let solutionPath = []; // Chemin solution du labyrinthe
let appData = null; // Données chargées depuis le fichier JSON
let waypointCircles = []; // Liste des cercles des points de passage
let commercesPau = [];

// =============================================
// Charger les données depuis le fichier data.json
// =============================================
async function loadData() {
  try {
    // Récupérer et parser le fichier JSON
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error(`Erreur HTTP! Statut: ${response.status}`);
    }
    appData = await response.json();
    return appData;
  } catch (error) {
    // Gérer les erreurs de chargement
    console.error("Erreur lors du chargement du fichier JSON :", error);
    return null;
  }
}

// =============================================
// Charger les commerces de Pau
// =============================================
async function loadCommercesPau() {
  try {
    const response = await fetch("pau.json");
    if (!response.ok) throw new Error("Erreur de chargement");
    const data = await response.json();

    // CORRECTION: Adapter la structure du JSON pau.json
    commercesPau = data.filter((item) => {
      const lat = item.geo_point_2d.lat;
      const lng = item.geo_point_2d.lon;
      return lat > 43.2 && lat < 43.4 && lng > -0.45 && lng < -0.3;
    });
    console.log("Commerces de Pau chargés :", commercesPau.length);
  } catch (error) {
    console.error("Erreur :", error);
    updateStatus("map", "Impossible de charger les commerces de Pau.", "error");
  }
}

// =============================================
// Initialisation de l'application au chargement de la page
// =============================================
window.onload = async function () {
  await loadCommercesPau(); // Charger les commerces AVANT
  appData = await loadData();
  if (appData) {
    initMap(); // Initialiser la carte
    generateMaze(); // Générer le labyrinthe
  } else {
    updateStatus("map", "Impossible de charger les données.", "error");
  }
};

// =============================================
// Initialiser la carte Leaflet avec les paramètres du JSON
// =============================================
function initMap() {
  // Récupérer les paramètres de la carte depuis appData
  const { center, zoom, tileLayers } = appData.mapSettings;
  // Créer la carte centrée sur les coordonnées spécifiées
  map = L.map("map", {
    center: center,
    zoom: zoom,
    attributionControl: false,
    minZoom: 13, // Empêche de dézoomer au-delà de ce niveau
    maxZoom: 17, // Empêche de zoomer au-delà de ce niveau
  });

  // CORRECTION: Un seul gestionnaire d'événement contextmenu
  map.on("contextmenu", function (e) {
    e.originalEvent.preventDefault(); // Désactive le menu contextuel

    const { lat, lng } = e.latlng;
    const { commerce: nearest, distance } = findNearestCommerce(lat, lng);
    const MAX_DISTANCE = 500; // Seuil en mètres

    if (nearest && distance <= MAX_DISTANCE) {
      addWaypointAt(
        nearest.coords[0],
        nearest.coords[1],
        nearest.name,
        nearest.icon,
        waypoints.length + 1
      );
      updateStatus(
        "map",
        `✅ Waypoint ajouté : ${nearest.name} (${distance.toFixed(0)}m)`,
        "success"
      );
    } else {
      updateStatus(
        "map",
        `❌ Aucun commerce trouvé à moins de ${MAX_DISTANCE}m.`,
        "error"
      );
    }
  });

  // Ajouter les couches de tuiles (ex: OpenStreetMap)
  const layers = {};
  tileLayers.forEach((layer) => {
    const tileLayer = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: layer.maxZoom,
    });
    layers[layer.name] = tileLayer;
    if (Object.keys(layers)[0] === layer.name) {
      tileLayer.addTo(map); // Ajouter la première couche par défaut
    }
  });

  // Ajouter les marqueurs principaux (Kaamelott et Labyrinthe)
  appData.mainLocations.forEach((location) => {
    const icon = L.divIcon(location.icon);
    const marker = L.marker(location.coords, { icon: icon })
      .addTo(map)
      .bindPopup(
        location.popupContent
          .replace("{lat}", location.coords[0])
          .replace("{lng}", location.coords[1]),
        { maxWidth: 250 }
      );

    // Stocker les marqueurs dans des variables globales pour un accès facile
    if (location.id === "kaamelott") {
      kaamelottMarker = marker;
    } else if (location.id === "labyrinth") {
      labyrinthMarker = marker;
    }

    // Ajouter un cercle autour du marqueur pour une meilleure visibilité
    L.circle(location.coords, {
      color: location.id === "kaamelott" ? "#32CD32" : "#FF6B6B",
      fillColor: location.id === "kaamelott" ? "#32CD32" : "#FF6B6B",
      fillOpacity: 0.1,
      radius: 60,
    }).addTo(map);
  });

  // Ajouter les premiers points de passage par défaut
  appData.waypoints.slice(0, 3).forEach((waypoint, index) => {
    addWaypointAt(
      waypoint.coords[0],
      waypoint.coords[1],
      waypoint.name,
      waypoint.emoji,
      index + 1
    );
  });
}

// =============================================
// Obtenir l'icône selon le type de commerce
// =============================================
function getCommerceIcon(types) {
  if (!types || types.length === 0) return "🏪";

  // Prendre le premier type pour déterminer l'icône
  const primaryType = types[0];

  const iconMap = {
    clothes: "👕",
    restaurant: "🍽️",
    fast_food: "🍔",
    hairdresser: "💇",
    bar: "🍺",
    bank: "🏦",
    beauty: "💄",
    pharmacy: "💊",
    jewelry: "💎",
    tattoo: "🔖",
    florist: "🌸",
    pub: "🍻",
    "e-cigarette": "💨",
    tobacco: "🚬",
    bakery: "🥖",
    convenience: "🛒",
    cafe: "☕",
    car_repair: "🔧",
    car: "🚗",
    supermarket: "🛍️",
    shoes: "👟",
    car_wash: "🧽",
    optician: "👓",
  };

  return iconMap[primaryType] || "🏪";
}

// =============================================
// Trouver le commerce le plus proche
// =============================================
function findNearestCommerce(lat, lng) {
  const clickCoords = [lat, lng];
  let nearest = null;
  let minDistance = Infinity;

  commercesPau.forEach((item) => {
    // CORRECTION: Adapter à la structure du JSON pau.json
    const commerceLat = item.geo_point_2d.lat;
    const commerceLng = item.geo_point_2d.lon;
    const distance =
      calculateDistance(clickCoords, [commerceLat, commerceLng]) * 1000; // Convertir en mètres

    if (distance < minDistance) {
      minDistance = distance;
      const commerceIcon = getCommerceIcon(item.type);
      nearest = {
        name: item.name || "Commerce inconnu",
        coords: [commerceLat, commerceLng],
        type: item.type ? item.type.join(", ") : "inconnu",
        icon: commerceIcon,
        address: item.address || "Adresse inconnue",
      };
    }
  });

  return { commerce: nearest, distance: minDistance };
}

// =============================================
// Afficher une phase spécifique (map, maze, etc.)
// =============================================
function showPhase(phase) {
  // Désactiver tous les boutons et conteneurs
  document
    .querySelectorAll(".phase-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll('[id$="-container"]')
    .forEach((container) => container.classList.remove("active"));

  // Activer le bouton et le conteneur sélectionnés
  event.target.classList.add("active");
  document.getElementById(phase + "-container").classList.add("active");

  // Réinitialiser la taille de la carte si nécessaire
  if (phase === "map" && map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

// =============================================
// Ajouter un point de passage depuis la liste des waypoints
// =============================================
function addWaypoint() {
  if (waypoints.length < appData.waypoints.length) {
    const wp = appData.waypoints[waypoints.length];
    addWaypointAt(
      wp.coords[0],
      wp.coords[1],
      wp.name,
      wp.emoji,
      waypoints.length + 1
    );
    updateStatus("map", `Point de passage "${wp.name}" ajouté !`, "success");
  } else {
    updateStatus("map", "Tous les points de passage ont été ajoutés !", "info");
  }
}

// =============================================
// Ajouter un point de passage à la carte
// =============================================
function addWaypointAt(lat, lng, name, emoji, index) {
  // CORRECTION: Créer un waypoint générique si pas trouvé dans appData
  let waypoint = appData.waypoints.find((wp) => wp.name === name);

  if (!waypoint) {
    // Créer un waypoint générique pour les commerces
    waypoint = {
      icon: {
        className: "waypoint-marker",
        html: `<div class="marker-content">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      },
      popupContent: `<b>${emoji} ${name}</b><br/>Point de passage #${index}<br/>📍 ${lat.toFixed(
        4
      )}, ${lng.toFixed(4)}`,
    };
  }

  const waypointIcon = L.divIcon(waypoint.icon);
  const marker = L.marker([lat, lng], { icon: waypointIcon })
    .addTo(map)
    .bindPopup(
      waypoint.popupContent
        .replace("{emoji}", emoji)
        .replace("{name}", name)
        .replace("{index}", index)
        .replace("{lat}", lat.toFixed(4))
        .replace("{lng}", lng.toFixed(4)),
      { maxWidth: 200 }
    );

  // Stocker les informations du point de passage
  waypoints.push({
    marker: marker,
    coords: [lat, lng],
    name: name,
    emoji: emoji,
  });
  waypointMarkers.push(marker);

  // Ajouter un cercle autour du point pour une meilleure visibilité
  const circle = L.circle([lat, lng], {
    color: "#FFD700",
    fillColor: "#FFD700",
    fillOpacity: 0.1,
    radius: 100,
  }).addTo(map);

  // Stocker le cercle dans la liste globale
  waypointCircles.push(circle);
}

// =============================================
// Effacer tous les waypoints de la carte
// =============================================
function clearWaypoints() {
  // Supprimer les marqueurs des waypoints de la carte
  waypointMarkers.forEach((marker) => {
    map.removeLayer(marker);
  });

  // Supprimer les cercles des waypoints de la carte
  waypointCircles.forEach((circle) => {
    map.removeLayer(circle);
  });

  // Réinitialiser les listes de waypoints, marqueurs et cercles
  waypoints = [];
  waypointMarkers = [];
  waypointCircles = [];

  // Effacer le chemin actuel si nécessaire
  clearPath();

  // Mettre à jour le statut
  updateStatus(
    "map",
    "Tous les points de passage ont été effacés !",
    "success"
  );
}

// =============================================
// Trouver le chemin le plus court entre les points de passage
// =============================================
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
    let routeWaypoints = [
      L.latLng(
        appData.mainLocations[0].coords[0],
        appData.mainLocations[0].coords[1]
      ),
    ];

    // Algorithme du plus proche voisin pour optimiser l'ordre des waypoints
    let unvisitedWaypoints = [...waypoints];
    let currentPos = appData.mainLocations[0].coords;

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
    routeWaypoints.push(
      L.latLng(
        appData.mainLocations[1].coords[0],
        appData.mainLocations[1].coords[1]
      )
    );

    // Créer le contrôle de routage Leaflet
    routingControl = L.Routing.control({
      waypoints: routeWaypoints,
      show: false,
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: function () {
        return null;
      },
      lineOptions: {
        styles: [
          {
            color: "var(--gold)",
            weight: 2,
            opacity: 0.8,
            dashArray: "10, 5",
          },
        ],
      },
      collapsible: true,
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
        profile: "walking",
      }),
    }).addTo(map);

    // Gérer la réponse du routage
    routingControl.on("routesfound", function (e) {
      const routes = e.routes;
      const summary = routes[0].summary;

      // Distance en km
      const distance = (summary.totalDistance / 1000).toFixed(2);

      // Vitesse de marche en km/h
      const speed = 5;

      // Temps en heures (distance ÷ vitesse)
      const timeHours = distance / speed;

      // Conversion en heures et minutes
      const hours = Math.floor(timeHours);
      const minutes = Math.round((timeHours - hours) * 60);

      // Construire la chaîne de temps
      let timeString = "";
      if (hours > 0) {
        timeString += `${hours} heure${hours > 1 ? "s" : ""}`;
        if (minutes > 0) {
          timeString += ` et ${minutes} min`;
        }
      } else {
        timeString = `${minutes} min`;
      }

      updateStatus(
        "map",
        `🎯 Chemin optimal calculé ! Distance: ${distance} km | Temps de marche: ${timeString}`,
        "success"
      );
    });

    // Gérer les erreurs de routage
    routingControl.on("routingerror", function (e) {
      updateStatus(
        "map",
        "Erreur lors du calcul du chemin. Utilisation du chemin direct.",
        "error"
      );
      createManualRoute(routeWaypoints);
    });
  }, 1000);
}

// =============================================
// Créer une route manuelle si le routage échoue
// =============================================
function createManualRoute(waypoints) {
  const pathCoords = waypoints.map((wp) => [wp.lat, wp.lng]);
  customRoute = L.polyline(pathCoords, {
    color: "#4169E1",
    weight: 6,
    opacity: 0.8,
    dashArray: "10, 5",
  }).addTo(map);

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

// =============================================
// Effacer le chemin actuel
// =============================================
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

// =============================================
// Calculer la distance entre deux coordonnées (en km)
// =============================================
function calculateDistance(coord1, coord2) {
  const latlng1 = L.latLng(coord1[0], coord1[1]);
  const latlng2 = L.latLng(coord2[0], coord2[1]);
  return latlng1.distanceTo(latlng2) / 1000;
}

// =============================================
// Centrer la carte sur Kaamelott
// =============================================
function centerOnKaamelott() {
  map.setView(appData.mainLocations[0].coords, 15);
  kaamelottMarker.openPopup();
}

// =============================================
// Générer un labyrinthe aléatoire
// =============================================
function generateMaze() {
  const settings = appData.mazeSettings;
  mazeSize = settings.size;
  updateStatus("maze", "Génération du labyrinthe mystérieux...", "loading");

  setTimeout(() => {
    // Initialiser le labyrinthe avec des murs
    maze = [];
    for (let i = 0; i < mazeSize; i++) {
      maze[i] = [];
      for (let j = 0; j < mazeSize; j++) {
        maze[i][j] = 1; // 1 = mur
      }
    }

    // Générer le labyrinthe récursivement
    generateMazeRecursive(settings.start.x, settings.start.y);
    maze[settings.start.x][settings.start.y] = 0; // 0 = chemin
    maze[settings.end.x][settings.end.y] = 0;

    renderMaze(); // Afficher le labyrinthe
    updateStatus(
      "maze",
      "Labyrinthe généré ! Résolvez-le pour trouver le trésor.",
      "success"
    );
  }, 1000);
}

// =============================================
// Générer le labyrinthe de manière récursive
// =============================================
function generateMazeRecursive(x, y) {
  const directions = [
    [2, 0], // Droite
    [0, 2], // Bas
    [-2, 0], // Gauche
    [0, -2], // Haut
  ];
  directions.sort(() => Math.random() - 0.5); // Mélanger les directions

  maze[x][y] = 0; // Marquer la case actuelle comme chemin

  for (let [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;

    // Vérifier si la case voisine est valide
    if (
      nx >= 1 &&
      nx < mazeSize - 1 &&
      ny >= 1 &&
      ny < mazeSize - 1 &&
      maze[nx][ny] === 1
    ) {
      maze[x + dx / 2][y + dy / 2] = 0; // Ouvrir un passage
      generateMazeRecursive(nx, ny);
    }
  }
}

// =============================================
// Afficher le labyrinthe dans le DOM
// =============================================
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

      // Marquer le départ et l'arrivée
      if (
        i === appData.mazeSettings.start.x &&
        j === appData.mazeSettings.start.y
      ) {
        cell.classList.add("start");
      } else if (
        i === appData.mazeSettings.end.x &&
        j === appData.mazeSettings.end.y
      ) {
        cell.classList.add("end");
      }

      mazeElement.appendChild(cell);
    }
  }
}

// =============================================
// Résoudre le labyrinthe avec l'algorithme A*
// =============================================
function solveMaze() {
  updateStatus("maze", "Résolution du labyrinthe en cours...", "loading");

  setTimeout(() => {
    const start = {
      x: appData.mazeSettings.start.x,
      y: appData.mazeSettings.start.y,
    };
    const end = {
      x: appData.mazeSettings.end.x,
      y: appData.mazeSettings.end.y,
    };

    solutionPath = findPathAStar(start, end);

    if (solutionPath.length > 0) {
      // Colorier le chemin solution
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

// =============================================
// Trouver le chemin avec l'algorithme A*
// =============================================
function findPathAStar(start, end) {
  const openSet = [start];
  const closedSet = [];
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  gScore[`${start.x},${start.y}`] = 0;
  fScore[`${start.x},${start.y}`] = heuristic(start, end);

  while (openSet.length > 0) {
    // Trouver le nœud avec le score f le plus bas
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

    // Si on a atteint la fin, reconstruire le chemin
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

    // Explorer les voisins
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

// =============================================
// Heuristique pour A* (distance de Manhattan)
// =============================================
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// =============================================
// Récupérer les voisins valides d'une case
// =============================================
function getNeighbors(node) {
  const neighbors = [];
  const directions = [
    [1, 0], // Droite
    [0, 1], // Bas
    [-1, 0], // Gauche
    [0, -1], // Haut
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

// =============================================
// Faire avancer Arthur dans le labyrinthe
// =============================================
function startArthurJourney() {
  if (solutionPath.length === 0) {
    updateStatus("maze", "Résolvez d'abord le labyrinthe !", "error");
    return;
  }

  resetMaze();
  arthurPosition = {
    x: appData.mazeSettings.start.x,
    y: appData.mazeSettings.start.y,
  };
  const cell = document.querySelector(
    `[data-x="${arthurPosition.x}"][data-y="${arthurPosition.y}"]`
  );
  cell.classList.add("arthur");

  updateStatus(
    "maze",
    "Arthur commence son périple vers le trésor...",
    "loading"
  );

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

    // Déplacer Arthur
    const oldCell = document.querySelector(
      `[data-x="${arthurPosition.x}"][data-y="${arthurPosition.y}"]`
    );
    oldCell.classList.remove("arthur");
    oldCell.classList.add("visited");

    arthurPosition = solutionPath[stepIndex];
    const newCell = document.querySelector(
      `[data-x="${arthurPosition.x}"][data-y="${arthurPosition.y}"]`
    );
    newCell.classList.add("arthur");

    stepIndex++;
  }, 500);
}

// =============================================
// Réinitialiser le labyrinthe
// =============================================
function resetMaze() {
  document.querySelectorAll(".maze-cell").forEach((cell) => {
    cell.classList.remove("arthur", "visited", "solution");
  });
  solutionPath = [];
  arthurPosition = null;
}

// =============================================
// Mettre à jour le statut (message d'information)
// =============================================
function updateStatus(phase, message, type = "info") {
  const statusElement = document.getElementById(phase + "-status");
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = "status " + type;
  }
}
