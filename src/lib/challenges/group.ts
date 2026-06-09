import type { LessonChallenges } from "./core";

const schema = `CREATE TABLE productos (
  id INT PRIMARY KEY,
  nombre VARCHAR(60),
  categoria VARCHAR(30),
  precio DECIMAL(10,2),
  stock INT
);
INSERT INTO productos VALUES
  (1,'Café Sierra','Café',32000,18),
  (2,'Café Huila','Café',28000,25),
  (3,'Café Tolima','Café',30000,6),
  (4,'Té verde','Té',12000,12),
  (5,'Té manzanilla','Té',9500,30),
  (6,'Galletas','Snack',6000,4),
  (7,'Chocolate','Snack',22000,8),
  (8,'Azúcar','Despensa',4500,25),
  (9,'Panela','Despensa',3200,40),
  (10,'Cacao','Despensa',15000,11);`;

export const GROUP_LESSON: LessonChallenges = {
  lessonId: "group",
  title: "GROUP BY · Subconsultas",
  href: "/sql/group",
  schema,
  challenges: [
    {
      id: "group-basico",
      nivel: "basico",
      enunciado:
        "Contá cuántos productos hay en cada categoría. Mostrá la columna 'categoria' y la columna 'total' con el conteo. El orden no importa.",
      solution:
        "SELECT categoria, COUNT(*) AS total FROM productos GROUP BY categoria;",
      pista:
        "Usá GROUP BY categoria y COUNT(*) AS total para contar las filas de cada grupo.",
    },
    {
      id: "group-intermedio",
      nivel: "intermedio",
      enunciado:
        "Calculá el stock total disponible por categoría. Mostrá 'categoria' y 'stock_total', ordenados de mayor a menor stock.",
      solution:
        "SELECT categoria, SUM(stock) AS stock_total FROM productos GROUP BY categoria ORDER BY stock_total DESC;",
      ordered: true,
      pista:
        "Usá SUM(stock) AS stock_total, GROUP BY categoria y ORDER BY stock_total DESC.",
    },
    {
      id: "group-avanzado",
      nivel: "avanzado",
      enunciado:
        "Encontrá las categorías cuyo precio promedio supera los 15 000. Mostrá 'categoria' y 'precio_promedio'. El orden no importa.",
      solution:
        "SELECT categoria, AVG(precio) AS precio_promedio FROM productos GROUP BY categoria HAVING AVG(precio) > 15000;",
      pista:
        "Usá AVG(precio) AS precio_promedio con GROUP BY categoria y filtrá los grupos con HAVING AVG(precio) > 15000.",
    },
  ],
};
