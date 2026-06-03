import type { Metadata } from "next";
import { Callout, H1, H2, Lede, P, UL } from "@/components/content";
import { Snippet } from "@/components/lab/highlight";
import { Lab } from "@/components/lab/lab";

export const metadata: Metadata = {
  title: "INSERT / UPDATE / DELETE",
  description: "Los verbos que cambian la realidad: agregar, modificar y borrar filas con seguridad.",
};

export default function WritePage() {
  return (
    <div className="anim-fade-up">
      <H1>
        <em>INSERT</em>, <em>UPDATE</em>, <em>DELETE</em> — los verbos que cambian la realidad.
      </H1>
      <Lede>
        <strong>SELECT</strong> mira; <strong>INSERT</strong>, <strong>UPDATE</strong> y <strong>DELETE</strong> modifican.
        Tres operaciones, una regla de oro: <em>siempre</em> piensa cuántas filas vas a tocar antes de ejecutar.
      </Lede>

      <H2 num="01">INSERT — agregar filas</H2>
      <Snippet
        code={`INSERT INTO productos (nombre, precio, stock)
VALUES ('Café 250g', 18000, 30),
       ('Té verde',  12000, 12);`}
      />
      <UL>
        <li>
          Si das <strong>menos columnas</strong> que las que tiene la tabla, el resto usa <code>DEFAULT</code> o{" "}
          <code>NULL</code>.
        </li>
        <li>
          Puedes insertar <strong>varias filas</strong> separándolas por coma — es mucho más rápido que uno por uno.
        </li>
        <li>
          Si la columna es <code>AUTO_INCREMENT</code>, omítela y el motor pone el ID.
        </li>
      </UL>

      <H2 num="02">UPDATE — cambiar filas existentes</H2>
      <Snippet
        code={`UPDATE productos
SET precio = precio * 1.10
WHERE stock < 10;`}
      />
      <Callout variant="warn" label="Cuidado">
        <strong>
          Un <code>UPDATE</code> sin <code>WHERE</code> actualiza toda la tabla.
        </strong>{" "}
        Siempre pruebas primero con un <code>SELECT</code> usando el mismo <code>WHERE</code> para ver qué filas vas a
        afectar.
      </Callout>

      <H2 num="03">DELETE — borrar filas</H2>
      <Snippet code={`DELETE FROM productos WHERE id = 5;`} />
      <P>
        Misma regla: sin <code>WHERE</code> vacías la tabla entera. En <code>DELETE</code> el motor también borra del
        índice y libera el espacio en disco progresivamente.
      </P>

      <H2 num="04">Laboratorio · transformaciones reales</H2>
      <Lab
        labId="lab-write"
        initialState={{
          sql: `CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60),
  precio DECIMAL(10,2),
  stock INT DEFAULT 0
);
INSERT INTO productos (nombre, precio, stock) VALUES
  ('Café 250g', 18000, 30),
  ('Té verde',  12000, 12),
  ('Galletas',   6000,  4),
  ('Chocolate', 22000,  8);`,
        }}
        initialSql={`-- Subir 10% el precio a productos con poco stock\nUPDATE productos SET precio = precio * 1.10 WHERE stock < 10;\nSELECT * FROM productos;`}
        autorun
        samples={[
          {
            label: "+ fila",
            sql: `INSERT INTO productos (nombre, precio, stock) VALUES ('Azúcar', 4500, 25);\nSELECT * FROM productos;`,
          },
          {
            label: "borrar sin stock",
            sql: `DELETE FROM productos WHERE stock < 5;\nSELECT * FROM productos;`,
          },
          {
            label: "rebajar todos 20%",
            sql: `UPDATE productos SET precio = precio * 0.8;\nSELECT * FROM productos;`,
          },
        ]}
      />

      <Callout variant="note" label="ACID — transacciones">
        En producción, las modificaciones se agrupan en <strong>transacciones</strong>. Si una de las operaciones falla,
        el motor revierte todas las anteriores. Lo verás como <code>BEGIN ... COMMIT / ROLLBACK</code>.
      </Callout>
    </div>
  );
}
