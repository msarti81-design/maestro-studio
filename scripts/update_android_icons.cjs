const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Exact Android Adaptive Icon & Legacy Icon Specs
const ICON_CONFIGS = {
  'mipmap-mdpi': { launcher: 48, foreground: 108 },
  'mipmap-hdpi': { launcher: 72, foreground: 162 },
  'mipmap-xhdpi': { launcher: 96, foreground: 216 },
  'mipmap-xxhdpi': { launcher: 144, foreground: 324 },
  'mipmap-xxxhdpi': { launcher: 192, foreground: 432 },
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

  // 1. Update values/ic_launcher_background.xml to dark navy theme (#020617)
  const valuesDir = path.join(resDir, 'values');
  if (!fs.existsSync(valuesDir)) {
    fs.mkdirSync(valuesDir, { recursive: true });
  }

  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#020617</color>
</resources>
`;
  fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), bgXml, 'utf-8');

  // Also check values/colors.xml if present
  const colorsXmlPath = path.join(valuesDir, 'colors.xml');
  if (fs.existsSync(colorsXmlPath)) {
    let colorsContent = fs.readFileSync(colorsXmlPath, 'utf-8');
    if (colorsContent.includes('ic_launcher_background')) {
      colorsContent = colorsContent.replace(/<color name="ic_launcher_background">[^<]+<\/color>/g, '<color name="ic_launcher_background">#020617</color>');
      fs.writeFileSync(colorsXmlPath, colorsContent, 'utf-8');
    }
  }

  // 2. Generate Mipmap densities (Legacy launcher + Round + Adaptive Foreground)
  for (const [folder, config] of Object.entries(ICON_CONFIGS)) {
    const targetDir = path.join(resDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard & Round Launcher Icons (48, 72, 96, 144, 192)
    const launcherBuffer = await sharp(iconSrc)
      .resize(config.launcher, config.launcher)
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), launcherBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), launcherBuffer);

    // Adaptive Foreground Icon (108, 162, 216, 324, 432) with 72% safe zone centering
    const iconInnerSize = Math.round(config.foreground * 0.72);
    const innerBuffer = await sharp(iconSrc)
      .resize(iconInnerSize, iconInnerSize)
      .png()
      .toBuffer();

    const padLeft = Math.round((config.foreground - iconInnerSize) / 2);
    const padTop = Math.round((config.foreground - iconInnerSize) / 2);

    const foregroundBuffer = await sharp({
      create: {
        width: config.foreground,
        height: config.foreground,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerBuffer, left: padLeft, top: padTop }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), foregroundBuffer);

    console.log(`Generated ${folder}: launcher (${config.launcher}px) & adaptive foreground (${config.foreground}px)`);
  }

  // 3. Ensure mipmap-anydpi-v26 exists and points to adaptive icons
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) {
    fs.mkdirSync(anydpiDir, { recursive: true });
  }

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml, 'utf-8');
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml, 'utf-8');

  console.log('✅ Android Adaptive Icons (Android 8.0 through Android 16) fully configured for VirtuKeys!');
}

if (require.main === module) {
  updateAndroidIcons().catch((err) => {
    console.error('Error updating Android icons:', err);
    process.exit(1);
  });
}

module.exports = { updateAndroidIcons };
