name: GEO build (JSON-LD + llms-full.txt)

# Runs whenever the source content JSON is updated (e.g. you upload a new
# glossary-data.json or data.json). Regenerates the JSON-LD blocks inside
# glossary.html / stories.html and rebuilds llms-full.txt, then commits the
# result back to the repo. You keep uploading JSON by hand — everything else
# is automatic.

on:
  push:
    branches: [ main ]
    paths:
      - 'glossary-data.json'
      - 'data.json'
      - 'scripts/geo-build.js'
  workflow_dispatch: {}   # allows manual run from the Actions tab

permissions:
  contents: write

# Avoid overlapping runs if you push several times quickly
concurrency:
  group: geo-build
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate GEO artifacts
        run: node scripts/geo-build.js

      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add glossary.html stories.html llms-full.txt
          if git diff --cached --quiet; then
            echo "No changes to commit."
          else
            git commit -m "chore: auto-regenerate GEO artifacts (JSON-LD + llms-full.txt)"
            git push
          fi
