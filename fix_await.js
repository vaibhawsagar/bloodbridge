const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else if (dirPath.endsWith('.js')) {
            callback(dirPath);
        }
    });
}

walk('./js', (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    let replaced = content.replace(/(await MockData\.getAll\([^)]+\))\.(filter|find|map|reduce|sort)\(/g, '($1).$2(');
    
    if (original !== replaced) {
        fs.writeFileSync(filePath, replaced);
        console.log('Fixed ' + filePath);
    }
});
