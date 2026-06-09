import type { LessonChallenges } from "./core";

/**
 * A deliberately MESSY store database — problems are planted on purpose:
 * - clientes: a duplicated email, a NULL email (nombre is NOT NULL on purpose)
 * - productos: invalid prices (<= 0), miscased categories ("Café"/"café"/"CAFE")
 * - pedidos: NO foreign key declared, so an orphan row (cliente 99) can exist;
 *   one NULL fecha; one total that doesn't match the sum of its items
 * - items_pedido: the real line items used to recompute the broken total
 */
const schema = `CREATE TABLE clientes (
  id     INT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  email  VARCHAR(120)
);
INSERT INTO clientes (id, nombre, email) VALUES
  (1, 'Ana Torres',  'ana@mail.com'),
  (2, 'Luis Pérez',  'luis@mail.com'),
  (3, 'María Gómez', 'ana@mail.com'),
  (4, 'Carla Ruiz',  NULL);

CREATE TABLE productos (
  id        INT PRIMARY KEY,
  nombre    VARCHAR(60),
  categoria VARCHAR(30),
  precio    DECIMAL(10,2)
);
INSERT INTO productos (id, nombre, categoria, precio) VALUES
  (1, 'Café Sierra', 'Café',   32000),
  (2, 'Café Huila',  'café',   28000),
  (3, 'Té verde',    'Té',     12000),
  (4, 'Galletas',    'Snack',  -5000),
  (5, 'Chocolate',   'Snack',      0);

CREATE TABLE pedidos (
  id         INT PRIMARY KEY,
  cliente_id INT,
  fecha      DATE,
  total      DECIMAL(10,2)
);
INSERT INTO pedidos (id, cliente_id, fecha, total) VALUES
  (1, 1, '2024-01-10', 64000),
  (2, 2, NULL,         28000),
  (3, 99, '2024-02-01', 12000),
  (4, 1, '2024-02-15', 99999);

CREATE TABLE items_pedido (
  id          INT PRIMARY KEY,
  pedido_id   INT,
  producto_id INT,
  cantidad    INT,
  precio_unit DECIMAL(10,2)
);
INSERT INTO items_pedido (id, pedido_id, producto_id, cantidad, precio_unit) VALUES
  (1, 1, 1, 2, 32000),
  (2, 4, 3, 1, 12000),
  (3, 4, 1, 1, 32000);`;

export const AUDITORIA_LESSON: LessonChallenges = {
  lessonId: "auditoria",
  title: "Auditoría de datos",
  href: "/admin/auditoria",
  schema,
  challenges: [
    {
      id: "auditoria-basico-fechas",
      nivel: "basico",
      enunciado:
        "Auditá los pedidos incompletos: listá el id de los pedidos que no tienen fecha registrada.",
      solution: "SELECT id FROM pedidos WHERE fecha IS NULL;",
      pista: "Una columna vacía se compara con IS NULL, nunca con = NULL.",
    },
    {
      id: "auditoria-basico-precios",
      nivel: "basico",
      enunciado:
        "Encontrá los productos con precio inválido: mostrá nombre y precio de los que tienen precio menor o igual a 0.",
      solution: "SELECT nombre, precio FROM productos WHERE precio <= 0;",
      pista: "Un precio válido es mayor que 0; lo demás es un dato corrupto.",
    },
    {
      id: "auditoria-intermedio-duplicados",
      nivel: "intermedio",
      enunciado:
        "Detectá emails duplicados entre clientes: mostrá el email y cuántas veces aparece (columna 'veces'), solo los que se repiten.",
      solution: "SELECT email, COUNT(*) AS veces FROM clientes GROUP BY email HAVING COUNT(*) > 1;",
      pista: "Agrupá por email y quedate con los grupos cuyo COUNT(*) sea mayor a 1.",
    },
    {
      id: "auditoria-intermedio-reparar-notnull",
      nivel: "intermedio",
      enunciado:
        "Este INSERT falla con el error: La columna \"nombre\" no admite NULL. Registrá al cliente correctamente con id 5, nombre 'Diego Soto' y email 'diego@mail.com'.",
      starter: "INSERT INTO clientes (id, nombre, email) VALUES (5, NULL, 'diego@mail.com');",
      solution: "INSERT INTO clientes (id, nombre, email) VALUES (5, 'Diego Soto', 'diego@mail.com');",
      verify: "SELECT id, nombre, email FROM clientes ORDER BY id;",
      ordered: true,
      pista: "La columna nombre es NOT NULL: tiene que llevar un valor real, no NULL.",
    },
    {
      id: "auditoria-avanzado-huerfanos",
      nivel: "avanzado",
      enunciado:
        "Encontrá los pedidos huérfanos: aquellos cuyo cliente_id no corresponde a ningún cliente real. Mostrá el id del pedido y su cliente_id.",
      solution:
        "SELECT p.id, p.cliente_id FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id WHERE c.id IS NULL;",
      pista: "Un LEFT JOIN con clientes deja en NULL el lado derecho cuando no hay coincidencia.",
    },
    {
      id: "auditoria-avanzado-reparar-total",
      nivel: "avanzado",
      enunciado:
        "El pedido 4 tiene un total mal cargado (99999) que no coincide con la suma real de sus ítems. Corregí el total del pedido 4 para que sea la suma de cantidad × precio_unit de sus ítems.",
      starter: "-- El total del pedido 4 no cuadra con sus items. Corregilo:\nUPDATE pedidos SET total = 0 WHERE id = 4;",
      solution: "UPDATE pedidos SET total = 44000 WHERE id = 4;",
      verify: "SELECT id, total FROM pedidos ORDER BY id;",
      ordered: true,
      pista: "Los ítems del pedido 4 son 1×12000 y 1×32000. Sumá: 44000.",
    },
  ],
};
