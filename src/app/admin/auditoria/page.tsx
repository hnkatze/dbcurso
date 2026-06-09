import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Lab } from "@/components/lab/lab";
import { ChallengeBoard } from "@/components/lab/challenge";
import { AUDITORIA_LESSON } from "@/lib/challenges/auditoria";

export const metadata: Metadata = {
  title: "Auditoría de datos",
  description:
    "Administrar una base no es solo guardar datos: es vigilar que sean correctos. Detectá huérfanos, duplicados y valores inválidos con consultas, y reparalos.",
};

export default function AuditoriaPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Auditoría de <em>datos</em>.
      </H1>
      <Lede>
        Guardar datos es fácil. Mantenerlos <strong>correctos</strong> es el verdadero trabajo de quien administra una base.
        Con el tiempo aparecen filas huérfanas, duplicados, valores imposibles y campos vacíos. Auditar es{" "}
        <strong>buscar esos problemas con consultas</strong> — y arreglarlos.
      </Lede>

      <H2 num="01">Por qué los datos se ensucian</H2>
      <P>
        Ninguna base nace sucia: se ensucia de a poco. Una app con un bug inserta un pedido sin fecha; una integración
        carga dos veces el mismo cliente; alguien borra una categoría pero deja los productos que la usaban. El motor no
        siempre lo impide —sobre todo cuando faltan restricciones— así que la integridad termina dependiendo de que{" "}
        <strong>alguien la vigile</strong>.
      </P>

      <H2 num="02">Los problemas clásicos</H2>
      <ConceptRow>
        <Concept tint="p" mark="⌀" title="Huérfanos">
          Una fila apunta (por su <code>id</code> foráneo) a otra que ya no existe. Un pedido de un cliente fantasma.
        </Concept>
        <Concept tint="y" mark="≡" title="Duplicados">
          El mismo dato cargado dos veces: dos clientes con idéntico email. Rompen conteos y reportes.
        </Concept>
        <Concept tint="b" mark="∅" title="NULLs indebidos">
          Campos críticos vacíos: un pedido sin fecha, un cliente sin nombre. Se cazan con <code>IS NULL</code>.
        </Concept>
        <Concept tint="g" mark="±" title="Valores inválidos">
          Datos que no tienen sentido en el dominio: precios en 0 o negativos, cantidades menores a cero.
        </Concept>
      </ConceptRow>

      <Callout variant="note" label="Detectar y reparar">
        Una auditoría real tiene dos tiempos: primero <strong>detectás</strong> el problema con un <code>SELECT</code> que
        lo aísla, y después lo <strong>reparás</strong> con un <code>UPDATE</code>, un <code>DELETE</code> o un{" "}
        <code>INSERT</code> corregido. Los desafíos de abajo practican ambos.
      </Callout>

      <H2 num="03">Explorá la base sucia</H2>
      <P>
        Esta tienda tiene problemas plantados a propósito en sus cuatro tablas. Corré las consultas de ejemplo y mirá qué
        encontrás antes de pasar a los desafíos.
      </P>
      <Lab
        labId="lab-auditoria"
        initialState={{ sql: AUDITORIA_LESSON.schema }}
        initialSql={`-- Mirá todos los pedidos: ¿notás algo raro?\nSELECT * FROM pedidos;`}
        autorun
        samples={[
          { label: "pedidos sin fecha", sql: `SELECT id, cliente_id, total FROM pedidos WHERE fecha IS NULL;` },
          { label: "precios inválidos", sql: `SELECT nombre, precio FROM productos WHERE precio <= 0;` },
          {
            label: "emails repetidos",
            sql: `SELECT email, COUNT(*) AS veces FROM clientes GROUP BY email HAVING COUNT(*) > 1;`,
          },
          {
            label: "pedidos huérfanos",
            sql: `SELECT p.id, p.cliente_id FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id WHERE c.id IS NULL;`,
          },
        ]}
      />

      <Callout variant="warn" label="Ojo con NULL">
        <code>fecha = NULL</code> nunca es verdadero, ni siquiera cuando la fecha es nula. <code>NULL</code> significa
        “desconocido”, así que se compara con <code>IS NULL</code> / <code>IS NOT NULL</code>. Es el error de auditoría más
        común.
      </Callout>

      <H2 num="04">Desafíos · auditá y repará</H2>
      <P>
        Seis retos sobre la base sucia: unos te piden <strong>detectar</strong> el problema con una consulta, otros te dan
        una operación que <strong>falla con un error</strong> y tenés que corregirla. Escribí tu solución y dale{" "}
        <strong>Comprobar</strong>.
      </P>
      <UL>
        <li>
          <strong>Detección:</strong> el editor arranca vacío — vos escribís la consulta que aísla el problema.
        </li>
        <li>
          <strong>Reparación:</strong> el editor trae la consulta rota. Corréla para ver el error del motor, después
          arreglala.
        </li>
      </UL>
      <ChallengeBoard schema={AUDITORIA_LESSON.schema} challenges={AUDITORIA_LESSON.challenges} />
    </div>
  );
}
