-- producto_id usaba integer pero los IDs de stock son Date.now() (~1.7T), fuera del rango integer
alter table stock_movimientos alter column producto_id type bigint;
