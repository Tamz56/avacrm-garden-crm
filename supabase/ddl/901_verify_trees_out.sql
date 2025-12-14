-- 901_verify_trees_out.sql
-- Run this to verify that the 'trees_out' mode works correctly (should return 0 rows if no data, but no error)

SELECT * FROM public.get_dashboard_chart(
  'trees_out',
  (CURRENT_DATE - INTERVAL '3 months')::date,
  CURRENT_DATE::date,
  'month'
);
