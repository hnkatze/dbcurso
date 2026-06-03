import type { Metadata } from "next";
import {
  Concept,
  ConceptRow,
  Callout,
  H1,
  H2,
  Lede,
  P,
  UL,
} from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { ClusterDemo } from "@/components/nosql/cassandra/cluster-demo";

export const metadata: Metadata = {
  title: "Cassandra",
  description:
    "Cassandra: base de datos distribuida sin maestro, anillo de particiones, replicación y consistencia configurable. Aprende a modelar según tus queries.",
};

function CaseTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-ink text-cream mr-2 inline-block rounded-full px-3 py-1 font-mono text-[11px] tracking-wider uppercase">
      {children}
    </span>
  );
}

export default function CassandraPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Cassandra — <em>escala primero</em>, preguntas después.
      </H1>
      <Lede>
        Cassandra fue diseñada en Facebook para una sola cosa:{" "}
        <strong>nunca caerse, aunque mueras de éxito</strong>. No tiene maestro,
        no tiene punto único de falla, y agregar un nodo es literalmente
        conectarlo al clúster. A cambio te pide algo: modelar la base{" "}
        <em>según las queries que vas a hacer</em>.
      </Lede>

      <H2 num="01">El anillo — todos los nodos son iguales</H2>
      <P>
        En lugar de un servidor maestro, Cassandra coloca los nodos en un{" "}
        <strong>anillo</strong>. Cada uno es responsable de un rango del espacio
        de hashes. No hay jerarquía. Si uno se cae, los demás cubren su trabajo.
        Si agregas uno nuevo, el anillo se reorganiza para que cada nodo cargue
        una porción igual.
      </P>

      <ConceptRow>
        <Concept tint="b" mark="◯" title="Sin maestro">
          Cualquier nodo puede recibir tu petición y coordinarla. No hay "el
          servidor principal" que pueda caerse.
        </Concept>
        <Concept tint="g" mark="⇄" title="Replicación">
          Cada fila se guarda en N nodos (típicamente 3). Si dos caen, el
          tercero sigue respondiendo.
        </Concept>
        <Concept tint="p" mark="↗" title="Escala lineal">
          Doblar el tráfico = doblar los nodos. Sin reescribir queries, sin
          cuellos de botella.
        </Concept>
        <Concept tint="y" mark="◐" title="Trade-off (CAP)">
          Es <strong>AP</strong>: prioriza <em>Availability</em> y{" "}
          <em>Partition tolerance</em> sobre consistencia estricta. Lo veremos
          en &quot;consistency level&quot;.
        </Concept>
      </ConceptRow>

      <H2 num="02">La clave de todo: la partition key</H2>
      <P>
        En Cassandra, la <strong>primary key se divide en dos partes</strong>:
        la <strong>partition key</strong> decide{" "}
        <em>en qué nodo</em> vive la fila; la{" "}
        <strong>clustering key</strong> decide en qué{" "}
        <em>orden</em> se guardan las filas <em>dentro</em> de la partición.
      </P>
      <Snippet
        code={`CREATE TABLE messages (
  chat_id   text,
  ts        timestamp,
  by        text,
  text      text,
  PRIMARY KEY ((chat_id), ts)
);`}
      />
      <UL>
        <li>
          <code>(chat_id)</code> entre paréntesis dobles →{" "}
          <strong>partition key</strong>. Su hash decide el nodo.
        </li>
        <li>
          <code>ts</code> a continuación → <strong>clustering key</strong>.
          Ordena los mensajes dentro del chat.
        </li>
        <li>
          <strong>
            Todos los mensajes del mismo chat viven juntos
          </strong>
          , ordenados por fecha — leerlos es 1 disco, 1 nodo.
        </li>
      </UL>

      <Callout variant="warn" label="El error #1 al modelar Cassandra">
        Si pones la PK en algo que cambia (como un user_id que rara vez se
        consulta solo), las particiones quedan minúsculas y las queries reales
        tienen que <strong>tocar muchos nodos</strong>. La regla de oro:{" "}
        <strong>diseña la PK alrededor de la query que más vas a ejecutar</strong>.
      </Callout>

      {/* MAIN DEMO */}
      <H2 num="03">
        Caso · <CaseTag>Clúster</CaseTag> Ver el anillo en vivo
      </H2>
      <P>
        Aquí tienes un clúster de 5 nodos con factor de replicación 3. Selecciona
        un chat (esa es la partition key), escribe un mensaje y dale a{" "}
        <strong>INSERT</strong>. Vas a ver la fila <em>volar</em> hacia su nodo
        dueño y luego replicarse en los dos siguientes del anillo. Hacé clic en
        cualquier nodo para ver qué guarda dentro.
      </P>

      <ClusterDemo />

      <Callout variant="ok" label="Lo que estás viendo">
        Todos los mensajes con <code>chat_id = &apos;general&apos;</code> caen
        en el mismo nodo dueño + sus dos réplicas. Mientras esos tres nodos no
        se caigan a la vez, el chat sigue funcionando perfectamente — y leer
        todo el historial es una operación local, ultra rápida.
      </Callout>

      <H2 num="04">Reglas de las queries — lo que duele al principio</H2>
      <P>
        Por cómo funciona la partición, Cassandra{" "}
        <strong>obliga</strong> a que tu <code>WHERE</code> incluya la partition
        key. No puedes hacer &quot;dame todos los mensajes donde el texto contiene
        X&quot; como en SQL: eso obligaría a escanear todos los nodos.
      </P>
      <Snippet
        code={`-- ✓ válido — sabe a qué nodo ir
SELECT * FROM messages WHERE chat_id = 'general';

-- ✓ válido — partition + rango sobre clustering
SELECT * FROM messages
WHERE chat_id = 'general' AND ts > '2026-01-01';

-- ✗ inválido — sin partition key, necesitaría hablar con todos
SELECT * FROM messages WHERE text = 'hola';`}
      />
      <P>
        Si <em>realmente</em> necesitas otra forma de buscar, creas{" "}
        <strong>una segunda tabla</strong> con la PK diseñada para esa query.
        Sí: en Cassandra se <strong>duplica el dato</strong> a propósito. Es
        barato (disco) y vuelve cada query super rápida.
      </P>

      <H2 num="05">Consistency level — eligiendo en cada query</H2>
      <P>
        Como hay varias réplicas, en cada operación puedes elegir cuántas tienen
        que confirmar:
      </P>
      <ConceptRow>
        <Concept tint="g" mark="ONE" title="ONE">
          1 réplica confirma. Velocísimo, puede leer datos un poquito viejos.
        </Concept>
        <Concept tint="y" mark="QUORUM" title="QUORUM">
          La mayoría confirma (RF/2 + 1). Balance recomendado para casi todo.
        </Concept>
        <Concept tint="p" mark="ALL" title="ALL">
          Todas las réplicas. Máxima consistencia, pero si una se cae, falla la
          query.
        </Concept>
      </ConceptRow>

      <H2 num="06">Cuándo Cassandra, cuándo NO</H2>
      <ConceptRow>
        <Concept tint="g" mark="✓" title="Sí, Cassandra">
          Volúmenes masivos de escritura (logs, IoT, métricas, telemetría).
          Aplicaciones <em>always-on</em> en varios datacenters. Time-series y
          feeds donde la query siempre lleva la misma clave. Netflix, Discord,
          Apple, Instagram la usan así.
        </Concept>
        <Concept tint="p" mark="✗" title="No, Cassandra">
          Si no sabes cómo vas a consultar. Si necesitas JOINs, transacciones,
          agregaciones complejas. Si tu volumen no justifica un clúster (3
          servidores mínimos). En esos casos, Postgres te alcanza y sobra.
        </Concept>
      </ConceptRow>

      <Callout variant="note" label="La gran moraleja de Cassandra">
        &quot;Modela según tus queries, no según tus entidades.&quot; En SQL diseñas
        las tablas con la idea de un mundo limpio y normalizado; en Cassandra
        diseñas con la idea de las preguntas que tu app va a hacer cada segundo.
        Es una mentalidad distinta — pero a escala planetaria, es la única que
        sobrevive.
      </Callout>
    </div>
  );
}
