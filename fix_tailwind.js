const fs = require('fs');
const path = require('path');

const extensions = ['.tsx', '.ts', '.js', '.jsx'];
const targetDir = 'src';

// Tailwind prefixes and colors to target
const prefixes = [
    'w', 'h', 'min', 'max', 'flex', 'grid', 'table', 'items', 'justify', 'content', 'self', 'place',
    'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
    'space', 'divide', 'gap', 'row', 'col', 'order', 'border', 'outline', 'ring',
    'bg', 'text', 'font', 'shadow', 'opacity', 'transition', 'animate', 'duration', 'ease',
    'z', 'basis', 'grow', 'shrink', 'overflow', 'cursor', 'pointer', 'rounded',
    'top', 'right', 'bottom', 'left', 'inset', 'translate', 'scale', 'rotate', 'skew',
    'fill', 'stroke', 'from', 'to', 'via', 'decoration', 'leading', 'tracking',
    'backdrop', 'grayscale', 'invert', 'sepia', 'blur', 'list', 'select', 'resize', 'object'
];

const colors = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
    'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
    'purple', 'fuchsia', 'pink', 'rose', 'white', 'black', 'transparent', 'current'
];

const misc = [
    'full', 'screen', 'auto', 'none', 'cover', 'contain', 'block', 'inline', 'hidden',
    'visible', 'scroll', 'fixed', 'absolute', 'relative', 'static', 'sticky'
];

const allKeywords = [...prefixes, ...colors, ...misc];
const keywordPattern = allKeywords.join('|');

// Regex: Look for a keyword followed by space-hyphen-space
// capturing the keyword in group 1
const regex = new RegExp(`(\\b(?:${keywordPattern}))\\s+-\\s+`, 'g');

// Also strict numeric matching: '-[0-9]' or '-['
// e.g. 'top - [50px]'
const regexNumeric = new RegExp(`(\\b(?:${keywordPattern}))\\s+-\\s+(?=[\\[0-9])`, 'g');


function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Apply multiple passes to handle 'min - h - screen' -> 'min-h - screen' -> 'min-h-screen'
    let changed = true;
    while (changed) {
        let newContent = content.replace(regex, '$1-');
        if (newContent === content) {
            // try numeric
            newContent = content.replace(regexNumeric, '$1-');
        }

        if (newContent !== content) {
            content = newContent;
        } else {
            changed = false;
        }
    }

    // Also fix the ': ' issue if present, e.g. 'hover: bg-...'
    // This is safer to just check for 'hover:\s+' etc
    // Common modifiers: hover, focus, active, disabled, group-hover, dark, md, lg, xl, sm
    const modifiers = ['hover', 'focus', 'active', 'disabled', 'group-hover', 'dark', 'md', 'lg', 'xl', '2xl', 'sm', 'print'];
    const modPattern = modifiers.join('|');
    const modRegex = new RegExp(`(\\b(?:${modPattern})):\\s+`, 'g');

    // Replace 'dark: ' with 'dark:'
    content = content.replace(modRegex, '$1:');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (let file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else {
            if (extensions.includes(path.extname(file))) {
                processFile(fullPath);
            }
        }
    }
}

console.log('Starting cleanup...');
walk(targetDir);
console.log('Done.');
