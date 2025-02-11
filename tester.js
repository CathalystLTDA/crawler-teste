import fs from 'fs';
import path from 'path';

const folderPath = './storage/datasets/default'; // Change this to your folder path

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }
    
    files.forEach(file => {
        if (path.extname(file) === '.json') {
            const filePath = path.join(folderPath, file);
            
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading file ${file}:`, err);
                    return;
                }
                
                try {
                    const jsonObject = JSON.parse(data);
                    if (jsonObject.imageUrl && !jsonObject.imageUrl.startsWith('https')) {
                        console.log(`File: ${file} has an invalid imageUrl: ${jsonObject.imageUrl}`);
                    }
                } catch (parseError) {
                    console.error(`Error parsing JSON in file ${file}:`, parseError);
                }
            });
        }
    });
});
