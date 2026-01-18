---
description: Test PDF generation and layout
---

# PDF Testing

## Steps

1. Start the development server:
   // turbo
   ```bash
   bun dev
   ```

2. Navigate to a report with multiple equipment and checklist items

3. Click "Last ned PDF" to generate the PDF

4. Check for:
   - Category headers staying with their content (not orphaned)
   - No text/row overlap across page boundaries
   - Clean page breaks between sections
   - Equipment headers with column headers and rows

5. Test edge cases:
   - Report with 20+ items in a single category
   - Report with multiple equipment types
   - Items with long comments that wrap
