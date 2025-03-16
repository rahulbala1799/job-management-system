USE job_management;

-- Add Corriboard 5mm
INSERT INTO products (
  name,
  category,
  material,
  width_m,
  length_m,
  roll_cost,
  cost_per_sqm,
  thickness
) VALUES (
  'Corriboard 5mm',
  'wide_format',
  'Corrugated Plastic',
  2.44,
  1.20,
  17.00,
  ROUND(17.00 / (2.44 * 1.20), 2),  -- €5.81 per sqm
  '5mm'
);

-- Add Foamex 5mm (Foamed Board)
INSERT INTO products (
  name,
  category,
  material,
  width_m,
  length_m,
  roll_cost,
  cost_per_sqm,
  thickness
) VALUES (
  'Foamex 5mm',
  'wide_format',
  'Foamed PVC',
  2.44,
  1.20,
  32.00,
  ROUND(32.00 / (2.44 * 1.20), 2),  -- €10.93 per sqm
  '5mm'
);

-- Add Laminate Matte
INSERT INTO products (
  name,
  category,
  material,
  width_m,
  length_m,
  roll_cost,
  cost_per_sqm
) VALUES (
  'Laminate Matte',
  'wide_format',
  'Laminate Film',
  1.50,
  50.00,
  120.00,
  ROUND(120.00 / (1.50 * 50.00), 2)  -- €1.60 per sqm
); 