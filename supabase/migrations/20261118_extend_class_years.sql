-- Class years ran out at 2030. Extend the enum through 2035 so imports and
-- forms can use later recruiting classes. Additive only; existing rows untouched.
ALTER TYPE class_year ADD VALUE IF NOT EXISTS '2031' BEFORE 'pro';
ALTER TYPE class_year ADD VALUE IF NOT EXISTS '2032' BEFORE 'pro';
ALTER TYPE class_year ADD VALUE IF NOT EXISTS '2033' BEFORE 'pro';
ALTER TYPE class_year ADD VALUE IF NOT EXISTS '2034' BEFORE 'pro';
ALTER TYPE class_year ADD VALUE IF NOT EXISTS '2035' BEFORE 'pro';
