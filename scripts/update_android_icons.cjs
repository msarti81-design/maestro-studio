const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function updateAndroidIcons() {
  const iconSrc = path.join(__dirname, '../public/play-store/google-play-icon-512x512.png');
  const resDir = path.join(__dirname, '../android/app/src/main/res');

  if (!fs.existsSync(iconSrc)) {
    console.error('Source icon not found at', iconSrc);
    return;
  }

  if (!fs.existsSync(resDir)) {
    console.log('Android res directory not found yet (Capacitor sync pending), skipping icon injection for now.');
    return;
  }

  for (const [folder, size] of Object.entries(SIZES)) {
    const targetDir = path.join(resDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const resizedBuffer = await sharp(iconSrc).resize(size, size).png().toBuffer();

    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), resizedBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), resizedBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), resizedBuffer);

    console.log(`Updated Android ${folder} icons to official 512x512 VirtuKeys design (${size}x${size}px)`);
  }

  console.log('✅ All Android launcher and round icons updated successfully to VirtuKeys!');
}

if (require.main === module) {
  updateAndroidIcons().catch((err) => {
    console.error('Error updating Android icons:', err);
    process.exit(1);
  });
}

module.exports = { updateAndroidIcons };
