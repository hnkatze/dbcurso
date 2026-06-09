import type { Metadata } from "next";
import { H1, Lede } from "@/components/content";
import { ChallengesHub } from "@/components/desafios/hub";

export const metadata: Metadata = {
  title: "Desafíos",
  description:
    "Todos los retos del curso reunidos por nivel. Resolvé consultas reales y seguí tu progreso de Básico a Avanzado.",
};

export default function DesafiosPage() {
  return (
    <div className="anim-fade-up">
      <H1>
        Desafíos<em>.</em>
      </H1>
      <Lede>
        Todos los retos del curso, reunidos y ordenados por <strong>nivel</strong>. Cada uno se valida por el resultado —
        cualquier camino correcto sirve. Tu progreso se guarda en este navegador.
      </Lede>
      <ChallengesHub />
    </div>
  );
}
