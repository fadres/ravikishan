# Class 11E — Extra Solutions Tree

Class 11E is a snapshot of Class 11 (created with `npm run clone:11e` in
`backend/`) with its own **extra solutions** added on top. Class 11 itself
never sees these files — they belong to the 11E tree only.

## How to add an extra solution

1. Create the file under the right folder:

   ```
   content/class-11e/
     physics/
       kinematics/
         examples/01-my-solution.json     → solved-example block
         pyqs/01-my-pyq.json              → past-year question block
     chemistry/
       stoichiometry/
         examples/01-mole-numerical.json
   ```

   Folders are the same taxonomy as Class 11: `concepts`, `notes`,
   `examples`, `formula`, `pyqs`, `sets`, `mindmap`, plus `graph` for
   parametric SVG diagrams (projectile parabolas, wave plots, …).

2. File shape (same schema as import-notes):

   ```json
   {
     "title": "Extra numerical — stopping distance",
     "notes": [
       "**Question:** ...",
       "**Solution:** ..."
     ],
     "type": "example",
     "order": 1
   }
   ```

   `type` is optional (auto-classified when omitted) and `order` controls
   its position inside the folder's group.

   A `graph` file carries a GraphSpec instead of prose (notes optional):

   ```json
   {
     "title": "Projectile trajectory",
     "type": "graph",
     "order": 1,
     "graph": {
       "xLabel": "Horizontal distance",
       "yLabel": "Height",
       "xUnit": "m",
       "yUnit": "m",
       "curve": { "type": "parabola", "x0": 5, "y0": 2.5 },
       "peak": { "x": 5, "y": 2.5, "label": "H = 2.5 m" },
       "angle": { "degrees": 45, "at": [0.8, 0.4], "label": "θ = 45°" },
       "dashedCurve": true
     }
   }
   ```

3. Import (dry-run first, then apply):

   ```bash
   npm run import-11e                   # dry-run
   npm run import-11e -- --apply --publish --allow-create
   ```

   `--allow-create` is needed once so new subjects/chapters/… are created
   under Class 11E; afterwards you can drop it. `--publish` makes the new
   blocks live immediately.

## Notes

- You can also add solutions straight from the admin CMS — 11E chapters
  appear there under "Class 11E" like any other class.
- Importing with `--section class-11e` never touches Class 11 rows.
- Re-running `npm run clone:11e -- --apply` refreshes the snapshot from
  Class 11 (source edits propagate; 11E-only content is kept).
