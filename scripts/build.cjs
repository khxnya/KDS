const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const release = path.join(root, 'release');

const applicationFiles = [
  'index.html',
  'admin.html',
  'client.html',
  'developer.html',
  'favicon.svg',
  'team.js',
  'kinetic.js',
  'v6.js',
  'v6.css',
  'v7.js',
  'v7.css',
  'v8-public.js',
  'v8-public.css',
  'v8-workspace.js',
  'v8-workspace.css',
  'v8-session.js',
  'v8-export.js',
  'xlsx.js'
];

const releaseFiles = [
  ...applicationFiles,
  'config.example.js',
  'README.md',
  'PRODUCTION-V8.md',
  'TEAM-SETUP.md',
  'database.sql',
  'team.sql',
  'collaboration.sql',
  'production-v8.sql',
  'setup.html',
  'package.json',
  'package-lock.json'
];

function resetDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function copyFile(file, targetDirectory) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) throw new Error(`Required build file is missing: ${file}`);
  const target = path.join(targetDirectory, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativeDirectory, targetRoot) {
  const source = path.join(root, relativeDirectory);
  if (!fs.existsSync(source)) throw new Error(`Required build directory is missing: ${relativeDirectory}`);
  fs.cpSync(source, path.join(targetRoot, relativeDirectory), { recursive: true });
}

resetDirectory(dist);
for (const file of applicationFiles) copyFile(file, dist);
if (fs.existsSync(path.join(root, 'config.js'))) copyFile('config.js', dist);
else copyFile('config.example.js', dist);

resetDirectory(release);
for (const file of releaseFiles) copyFile(file, release);
copyDirectory('supabase/functions/contact-submit', release);
copyDirectory('scripts', release);
copyDirectory('tests', release);

console.log('Static deploy output prepared in dist/.');
console.log('Credential-free handover bundle prepared in release/. Preserve your configured config.js when upgrading.');
