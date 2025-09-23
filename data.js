// Lieux et chemins du royaume
export const lieux = {
  Kaamelott: {
    lat: 48.8566,
    lng: 2.3522,
    nom: "Kaamelott",
    icone: "castle",
    description: "Château du Roi Arthur.",
  },
  PontRivière: {
    lat: 48.8606,
    lng: 2.3376,
    nom: "Pont de la Rivière",
    icone: "bridge",
    description: "Pont ancien gardé par des chevaliers.",
  },
  ForêtBrume: {
    lat: 48.8534,
    lng: 2.3488,
    nom: "Forêt des Brumes",
    icone: "tree",
    description: "Forêt mystérieuse, attention aux créatures...",
  },
  CollineCorbeaux: {
    lat: 48.848,
    lng: 2.33,
    nom: "Colline aux Corbeaux",
    icone: "crow",
    description: "Lieu de rassemblement des corbeaux messagers.",
  },
  EntréeLabyrinthe: {
    lat: 48.8584,
    lng: 2.2945,
    nom: "Entrée du Labyrinthe",
    icone: "door-open",
    description: "Ici commence l’épreuve finale.",
  },
};

export const chemins = [
  ["Kaamelott", "PontRivière", 1.2],
  ["Kaamelott", "ForêtBrume", 1.8],
  ["PontRivière", "CollineCorbeaux", 0.8],
  ["PontRivière", "EntréeLabyrinthe", 1.5],
  ["ForêtBrume", "CollineCorbeaux", 0.5],
  ["ForêtBrume", "EntréeLabyrinthe", 1.0],
  ["CollineCorbeaux", "EntréeLabyrinthe", 0.7],
];

export const graphe = {
  Kaamelott: { PontRivière: 1.2, ForêtBrume: 1.8 },
  PontRivière: { Kaamelott: 1.2, CollineCorbeaux: 0.8, EntréeLabyrinthe: 1.5 },
  ForêtBrume: { Kaamelott: 1.8, CollineCorbeaux: 0.5, EntréeLabyrinthe: 1.0 },
  CollineCorbeaux: { PontRivière: 0.8, ForêtBrume: 0.5, EntréeLabyrinthe: 0.7 },
  EntréeLabyrinthe: {},
};
