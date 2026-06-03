import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { Lab } from "@/components/lab/lab";

export const metadata: Metadata = {
  title: "Llaves PK / FK",
  description: "Identificar filas con la llave primaria y conectarlas con llaves foráneas: integridad referencial.",
};

export default function KeysPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Llaves: <em>identificar</em> y <em>conectar</em>.
      </H1>
      <Lede>
        Una <strong>llave primaria</strong> (PK) responde a “¿cuál fila es esta?”. Una <strong>llave foránea</strong> (FK)
        responde a “¿con cuál fila de otra tabla está relacionada esta?”. Solo dos ideas, pero sostienen todo el modelo.
      </Lede>

      <H2 num="01">Primary Key</H2>
      <P>
        Una PK es una columna (o combinación) que <strong>identifica unívocamente</strong> cada fila. El motor te
        garantiza dos cosas:
      </P>
      <UL>
        <li>
          <strong>No se repite</strong> el valor entre filas.
        </li>
        <li>
          <strong>No es <code>NULL</code></strong>.
        </li>
      </UL>
      <Snippet
        code={`CREATE TABLE usuarios (
  id     INT PRIMARY KEY AUTO_INCREMENT,
  email  VARCHAR(120) UNIQUE NOT NULL,
  nombre VARCHAR(80)
);`}
      />
      <P>
        El email también es único, pero la PK ideal suele ser un <strong>id sintético</strong> (un número o UUID) — los
        emails cambian, los IDs no.
      </P>

      <H2 num="02">Foreign Key — el “puente”</H2>
      <P>
        Una FK es una columna en la tabla A que apunta a la PK de la tabla B. El motor verifica que el valor exista
        realmente del otro lado: <strong>integridad referencial</strong>.
      </P>
      <Snippet
        code={`CREATE TABLE pedidos (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id  INT NOT NULL REFERENCES usuarios(id),
  total       DECIMAL(10,2),
  creado_en   TIMESTAMP
);`}
      />
      <Callout variant="warn" label="Lo que rompe sin FK">
        Sin FK, alguien puede insertar un pedido con <code>usuario_id = 9999</code> que no existe. Tres meses después, un
        reporte que “suma pedidos por usuario” ignora silenciosamente esos huérfanos. La FK lo bloquea desde el primer
        INSERT.
      </Callout>

      <H2 num="03">Laboratorio · armar la relación</H2>
      <P>
        El siguiente lab crea dos tablas conectadas. Intenta insertar un pedido con un <code>usuario_id</code> que no
        existe — el motor te corregirá.
      </P>

      <Lab
        canvas
        labId="lab-keys"
        initialSql={`CREATE TABLE usuarios (
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
  (1, 23000);`}
        autorun
        samples={[
          { label: "usuario válido", sql: `INSERT INTO pedidos (usuario_id, total) VALUES (1, 99000);` },
          { label: "usuario fantasma ✗", sql: `INSERT INTO pedidos (usuario_id, total) VALUES (777, 50000);` },
          {
            label: "email duplicado ✗",
            sql: `INSERT INTO usuarios (nombre, email) VALUES ('Otra Ana', 'ana@mail.com');`,
          },
        ]}
      />

      <H2 num="04">Cardinalidad — cuántas con cuántas</H2>
      <ConceptRow>
        <Concept tint="y" mark="1·1" title="Uno a uno">
          Cada usuario tiene exactamente un <em>perfil</em> y viceversa. Se modela poniendo la FK en cualquiera de las
          dos.
        </Concept>
        <Concept tint="b" mark="1·N" title="Uno a muchos">
          Un usuario tiene <strong>muchos</strong> pedidos. La FK vive en la tabla del lado <em>“muchos”</em>.
        </Concept>
        <Concept tint="p" mark="N·N" title="Muchos a muchos">
          Productos en muchas categorías y categorías con muchos productos. Se resuelve con una{" "}
          <strong>tabla puente</strong>: <code>producto_categoria(producto_id, categoria_id)</code>.
        </Concept>
      </ConceptRow>
    </div>
  );
}
