// Grille du labyrinthe (0 = mur, 1 = chemin)
export const labyrinthe = [
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Position du trésor (exemple)
export const tresor = { x: 8, y: 8 };

// Algorithme BFS pour trouver le chemin vers le trésor
export function trouverCheminVersTresor(labyrinthe, depart, tresor) {
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  const queue = [{ ...depart, path: [] }];
  const visited = new Set([`${depart.x},${depart.y}`]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === tresor.x && current.y === tresor.y) {
      return [...current.path, current];
    }

    for (const [dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (
        x >= 0 &&
        x < labyrinthe[0].length &&
        y >= 0 &&
        y < labyrinthe.length
      ) {
        if (labyrinthe[y][x] === 1 && !visited.has(`${x},${y}`)) {
          visited.add(`${x},${y}`);
          queue.push({ x, y, path: [...current.path, current] });
        }
      }
    }
  }

  return []; // Chemin non trouvé
}