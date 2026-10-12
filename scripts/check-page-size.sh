#!/bin/bash
#
# Check that no Next.js page file exceeds 300 lines.
#
# Usage:
#   ./scripts/check-page-size.sh                 # Check all pages
#   ./scripts/check-page-size.sh src/app/*/page.tsx   # Check specific pages
#
# Exit codes:
#   0: All pages under limit
#   1: One or more pages exceed limit

set -e

MAX_LINES=300
EXIT_CODE=0

if [ $# -gt 0 ]; then
  FILES="$@"
else
  # Find all page.tsx and page.ts files in src/app
  FILES=$(find src/app -name "page.tsx" -o -name "page.ts" 2>/dev/null || true)
fi

if [ -z "$FILES" ]; then
  echo "No page files found."
  exit 0
fi

echo "Checking page file sizes (limit: $MAX_LINES lines)..."
echo

for file in $FILES; do
  if [ ! -f "$file" ]; then
    continue
  fi
  
  lines=$(wc -l < "$file")
  
  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "❌ $file: $lines lines (exceeds $MAX_LINES)"
    echo "   Please decompose this page following AGENTS.md > Component Decomposition Convention"
    echo
    EXIT_CODE=1
  else
    echo "✅ $file: $lines lines"
  fi
done

echo

if [ $EXIT_CODE -eq 0 ]; then
  echo "All page files are within size limits."
else
  echo "ERROR: One or more pages exceed the $MAX_LINES line limit."
  echo "See AGENTS.md for decomposition guidelines."
fi

exit $EXIT_CODE
