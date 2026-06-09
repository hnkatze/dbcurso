import type { LessonChallenges } from "./core";

const schema = `CREATE TABLE usuarios (
  id     INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60),
  email  VARCHAR(120) UNIQUE
);

CREATE TABLE pedidos (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  total      DECIMAL(10,2)
);

INSERT INTO usuarios (nombre, email) VALUES
  ('Ana',   'ana@mail.com'),
  ('Luis',  'luis@mail.com');

INSERT INTO pedidos (usuario_id, total) VALUES
  (1, 45000),
  (2, 18000),
  (1, 23000);`;

export const KEYS_LESSON: LessonChallenges = {
  lessonId: "keys",
  title: "Llaves PK / FK",
  href: "/sql/keys",
  schema,
  challenges: [
    {
      id: "keys-basico",
      nivel: "basico",
      enunciado:
        "Registrá un nuevo pedido de Luis (usuario con id 2) por un total de 75 000. Insertá la fila en la tabla pedidos respetando la llave foránea.",
      solution: "INSERT INTO pedidos (usuario_id, total) VALUES (2, 75000);",
      verify: "SELECT id, usuario_id, total FROM pedidos ORDER BY id;",
      pista:
        "Usá INSERT INTO pedidos (usuario_id, total) VALUES (...). El usuario_id debe ser un id que exista en la tabla usuarios.",
    },
    {
      id: "keys-intermedio",
      nivel: "intermedio",
      enunciado:
        "Mostrá el nombre del usuario y el total de cada pedido uniendo las dos tablas por la llave. Mostrá las columnas nombre y total.",
      solution:
        "SELECT u.nombre, p.total FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id;",
      pista:
        "INNER JOIN pedidos p ON p.usuario_id = u.id conecta la FK de pedidos con la PK de usuarios.",
    },
    {
      id: "keys-avanzado",
      nivel: "avanzado",
      enunciado:
        "Calculá cuánto gastó en total cada usuario. Mostrá nombre y total_gastado, ordenados del que más gastó al que menos.",
      solution:
        "SELECT u.nombre, SUM(p.total) AS total_gastado FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id GROUP BY u.nombre ORDER BY total_gastado DESC;",
      ordered: true,
      pista:
        "Usá INNER JOIN + GROUP BY u.nombre + SUM(p.total). Luego ORDER BY total_gastado DESC.",
    },
  ],
};
