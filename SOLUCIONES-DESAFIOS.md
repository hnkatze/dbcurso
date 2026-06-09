# Soluciones de los desafíos · Curso DBs

> Machete para la exposición. La validación de cada desafío compara el **resultado**, no el texto: cualquier consulta que produzca estas mismas filas se acepta como correcta.


**Índice**

- [CREATE / ALTER](#create)
- [INSERT / UPDATE / DELETE](#write)
- [SELECT, WHERE, ORDER](#select)
- [Llaves PK / FK](#keys)
- [JOINs](#joins)
- [GROUP BY · Subconsultas](#group)
- [Caso real · Ventas](#ventas)
- [Auditoría de datos](#auditoria)

---


## CREATE / ALTER

<a id="create"></a>

Ruta: `/sql/create`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE departamentos (
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
  (2, 'App móvil');
```
</details>


### Básico — `create-basico`

**Enunciado.** Creá una tabla llamada `empleados` con tres columnas: `id` (INT, clave primaria), `nombre` (VARCHAR(60), NOT NULL) y `salario` (DECIMAL(10,2)). Luego el sistema verificará que la estructura sea correcta.


**Solución**

```sql
CREATE TABLE empleados (
  id      INT PRIMARY KEY,
  nombre  VARCHAR(60) NOT NULL,
  salario DECIMAL(10,2)
);
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
INSERT INTO empleados (id, nombre, salario) VALUES (1, 'Ana García', 2500.00);
SELECT id, nombre, salario FROM empleados;
```


💡 _Pista:_ CREATE TABLE empleados ( id INT PRIMARY KEY, nombre VARCHAR(60) NOT NULL, salario DECIMAL(10,2) );


**Resultado esperado** (1 fila)


| id | nombre | salario |
| --- | --- | --- |
| 1 | Ana García | 2500 |


### Intermedio — `create-intermedio`

**Enunciado.** La tabla `proyectos` ya existe con columnas `id` y `titulo`. Usando ALTER TABLE, agregale la columna `presupuesto` de tipo DECIMAL(12,2). El sistema verificará insertando una fila que use esa columna.


**Solución**

```sql
ALTER TABLE proyectos ADD COLUMN presupuesto DECIMAL(12,2);
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
INSERT INTO proyectos (id, titulo, presupuesto) VALUES (3, 'Sistema ERP', 85000.00);
SELECT id, titulo, presupuesto FROM proyectos WHERE id = 3;
```


💡 _Pista:_ ALTER TABLE proyectos ADD COLUMN presupuesto DECIMAL(12,2); — no modifiques columnas existentes.


**Resultado esperado** (1 fila)


| id | titulo | presupuesto |
| --- | --- | --- |
| 3 | Sistema ERP | 85000 |


### Avanzado — `create-avanzado`

**Enunciado.** Creá una tabla llamada `asignaciones` con cuatro columnas: `id` (INT, clave primaria), `empleado_id` (INT, NOT NULL), `departamento_id` (INT, NOT NULL, clave foránea que referencia `departamentos(id)`) y `fecha` (DATE, NOT NULL). El sistema verificará insertando una fila válida.


**Solución**

```sql
CREATE TABLE asignaciones (
  id              INT PRIMARY KEY,
  empleado_id     INT NOT NULL,
  departamento_id INT NOT NULL REFERENCES departamentos(id),
  fecha           DATE NOT NULL
);
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
INSERT INTO asignaciones (id, empleado_id, departamento_id, fecha) VALUES (1, 10, 1, '2024-03-15');
SELECT id, empleado_id, departamento_id, fecha FROM asignaciones;
```


💡 _Pista:_ La FK se declara así: departamento_id INT NOT NULL REFERENCES departamentos(id). El departamento_id 1 ('Ingeniería') ya existe en el schema.


**Resultado esperado** (1 fila)


| id | empleado_id | departamento_id | fecha |
| --- | --- | --- | --- |
| 1 | 10 | 1 | 2024-03-15 |


---


## INSERT / UPDATE / DELETE

<a id="write"></a>

Ruta: `/sql/write`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60),
  precio DECIMAL(10,2),
  stock INT DEFAULT 0
);
INSERT INTO productos (nombre, precio, stock) VALUES
  ('Café 250g', 18000, 30),
  ('Té verde',  12000, 12),
  ('Galletas',   6000,  4),
  ('Chocolate', 22000,  8);
```
</details>


### Básico — `write-basico`

**Enunciado.** Insertá el producto 'Panela' con un precio de 4500 y un stock de 20 en la tabla productos.


**Solución**

```sql
INSERT INTO productos (nombre, precio, stock) VALUES ('Panela', 4500, 20);
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
SELECT id, nombre, precio, stock FROM productos ORDER BY id;
```


💡 _Pista:_ Usá INSERT INTO productos (nombre, precio, stock) VALUES (...). El id es AUTO_INCREMENT, no lo pongas.


**Resultado esperado** (5 filas)


| id | nombre | precio | stock |
| --- | --- | --- | --- |
| 1 | Café 250g | 18000 | 30 |
| 2 | Té verde | 12000 | 12 |
| 3 | Galletas | 6000 | 4 |
| 4 | Chocolate | 22000 | 8 |
| 5 | Panela | 4500 | 20 |


### Intermedio — `write-intermedio`

**Enunciado.** Subí un 15% el precio de todos los productos con stock menor a 10.


**Solución**

```sql
UPDATE productos SET precio = precio * 1.15 WHERE stock < 10;
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
SELECT id, nombre, precio FROM productos ORDER BY id;
```


💡 _Pista:_ UPDATE productos SET precio = precio * 1.15 WHERE stock < 10. Eso afecta a Galletas (stock 4) y Chocolate (stock 8).


**Resultado esperado** (4 filas)


| id | nombre | precio |
| --- | --- | --- |
| 1 | Café 250g | 18000 |
| 2 | Té verde | 12000 |
| 3 | Galletas | 6900.00 |
| 4 | Chocolate | 25300.00 |


### Avanzado — `write-avanzado`

**Enunciado.** Eliminá de la tabla todos los productos con stock menor a 5.


**Solución**

```sql
DELETE FROM productos WHERE stock < 5;
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
SELECT id, nombre, stock FROM productos ORDER BY id;
```


💡 _Pista:_ DELETE FROM productos WHERE stock < 5. Solo Galletas tiene stock 4, así que quedan 3 productos.


**Resultado esperado** (3 filas)


| id | nombre | stock |
| --- | --- | --- |
| 1 | Café 250g | 30 |
| 2 | Té verde | 12 |
| 4 | Chocolate | 8 |


---


## SELECT, WHERE, ORDER

<a id="select"></a>

Ruta: `/sql/select`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE productos (
  id INT PRIMARY KEY,
  nombre VARCHAR(60),
  categoria VARCHAR(30),
  precio DECIMAL(10,2),
  stock INT
);
INSERT INTO productos VALUES
  (1, 'Café Sierra Nevada', 'Café',    32000, 18),
  (2, 'Café del Huila',     'Café',    28000, 25),
  (3, 'Café Tolima',        'Café',    30000,  6),
  (4, 'Té verde',           'Té',      12000, 12),
  (5, 'Té manzanilla',      'Té',       9500, 30),
  (6, 'Galletas integral',  'Snack',    6000,  4),
  (7, 'Chocolate amargo',   'Snack',   22000,  8),
  (8, 'Azúcar morena',      'Despensa', 4500, 25),
  (9, 'Panela',             'Despensa', 3200, 40),
  (10,'Cacao en polvo',     'Despensa',15000, 11);
```
</details>


### Básico — `select-basico`

**Enunciado.** Traé el nombre y el precio de todos los productos de la categoría 'Té'.


**Solución**

```sql
SELECT nombre, precio FROM productos WHERE categoria = 'Té';
```


💡 _Pista:_ Filtrá con WHERE categoria = 'Té' y seleccioná solo nombre y precio.


**Resultado esperado** (2 filas)


| nombre | precio |
| --- | --- |
| Té verde | 12000 |
| Té manzanilla | 9500 |


### Intermedio — `select-intermedio`

**Enunciado.** Listá los productos con stock menor a 10, del stock más bajo al más alto. Mostrá nombre y stock.


**Solución**

```sql
SELECT nombre, stock FROM productos WHERE stock < 10 ORDER BY stock ASC;
```


💡 _Pista:_ WHERE stock < 10 para filtrar, ORDER BY stock ASC para ordenar.


**Resultado esperado** (3 filas)


| nombre | stock |
| --- | --- |
| Galletas integral | 4 |
| Café Tolima | 6 |
| Chocolate amargo | 8 |


### Avanzado — `select-avanzado`

**Enunciado.** Mostrá los 3 productos más caros (nombre y precio), del más caro al más barato.


**Solución**

```sql
SELECT nombre, precio FROM productos ORDER BY precio DESC LIMIT 3;
```


💡 _Pista:_ Ordená por precio DESC y cortá el resultado con LIMIT 3.


**Resultado esperado** (3 filas)


| nombre | precio |
| --- | --- |
| Café Sierra Nevada | 32000 |
| Café Tolima | 30000 |
| Café del Huila | 28000 |


---


## Llaves PK / FK

<a id="keys"></a>

Ruta: `/sql/keys`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE usuarios (
  id     INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(60),
  email  VARCHAR(120) UNIQUE
);

CREATE TABLE pedidos (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  total      DECIMAL(10,2)
);

INSERT INTO usuarios (nombre, email) VALUES
  ('Ana',   'ana@mail.com'),
  ('Luis',  'luis@mail.com');

INSERT INTO pedidos (usuario_id, total) VALUES
  (1, 45000),
  (2, 18000),
  (1, 23000);
```
</details>


### Básico — `keys-basico`

**Enunciado.** Registrá un nuevo pedido de Luis (usuario con id 2) por un total de 75 000. Insertá la fila en la tabla pedidos respetando la llave foránea.


**Solución**

```sql
INSERT INTO pedidos (usuario_id, total) VALUES (2, 75000);
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
SELECT id, usuario_id, total FROM pedidos ORDER BY id;
```


💡 _Pista:_ Usá INSERT INTO pedidos (usuario_id, total) VALUES (...). El usuario_id debe ser un id que exista en la tabla usuarios.


**Resultado esperado** (4 filas)


| id | usuario_id | total |
| --- | --- | --- |
| 1 | 1 | 45000 |
| 2 | 2 | 18000 |
| 3 | 1 | 23000 |
| 4 | 2 | 75000 |


### Intermedio — `keys-intermedio`

**Enunciado.** Mostrá el nombre del usuario y el total de cada pedido uniendo las dos tablas por la llave. Mostrá las columnas nombre y total.


**Solución**

```sql
SELECT u.nombre, p.total FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id;
```


💡 _Pista:_ INNER JOIN pedidos p ON p.usuario_id = u.id conecta la FK de pedidos con la PK de usuarios.


**Resultado esperado** (3 filas)


| nombre | total |
| --- | --- |
| Ana | 45000 |
| Ana | 23000 |
| Luis | 18000 |


### Avanzado — `keys-avanzado`

**Enunciado.** Calculá cuánto gastó en total cada usuario. Mostrá nombre y total_gastado, ordenados del que más gastó al que menos.


**Solución**

```sql
SELECT u.nombre, SUM(p.total) AS total_gastado FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id GROUP BY u.nombre ORDER BY total_gastado DESC;
```


💡 _Pista:_ Usá INNER JOIN + GROUP BY u.nombre + SUM(p.total). Luego ORDER BY total_gastado DESC.


**Resultado esperado** (2 filas)


| nombre | total_gastado |
| --- | --- |
| Ana | 68000 |
| Luis | 18000 |


---


## JOINs

<a id="joins"></a>

Ruta: `/sql/joins`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE usuarios (
  id INT PRIMARY KEY,
  nombre VARCHAR(40),
  ciudad VARCHAR(40)
);
CREATE TABLE pedidos (
  id INT PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  total DECIMAL(10,2)
);
INSERT INTO usuarios VALUES (1,'Ana','Bogotá'),(2,'Luis','Medellín'),(3,'María','Cali'),(4,'Pedro','Cartagena');
INSERT INTO pedidos VALUES (10,1,45000),(11,2,18000),(12,1,23000),(13,2,32000),(14,1,9000);
```
</details>


### Básico — `joins-basico`

**Enunciado.** Traé el nombre del usuario y el total de cada pedido. Solo deben aparecer usuarios que tengan al menos un pedido. Mostrá las columnas nombre y total.


**Solución**

```sql
SELECT u.nombre, p.total FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id;
```


💡 _Pista:_ Usá INNER JOIN entre usuarios y pedidos con ON p.usuario_id = u.id. Alias u y p hacen la consulta más corta.


**Resultado esperado** (5 filas)


| nombre | total |
| --- | --- |
| Ana | 45000 |
| Ana | 23000 |
| Ana | 9000 |
| Luis | 18000 |
| Luis | 32000 |


### Intermedio — `joins-intermedio`

**Enunciado.** Encontrá los usuarios que NO tienen ningún pedido registrado. Mostrá solo la columna nombre.


**Solución**

```sql
SELECT u.nombre FROM usuarios u LEFT JOIN pedidos p ON p.usuario_id = u.id WHERE p.id IS NULL;
```


💡 _Pista:_ Con LEFT JOIN todos los usuarios aparecen. Cuando no hay pedido, p.id queda NULL. Filtrá con WHERE p.id IS NULL.


**Resultado esperado** (2 filas)


| nombre |
| --- |
| María |
| Pedro |


### Avanzado — `joins-avanzado`

**Enunciado.** Calculá el total gastado por cada usuario que tiene pedidos. Mostrá nombre y total_gastado, ordenados del mayor al menor gasto.


**Solución**

```sql
SELECT u.nombre, SUM(p.total) AS total_gastado FROM usuarios u INNER JOIN pedidos p ON p.usuario_id = u.id GROUP BY u.nombre ORDER BY total_gastado DESC;
```


💡 _Pista:_ INNER JOIN + GROUP BY u.nombre + SUM(p.total). Luego ORDER BY total_gastado DESC para ordenar del mayor al menor.


**Resultado esperado** (2 filas)


| nombre | total_gastado |
| --- | --- |
| Ana | 77000 |
| Luis | 50000 |


---


## GROUP BY · Subconsultas

<a id="group"></a>

Ruta: `/sql/group`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE productos (
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
  (10,'Cacao','Despensa',15000,11);
```
</details>


### Básico — `group-basico`

**Enunciado.** Contá cuántos productos hay en cada categoría. Mostrá la columna 'categoria' y la columna 'total' con el conteo. El orden no importa.


**Solución**

```sql
SELECT categoria, COUNT(*) AS total FROM productos GROUP BY categoria;
```


💡 _Pista:_ Usá GROUP BY categoria y COUNT(*) AS total para contar las filas de cada grupo.


**Resultado esperado** (4 filas)


| categoria | total |
| --- | --- |
| Café | 3 |
| Té | 2 |
| Snack | 2 |
| Despensa | 3 |


### Intermedio — `group-intermedio`

**Enunciado.** Calculá el stock total disponible por categoría. Mostrá 'categoria' y 'stock_total', ordenados de mayor a menor stock.


**Solución**

```sql
SELECT categoria, SUM(stock) AS stock_total FROM productos GROUP BY categoria ORDER BY stock_total DESC;
```


💡 _Pista:_ Usá SUM(stock) AS stock_total, GROUP BY categoria y ORDER BY stock_total DESC.


**Resultado esperado** (4 filas)


| categoria | stock_total |
| --- | --- |
| Despensa | 76 |
| Café | 49 |
| Té | 42 |
| Snack | 12 |


### Avanzado — `group-avanzado`

**Enunciado.** Encontrá las categorías cuyo precio promedio supera los 15 000. Mostrá 'categoria' y 'precio_promedio'. El orden no importa.


**Solución**

```sql
SELECT categoria, AVG(precio) AS precio_promedio FROM productos GROUP BY categoria HAVING AVG(precio) > 15000;
```


💡 _Pista:_ Usá AVG(precio) AS precio_promedio con GROUP BY categoria y filtrá los grupos con HAVING AVG(precio) > 15000.


**Resultado esperado** (1 fila)


| categoria | precio_promedio |
| --- | --- |
| Café | 30000 |


---


## Caso real · Ventas

<a id="ventas"></a>

Ruta: `/sql/ventas`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE clientes (
  id     INT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  email  VARCHAR(120) UNIQUE
);

CREATE TABLE categorias (
  id     INT PRIMARY KEY,
  nombre VARCHAR(40) UNIQUE NOT NULL
);

CREATE TABLE productos (
  id           INT PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  categoria_id INT NOT NULL REFERENCES categorias(id),
  precio       DECIMAL(10,2) NOT NULL
);

CREATE TABLE pedidos (
  id         INT PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id),
  fecha      DATE,
  estado     VARCHAR(20) DEFAULT 'pendiente'
);

CREATE TABLE items_pedido (
  id          INT PRIMARY KEY,
  pedido_id   INT NOT NULL REFERENCES pedidos(id),
  producto_id INT NOT NULL REFERENCES productos(id),
  cantidad    INT NOT NULL,
  precio_unit DECIMAL(10,2) NOT NULL
);

CREATE TABLE pagos (
  id        INT PRIMARY KEY,
  pedido_id INT NOT NULL REFERENCES pedidos(id),
  monto     DECIMAL(10,2) NOT NULL,
  metodo    VARCHAR(30)
);

INSERT INTO clientes (id, nombre, email) VALUES
  (1, 'Ana Torres',  'ana@mail.com'),
  (2, 'Luis Pérez',  'luis@mail.com'),
  (3, 'María Gómez', 'maria@mail.com');

INSERT INTO categorias (id, nombre) VALUES
  (1, 'Café'), (2, 'Té'), (3, 'Snacks');

INSERT INTO productos (id, nombre, categoria_id, precio) VALUES
  (1, 'Café Sierra', 1, 32000),
  (2, 'Café Huila',  1, 28000),
  (3, 'Té verde',    2, 12000),
  (4, 'Galletas',    3,  6000);

INSERT INTO pedidos (id, cliente_id, fecha, estado) VALUES
  (1, 1, '2024-05-01', 'pagado'),
  (2, 2, '2024-05-02', 'pendiente'),
  (3, 1, '2024-05-03', 'pagado');

INSERT INTO items_pedido (id, pedido_id, producto_id, cantidad, precio_unit) VALUES
  (1, 1, 1, 2, 32000),
  (2, 1, 4, 1,  6000),
  (3, 2, 3, 3, 12000),
  (4, 3, 2, 1, 28000);

INSERT INTO pagos (id, pedido_id, monto, metodo) VALUES
  (1, 1, 70000, 'tarjeta'),
  (2, 3, 28000, 'efectivo');
```
</details>


### Básico — `ventas-basico`

**Enunciado.** Listá los productos que forman el pedido #1: mostrá el nombre del producto, la cantidad y el precio unitario.


**Solución**

```sql
SELECT pr.nombre, i.cantidad, i.precio_unit
FROM items_pedido i
JOIN productos pr ON pr.id = i.producto_id
WHERE i.pedido_id = 1;
```


💡 _Pista:_ Unís items_pedido con productos (JOIN productos pr ON pr.id = i.producto_id) y filtrás WHERE i.pedido_id = 1.


**Resultado esperado** (2 filas)


| nombre | cantidad | precio_unit |
| --- | --- | --- |
| Café Sierra | 2 | 32000 |
| Galletas | 1 | 6000 |


### Intermedio — `ventas-intermedio`

**Enunciado.** Calculá el total gastado por cada cliente (suma de cantidad × precio unitario en todos sus pedidos). Mostrá nombre del cliente y el total, del mayor al menor.


**Solución**

```sql
SELECT c.nombre, SUM(i.cantidad * i.precio_unit) AS total
FROM clientes c
JOIN pedidos p ON p.cliente_id = c.id
JOIN items_pedido i ON i.pedido_id = p.id
GROUP BY c.nombre
ORDER BY total DESC;
```


💡 _Pista:_ Necesitás tres tablas: clientes → pedidos → items_pedido. Usá SUM(i.cantidad * i.precio_unit) y GROUP BY c.nombre.


**Resultado esperado** (2 filas)


| nombre | total |
| --- | --- |
| Ana Torres | 98000 |
| Luis Pérez | 36000 |


### Avanzado — `ventas-avanzado`

**Enunciado.** Calculá los ingresos totales por categoría de producto (suma de cantidad × precio unitario). Mostrá el nombre de la categoría y el total, de mayor a menor.


**Solución**

```sql
SELECT cat.nombre, SUM(i.cantidad * i.precio_unit) AS ingresos
FROM items_pedido i
JOIN productos pr ON pr.id = i.producto_id
JOIN categorias cat ON cat.id = pr.categoria_id
GROUP BY cat.nombre
ORDER BY ingresos DESC;
```


💡 _Pista:_ Encadenás tres JOINs: items_pedido → productos → categorias. Agrupás por cat.nombre y sumás cantidad × precio_unit.


**Resultado esperado** (3 filas)


| nombre | ingresos |
| --- | --- |
| Café | 92000 |
| Té | 36000 |
| Snacks | 6000 |


---


## Auditoría de datos

<a id="auditoria"></a>

Ruta: `/admin/auditoria`


<details>
<summary>Esquema base (datos sobre los que se resuelve)</summary>


```sql
CREATE TABLE clientes (
  id     INT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  email  VARCHAR(120)
);
INSERT INTO clientes (id, nombre, email) VALUES
  (1, 'Ana Torres',  'ana@mail.com'),
  (2, 'Luis Pérez',  'luis@mail.com'),
  (3, 'María Gómez', 'ana@mail.com'),
  (4, 'Carla Ruiz',  NULL);

CREATE TABLE productos (
  id        INT PRIMARY KEY,
  nombre    VARCHAR(60),
  categoria VARCHAR(30),
  precio    DECIMAL(10,2)
);
INSERT INTO productos (id, nombre, categoria, precio) VALUES
  (1, 'Café Sierra', 'Café',   32000),
  (2, 'Café Huila',  'café',   28000),
  (3, 'Té verde',    'Té',     12000),
  (4, 'Galletas',    'Snack',  -5000),
  (5, 'Chocolate',   'Snack',      0);

CREATE TABLE pedidos (
  id         INT PRIMARY KEY,
  cliente_id INT,
  fecha      DATE,
  total      DECIMAL(10,2)
);
INSERT INTO pedidos (id, cliente_id, fecha, total) VALUES
  (1, 1, '2024-01-10', 64000),
  (2, 2, NULL,         28000),
  (3, 99, '2024-02-01', 12000),
  (4, 1, '2024-02-15', 99999);

CREATE TABLE items_pedido (
  id          INT PRIMARY KEY,
  pedido_id   INT,
  producto_id INT,
  cantidad    INT,
  precio_unit DECIMAL(10,2)
);
INSERT INTO items_pedido (id, pedido_id, producto_id, cantidad, precio_unit) VALUES
  (1, 1, 1, 2, 32000),
  (2, 4, 3, 1, 12000),
  (3, 4, 1, 1, 32000);
```
</details>


### Básico — `auditoria-basico-fechas`

**Enunciado.** Auditá los pedidos incompletos: listá el id de los pedidos que no tienen fecha registrada.


**Solución**

```sql
SELECT id FROM pedidos WHERE fecha IS NULL;
```


💡 _Pista:_ Una columna vacía se compara con IS NULL, nunca con = NULL.


**Resultado esperado** (1 fila)


| id |
| --- |
| 2 |


### Básico — `auditoria-basico-precios`

**Enunciado.** Encontrá los productos con precio inválido: mostrá nombre y precio de los que tienen precio menor o igual a 0.


**Solución**

```sql
SELECT nombre, precio FROM productos WHERE precio <= 0;
```


💡 _Pista:_ Un precio válido es mayor que 0; lo demás es un dato corrupto.


**Resultado esperado** (2 filas)


| nombre | precio |
| --- | --- |
| Galletas | -5000 |
| Chocolate | 0 |


### Intermedio — `auditoria-intermedio-duplicados`

**Enunciado.** Detectá emails duplicados entre clientes: mostrá el email y cuántas veces aparece (columna 'veces'), solo los que se repiten.


**Solución**

```sql
SELECT email, COUNT(*) AS veces FROM clientes GROUP BY email HAVING COUNT(*) > 1;
```


💡 _Pista:_ Agrupá por email y quedate con los grupos cuyo COUNT(*) sea mayor a 1.


**Resultado esperado** (1 fila)


| email | veces |
| --- | --- |
| ana@mail.com | 2 |


### Intermedio — `auditoria-intermedio-reparar-notnull`

**Enunciado.** Este INSERT falla con el error: La columna "nombre" no admite NULL. Registrá al cliente correctamente con id 5, nombre 'Diego Soto' y email 'diego@mail.com'.


**Solución**

```sql
INSERT INTO clientes (id, nombre, email) VALUES (5, 'Diego Soto', 'diego@mail.com');
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
SELECT id, nombre, email FROM clientes ORDER BY id;
```


💡 _Pista:_ La columna nombre es NOT NULL: tiene que llevar un valor real, no NULL.


**Resultado esperado** (5 filas)


| id | nombre | email |
| --- | --- | --- |
| 1 | Ana Torres | ana@mail.com |
| 2 | Luis Pérez | luis@mail.com |
| 3 | María Gómez | ana@mail.com |
| 4 | Carla Ruiz | NULL |
| 5 | Diego Soto | diego@mail.com |


### Avanzado — `auditoria-avanzado-huerfanos`

**Enunciado.** Encontrá los pedidos huérfanos: aquellos cuyo cliente_id no corresponde a ningún cliente real. Mostrá el id del pedido y su cliente_id.


**Solución**

```sql
SELECT p.id, p.cliente_id FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id WHERE c.id IS NULL;
```


💡 _Pista:_ Un LEFT JOIN con clientes deja en NULL el lado derecho cuando no hay coincidencia.


**Resultado esperado** (1 fila)


| id | cliente_id |
| --- | --- |
| 3 | 99 |


### Avanzado — `auditoria-avanzado-reparar-total`

**Enunciado.** El pedido 4 tiene un total mal cargado (99999) que no coincide con la suma real de sus ítems. Corregí el total del pedido 4 para que sea la suma de cantidad × precio_unit de sus ítems.


**Solución**

```sql
UPDATE pedidos SET total = 44000 WHERE id = 4;
```


**Verificación** (SELECT que inspecciona el estado tras la operación)

```sql
SELECT id, total FROM pedidos ORDER BY id;
```


💡 _Pista:_ Los ítems del pedido 4 son 1×12000 y 1×32000. Sumá: 44000.


**Resultado esperado** (4 filas)


| id | total |
| --- | --- |
| 1 | 64000 |
| 2 | 28000 |
| 3 | 12000 |
| 4 | 44000 |


---
