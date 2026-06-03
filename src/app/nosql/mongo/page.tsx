import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { MongoSnippet } from "@/components/nosql/mongo/mongo-snippet";
import { BlogDemo } from "@/components/nosql/mongo/blog-demo";
import { FilterDemo } from "@/components/nosql/mongo/filter-demo";
import { ProfileDemo } from "@/components/nosql/mongo/profile-demo";

export const metadata: Metadata = {
  title: "MongoDB",
  description:
    "Aprende MongoDB: documentos JSON, CRUD con operadores $, embedding vs referencing y cuándo usar una base orientada a documentos.",
};

function CaseTag({ children }: { children: string }) {
  return (
    <span className="mr-2 inline-block rounded-full bg-ink px-3 py-1 font-mono text-[11px] tracking-wider text-cream uppercase">
      {children}
    </span>
  );
}

export default function MongoPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        MongoDB — <em>documentos</em>, no tablas.
      </H1>
      <Lede>
        Si en SQL los datos viven en filas con columnas fijas, en Mongo viven en{" "}
        <strong>documentos JSON</strong> que pueden anidar objetos, arrays, lo que quieras. Cada
        documento tiene su propia forma. La estructura no se declara antes — se descubre al
        insertar.
      </Lede>

      <H2 num="01">Vocabulario que sí cambia</H2>
      <ConceptRow>
        <Concept tint="y" mark="≡" title="Database">
          Sigue siendo la base de datos. Una por proyecto, normalmente.
        </Concept>
        <Concept tint="b" mark="◇" title="Collection">
          El equivalente a una tabla. Un grupo de documentos relacionados (<code>posts</code>,{" "}
          <code>users</code>).
        </Concept>
        <Concept tint="g" mark="{ }" title="Document">
          Un objeto JSON con un campo único <code>_id</code>. El equivalente de una fila, pero{" "}
          <strong>cada uno puede tener su propia forma</strong>.
        </Concept>
        <Concept tint="p" mark="[ ]" title="Embedded">
          Dentro de un documento puedes guardar <strong>arrays</strong> u{" "}
          <strong>objetos anidados</strong>. Adiós a tablas auxiliares para datos que viven juntos.
        </Concept>
      </ConceptRow>

      <P>
        Un documento se ve así. Lo importante es que estos cuatro campos no están
        &quot;predefinidos&quot; en ningún lado — el motor los acepta al insertar:
      </P>
      <MongoSnippet
        code={`{
  _id: "p001",
  title: "Por qué empezar con SQL antes que NoSQL",
  author: "profesor_db",
  tags: ["sql", "tutorial"],
  stats: { views: 142, likes: 28 },
  comments: [
    { by: "ana",  text: "Buenísimo!", likes: 3 },
    { by: "luis", text: "¿Y cuándo Mongo?", likes: 1 }
  ]
}`}
      />

      <Callout variant="note" label="¿Por qué guardar comentarios DENTRO del post?">
        En SQL tendrías una tabla <code>comments</code> y un JOIN cada vez que muestras el post. En
        Mongo, mostrar el post completo es <strong>una sola lectura</strong>. Ese principio se llama{" "}
        <em>embedding</em> y es el corazón del diseño con documentos.
      </Callout>

      <H2 num="02">CRUD — los cuatro verbos en Mongo</H2>
      <P>El shell de Mongo usa JavaScript. Aquí está la versión sin floritura:</P>
      <MongoSnippet
        code={`// Insertar
db.posts.insertOne({ title: "Hola", author: "ana", likes: 0 })

// Leer
db.posts.find({ author: "ana" })
db.posts.findOne({ _id: "p001" })

// Actualizar
db.posts.updateOne({ _id: "p001" }, { $set: { title: "Nuevo título" } })

// Borrar
db.posts.deleteOne({ _id: "p001" })`}
      />

      <P>
        Lo único &quot;raro&quot; al principio son los <strong>operadores con $</strong>. En el{" "}
        <em>query</em> sirven para comparar (<code>$gt</code>, <code>$in</code>…), en el{" "}
        <em>update</em> sirven para modificar (<code>$set</code>, <code>$inc</code>,{" "}
        <code>$push</code>…).
      </P>

      <H2 num="03">
        Caso 1 · <CaseTag>$push</CaseTag> Blog con comentarios
      </H2>
      <P>
        Este es el ejemplo clásico donde Mongo brilla: un post con un array de comentarios anidado.
        Cuando alguien comenta, no insertas en otra tabla —{" "}
        <strong>
          haces <code>$push</code> al array
        </strong>{" "}
        del documento.
      </P>
      <P>
        Escribe un comentario abajo y mira el documento entero a la derecha. Cada acción (comentar,
        dar like, borrar) imprime el comando Mongo exacto.
      </P>
      <BlogDemo />

      <H2 num="04">Operadores de query — filtrar como pro</H2>
      <ConceptRow>
        <Concept tint="y" mark="=" title="Igualdad">
          <code>{`{ author: "ana" }`}</code>. Para algo distinto:{" "}
          <code>{`{ author: { $ne: "ana" } }`}</code>.
        </Concept>
        <Concept tint="b" mark="≷" title="Rangos">
          <code>$gt</code>, <code>$gte</code>, <code>$lt</code>, <code>$lte</code>.{" "}
          <code>{`{ price: { $lte: 20000 } }`}</code>.
        </Concept>
        <Concept tint="p" mark="∈" title="Listas">
          <code>{`{ category: { $in: ["café","té"] } }`}</code> es como{" "}
          <code>WHERE … IN</code>.
        </Concept>
        <Concept tint="g" mark="∧∨" title="Combinación">
          <code>$and</code>, <code>$or</code> aceptan un array de condiciones.
        </Concept>
      </ConceptRow>

      <MongoSnippet
        code={`db.products.find({
  category: { $in: ["café", "té"] },
  price:    { $lte: 20000 },
  $or: [
    { stock: { $gt: 0 } },
    { tags:  "premium" }
  ]
})`}
      />

      <H2 num="05">
        Caso 2 · <CaseTag>find()</CaseTag> Catálogo filtrable
      </H2>
      <P>
        Mueve los filtros de la izquierda y mira la{" "}
        <strong>query Mongo construirse en vivo</strong> a la derecha. Es exactamente lo que hace
        cualquier e-commerce moderno: cada filtro es un operador más en el objeto de búsqueda.
      </P>
      <FilterDemo />

      <H2 num="06">Operadores de update</H2>
      <ConceptRow>
        <Concept tint="y" mark="$set" title="$set">
          Cambiar un campo a un valor exacto. Soporta <strong>dot-notation</strong>:{" "}
          <code>&quot;address.city&quot;</code>.
        </Concept>
        <Concept tint="b" mark="$inc" title="$inc">
          Sumar (o restar con valor negativo). Ideal para contadores.
        </Concept>
        <Concept tint="g" mark="$push" title="$push / $pull">
          Añadir o quitar elementos de un array dentro del documento.
        </Concept>
        <Concept tint="p" mark="$addToSet" title="$addToSet">
          Como <code>$push</code> pero <strong>evita duplicados</strong> — útil para tags, likers,
          etc.
        </Concept>
      </ConceptRow>

      <H2 num="07">
        Caso 3 · <CaseTag>$set</CaseTag> Editor de perfil
      </H2>
      <P>
        Aquí lo que importa es <strong>dot-notation</strong>: para cambiar la ciudad dentro de{" "}
        <code>address</code>, el campo se escribe <code>&quot;address.city&quot;</code>. Mongo
        entiende el camino y solo modifica esa hoja, sin tocar el resto del objeto.
      </P>
      <ProfileDemo />

      <Callout variant="warn" label="No reemplaces el documento entero">
        Un error común al empezar:{" "}
        <code>{`updateOne({_id}, { newDoc })`}</code> sin <code>$set</code>. Eso{" "}
        <strong>reemplaza</strong> el documento entero — pierdes campos que no incluiste. Siempre
        usa los operadores ($set, $inc, $push) cuando quieras editar.
      </Callout>

      <H2 num="08">Embedding vs Referencing</H2>
      <P>
        La gran decisión de diseño en Mongo es{" "}
        <strong>cuándo anidar y cuándo referenciar</strong>. La regla práctica:
      </P>
      <UL>
        <li>
          <strong>Embed</strong> cuando los datos hijos <em>solo viven con su padre</em> y se leen
          juntos: comentarios de un post, dirección de un usuario, items dentro de un pedido.
        </li>
        <li>
          <strong>Reference</strong> (un campo con el <code>_id</code> del otro) cuando los datos
          son <em>independientes</em> y se comparten: un usuario que aparece como autor en miles de
          posts no se duplica; guardas <code>{`{ author_id: "u042" }`}</code>.
        </li>
        <li>
          Hay un límite duro: un documento no puede exceder <strong>16 MB</strong>. Si el array
          crece sin parar, separa.
        </li>
      </UL>

      <H2 num="09">Cuándo Mongo, cuándo NO Mongo</H2>
      <ConceptRow>
        <Concept tint="g" mark="✓" title="Sí, Mongo">
          Datos cuya forma varía entre registros. Catálogos con atributos heterogéneos. Logs y
          eventos. Contenido (posts, productos) que se lee mucho más de lo que se cruza. Apps que
          crecen rápido sin esquema fijo.
        </Concept>
        <Concept tint="p" mark="✗" title="No, Mongo">
          Sistemas con muchas <strong>relaciones</strong> donde harás cinco JOINs (banca, ERP).
          Reportes complejos con queries arbitrarias. Cuando la{" "}
          <strong>consistencia transaccional</strong> es vital (aunque Mongo ya soporta
          transacciones, no es su fuerte original).
        </Concept>
      </ConceptRow>

      <Callout variant="ok" label="Resumen">
        Mongo no es &quot;SQL sin esquema&quot;. Es un modelo distinto donde tú{" "}
        <strong>diseñas los documentos en función de cómo se van a leer</strong>. Cuando lo
        entiendes, escribir CRUD es liberador. Cuando lo fuerzas a parecer una base relacional,
        sufres. Elige por la <strong>forma del problema</strong>, no por moda.
      </Callout>
    </div>
  );
}
