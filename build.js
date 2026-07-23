const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    console.log('Building React frontend...');
    execSync('npm run build', { cwd: path.join(__dirname, 'dashboard-new'), stdio: 'inherit' });

    const dest = path.join(__dirname, 'dashboard');
    if (fs.existsSync(dest)) {
        console.log('Removing old dashboard directory...');
        fs.rmSync(dest, { recursive: true, force: true });
    }

    console.log('Moving built assets to dashboard...');
    fs.renameSync(path.join(__dirname, 'dashboard-new', 'dist'), dest);
    console.log('Build complete successfully! 🚀');
} catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
}
