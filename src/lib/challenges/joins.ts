import type { LessonChallenges } from "./core";

const schema = `CREATE TABLE usuarios (
  id INT PRIMARY KEY,
  nombre VARCHAR(40),
  ciudad VARCHAR(40)
);
CREATE TABLE pedidos (
  id INT PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  total DECIMAL(10,2)
);
INSERT INTO usuarios VALUES (1,'Ana','Bogotá'),(2,'Luis','Medellín'),(3,'María','Cali'),(4,'Pedro','Cartagena');
INSERT INTO pedidos VALUES (10,1,45000),(11,2,18000),(12,1,23000),(13,2,32000),(14,1,9000);`;

export const JOINS_LESSON: LessonChallenges = {
  lessonId: "joins",
  title: "JOINs",
  href: "/sql/joins",
  schema,
  challenges: [
    {
      id: "joins-basico",
      nivel: "basico",
      enunciado:
        "Traé el nombre del usuario y el total de cada pedido. Solo deben aparecer usuarios que tengan al menos un pedido. Mostrá las columnas nombre y total.",
      solution:
        "SELECT u.nombre, p.total FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id;",
      pista:
        "Usá INNER JOIN entre usuarios y pedidos con ON p.usuario_id = u.id. Alias u y p hacen la consulta más corta.",
    },
    {
      id: "joins-intermedio",
      nivel: "intermedio",
      enunciado:
        "Encontrá los usuarios que NO tienen ningún pedido registrado. Mostrá solo la columna nombre.",
      solution:
        "SELECT u.nombre FROM usuarios u LEFT JOIN pedidos p ON p.usuario_id = u.id WHERE p.id IS NULL;",
      pista:
        "Con LEFT JOIN todos los usuarios aparecen. Cuando no hay pedido, p.id queda NULL. Filtrá con WHERE p.id IS NULL.",
    },
    {
      id: "joins-avanzado",
      nivel: "avanzado",
      enunciado:
        "Calculá el total gastado por cada usuario que tiene pedidos. Mostrá nombre y total_gastado, ordenados del mayor al menor gasto.",
      solution:
        "SELECT u.nombre, SUM(p.total) AS total_gastado FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id GROUP BY u.nombre ORDER BY total_gastado DESC;",
      ordered: true,
      pista:
        "INNER JOIN + GROUP BY u.nombre + SUM(p.total). Luego ORDER BY total_gastado DESC para ordenar del mayor al menor.",
    },
  ],
};
