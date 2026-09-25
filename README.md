# FP&A Market Validation Dashboard

Interactive React + TypeScript dashboard built from the revised 37-response simulated dataset.

## What changed
- Full React state-driven filters for employee bracket and finance role
- Optional cross-filtering of charts and hypothesis calculations
- Hoverable scatter points and heatmap cells
- Click a scatter point to inspect that respondent
- Toggle to highlight high-residual exception points
- Interactive product-prototype tabs
- H1/H2 integer x-axis ticks
- Complete 7×7 inverted-y correlation heatmap
- Revised simulated data with all H1–H8 Spearman correlations between ~0.64 and ~0.85

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

A self-contained `dist/standalone.html` is also included and does not require npm or a server.

## Data note
The dataset is simulated for analysis/design testing. Do not present it as collected participant evidence.
