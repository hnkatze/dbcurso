import type { LessonChallenges } from "./core";

/**
 * Schema de partida para todos los desafíos de CREATE / ALTER.
 *
 * Contiene:
 *  - departamentos: tabla base con datos, referenciada por la FK del reto avanzado.
 *  - proyectos: tabla sin columna "presupuesto"; el reto intermedio la añade con ALTER.
 *
 * La tabla "empleados" NO existe aquí — el reto básico la crea desde cero.
 * La tabla "asignaciones" NO existe aquí — el reto avanzado la crea desde cero.
 */
const schema = `CREATE TABLE departamentos (
  id     INT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL
);
INSERT INTO departamentos (id, nombre) VALUES
  (1, 'Ingeniería'),
  (2, 'Marketing');

CREATE TABLE proyectos (
  id     INT PRIMARY KEY,
  titulo VARCHAR(80) NOT NULL
);
INSERT INTO proyectos (id, titulo) VALUES
  (1, 'Portal web'),
  (2, 'App móvil');`;

export const CREATE_LESSON: LessonChallenges = {
  lessonId: "create",
  title: "CREATE / ALTER",
  href: "/sql/create",
  schema,
  challenges: [
    {
      id: "create-basico",
      nivel: "basico",
      enunciado:
        "Creá una tabla llamada `empleados` con tres columnas: `id` (INT, clave primaria), `nombre` (VARCHAR(60), NOT NULL) y `salario` (DECIMAL(10,2)). Luego el sistema verificará que la estructura sea correcta.",
      solution: `CREATE TABLE empleados (
  id      INT PRIMARY KEY,
  nombre  VARCHAR(60) NOT NULL,
  salario DECIMAL(10,2)
);`,
      verify: `INSERT INTO empleados (id, nombre, salario) VALUES (1, 'Ana García', 2500.00);
SELECT id, nombre, salario FROM empleados;`,
      pista:
        "CREATE TABLE empleados ( id INT PRIMARY KEY, nombre VARCHAR(60) NOT NULL, salario DECIMAL(10,2) );",
    },
    {
      id: "create-intermedio",
      nivel: "intermedio",
      enunciado:
        "La tabla `proyectos` ya existe con columnas `id` y `titulo`. Usando ALTER TABLE, agregale la columna `presupuesto` de tipo DECIMAL(12,2). El sistema verificará insertando una fila que use esa columna.",
      solution: `ALTER TABLE proyectos ADD COLUMN presupuesto DECIMAL(12,2);`,
      verify: `INSERT INTO proyectos (id, titulo, presupuesto) VALUES (3, 'Sistema ERP', 85000.00);
SELECT id, titulo, presupuesto FROM proyectos WHERE id = 3;`,
      pista:
        "ALTER TABLE proyectos ADD COLUMN presupuesto DECIMAL(12,2); — no modifiques columnas existentes.",
    },
    {
      id: "create-avanzado",
      nivel: "avanzado",
      enunciado:
        "Creá una tabla llamada `asignaciones` con cuatro columnas: `id` (INT, clave primaria), `empleado_id` (INT, NOT NULL), `departamento_id` (INT, NOT NULL, clave foránea que referencia `departamentos(id)`) y `fecha` (DATE, NOT NULL). El sistema verificará insertando una fila válida.",
      solution: `CREATE TABLE asignaciones (
  id              INT PRIMARY KEY,
  empleado_id     INT NOT NULL,
  departamento_id INT NOT NULL REFERENCES departamentos(id),
  fecha           DATE NOT NULL
);`,
      verify: `INSERT INTO asignaciones (id, empleado_id, departamento_id, fecha) VALUES (1, 10, 1, '2024-03-15');
SELECT id, empleado_id, departamento_id, fecha FROM asignaciones;`,
      pista:
        "La FK se declara así: departamento_id INT NOT NULL REFERENCES departamentos(id). El departamento_id 1 ('Ingeniería') ya existe en el schema.",
    },
  ],
};
