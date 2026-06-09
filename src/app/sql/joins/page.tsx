import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { Lab } from "@/components/lab/lab";
import { ChallengeBoard } from "@/components/lab/challenge";
import { JOINS_LESSON } from "@/lib/challenges/joins";

export const metadata: Metadata = {
  title: "JOINs",
  description: "Combinar filas que viven en tablas distintas: INNER, LEFT, RIGHT y FULL JOIN.",
};

export default function JoinsPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        <em>JOIN</em> — armar información que vive en tablas distintas.
      </H1>
      <Lede>
        Cuando tienes <strong>usuarios</strong> y <strong>pedidos</strong> separados, un <code>JOIN</code> combina las
        filas que se corresponden según la FK. Hay cuatro variantes — la diferencia es <em>qué pasa con las filas que no
        encuentran pareja</em>.
      </Lede>

      <H2 num="01">INNER JOIN — solo lo que está en ambas</H2>
      <Snippet
        code={`SELECT u.nombre, p.total
FROM   usuarios u
INNER JOIN pedidos p ON p.usuario_id = u.id;`}
      />
      <P>
        Solo aparecen usuarios <strong>que tengan al menos un pedido</strong>, y pedidos cuyo usuario exista. El alias
        (<code>u</code>, <code>p</code>) hace la consulta más corta y legible — úsalo siempre.
      </P>

      <H2 num="02">LEFT JOIN — todos los de la izquierda</H2>
      <Snippet
        code={`SELECT u.nombre, p.total
FROM   usuarios u
LEFT JOIN pedidos p ON p.usuario_id = u.id;`}
      />
      <P>
        Mantiene <strong>todas</strong> las filas de <code>usuarios</code> aunque no tengan pedidos; en ese caso las
        columnas de <code>pedidos</code> aparecen como <code>NULL</code>. Útil para “quién <em>no</em> ha pedido”.
      </P>

      <H2 num="03">Las cuatro variantes en una imagen mental</H2>
      <ConceptRow>
        <Concept tint="y" mark="∩" title="INNER">
          Intersección. Solo coincidencias.
        </Concept>
        <Concept tint="b" mark="◐" title="LEFT">
          Todo lo de A + coincidencias de B.
        </Concept>
        <Concept tint="p" mark="◑" title="RIGHT">
          Todo lo de B + coincidencias de A.
        </Concept>
        <Concept tint="v" mark="∪" title="FULL">
          Todo, con NULLs donde no hay match.
        </Concept>
      </ConceptRow>

      <H2 num="04">Laboratorio · ver y comparar</H2>
      <Lab
        labId="lab-joins"
        initialState={{
          sql: `CREATE TABLE usuarios (
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
INSERT INTO pedidos VALUES (10,1,45000),(11,2,18000),(12,1,23000),(13,2,32000),(14,1,9000);`,
        }}
        initialSql={`-- Quién compró cuánto (solo usuarios con pedidos)\nSELECT u.nombre, p.id AS pedido, p.total\nFROM usuarios u\nINNER JOIN pedidos p ON p.usuario_id = u.id\nORDER BY u.nombre;`}
        autorun
        samples={[
          {
            label: "LEFT — incluye sin pedidos",
            sql: `SELECT u.nombre, p.id AS pedido, p.total
FROM usuarios u
LEFT JOIN pedidos p ON p.usuario_id = u.id
ORDER BY u.nombre;`,
          },
          {
            label: "sin pedidos",
            sql: `SELECT u.nombre
FROM usuarios u
LEFT JOIN pedidos p ON p.usuario_id = u.id
WHERE p.id IS NULL;`,
          },
          {
            label: "total por usuario",
            sql: `SELECT u.nombre, SUM(p.total) AS gastado
FROM usuarios u
LEFT JOIN pedidos p ON p.usuario_id = u.id
GROUP BY u.nombre
ORDER BY gastado DESC;`,
          },
        ]}
      />

      <Callout variant="note" label="El error #1 del JOIN">
        Olvidar la condición <code>ON</code> produce un <em>producto cartesiano</em>: cada fila de A se combina con cada
        fila de B. Si tienes 1.000 y 1.000, te salen <strong>un millón de filas</strong>. El motor no se queja, pero el
        servidor sí.
      </Callout>

      <H2 num="05">Desafíos · ponete a prueba</H2>
      <P>Tres retos con JOINs, de menor a mayor dificultad. Escribí tu consulta y dale <strong>Comprobar</strong>.</P>
      <ChallengeBoard schema={JOINS_LESSON.schema} challenges={JOINS_LESSON.challenges} />
    </div>
  );
}
