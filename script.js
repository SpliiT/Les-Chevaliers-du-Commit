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

  // Gestionnaire d'événement pour le clic droit (ajout de waypoint)
  map.on("contextmenu", function (e) {
    e.originalEvent.preventDefault(); // Désactive le menu contextuel

    const { lat, lng } = e.latlng;
    const { commerce: nearest, distance } = findNearestCommerce(lat, lng);
    const MAX_DISTANCE = 500; // Seuil en mètres

    if (nearest && distance <= MAX_DISTANCE) {
      // Obtenir le type principal du commerce pour le stocker
      const primaryType = nearest.type.split(", ")[0];

      addWaypointAt(
        nearest.coords[0],
        nearest.coords[1],
        nearest.name,
        nearest.icon,
        waypoints.length + 1,
        primaryType // Passer le type de commerce
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
      radius: 100,
    }).addTo(map);
  });

  updateStatus(
    "map",
    "Carte initialisée. Clic droit pour ajouter des waypoints.",
    "success"
  );
}

// =============================================
// Obtenir l'icône selon le type de commerce
// =============================================
function getCommerceIcon(types) {
  if (!types || types.length === 0) return "🏪";

  // Prendre le premier type pour déterminer l'icône
  const primaryType = types[0];

  const iconMap = {
    clothes: "<img src='/icons/clothes.png' width='35' height='35'/>",
    restaurant: "<img src='/icons/restaurant.png' width='35' height='35'/>",
    fast_food: "<img src='/icons/fast_food.png' width='35' height='35'/>",
    hairdresser: "<img src='/icons/hairdresser.png' width='35' height='35'/>",
    bar: "<img src='/icons/bar.png' width='35' height='35'/>",
    bank: "<img src='/icons/bank.png' width='35' height='35'/>",
    beauty: "<img src='/icons/beauty.png' width='35' height='35'/>",
    pharmacy: "<img src='/icons/pharmacy.png' width='35' height='35'/>",
    jewelry: "<img src='/icons/jewelry.png' width='35' height='35'/>",
    tattoo: "<img src='/icons/tattoo.png' width='35' height='35'/>",
    florist: "<img src='/icons/florist.png' width='35' height='35'/>",
    pub: "<img src='/icons/pub.png' width='35' height='35'/>",
    "e-cigarette": "<img src='/icons/e-cigarette.png' width='35' height='35'/>",
    tobacco: "<img src='/icons/tobacco.png' width='35' height='35'/>",
    bakery: "<img src='/icons/bakery.png' width='35' height='35'/>",
    convenience: "<img src='/icons/convenience.png' width='35' height='35'/>",
    cafe: "<img src='/icons/cafe.png' width='35' height='35'/>",
    car_repair: "<img src='/icons/car_repair.png' width='35' height='35'/>",
    car: "<img src='/icons/car.png' width='35' height='35'/>",
    supermarket: "<img src='/icons/supermarket.png' width='35' height='35'/>",
    shoes: "<img src='/icons/shoes.png' width='35' height='35'/>",
    car_wash: "<img src='/icons/car_wash.png' width='35' height='35'/>",
    optician: "<img src='/icons/optician.png' width='35' height='35'/>",
    butcher: "<img src='/icons/butcher.png' width='35' height='35'/>",
    sports: "<img src='/icons/sports.png' width='35' height='35'/>",
    books: "<img src='/icons/books.png' width='35' height='35'/>",
    toys: "<img src='/icons/toys.png' width='35' height='35'/>",
    nightclub: "<img src='/icons/nightclub.png' width='35' height='35'/>",
    cinema: "<img src='/icons/cinema.png' width='35' height='35'/>",
    educational_institution:
      "<img src='/icons/educational_institution.png' width='35' height='35'/>",
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
    // Adapter à la structure du JSON pau.json
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
// Ajouter un point de passage à la carte
// =============================================
function addWaypointAt(lat, lng, name, icon, index, commerceType = null) {
  // Créer un waypoint générique avec l'icône fournie
  const waypoint = {
    icon: {
      className: "waypoint-marker",
      html: `<div class="marker-content">${icon}</div>`,

      iconSize: [40, 40],
      iconAnchor: [20, 20],
    },
    popupContent: `<div style="text-align: center;"><div class="marker-content">${icon}</div><h4>${name}</h4><p>Point de passage #${index}</p><p><em>Coords: ${lat.toFixed(
      4
    )}, ${lng.toFixed(4)}</em></p></div>`,
  };

  const waypointIcon = L.divIcon(waypoint.icon);
  const marker = L.marker([lat, lng], { icon: waypointIcon })
    .addTo(map)
    .bindPopup(waypoint.popupContent, { maxWidth: 200 });

  // Stocker les informations du point de passage
  waypoints.push({
    marker: marker,
    coords: [lat, lng],
    name: name,
    icon: icon,
    commerceType: commerceType, // Ajouter le type de commerce
  });
  waypointMarkers.push(marker);

  // Ajouter un cercle autour du point pour une meilleure visibilité
  const circle = L.circle([lat, lng], {
    color: "transparent",
    fillColor: "transparent",
    fillOpacity: 0.1,
    radius: 50,
  }).addTo(map);

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
      collapsible: false,
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
// Fonctions de centrage de la carte
// =============================================
function centerKaamelott() {
  map.setView(appData.mainLocations[0].coords, 15);
  kaamelottMarker.openPopup();
}

function centerLabyrinthe() {
  map.setView(appData.mainLocations[1].coords, 15);
  labyrinthMarker.openPopup();
}

function centerPau() {
  map.setView([43.29614574576827, -0.3717861445392325], 15);
}

// =============================================
// Centrer sur le commerce le plus proche d'un type donné
// =============================================
function centerOnCommerceType(commerceType) {
  // Obtenir la position actuelle de la carte
  const currentCenter = map.getCenter();
  const currentPos = [currentCenter.lat, currentCenter.lng];

  // D'abord, vérifier s'il y a un waypoint existant du même type à proximité (dans un rayon de 500m)
  const nearbyWaypoint = findNearbyWaypointOfType(
    currentPos,
    commerceType,
    500
  );

  if (nearbyWaypoint) {
    // Si un waypoint du même type existe à proximité, centrer dessus et ouvrir son popup
    map.setView(nearbyWaypoint.coords, 17);
    nearbyWaypoint.marker.openPopup();

    updateStatus(
      "map",
      `📍 Waypoint "${nearbyWaypoint.name}" trouvé à proximité`,
      "info"
    );
    return;
  }

  // Sinon, trouver le commerce le plus proche du type demandé
  let nearestCommerce = null;
  let minDistance = Infinity;

  commercesPau.forEach((item) => {
    // Vérifier si ce commerce correspond au type recherché
    if (item.type && item.type.includes(commerceType)) {
      const commerceLat = item.geo_point_2d.lat;
      const commerceLng = item.geo_point_2d.lon;
      const distance = calculateDistance(currentPos, [
        commerceLat,
        commerceLng,
      ]);

      if (distance < minDistance) {
        minDistance = distance;
        nearestCommerce = {
          name: item.name || "Commerce inconnu",
          coords: [commerceLat, commerceLng],
          type: item.type.join(", "),
          address: item.address || "Adresse inconnue",
          primaryType: item.type[0], // Garder le type principal pour l'icône
        };
      }
    }
  });

  if (nearestCommerce) {
    // Centrer sur le commerce trouvé
    map.setView(nearestCommerce.coords, 17);

    // Créer un marqueur temporaire pour montrer le commerce
    const tempIcon = L.divIcon({
      className: "temp-marker",
      html: `<div style="background: #FF6B6B; color: white; padding: 5px; border-radius: 50%; text-align: center; font-weight: bold;">!</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const tempMarker = L.marker(nearestCommerce.coords, {
      icon: tempIcon,
    }).addTo(map);

    // Utiliser le type principal pour obtenir la bonne icône
    const correctIcon = getCommerceIcon([nearestCommerce.primaryType]);

    // Créer le popup avec les boutons d'action
    const popupContent = `
      <div style="text-align: center;">
      <img src='/icons/${
        nearestCommerce.primaryType
      }.png' width='35' height='35'/>
        <h4>${nearestCommerce.name}</h4>
        <p><strong>Type:</strong> ${nearestCommerce.type}</p>
        <p><strong>Distance:</strong> ${(minDistance * 1000).toFixed(0)}m</p>
        <p><em>${nearestCommerce.address}</em></p>
        <div style="margin-top: 10px;">
          <button onclick="addWaypointFromModal('${
            nearestCommerce.coords[0]
          }', '${nearestCommerce.coords[1]}', '${nearestCommerce.name.replace(
      /'/g,
      "\\'"
    )}', '${correctIcon.replace(/'/g, "\\'")}', '${
      nearestCommerce.primaryType
    }')" 
                  style="background: #32CD32; color: white; border: none; padding: 8px 12px; margin: 2px; border-radius: 4px; cursor: pointer;">
            Ajouter waypoint
          </button>
          <button onclick="removeWarningMarker()" 
                  style="background: #FF6B6B; color: white; border: none; padding: 8px 12px; margin: 2px; border-radius: 4px; cursor: pointer;">
            Ne pas ajouter
          </button>
        </div>
      </div>
    `;

    tempMarker
      .bindPopup(popupContent, {
        maxWidth: 250,
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
      })
      .openPopup();

    // Stocker le marqueur temporaire globalement pour pouvoir le supprimer
    window.currentWarningMarker = tempMarker;

    updateStatus(
      "map",
      `📍 Commerce trouvé: ${nearestCommerce.name} (${(
        minDistance * 1000
      ).toFixed(0)}m)`,
      "success"
    );
  } else {
    updateStatus(
      "map",
      `❌ Aucun commerce de type "${commerceType}" trouvé à Pau.`,
      "error"
    );
  }
}

// =============================================
// Trouver un waypoint existant à proximité du même type
// =============================================
function findNearbyWaypointOfType(currentPos, searchType, radiusMeters) {
  for (let waypoint of waypoints) {
    const distance = calculateDistance(currentPos, waypoint.coords) * 1000; // Convertir en mètres

    if (distance <= radiusMeters) {
      // Vérifier si ce waypoint correspond au type recherché
      // On peut déduire le type depuis l'icône ou le nom du waypoint
      if (waypointMatchesType(waypoint, searchType)) {
        return waypoint;
      }
    }
  }
  return null;
}

// =============================================
// Vérifier si un waypoint correspond à un type donné
// =============================================
function waypointMatchesType(waypoint, searchType) {
  // Logique simplifiée basée sur l'icône ou le nom
  // Cette fonction peut être améliorée selon vos besoins spécifiques
  const waypointIcon = waypoint.icon;
  const expectedIcon = getCommerceIcon([searchType]);

  // Comparaison basique des icônes
  return waypointIcon.includes(searchType) || waypointIcon === expectedIcon;
}

// =============================================
// Ajouter un waypoint depuis la modal
// =============================================
function addWaypointFromModal(lat, lng, name, icon) {
  // Convertir les coordonnées en nombres
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  // Ajouter le waypoint
  addWaypointAt(latitude, longitude, name, icon, waypoints.length + 1);

  // Supprimer le marqueur d'avertissement
  removeWarningMarker();

  updateStatus("map", `✅ Waypoint ajouté : ${name}`, "success");
}

// =============================================
// Supprimer le marqueur d'avertissement
// =============================================
function removeWarningMarker() {
  if (window.currentWarningMarker) {
    map.removeLayer(window.currentWarningMarker);
    window.currentWarningMarker = null;
  }
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

// =============================================
// Function du Didacticiel
// =============================================
// Fonction pour démarrer le didacticiel vocal
function startTutorial() {
  // Afficher l'overlay du didacticiel
  const overlay = document.getElementById('tutorial-overlay');
  const textElement = document.getElementById('tutorial-text');
  const nextButton = document.getElementById('tutorial-next');
  overlay.style.display = 'flex';

  // Messages du didacticiel avec actions associées (phrases plus courtes)
  const tutorialSteps = [
    {
      text: "Bienvenue dans le royaume de Kaamelott !",
      action: null
    },
    {
      text: "Vous allez aider le roi Arthur à trouver le trésor caché de la Dame du Lac.",
      action: null
    },
    {
      text: "Votre mission : guider Arthur depuis Kaamelott jusqu'à l'entrée du labyrinthe.",
      action: () => document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth' })
    },
    {
      text: "Puis à travers le labyrinthe pour atteindre le trésor.",
      action: null
    },
    {
      text: "Le jeu a deux phases principales.",
      action: () => showPhase('map')
    },
    {
      text: "La première phase utilise une carte interactive pour planifier le voyage.",
      action: null
    },
    {
      text: "Cliquez sur 'Calculer Route Optimale' pour trouver le meilleur chemin.",
      action: null
    },
    {
      text: "Une fois à l'entrée du labyrinthe, passez à la deuxième phase.",
      action: () => showPhase('maze')
    },
    {
      text: "Le labyrinthe mystérieux.",
      action: null
    },
    {
      text: "Générez un nouveau labyrinthe avec 'Nouveau Labyrinthe'.",
      action: null
    },
    {
      text: "Que la quête commence !",
      action: () => {
        overlay.style.display = 'none';
        showPhase('map');
      }
    },
    {
      text: "Bonne chance, noble chevalier !",
      action: null
    }
  ];

  let currentStep = 0;

  // Fonction pour afficher et parler un message
  function showStep(stepIndex) {
    if (stepIndex >= tutorialSteps.length) {
      return;
    }

    const step = tutorialSteps[stepIndex];
    textElement.textContent = step.text;

    // Exécuter l'action associée si elle existe
    if (step.action) {
      step.action();
    }
  }

  // Gestionnaire pour le bouton suivant
  nextButton.onclick = () => {
    currentStep++;
    if (currentStep < tutorialSteps.length) {
      showStep(currentStep);
    } else {
      overlay.style.display = 'none';
    }
  };

  // Démarrer le didacticiel
  showStep(0);
}
