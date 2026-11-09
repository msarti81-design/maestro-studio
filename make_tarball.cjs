const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const output = fs.createWriteStream(path.join(process.cwd(), 'public', 'maestro-studio.tar.gz'));
const archive = archiver('tar', {
  gzip: true,
  gzipOptions: { level: 9 }
});

output.on('close', function() {
  console.log('Archive created: maestro-studio.tar.gz, total bytes:', archive.pointer());
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Add all project files except node_modules, .git, dist, .aistudio
archive.glob('**/*', {
  cwd: process.cwd(),
  ignore: [
    'node_modules/**',
    'dist/**',
    '.git/**',
    '.aistudio/**',
    'public/maestro-studio.tar.gz',
    '*.log'
  ]
});

archive.finalize();
