import type { Metadata } from "next";
import { Concept, ConceptRow, Callout, H1, H2, Lede, P } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { ChatDemo } from "@/components/nosql/firebase/ChatDemo";
import { OrdersDemo } from "@/components/nosql/firebase/OrdersDemo";

export const metadata: Metadata = {
  title: "Firebase",
  description:
    "Aprende Firebase Realtime Database y Firestore: listeners en tiempo real, push keys y reglas de seguridad declarativas.",
};

function CaseTag({ children }: { children: string }) {
  return (
    <span className="mr-2 inline-block rounded-full bg-ink px-3 py-1 font-mono text-[11px] tracking-wider text-cream uppercase">
      {children}
    </span>
  );
}

export default function FirebasePage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Firebase — la base que <em>te avisa</em>.
      </H1>
      <Lede>
        La idea más rara que trae Firebase es: tu app no <em>pregunta</em> por los datos, los{" "}
        <em>recibe</em>. Cada vez que algo cambia en la base, todas las pantallas que estaban mirando
        ese pedazo se actualizan solas. Realtime sin esfuerzo, sin servidor propio, sin WebSockets
        escritos a mano.
      </Lede>

      <H2 num="01">Dos productos, una filosofía</H2>
      <ConceptRow>
        <Concept tint="y" mark="↝" title="Realtime Database">
          La original. <strong>Un único árbol JSON</strong> gigantesco; pides una rama y te
          suscribes. Buena para chat, presencia, juegos sencillos.
        </Concept>
        <Concept tint="g" mark="◇" title="Firestore">
          La moderna. <strong>Colecciones de documentos</strong>, parecida a Mongo pero con{" "}
          <code>onSnapshot()</code> de fábrica y reglas de seguridad. Más escalable para apps grandes.
        </Concept>
      </ConceptRow>
      <P>
        Las dos son &quot;realtime&quot; y serverless. La elección depende del tamaño esperado y del
        modelo de datos. Firestore gana en casi todo lo nuevo, pero RTDB sigue siendo perfecto para
        casos donde el árbol plano modela mejor (chats, contadores compartidos, presencia).
      </P>

      <H2 num="02">Los cuatro verbos del RTDB</H2>
      <Snippet
        code={`// Apuntar a una ruta
const ref = db.ref('chats/general/messages');

// Reemplazar todo lo que hay en ese path
ref.set({ ... });

// Mezclar campos (no borra lo demás)
ref.update({ ... });

// Agregar un hijo con clave auto-generada
ref.push({ by: 'ana', text: 'hola', at: Date.now() });

// Borrar el nodo
ref.remove();

// Y la joya:
ref.on('value', snap => render(snap.val()));`}
      />
      <P>
        <code>on(&apos;value&apos;)</code> es lo que cambia el juego. Tu UI ya no pregunta — Firebase
        llama tu función con el dato nuevo cada vez que cambia.
      </P>

      <H2 num="03">
        Caso 1 · <CaseTag>RTDB</CaseTag> Chat en tiempo real
      </H2>
      <P>
        Dos teléfonos, uno solo árbol. Cuando Ana escribe, el mensaje viaja a Firebase y el listener
        de Luis dispara — su pantalla se actualiza sin tocarla. Mira el árbol JSON crecer en vivo a
        la derecha.
      </P>
      <ChatDemo />

      <Callout variant="note" label="Por qué push() y no set()">
        <code>push()</code> genera una clave única ordenada por timestamp (los{" "}
        <code>-Mx…</code> que ves). Si dos clientes hacen push al mismo tiempo, sus mensajes no
        chocan: cada uno termina en su propia clave. <code>set()</code> con la misma ruta los
        sobrescribiría.
      </Callout>

      <H2 num="04">Firestore — colecciones con superpoderes</H2>
      <Snippet
        code={`db.collection('orders').add({
  customer: 'Ana',
  total: 45000,
  status: 'recibido'
});

// Listener: dispara cada vez que cambia la colección
db.collection('orders').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added')   addToUI(change.doc);
    if (change.type === 'modified') updateUI(change.doc);
    if (change.type === 'removed') removeFromUI(change.doc);
  });
});`}
      />
      <P>
        Si vienes de Mongo, esto te resulta familiar. La diferencia es <strong>onSnapshot</strong>:
        aquí no <em>tiras</em> de los datos, te <em>llegan</em> cuando hay cambios. Y un detalle
        bonito — Firestore te dice qué cambió, no solo el estado nuevo.
      </P>

      <H2 num="05">
        Caso 2 · <CaseTag>Firestore</CaseTag> Dashboard de pedidos
      </H2>
      <P>
        Un comercio que recibe pedidos. Cada nuevo documento dispara <code>onSnapshot</code> en todos
        los dispositivos que estén mirando la colección — la cocina, el repartidor, el dueño. Dale a{" "}
        <strong>▶ auto</strong> y mira el tráfico real entrando solo, sin recargar nada.
      </P>
      <OrdersDemo />

      <H2 num="06">Reglas de seguridad — el firewall declarativo</H2>
      <P>
        Como Firebase se conecta directo desde el navegador, no hay backend que filtre quién puede
        leer/escribir qué. Esa responsabilidad la asumen las <strong>security rules</strong>: pequeñas
        funciones declarativas que el motor evalúa en cada operación.
      </P>
      <Snippet
        code={`// Firestore rules — solo el dueño del documento puede modificarlo
match /orders/{orderId} {
  allow read:  if request.auth != null;
  allow write: if request.auth.uid == resource.data.userId;
}`}
      />
      <Callout variant="warn" label="No te saltes las rules">
        El error #1 de los principiantes en Firebase es lanzar a producción con{" "}
        <code>allow read, write: if true</code>. Cualquier persona con la URL podría leer y borrar
        todo. Las reglas son obligatorias, no decorativas.
      </Callout>

      <H2 num="07">Cuándo Firebase, cuándo NO</H2>
      <ConceptRow>
        <Concept tint="g" mark="✓" title="Sí, Firebase">
          Prototipos rápidos. Apps móviles con sync entre dispositivos. Chat, colaborativos,
          presencia, notificaciones. Equipos sin backend dedicado. Cuando la velocidad de iteración
          es más importante que el control.
        </Concept>
        <Concept tint="p" mark="✗" title="No, Firebase">
          Queries complejas con JOINs (no existen). Reportes analíticos. Costos predecibles a gran
          escala (la pricing sorprende). Cuando necesitas control fino sobre la base, o evitar vendor
          lock-in con Google.
        </Concept>
      </ConceptRow>

      <Callout variant="ok" label="Resumen">
        Firebase no es &quot;una base de datos más rápida&quot;: es una base que{" "}
        <strong>cambia tu arquitectura</strong>. El servidor pasa a un segundo plano y la
        sincronización deja de ser un problema. A cambio, pierdes flexibilidad de consulta. Como
        siempre — la herramienta correcta para el problema correcto.
      </Callout>
    </div>
  );
}
