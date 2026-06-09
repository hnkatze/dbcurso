import type { LessonChallenges } from "./core";

const schema = `CREATE TABLE productos (
  id INT PRIMARY KEY,
  nombre VARCHAR(60),
  categoria VARCHAR(30),
  precio DECIMAL(10,2),
  stock INT
);
INSERT INTO productos VALUES
  (1, 'Café Sierra Nevada', 'Café',    32000, 18),
  (2, 'Café del Huila',     'Café',    28000, 25),
  (3, 'Café Tolima',        'Café',    30000,  6),
  (4, 'Té verde',           'Té',      12000, 12),
  (5, 'Té manzanilla',      'Té',       9500, 30),
  (6, 'Galletas integral',  'Snack',    6000,  4),
  (7, 'Chocolate amargo',   'Snack',   22000,  8),
  (8, 'Azúcar morena',      'Despensa', 4500, 25),
  (9, 'Panela',             'Despensa', 3200, 40),
  (10,'Cacao en polvo',     'Despensa',15000, 11);`;

export const SELECT_LESSON: LessonChallenges = {
  lessonId: "select",
  title: "SELECT, WHERE, ORDER",
  href: "/sql/select",
  schema,
  challenges: [
    {
      id: "select-basico",
      nivel: "basico",
      enunciado: "Traé el nombre y el precio de todos los productos de la categoría 'Té'.",
      solution: "SELECT nombre, precio FROM productos WHERE categoria = 'Té';",
      pista: "Filtrá con WHERE categoria = 'Té' y seleccioná solo nombre y precio.",
    },
    {
      id: "select-intermedio",
      nivel: "intermedio",
      enunciado: "Listá los productos con stock menor a 10, del stock más bajo al más alto. Mostrá nombre y stock.",
      solution: "SELECT nombre, stock FROM productos WHERE stock < 10 ORDER BY stock ASC;",
      ordered: true,
      pista: "WHERE stock < 10 para filtrar, ORDER BY stock ASC para ordenar.",
    },
    {
      id: "select-avanzado",
      nivel: "avanzado",
      enunciado: "Mostrá los 3 productos más caros (nombre y precio), del más caro al más barato.",
      solution: "SELECT nombre, precio FROM productos ORDER BY precio DESC LIMIT 3;",
      ordered: true,
      pista: "Ordená por precio DESC y cortá el resultado con LIMIT 3.",
    },
  ],
};
