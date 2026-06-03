import type { Metadata } from "next";
import { Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Lab } from "@/components/lab/lab";

export const metadata: Metadata = {
  title: "Caso real · Ventas",
  description:
    "Cierre de la parte relacional: un modelo de e-commerce completo, su diagrama de relaciones y consultas que cruzan todas las tablas.",
};

// Esquema + datos del flujo de ventas, reutilizado por ambos labs.
const VENTAS_SCHEMA = `CREATE TABLE clientes (
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

export default function VentasPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Un modelo <em>completo</em> · flujo de ventas.
      </H1>
      <Lede>
        Hasta acá viste las piezas por separado. Ahora juntémoslas en un modelo de verdad — un e-commerce mínimo — y
        cerremos la parte relacional viendo cómo <strong>todo se conecta</strong> y cómo una sola consulta puede cruzar
        media base de datos.
      </Lede>

      <H2 num="01">El diagrama del modelo</H2>
      <P>
        Seis tablas, cinco relaciones. <strong>Clientes</strong> hacen <strong>pedidos</strong>; cada pedido tiene
        varios <strong>productos</strong> a través de la tabla puente <code>items_pedido</code> (la solución clásica al{" "}
        <em>muchos a muchos</em>); los productos viven en <strong>categorías</strong>; y cada pedido puede tener{" "}
        <strong>pagos</strong>. Ejecutá y explorá: arrastrá las tablas, hacé zoom, y seguí cada línea — es un{" "}
        <code>REFERENCES</code>.
      </P>

      <Lab canvas labId="lab-ventas-erd" autorun initialSql={VENTAS_SCHEMA} />

      <H2 num="02">Consultas que cruzan todo el modelo</H2>
      <P>
        Lo poderoso del modelo relacional es que, una vez bien conectado, podés hacer preguntas de negocio que tocan
        muchas tablas a la vez. Acá la base ya está cargada — ejecutá la consulta y probá los ejemplos de abajo.
      </P>
      <UL>
        <li>
          <strong>Facturación por cliente</strong> cruza <code>clientes → pedidos → items_pedido</code> con dos JOINs.
        </li>
        <li>
          <strong>Ventas por categoría</strong> encadena tres JOINs hasta llegar a <code>categorias</code>.
        </li>
        <li>
          El <code>SUM(cantidad * precio_unit)</code> calcula el total <em>dentro</em> de la agregación.
        </li>
      </UL>

      <Lab
        labId="lab-ventas-query"
        initialState={{ sql: VENTAS_SCHEMA }}
        initialSql={`-- Total facturado por cada cliente\nSELECT c.nombre, SUM(i.cantidad * i.precio_unit) AS facturado\nFROM clientes c\nJOIN pedidos p ON p.cliente_id = c.id\nJOIN items_pedido i ON i.pedido_id = p.id\nGROUP BY c.nombre\nORDER BY facturado DESC;`}
        autorun
        samples={[
          {
            label: "ventas por categoría",
            sql: `SELECT cat.nombre, SUM(i.cantidad * i.precio_unit) AS total
FROM items_pedido i
JOIN productos pr ON pr.id = i.producto_id
JOIN categorias cat ON cat.id = pr.categoria_id
GROUP BY cat.nombre
ORDER BY total DESC;`,
          },
          {
            label: "top productos",
            sql: `SELECT pr.nombre, SUM(i.cantidad) AS unidades
FROM items_pedido i
JOIN productos pr ON pr.id = i.producto_id
GROUP BY pr.nombre
ORDER BY unidades DESC;`,
          },
          {
            label: "pedidos por estado",
            sql: `SELECT estado, COUNT(*) AS cuantos
FROM pedidos
GROUP BY estado;`,
          },
        ]}
      />

      <Callout variant="ok" label="Cierre de la parte relacional">
        Si entendiste este modelo — tablas con forma, llaves que conectan, y consultas declarativas que cruzan todo —
        ya tenés el <strong>núcleo</strong> de las bases relacionales. Lo demás (índices, transacciones, optimización) es
        profundizar sobre esta misma base. Ahora sí, saltemos a <strong>NoSQL</strong> para ver otra forma de pensar los
        datos.
      </Callout>
    </div>
  );
}
