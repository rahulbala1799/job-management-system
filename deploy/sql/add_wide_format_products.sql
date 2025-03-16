USE job_management;

-- Add Roll Up Banner
INSERT INTO products (
  name,
  category,
  material,
  width_m,
  length_m,
  roll_cost,
  cost_per_sqm
) VALUES (
  'Roll Up Banner',
  'wide_format',
  'Banner Material',
  0.91,
  30.00,
  120.00,
  ROUND(120.00 / (0.91 * 30.00), 2)  -- Calculate cost per sqm based on the total area
);

-- Add Avery Dennison Vinyl
INSERT INTO products (
  name,
  category,
  material,
  width_m,
  length_m,
  roll_cost,
  cost_per_sqm
) VALUES (
  'Avery Dennison Vinyl',
  'wide_format',
  'Vinyl',
  1.37,
  50.00,
  120.00,
  ROUND(120.00 / (1.37 * 50.00), 2)  -- Calculate cost per sqm based on the total area
); 