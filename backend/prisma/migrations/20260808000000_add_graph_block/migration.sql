-- Graph blocks: parametric SVG diagrams (e.g. projectile parabola with
-- peak point and angle annotation). GraphSpec lives in ContentBlock.diagramData
-- (shape { graph: { ... } }), reusing the existing JSON field.

ALTER TYPE "BlockType" ADD VALUE IF NOT EXISTS 'graph';
