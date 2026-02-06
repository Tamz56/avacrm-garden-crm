const fs = require('fs');
const files = [
    'src/components/Dashboard.tsx',
    'src/components/customers/deals/DealDocumentsPanel.tsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // Apply user-suggested regex fixes
        // Remove spaces around hyphens: "w - full" -> "w-full"
        // Also "min - h - screen" -> "min-h-screen"
        // Running multiple passes to handle chained hyphens if needed, though global replace should handle non-overlapping.
        // But "min - h - screen" has two " - ". 
        // " - " match consumes the space after h. " - " match starts after that. 
        // So "min - h - screen" -> "min-h - screen" (first pass)
        // We might need a loop or just run it twice.

        let oldContent = "";
        while (oldContent !== content) {
            oldContent = content;
            content = content.replace(/\s+-\s+/g, '-');
        }

        // Remove spaces after colons in class names: "lg: px-8" -> "lg:px-8"
        // User suggested :\s+ -> :
        // This affects "key: value" -> "key:value" (harmless in JS/TS usually)
        content = content.replace(/:\s+/g, ':');

        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
