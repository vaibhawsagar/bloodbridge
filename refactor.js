const fs = require('fs');
const path = require('path');

const JS_DIRS = [
    './js/admin',
    './js/donor',
    './js/recipient',
    './js/services',
    './js/auth'
];

function processFile(filePath) {
    if (!filePath.endsWith('.js') || filePath.includes('mock-data.js') || filePath.includes('api-client.js')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Make DOMContentLoaded async
    content = content.replace(/DOMContentLoaded',\s*\(\)\s*=>\s*\{/g, "DOMContentLoaded', async () => {");
    content = content.replace(/DOMContentLoaded',\s*function\s*\(\)\s*\{/g, "DOMContentLoaded', async function() {");

    // 2. Add 'await' to MockData calls
    content = content.replace(/(?<!await\s+)MockData\.getAll\(/g, 'await MockData.getAll(');
    content = content.replace(/(?<!await\s+)MockData\.getById\(/g, 'await MockData.getById(');
    content = content.replace(/(?<!await\s+)MockData\.insert\(/g, 'await MockData.insert(');
    content = content.replace(/(?<!await\s+)MockData\.update\(/g, 'await MockData.update(');
    content = content.replace(/(?<!await\s+)MockData\.delete\(/g, 'await MockData.delete(');
    content = content.replace(/(?<!await\s+)MockData\.query\(/g, 'await MockData.query(');

    // 3. Add 'await' to Service calls which will also become async
    content = content.replace(/(?<!await\s+)InventoryService\./g, 'await InventoryService.');
    content = content.replace(/(?<!await\s+)RequestService\./g, 'await RequestService.');
    content = content.replace(/(?<!await\s+)NotificationService\./g, 'await NotificationService.');
    content = content.replace(/(?<!await\s+)ActivityLogService\./g, 'await ActivityLogService.');

    // Fix double awaits if they got injected
    content = content.replace(/await\s+await\s+/g, 'await ');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Refactored: ${filePath}`);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

console.log('Starting automated frontend refactor...');
JS_DIRS.forEach(walkDir);
console.log('Refactor complete!');
