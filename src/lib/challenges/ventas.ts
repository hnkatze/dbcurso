import type { LessonChallenges } from "./core";

const schema = `CREATE TABLE clientes (
  id     INT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  email  VARCHAR(120) UNIQUE
);

CREATE TABLE categorias (
  id     INT PRIMARY KEY,
  nombre VARCHAR(40) UNIQUE NOT NULL
);

CREATE TABLE productos (
  id           INT PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  categoria_id INT NOT NULL REFERENCES categorias(id),
  precio       DECIMAL(10,2) NOT NULL
);

CREATE TABLE pedidos (
  id         INT PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id),
  fecha      DATE,
  estado     VARCHAR(20) DEFAULT 'pendiente'
);

CREATE TABLE items_pedido (
  id          INT PRIMARY KEY,
  pedido_id   INT NOT NULL REFERENCES pedidos(id),
  producto_id INT NOT NULL REFERENCES productos(id),
  cantidad    INT NOT NULL,
  precio_unit DECIMAL(10,2) NOT NULL
);

CREATE TABLE pagos (
  id        INT PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES pedidos(id),
  monto     DECIMAL(10,2) NOT NULL,
  metodo    VARCHAR(30)
);

INSERT INTO clientes (id, nombre, email) VALUES
  (1, 'Ana Torres',  'ana@mail.com'),
  (2, 'Luis Pérez',  'luis@mail.com'),
  (3, 'María Gómez', 'maria@mail.com');

INSERT INTO categorias (id, nombre) VALUES
  (1, 'Café'), (2, 'Té'), (3, 'Snacks');

INSERT INTO productos (id, nombre, categoria_id, precio) VALUES
  (1, 'Café Sierra', 1, 32000),
  (2, 'Café Huila',  1, 28000),
  (3, 'Té verde',    2, 12000),
  (4, 'Galletas',    3,  6000);

INSERT INTO pedidos (id, cliente_id, fecha, estado) VALUES
  (1, 1, '2024-05-01', 'pagado'),
  (2, 2, '2024-05-02', 'pendiente'),
  (3, 1, '2024-05-03', 'pagado');

INSERT INTO items_pedido (id, pedido_id, producto_id, cantidad, precio_unit) VALUES
  (1, 1, 1, 2, 32000),
  (2, 1, 4, 1,  6000),
  (3, 2, 3, 3, 12000),
  (4, 3, 2, 1, 28000);

INSERT INTO pagos (id, pedido_id, monto, metodo) VALUES
  (1, 1, 70000, 'tarjeta'),
  (2, 3, 28000, 'efectivo');`;

export const VENTAS_LESSON: LessonChallenges = {
  lessonId: "ventas",
  title: "Caso real · Ventas",
  href: "/sql/ventas",
  schema,
  challenges: [
    {
      id: "ventas-basico",
      nivel: "basico",
      enunciado:
        "Listá los productos que forman el pedido #1: mostrá el nombre del producto, la cantidad y el precio unitario.",
      solution: `SELECT pr.nombre, i.cantidad, i.precio_unit
FROM items_pedido i
JOIN productos pr ON pr.id = i.producto_id
WHERE i.pedido_id = 1;`,
      pista:
        "Unís items_pedido con productos (JOIN productos pr ON pr.id = i.producto_id) y filtrás WHERE i.pedido_id = 1.",
    },
    {
      id: "ventas-intermedio",
      nivel: "intermedio",
      enunciado:
        "Calculá el total gastado por cada cliente (suma de cantidad × precio unitario en todos sus pedidos). Mostrá nombre del cliente y el total, del mayor al menor.",
      solution: `SELECT c.nombre, SUM(i.cantidad * i.precio_unit) AS total
FROM clientes c
JOIN pedidos p ON p.cliente_id = c.id
JOIN items_pedido i ON i.pedido_id = p.id
GROUP BY c.nombre
ORDER BY total DESC;`,
      ordered: true,
      pista:
        "Necesitás tres tablas: clientes → pedidos → items_pedido. Usá SUM(i.cantidad * i.precio_unit) y GROUP BY c.nombre.",
    },
    {
      id: "ventas-avanzado",
      nivel: "avanzado",
      enunciado:
        "Calculá los ingresos totales por categoría de producto (suma de cantidad × precio unitario). Mostrá el nombre de la categoría y el total, de mayor a menor.",
      solution: `SELECT cat.nombre, SUM(i.cantidad * i.precio_unit) AS ingresos
FROM items_pedido i
JOIN productos pr ON pr.id = i.producto_id
JOIN categorias cat ON cat.id = pr.categoria_id
GROUP BY cat.nombre
ORDER BY ingresos DESC;`,
      ordered: true,
      pista:
        "Encadenás tres JOINs: items_pedido → productos → categorias. Agrupás por cat.nombre y sumás cantidad × precio_unit.",
    },
  ],
};
