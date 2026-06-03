import type { Metadata } from "next";
import {
  Concept,
  ConceptRow,
  Callout,
  H1,
  H2,
  Lede,
  P,
} from "@/components/content";
import { RedisLab, RedisSnippet } from "@/components/nosql/redis/redis-lab";
import { CartDemo } from "@/components/nosql/redis/cart-demo";

export const metadata: Metadata = {
  title: "Redis",
  description:
    "Redis: base de datos en memoria con cinco estructuras de datos. Aprende STRINGs, LISTs, HASHs, SETs y ZSETs para sesiones, carritos, contadores, rankings y más.",
};

function CaseTag({ children }: { children: string }) {
  return (
    <span className="mr-2 inline-block rounded-full bg-ink px-3 py-1 font-mono text-[11px] tracking-wider text-cream uppercase">
      {children}
    </span>
  );
}

export default function RedisPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Redis — el <em>cuchillo suizo</em> en memoria.
      </H1>
      <Lede>
        Redis es una base de datos que vive en RAM. Cero tablas, cero JOINs. Todo
        son <strong>claves</strong> que apuntan a <strong>valores</strong>, pero el
        valor puede ser una de cinco estructuras muy poderosas. Es rapidísima —
        milisegundos — y por eso se usa para sesiones, carritos, cachés, colas y
        rankings.
      </Lede>

      <H2 num="01">Las cinco estructuras</H2>
      <P>
        Toda la magia se reduce a esto:{" "}
        <strong>una clave (string), un valor (5 sabores posibles)</strong>.
      </P>
      <ConceptRow>
        <Concept tint="y" mark={'"abc"'} title="STRING">
          El más simple. Texto, número o blob. Si parece número, soporta{" "}
          <code>INCR</code>.
        </Concept>
        <Concept tint="b" mark="↦↦" title="LIST">
          Cola/pila ordenada de strings. Empujas por la izquierda o por la derecha.
        </Concept>
        <Concept tint="p" mark="{k:v}" title="HASH">
          Como un objeto JSON pequeño dentro de una clave: campos → valores.
        </Concept>
        <Concept tint="g" mark="{•}" title="SET">
          Bolsa de strings <strong>sin duplicados</strong>, sin orden.
        </Concept>
        <Concept tint="v" mark="↧#" title="ZSET">
          Como un SET pero cada miembro lleva un <strong>score</strong>. Mantiene
          orden — ideal para rankings.
        </Concept>
      </ConceptRow>

      <H2 num="02">Sintaxis del CLI</H2>
      <P>
        Redis no usa SQL. Le hablas con comandos cortos en mayúsculas, separados
        por espacios:
      </P>
      <RedisSnippet
        code={`SET nombre "Ana"
GET nombre
INCR contador
LPUSH cola "tarea1" "tarea2"
HSET usuario:1 nombre "Ana" edad 30`}
      />
      <P>
        Lo verás aún más claro abajo — el lab te deja escribir comandos reales y
        ver cómo aparecen las claves al instante.
      </P>

      <H2 num="03">Tu primer lab Redis</H2>
      <RedisLab
        labId="lab-redis-intro"
        initialCommands={`# Una STRING simple
SET nombre "Ana"
GET nombre

# Un contador (también es STRING, pero numérico)
SET visitas 0
INCR visitas
INCR visitas
INCR visitas`}
        autorun={true}
        samples={[
          {
            label: "LIST de tareas",
            sql: `LPUSH cola "tarea1"
LPUSH cola "tarea2"
LPUSH cola "tarea3"
LRANGE cola 0 -1`,
          },
          {
            label: "HASH usuario",
            sql: `HSET usuario:1 nombre "Ana" edad 30 ciudad "Bogotá"
HGETALL usuario:1`,
          },
          {
            label: "SET de tags",
            sql: `SADD tags "redis" "cache" "nosql"
SADD tags "redis"
SMEMBERS tags`,
          },
          {
            label: "ZSET ranking",
            sql: `ZADD top 850 "Ana" 720 "Luis" 950 "María"
ZREVRANGE top 0 -1 WITHSCORES`,
          },
        ]}
      />

      <Callout variant="note" label="Convención de nombres">
        Las claves suelen llevar <strong>namespaces</strong> con dos puntos:{" "}
        <code>usuario:1</code>, <code>cart:42</code>, <code>post:7:likes</code>. No
        es obligatorio, pero hace mucho más fácil agrupar y debuggear.
      </Callout>

      {/* ============================================================
          CASO 1 — CARRITO DE COMPRAS (HASH)
          ============================================================ */}
      <H2 num="04">
        Caso 1 · <CaseTag>HASH</CaseTag> Carrito de compras
      </H2>
      <P>
        Un carrito necesita dos cosas: <strong>qué productos</strong> y{" "}
        <strong>cuánta cantidad</strong> de cada uno. Eso es literalmente un HASH:{" "}
        <code>cart:userId</code> donde cada <em>field</em> es un producto y el{" "}
        <em>value</em> es la cantidad.
      </P>
      <P>
        Toca la tienda de la izquierda y mira cómo se construye el HASH en Redis.
        Cada botón emite el comando que aparece abajo a la derecha.
      </P>

      <CartDemo />

      <Callout variant="ok" label="Por qué un HASH y no varias keys">
        Podrías usar <code>SET cart:1:sku-42 1</code>,{" "}
        <code>SET cart:1:sku-99 2</code>... pero entonces "ver el carrito completo"
        necesitaría escanear todas las claves (lento). Con HASH,{" "}
        <strong>una sola lectura</strong> (<code>HGETALL</code>) trae todo.
      </Callout>

      {/* ============================================================
          CASO 2 — SESIÓN (STRING + TTL)
          ============================================================ */}
      <H2 num="05">
        Caso 2 · <CaseTag>STRING + TTL</CaseTag> Sesión de usuario
      </H2>
      <P>
        Cuando alguien inicia sesión, el servidor genera un{" "}
        <strong>token</strong> y necesita guardar "a qué usuario pertenece este
        token, y por cuánto tiempo es válido". Redis es perfecto: clave única +
        valor + <strong>TTL</strong> que el motor mismo gestiona.
      </P>
      <P>
        El truco es el modificador <code>EX seconds</code> al final del{" "}
        <code>SET</code> — la clave se autodestruye. Prueba el flujo en el lab:
        crea la sesión con TTL, luego consulta cuánto tiempo le queda.
      </P>
      <RedisLab
        labId="lab-redis-session"
        initialCommands={`# Crear sesión con TTL de 30 segundos
SET session:tok_abc123 "user:ana" EX 30
TTL session:tok_abc123

# Ver el valor
GET session:tok_abc123

# Expirar manualmente
DEL session:tok_abc123
GET session:tok_abc123`}
        samples={[
          {
            label: "Crear sesión",
            sql: `SET session:tok_xyz987 "user:luis" EX 60
TTL session:tok_xyz987`,
          },
          {
            label: "Renovar TTL",
            sql: `SET session:tok_abc123 "user:ana" EX 30
EXPIRE session:tok_abc123 60
TTL session:tok_abc123`,
          },
          {
            label: "Sesión expirada",
            sql: `SET session:tok_old "user:maria" EX 1
TTL session:tok_old`,
          },
        ]}
      />

      <Callout variant="warn" label="Atención con el TTL">
        El TTL aplica a la <strong>clave entera</strong>, no a campos individuales.
        Si necesitas que un campo de un HASH expire por separado, conviene usar
        claves distintas con su propio TTL.
      </Callout>

      {/* ============================================================
          CASO 3 — LIKES (INCR + SET)
          ============================================================ */}
      <H2 num="06">
        Caso 3 · <CaseTag>INCR</CaseTag> Botón de like
      </H2>
      <P>
        Un post que recibe 10.000 likes por segundo es un nightmare para una base
        relacional: cada <code>UPDATE</code> bloquea filas, los índices se
        actualizan, hay locks... <strong>Redis lo hace en microsegundos</strong>{" "}
        porque <code>INCR</code> es atómico y no toca disco.
      </P>
      <P>
        En el lab de abajo, combinamos un HASH para los contadores y un SET para
        registrar qué usuarios ya dieron like — así evitamos el like-spam sin
        lógica extra en el servidor.
      </P>
      <RedisLab
        labId="lab-redis-likes"
        initialCommands={`# Inicializar contadores del post
HSET post:42:stats likes 0 views 1

# Simular likes de distintos usuarios
SADD post:42:liked_by "ana"
HINCRBY post:42:stats likes 1

SADD post:42:liked_by "luis"
HINCRBY post:42:stats likes 1

# Ver estado completo
HGETALL post:42:stats
SMEMBERS post:42:liked_by`}
        samples={[
          {
            label: "Like duplicado (SET evita)",
            sql: `SADD post:42:liked_by "ana"
SADD post:42:liked_by "ana"
SMEMBERS post:42:liked_by`,
          },
          {
            label: "Unlike (quitar like)",
            sql: `SREM post:42:liked_by "ana"
HINCRBY post:42:stats likes -1
HGETALL post:42:stats`,
          },
          {
            label: "Rate limiting simple",
            sql: `INCR rate:user:ana:api
EXPIRE rate:user:ana:api 60
TTL rate:user:ana:api`,
          },
        ]}
      />

      <Callout variant="note" label="Atomicidad">
        <code>INCR</code> es <strong>atómico</strong>: si mil clientes hacen{" "}
        <code>INCR</code> al mismo tiempo, el número final es exactamente mil más.
        No hay race conditions. Esa propiedad es la que vuelve a Redis ideal para
        contadores, rate-limiting, locks y semáforos.
      </Callout>

      {/* ============================================================
          CIERRE
          ============================================================ */}
      <H2 num="07">Cuándo Redis, cuándo NO Redis</H2>
      <ConceptRow>
        <Concept tint="g" mark="✓" title="Sí, Redis">
          Sesiones, carritos efímeros, contadores, leaderboards, caches de
          consultas, colas de tareas, rate limiting, pub/sub en tiempo real.
        </Concept>
        <Concept tint="p" mark="✗" title="No, Redis">
          Datos críticos donde no puedes permitir perder nada al reiniciar (aunque
          hay persistencia, no es su fuerte). Reportes con queries arbitrarias.
          Joins complejos. Búsqueda full-text (mejor Elasticsearch).
        </Concept>
      </ConceptRow>

      <Callout variant="ok" label="Resumen">
        Redis no <strong>reemplaza</strong> a una base relacional — la{" "}
        <strong>acompaña</strong>. Postgres guarda la verdad, Redis guarda lo
        rápido. La inmensa mayoría de apps grandes usan ambas.
      </Callout>
    </div>
  );
}
