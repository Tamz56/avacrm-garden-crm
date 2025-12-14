-- 900_debug_check_zones.sql

-- 1. Check if view exists
SELECT table_schema, table_name 
FROM information_schema.views 
WHERE table_name = 'view_zone_overview';

-- 2. Check if stock_zones has data
SELECT count(*) as zone_count FROM public.stock_zones;

-- 3. Check if view returns data (limit 5)
SELECT * FROM public.view_zone_overview LIMIT 5;

-- 4. Check if planting_plot_trees has data
SELECT count(*) as tree_count FROM public.planting_plot_trees;
