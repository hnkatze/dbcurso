import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { Lab } from "@/components/lab/lab";
import { ChallengeBoard } from "@/components/lab/challenge";
import { GROUP_LESSON } from "@/lib/challenges/group";

export const metadata: Metadata = {
  title: "GROUP BY · Subconsultas",
  description: "Agregaciones con GROUP BY, HAVING y subconsultas: contar, sumar y promediar por grupo.",
};

export default function GroupPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Agregaciones con <em>GROUP BY</em>, y subconsultas.
      </H1>
      <Lede>
        Un <code>GROUP BY</code> colapsa filas que comparten un valor en común y aplica una{" "}
        <strong>función de agregación</strong> (<code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>,{" "}
        <code>MAX</code>) a cada grupo. Es como “contar por categoría” en una hoja de cálculo, pero con poder real.
      </Lede>

      <H2 num="01">Las cinco agregaciones</H2>
      <ConceptRow>
        <Concept tint="y" mark="#" title="COUNT(*)">
          Cuántas filas hay.
        </Concept>
        <Concept tint="b" mark="Σ" title="SUM(col)">
          Suma todos los valores no nulos.
        </Concept>
        <Concept tint="p" mark="μ" title="AVG(col)">
          Promedio aritmético.
        </Concept>
        <Concept tint="g" mark="↓" title="MIN/MAX">
          El menor o el mayor del grupo.
        </Concept>
      </ConceptRow>

      <H2 num="02">Anatomía</H2>
      <Snippet
        code={`SELECT  categoria, COUNT(*) AS cuantos, AVG(precio) AS promedio
FROM    productos
GROUP BY categoria
HAVING  COUNT(*) > 1
ORDER BY promedio DESC;`}
      />
      <UL>
        <li>
          Las columnas que <strong>no</strong> son agregaciones <em>deben</em> estar en el <code>GROUP BY</code>.
        </li>
        <li>
          <code>HAVING</code> filtra <strong>grupos</strong> (después de agregar). <code>WHERE</code> filtra{" "}
          <strong>filas</strong> (antes).
        </li>
        <li>
          <code>AS</code> renombra el resultado — útil para que la columna no se llame <code>COUNT(*)</code>.
        </li>
      </UL>

      <H2 num="03">Subconsultas — un SELECT dentro de otro</H2>
      <Snippet
        code={`-- Productos más caros que el promedio
SELECT nombre, precio
FROM   productos
WHERE  precio > (SELECT AVG(precio) FROM productos);`}
      />
      <P>
        El motor evalúa la subconsulta primero (un valor escalar: el promedio) y después la usa como si fuera un número
        literal. Las subconsultas también pueden aparecer en <code>FROM</code> (tabla derivada) o con <code>IN</code>.
      </P>

      <H2 num="04">Laboratorio · agrupa y analiza</H2>
      <Lab
        labId="lab-group"
        initialState={{
          sql: `CREATE TABLE productos (
  id INT PRIMARY KEY,
  nombre VARCHAR(60),
  categoria VARCHAR(30),
  precio DECIMAL(10,2),
  stock INT
);
INSERT INTO productos VALUES
  (1,'Café Sierra','Café',32000,18),
  (2,'Café Huila','Café',28000,25),
  (3,'Café Tolima','Café',30000,6),
  (4,'Té verde','Té',12000,12),
  (5,'Té manzanilla','Té',9500,30),
  (6,'Galletas','Snack',6000,4),
  (7,'Chocolate','Snack',22000,8),
  (8,'Azúcar','Despensa',4500,25),
  (9,'Panela','Despensa',3200,40),
  (10,'Cacao','Despensa',15000,11);`,
        }}
        initialSql={`SELECT categoria,
       COUNT(*)   AS items,
       AVG(precio) AS promedio,
       MAX(precio) AS maximo
FROM   productos
GROUP BY categoria
ORDER BY promedio DESC;`}
        autorun
        samples={[
          {
            label: "stock total por categoría",
            sql: `SELECT categoria, SUM(stock) AS total_stock
FROM productos GROUP BY categoria ORDER BY total_stock DESC;`,
          },
          {
            label: "categorías con > 2 items",
            sql: `SELECT categoria, COUNT(*) AS cuantos
FROM productos GROUP BY categoria HAVING COUNT(*) > 2;`,
          },
          {
            label: "más caros que el promedio",
            sql: `SELECT nombre, precio FROM productos
WHERE precio > (SELECT AVG(precio) FROM productos)
ORDER BY precio DESC;`,
          },
        ]}
      />

      <Callout variant="ok" label="Regla de oro">
        Si una columna aparece en <code>SELECT</code> pero no es una agregación, <strong>tiene</strong> que estar en{" "}
        <code>GROUP BY</code>. Si no la pones, te quedas con un valor cualquiera del grupo.
      </Callout>

      <H2 num="05">Desafíos · ponete a prueba</H2>
      <P>Tres retos de agregación, de menor a mayor dificultad. Escribí tu consulta y dale <strong>Comprobar</strong>.</P>
      <ChallengeBoard schema={GROUP_LESSON.schema} challenges={GROUP_LESSON.challenges} />
    </div>
  );
}
