import type { LessonChallenges } from "./core";

const schema = `CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60),
  precio DECIMAL(10,2),
  stock INT DEFAULT 0
);
INSERT INTO productos (nombre, precio, stock) VALUES
  ('Café 250g', 18000, 30),
  ('Té verde',  12000, 12),
  ('Galletas',   6000,  4),
  ('Chocolate', 22000,  8);`;

export const WRITE_LESSON: LessonChallenges = {
  lessonId: "write",
  title: "INSERT / UPDATE / DELETE",
  href: "/sql/write",
  schema,
  challenges: [
    {
      id: "write-basico",
      nivel: "basico",
      enunciado:
        "Insertá el producto 'Panela' con un precio de 4500 y un stock de 20 en la tabla productos.",
      solution:
        "INSERT INTO productos (nombre, precio, stock) VALUES ('Panela', 4500, 20);",
      verify:
        "SELECT id, nombre, precio, stock FROM productos ORDER BY id;",
      ordered: true,
      pista:
        "Usá INSERT INTO productos (nombre, precio, stock) VALUES (...). El id es AUTO_INCREMENT, no lo pongas.",
    },
    {
      id: "write-intermedio",
      nivel: "intermedio",
      enunciado:
        "Subí un 15% el precio de todos los productos con stock menor a 10.",
      solution:
        "UPDATE productos SET precio = precio * 1.15 WHERE stock < 10;",
      verify:
        "SELECT id, nombre, precio FROM productos ORDER BY id;",
      ordered: true,
      pista:
        "UPDATE productos SET precio = precio * 1.15 WHERE stock < 10. Eso afecta a Galletas (stock 4) y Chocolate (stock 8).",
    },
    {
      id: "write-avanzado",
      nivel: "avanzado",
      enunciado:
        "Eliminá de la tabla todos los productos con stock menor a 5.",
      solution:
        "DELETE FROM productos WHERE stock < 5;",
      verify:
        "SELECT id, nombre, stock FROM productos ORDER BY id;",
      ordered: true,
      pista:
        "DELETE FROM productos WHERE stock < 5. Solo Galletas tiene stock 4, así que quedan 3 productos.",
    },
  ],
};
