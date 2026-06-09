import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { Lab } from "@/components/lab/lab";
import { ChallengeBoard } from "@/components/lab/challenge";
import { CREATE_LESSON } from "@/lib/challenges/create";

export const metadata: Metadata = {
  title: "CREATE / ALTER",
  description: "Diseña tablas con CREATE TABLE: columnas, tipos y restricciones que el motor aplica por ti.",
};

export default function CreatePage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Diseñar tablas con <em>CREATE TABLE</em>.
      </H1>
      <Lede>
        Antes de guardar un solo dato, declaras la <strong>forma</strong> de la tabla: qué columnas tiene, de qué tipo, y
        qué restricciones aplica el motor por ti.
      </Lede>

      <H2 num="01">Anatomía de un CREATE TABLE</H2>
      <Snippet
        code={`CREATE TABLE productos (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  nombre   VARCHAR(80) NOT NULL,
  precio   DECIMAL(10,2) DEFAULT 0,
  stock    INT NOT NULL DEFAULT 0
);`}
      />

      <UL>
        <li>
          <code>INT</code>, <code>VARCHAR(80)</code>, <code>DECIMAL(10,2)</code> son <strong>tipos</strong>.
        </li>
        <li>
          <code>PRIMARY KEY</code> dice “esta columna identifica cada fila de forma única”.
        </li>
        <li>
          <code>NOT NULL</code> prohíbe valores vacíos.
        </li>
        <li>
          <code>DEFAULT</code> rellena un valor cuando el INSERT no lo especifica.
        </li>
        <li>
          <code>AUTO_INCREMENT</code> hace que el motor invente el siguiente número él solo.
        </li>
      </UL>

      <H2 num="02">Tipos que vas a usar 90% del tiempo</H2>
      <ConceptRow>
        <Concept tint="y" mark="#" title="Numéricos">
          <code>INT</code>, <code>BIGINT</code> para enteros. <code>DECIMAL(p,e)</code> para dinero. <code>FLOAT</code> solo
          si no te importa la precisión.
        </Concept>
        <Concept tint="b" mark="A" title="Texto">
          <code>VARCHAR(n)</code> cuando hay límite razonable. <code>TEXT</code> para texto largo y libre.
        </Concept>
        <Concept tint="p" mark="τ" title="Fecha/hora">
          <code>DATE</code> solo fecha, <code>TIMESTAMP</code> incluye hora. Útiles para auditoría y reportes.
        </Concept>
        <Concept tint="g" mark="✓" title="Lógicos">
          <code>BOOLEAN</code> verdadero/falso. En MySQL clásico se usa <code>TINYINT(1)</code>.
        </Concept>
      </ConceptRow>

      <Callout variant="warn" label="Tip de profesor">
        Para <strong>dinero</strong> usa <code>DECIMAL</code>, nunca <code>FLOAT</code>. <code>FLOAT</code> aproxima y te
        va a regalar centavos perdidos en facturas.
      </Callout>

      <H2 num="03">Laboratorio · construye tu primera tabla</H2>
      <P>
        Ejecuta el ejemplo, mira cómo aparece la tabla. Luego prueba con los chips de abajo para añadir columnas o crear
        más tablas — verás cómo el lienzo se reorganiza.
      </P>

      <Lab
        labId="lab-create"
        initialSql={`CREATE TABLE productos (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  nombre   VARCHAR(80) NOT NULL,
  precio   DECIMAL(10,2) DEFAULT 0,
  stock    INT NOT NULL DEFAULT 0
);`}
        autorun
        samples={[
          {
            label: "+ tabla categorías",
            sql: `CREATE TABLE categorias (
  id     INT PRIMARY KEY,
  nombre VARCHAR(40) UNIQUE
);`,
          },
          {
            label: "ALTER · añadir columna",
            sql: `ALTER TABLE productos ADD COLUMN destacado BOOLEAN DEFAULT FALSE;`,
          },
          { label: "DROP · borrar tabla", sql: `DROP TABLE productos;` },
        ]}
      />

      <H2 num="04">Modificar el esquema con ALTER</H2>
      <P>
        Una tabla creada no es para siempre. <code>ALTER TABLE</code> te deja añadir columnas, quitarlas o renombrarlas —
        sin perder los datos existentes.
      </P>
      <Snippet
        code={`ALTER TABLE productos ADD COLUMN destacado BOOLEAN DEFAULT FALSE;
ALTER TABLE productos DROP COLUMN stock;`}
      />

      <Callout variant="note" label="En producción">
        Cambiar el esquema con tráfico vivo se llama <em>migración</em>. Existen herramientas como Flyway, Liquibase o las
        migrations de Django/Rails que aplican cambios de forma <strong>versionada</strong>. Lección para más adelante.
      </Callout>

      <H2 num="05">Desafíos · ponete a prueba</H2>
      <P>
        Tres retos de creación y modificación de esquema, de menor a mayor dificultad. Escribí tu consulta y dale{" "}
        <strong>Comprobar</strong>.
      </P>
      <ChallengeBoard schema={CREATE_LESSON.schema} challenges={CREATE_LESSON.challenges} />
    </div>
  );
}
