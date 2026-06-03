import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { Lab } from "@/components/lab/lab";

export const metadata: Metadata = {
  title: "SELECT, WHERE, ORDER",
  description: "El verbo más usado de SQL: declara qué quieres con WHERE, ORDER BY y LIMIT.",
};

export default function SelectPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Consultar con <em>SELECT</em>.
      </H1>
      <Lede>
        El <strong>SELECT</strong> es el verbo más usado de todo SQL. Su gracia: declaras <strong>qué quieres</strong> — no
        cómo conseguirlo. El motor decide el camino más eficiente.
      </Lede>

      <H2 num="01">La forma canónica</H2>
      <Snippet
        code={`SELECT  columna1, columna2
FROM    tabla
WHERE   condición
ORDER BY columna [ASC|DESC]
LIMIT   n;`}
      />
      <P>
        Léelo de arriba abajo: <em>de la tabla T, filtrar las filas que cumplen C, mostrar columnas X, ordenarlas y
        limitarlas.</em>
      </P>

      <H2 num="02">WHERE — filtrar filas</H2>
      <ConceptRow>
        <Concept tint="y" mark="=" title="Comparación">
          <code>=</code>, <code>{"<>"}</code>, <code>{"<"}</code>, <code>{">"}</code>, <code>{"<="}</code>,{" "}
          <code>{">="}</code>
        </Concept>
        <Concept tint="b" mark="∧" title="Combinación">
          <code>AND</code>, <code>OR</code>, <code>NOT</code> para encadenar condiciones.
        </Concept>
        <Concept tint="p" mark="~" title="Patrones">
          <code>LIKE 'A%'</code> empieza por A, <code>LIKE '%a%'</code> contiene una a.
        </Concept>
        <Concept tint="g" mark="∈" title="Listas y rangos">
          <code>IN (1,2,3)</code> y <code>BETWEEN 10 AND 20</code>.
        </Concept>
      </ConceptRow>

      <Snippet
        code={`SELECT nombre, precio FROM productos
WHERE precio BETWEEN 5000 AND 20000
  AND nombre LIKE 'C%'
ORDER BY precio DESC
LIMIT 5;`}
      />

      <H2 num="03">ORDER BY — ordenar</H2>
      <P>
        <code>ASC</code> (ascendente, por defecto) o <code>DESC</code>. Puedes ordenar por varias columnas; si la primera
        empata, el motor desempata con la segunda.
      </P>

      <H2 num="04">LIMIT — cortar el resultado</H2>
      <P>
        Si pides los 10 productos más caros, no quieres descargar los 10 millones que tiene la base. <code>LIMIT 10</code>{" "}
        le dice al motor que pare al décimo. Junto con <code>ORDER BY</code> es la base de la paginación.
      </P>

      <H2 num="05">Laboratorio · explora 10 filas</H2>
      <Lab
        labId="lab-select"
        initialState={{
          sql: `CREATE TABLE productos (
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
  (10,'Cacao en polvo',     'Despensa',15000, 11);`,
        }}
        initialSql={`-- Top 5 productos más caros\nSELECT nombre, precio FROM productos\nORDER BY precio DESC\nLIMIT 5;`}
        autorun
        samples={[
          {
            label: "solo cafés",
            sql: `SELECT nombre, precio FROM productos WHERE categoria = 'Café' ORDER BY precio;`,
          },
          {
            label: "bajo stock",
            sql: `SELECT nombre, stock FROM productos WHERE stock < 10 ORDER BY stock ASC;`,
          },
          {
            label: "precio entre rangos",
            sql: `SELECT * FROM productos WHERE precio BETWEEN 5000 AND 15000;`,
          },
          { label: "LIKE empieza con C", sql: `SELECT nombre FROM productos WHERE nombre LIKE 'C%';` },
        ]}
      />

      <Callout variant="ok" label="Patrón mental">
        Cuando escribas un SELECT complejo, lee tu propia consulta empezando por el <code>FROM</code>: “de productos,
        filtrar X, ordenar por Y, mostrar Z”. Casi todos los bugs aparecen leyendo así.
      </Callout>
    </div>
  );
}
