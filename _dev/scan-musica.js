const fs = require('fs');
const path = require('path');

function scanMusica(rootDir) {
    const musicaDir = path.join(rootDir, 'Musica');
    const terminadosDir = path.join(musicaDir, 'Terminados');
    const demosDir = path.join(musicaDir, 'Demos');

    // Asegurar que las carpetas existan
    if (!fs.existsSync(musicaDir)) fs.mkdirSync(musicaDir, { recursive: true });
    if (!fs.existsSync(terminadosDir)) fs.mkdirSync(terminadosDir, { recursive: true });
    if (!fs.existsSync(demosDir)) fs.mkdirSync(demosDir, { recursive: true });

    const scanDir = (dir, pathPrefix) => {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'].includes(ext);
            })
            .map(file => {
                // Generar un título limpio
                const nameWithoutExt = path.basename(file, path.extname(file));
                const cleanTitle = nameWithoutExt
                    .replace(/[_-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/\b\w/g, c => c.toUpperCase()); // Capitalizar primera letra de cada palabra

                // Obtener datos del archivo
                const stats = fs.statSync(path.join(dir, file));
                
                return {
                    title: cleanTitle,
                    file: `${pathPrefix}/${file}`,
                    date: stats.mtime.toISOString().split('T')[0],
                    size: (stats.size / (1024 * 1024)).toFixed(1) + ' MB'
                };
            });
    };

    const terminados = scanDir(terminadosDir, 'Musica/Terminados');
    const demos = scanDir(demosDir, 'Musica/Demos');

    let list = { terminados, demos };

    // Si ambos están vacíos, agregar canciones premium de muestra online
    if (terminados.length === 0 && demos.length === 0) {
        list = {
            terminados: [
                {
                    title: "Enganchado Cumbia Classic (Muestra Online)",
                    file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                    date: new Date().toISOString().split('T')[0],
                    size: "6.2 MB",
                    isDemoTrack: true
                },
                {
                    title: "Retro Mix 90s (Muestra Online)",
                    file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
                    date: new Date().toISOString().split('T')[0],
                    size: "7.0 MB",
                    isDemoTrack: true
                }
            ],
            demos: [
                {
                    title: "Reggaeton Proyecto Nuevo (Muestra Online)",
                    file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
                    date: new Date().toISOString().split('T')[0],
                    size: "5.4 MB",
                    isDemoTrack: true
                },
                {
                    title: "Idea Melódica 2026 (Muestra Online)",
                    file: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
                    date: new Date().toISOString().split('T')[0],
                    size: "5.0 MB",
                    isDemoTrack: true
                }
            ]
        };
    }

    const listJsonPath = path.join(musicaDir, 'list.json');
    fs.writeFileSync(listJsonPath, JSON.stringify(list, null, 4), 'utf8');
    console.log(`🎵 [Musica Scanner] list.json actualizado: ${list.terminados.length} terminados, ${list.demos.length} demos.`);
}

module.exports = scanMusica;
