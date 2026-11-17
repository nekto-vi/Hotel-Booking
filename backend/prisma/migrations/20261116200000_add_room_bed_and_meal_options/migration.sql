CREATE TYPE "BedType" AS ENUM (
    'DOUBLE_BED',
    'TWO_SINGLE_BEDS',
    'THREE_SINGLE_BEDS'
);

CREATE TYPE "MealPlan" AS ENUM (
    'BREAKFAST_INCLUDED',
    'NO_MEALS',
    'ALL_INCLUSIVE'
);

ALTER TABLE "rooms"
ADD COLUMN "bed_type" "BedType",
ADD COLUMN "meal_plan" "MealPlan";
