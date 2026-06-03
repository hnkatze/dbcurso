import { Concept, ConceptRow, Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Lab } from "@/components/lab/lab";

export default function IntroPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Bases de datos <em>relacionales</em>, sin misterio.
      </H1>
      <Lede>
        Una base de datos relacional es solo un conjunto de <strong>tablas</strong> que se conocen entre sí. Cada tabla
        guarda <strong>filas</strong> con la misma forma, y las relaciones entre tablas se hacen con <strong>llaves</strong>.
        Eso es todo. Lo demás es vocabulario.
      </Lede>

      <H2 num="01">El modelo en tres ideas</H2>
      <ConceptRow>
        <Concept tint="y" mark="T" title="Tabla">
          Una colección de filas con columnas tipadas. <code>usuarios</code>, <code>pedidos</code>, <code>productos</code>.
        </Concept>
        <Concept tint="b" mark="F" title="Fila">
          Un registro concreto: un usuario, un pedido. Cada fila respeta el “esquema” de su tabla.
        </Concept>
        <Concept tint="p" mark="L" title="Llave">
          Identifica filas (<strong>PK</strong>) y conecta tablas entre sí (<strong>FK</strong>).
        </Concept>
      </ConceptRow>

      <P>
        Todo lo que harás se reduce a cuatro verbos — <code>CREATE</code>, <code>INSERT</code>, <code>SELECT</code>,
        <code> UPDATE/DELETE</code> — más una idea: <strong>JOIN</strong>, que es como “armar” información que vive en
        tablas separadas.
      </P>

      <H2 num="02">¿Por qué tablas y no “solo un JSON”?</H2>
      <P>
        Las tablas obligan a una forma. Esa restricción se llama <strong>esquema</strong>, y aunque suene rígida es la
        razón por la que millones de filas siguen siendo rápidas y consistentes décadas después: el motor sabe exactamente
        qué esperar.
      </P>
      <UL>
        <li>
          <strong>Consistencia.</strong> El motor rechaza datos malformados antes de que entren.
        </li>
        <li>
          <strong>Relaciones explícitas.</strong> Las llaves foráneas garantizan que un pedido no apunte a un usuario que
          no existe.
        </li>
        <li>
          <strong>Consultas declarativas.</strong> Le dices <em>qué</em> quieres, no <em>cómo</em> conseguirlo. El
          optimizador hace el resto.
        </li>
        <li>
          <strong>Transacciones (ACID).</strong> Varias operaciones se completan todas o ninguna.
        </li>
      </UL>

      <H2 num="03">Tu primer laboratorio</H2>
      <P>
        En cada módulo verás un editor SQL real a la izquierda y la base de datos viva a la derecha. Escribe, dale{" "}
        <strong>Ejecutar</strong> (o <code>⌘/Ctrl + Enter</code>) y las tablas se animan al ritmo de tus comandos.
      </P>

      <Lab
        labId="lab-intro"
        initialSql={`-- Creamos una tabla y le metemos dos filas\nCREATE TABLE usuarios (\n  id   INT PRIMARY KEY,\n  nombre VARCHAR(40),\n  ciudad VARCHAR(40)\n);\n\nINSERT INTO usuarios VALUES\n  (1, 'Ana',  'Bogotá'),\n  (2, 'Luis', 'Medellín');\n\nSELECT * FROM usuarios;`}
        autorun
        samples={[
          { label: "agregar fila", sql: `INSERT INTO usuarios VALUES (3, 'María', 'Cali');\nSELECT * FROM usuarios;` },
          { label: "filtrar", sql: `SELECT nombre FROM usuarios WHERE ciudad = 'Bogotá';` },
        ]}
      />

      <Callout variant="note" label="Cómo leer este sitio">
        Cada módulo a la izquierda es un <strong>capítulo</strong>. Te sugerimos seguirlos en orden la primera vez — cada
        uno asume lo del anterior.
      </Callout>
    </div>
  );
}
