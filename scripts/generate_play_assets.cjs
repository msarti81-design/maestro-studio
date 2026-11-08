const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const archiver = require('archiver');

const outputDir = path.join(__dirname, '../public/play-store');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. APP ICON (512 x 512)
function getAppIconSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0f1d"/>
        <stop offset="50%" stop-color="#050811"/>
        <stop offset="100%" stop-color="#020408"/>
      </linearGradient>
      
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="40%" stop-color="#eab308"/>
        <stop offset="80%" stop-color="#ca8a04"/>
        <stop offset="100%" stop-color="#854d0e"/>
      </linearGradient>

      <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#67e8f9"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>

      <linearGradient id="whiteKeyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="85%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </linearGradient>

      <linearGradient id="blackKeyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="40%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>

      <radialGradient id="centerGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/>
        <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="keyGlow" cx="50%" cy="90%" r="60%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>

    <!-- Deep Studio Canvas -->
    <rect width="512" height="512" fill="url(#bgGrad)"/>
    <circle cx="256" cy="220" r="210" fill="url(#centerGlow)"/>
    <rect y="260" width="512" height="252" fill="url(#keyGlow)"/>

    <!-- Subtle Geometric Acoustic Sound Rings -->
    <circle cx="256" cy="220" r="180" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 8" opacity="0.4"/>
    <circle cx="256" cy="220" r="140" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.3"/>
    <circle cx="256" cy="220" r="100" fill="none" stroke="#64748b" stroke-width="1" opacity="0.2"/>

    <!-- Gold Crest Ring -->
    <circle cx="256" cy="180" r="88" fill="#0b1120" stroke="url(#goldGrad)" stroke-width="3" filter="url(#shadow)"/>
    <circle cx="256" cy="180" r="80" fill="none" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 5" opacity="0.6"/>

    <!-- Artistic Treble Clef & Sound Wave Centerpiece -->
    <g transform="translate(256, 180) scale(1.15)" filter="url(#glow)">
      <!-- Stylized Treble Clef Path -->
      <path d="M -8 40 C -18 36 -24 24 -24 10 C -24 -12 -6 -28 10 -40 C 18 -46 22 -58 20 -70 C 18 -80 8 -88 -2 -88 C -14 -88 -20 -76 -18 -66 C -16 -60 -10 -56 -4 -56 C 2 -56 6 -60 6 -66 C 6 -72 2 -76 -2 -76 C -6 -76 -8 -74 -8 -70 C -8 -64 4 -62 4 -52 C 4 -36 -12 -20 -20 0 C -26 14 -22 34 -8 44 C 6 54 26 48 34 32 C 42 16 38 -8 26 -24 C 18 -36 8 -46 0 -58 L 2 52 C 2 64 -2 76 -12 82 C -22 88 -36 84 -40 72 C -44 60 -34 48 -22 50 C -12 52 -8 60 -10 68 C -12 74 -18 78 -24 76" 
            fill="none" stroke="url(#goldGrad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Treble Clef bottom orb -->
      <circle cx="-16" cy="74" r="5" fill="url(#goldGrad)"/>
    </g>

    <!-- Glowing Waterfall Cascade Beams dropping into keys -->
    <g opacity="0.75">
      <rect x="135" y="270" width="16" height="50" rx="8" fill="url(#cyanGrad)" opacity="0.7" filter="url(#glow)"/>
      <rect x="205" y="250" width="16" height="70" rx="8" fill="url(#goldGrad)" opacity="0.8" filter="url(#glow)"/>
      <rect x="290" y="260" width="16" height="60" rx="8" fill="url(#cyanGrad)" opacity="0.7" filter="url(#glow)"/>
      <rect x="360" y="280" width="16" height="40" rx="8" fill="url(#goldGrad)" opacity="0.6" filter="url(#glow)"/>
    </g>

    <!-- Piano Bed Container (Luxury Studio Console) -->
    <g filter="url(#shadow)">
      <rect x="46" y="320" width="420" height="152" rx="20" fill="#090d16" stroke="#1e293b" stroke-width="3"/>
      <!-- Red Felt Strip under fallboard -->
      <rect x="52" y="324" width="408" height="6" rx="3" fill="#dc2626"/>

      <!-- White Keys (7 keys) -->
      <!-- Key 1 -->
      <rect x="54" y="330" width="54" height="136" rx="6" fill="url(#whiteKeyGrad)" stroke="#94a3b8" stroke-width="1"/>
      <line x1="107" y1="334" x2="107" y2="462" stroke="#64748b" stroke-width="1.5"/>
      <!-- Key 2 -->
      <rect x="112" y="330" width="54" height="136" rx="6" fill="url(#whiteKeyGrad)" stroke="#94a3b8" stroke-width="1"/>
      <line x1="165" y1="334" x2="165" y2="462" stroke="#64748b" stroke-width="1.5"/>
      <!-- Key 3 (Active Illuminated Cyan) -->
      <rect x="170" y="330" width="54" height="136" rx="6" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
      <rect x="174" y="440" width="46" height="20" rx="4" fill="#38bdf8" opacity="0.6" filter="url(#glow)"/>
      <line x1="223" y1="334" x2="223" y2="462" stroke="#64748b" stroke-width="1.5"/>
      <!-- Key 4 -->
      <rect x="228" y="330" width="54" height="136" rx="6" fill="url(#whiteKeyGrad)" stroke="#94a3b8" stroke-width="1"/>
      <line x1="281" y1="334" x2="281" y2="462" stroke="#64748b" stroke-width="1.5"/>
      <!-- Key 5 (Active Illuminated Gold) -->
      <rect x="286" y="330" width="54" height="136" rx="6" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
      <rect x="290" y="440" width="46" height="20" rx="4" fill="#f59e0b" opacity="0.7" filter="url(#glow)"/>
      <line x1="339" y1="334" x2="339" y2="462" stroke="#64748b" stroke-width="1.5"/>
      <!-- Key 6 -->
      <rect x="344" y="330" width="54" height="136" rx="6" fill="url(#whiteKeyGrad)" stroke="#94a3b8" stroke-width="1"/>
      <line x1="397" y1="334" x2="397" y2="462" stroke="#64748b" stroke-width="1.5"/>
      <!-- Key 7 -->
      <rect x="402" y="330" width="54" height="136" rx="6" fill="url(#whiteKeyGrad)" stroke="#94a3b8" stroke-width="1"/>

      <!-- Black Keys with 3D bevels & gloss -->
      <!-- Black 1 -->
      <rect x="88" y="330" width="34" height="88" rx="4" fill="url(#blackKeyGrad)" stroke="#334155" stroke-width="1"/>
      <rect x="91" y="332" width="6" height="80" rx="2" fill="#ffffff" opacity="0.15"/>
      <!-- Black 2 -->
      <rect x="146" y="330" width="34" height="88" rx="4" fill="url(#blackKeyGrad)" stroke="#334155" stroke-width="1"/>
      <rect x="149" y="332" width="6" height="80" rx="2" fill="#ffffff" opacity="0.15"/>
      <!-- Black 3 -->
      <rect x="262" y="330" width="34" height="88" rx="4" fill="url(#blackKeyGrad)" stroke="#334155" stroke-width="1"/>
      <rect x="265" y="332" width="6" height="80" rx="2" fill="#ffffff" opacity="0.15"/>
      <!-- Black 4 -->
      <rect x="320" y="330" width="34" height="88" rx="4" fill="url(#blackKeyGrad)" stroke="#334155" stroke-width="1"/>
      <rect x="323" y="332" width="6" height="80" rx="2" fill="#ffffff" opacity="0.15"/>
      <!-- Black 5 -->
      <rect x="378" y="330" width="34" height="88" rx="4" fill="url(#blackKeyGrad)" stroke="#334155" stroke-width="1"/>
      <rect x="381" y="332" width="6" height="80" rx="2" fill="#ffffff" opacity="0.15"/>
    </g>

    <!-- Luxury Gold Studio Branding Ribbon at Top -->
    <text x="256" y="58" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" letter-spacing="9" fill="url(#goldGrad)">VIRTUKEYS</text>
    <text x="256" y="78" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="12" letter-spacing="4" fill="#94a3b8">PIANO STUDIO</text>
  </svg>
  `;
}

// 2. FEATURE GRAPHIC (1024 x 500)
function getFeatureGraphicSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500" width="1024" height="500">
    <defs>
      <linearGradient id="featBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#030712"/>
        <stop offset="45%" stop-color="#0a1023"/>
        <stop offset="80%" stop-color="#050a16"/>
        <stop offset="100%" stop-color="#02040a"/>
      </linearGradient>

      <linearGradient id="goldFeat" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="35%" stop-color="#f59e0b"/>
        <stop offset="70%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>

      <linearGradient id="cyanFeat" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#6366f1"/>
      </linearGradient>

      <linearGradient id="emeraldFeat" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>

      <radialGradient id="stageSpotlight" cx="68%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.32"/>
        <stop offset="50%" stop-color="#d97706" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <filter id="featGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <filter id="heavyGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="14" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Main Background -->
    <rect width="1024" height="500" fill="url(#featBg)"/>
    <rect width="1024" height="500" fill="url(#stageSpotlight)"/>

    <!-- Geometric Studio Grid Lines & Light Cones -->
    <g opacity="0.15" stroke="#475569" stroke-width="1">
      <line x1="0" y1="120" x2="1024" y2="120"/>
      <line x1="0" y1="240" x2="1024" y2="240"/>
      <line x1="0" y1="360" x2="1024" y2="360"/>
      <line x1="500" y1="0" x2="500" y2="500"/>
    </g>

    <!-- Glowing Musical Staff Waves in Background -->
    <g opacity="0.35" stroke="url(#goldFeat)" stroke-width="1.2" fill="none">
      <path d="M 0 160 Q 250 110, 500 170 T 1024 150"/>
      <path d="M 0 175 Q 250 125, 500 185 T 1024 165"/>
      <path d="M 0 190 Q 250 140, 500 200 T 1024 180"/>
      <path d="M 0 205 Q 250 155, 500 215 T 1024 195"/>
      <path d="M 0 220 Q 250 170, 500 230 T 1024 210"/>
    </g>

    <!-- Floating Musical Notes -->
    <g fill="url(#goldFeat)" opacity="0.75" filter="url(#featGlow)">
      <!-- Note 1 -->
      <circle cx="560" cy="140" r="9"/>
      <line x1="568" y1="140" x2="568" y2="95" stroke="url(#goldFeat)" stroke-width="3"/>
      <path d="M 568 95 Q 585 105, 580 120" fill="none" stroke="url(#goldFeat)" stroke-width="3"/>
      <!-- Note 2 (Beamed pair) -->
      <circle cx="890" cy="110" r="8"/>
      <circle cx="925" cy="100" r="8"/>
      <line x1="897" y1="110" x2="897" y2="70" stroke="url(#goldFeat)" stroke-width="3"/>
      <line x1="932" y1="100" x2="932" y2="60" stroke="url(#goldFeat)" stroke-width="3"/>
      <line x1="896" y1="70" x2="933" y2="60" stroke="url(#goldFeat)" stroke-width="4"/>
    </g>

    <!-- LEFT COLUMN: App Title, Branding, Subtitles & Badges (Clean Safe-Zone) -->
    <g transform="translate(64, 0)">
      <!-- Eyebrow Badge -->
      <g transform="translate(0, 92)">
        <rect width="260" height="30" rx="15" fill="#1e293b" stroke="#f59e0b" stroke-width="1.2" opacity="0.9"/>
        <text x="130" y="20" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" letter-spacing="2" fill="#fbbf24">CONCERT AUDIO ENGINE</text>
      </g>

      <!-- Main Logo / App Name -->
      <text x="0" y="185" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="58" letter-spacing="4" fill="url(#goldFeat)">VIRTUKEYS</text>
      <text x="4" y="222" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="24" letter-spacing="9" fill="#f8fafc">PIANO STUDIO</text>

      <!-- Description / Tagline -->
      <text x="4" y="262" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="15" fill="#94a3b8" letter-spacing="0.5">
        88-Key Concert Grand • Falling Notes Waterfall • Jam Band
      </text>
      <text x="4" y="286" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="15" fill="#94a3b8" letter-spacing="0.5">
        Dual-Staff Sheet Music Composer • Hanon Scale Gym
      </text>

      <!-- Feature Pill Badges -->
      <g transform="translate(0, 328)">
        <!-- Pill 1 -->
        <rect x="0" y="0" width="128" height="34" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
        <text x="64" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#38bdf8">WATERFALL</text>

        <!-- Pill 2 -->
        <rect x="136" y="0" width="136" height="34" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="1.2"/>
        <text x="204" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#fbbf24">SHEET MUSIC</text>

        <!-- Pill 3 -->
        <rect x="280" y="0" width="128" height="34" rx="8" fill="#0f172a" stroke="#34d399" stroke-width="1.2"/>
        <text x="344" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#34d399">JAM BAND</text>
      </g>

      <g transform="translate(0, 372)">
        <!-- Pill 4 -->
        <rect x="0" y="0" width="144" height="34" rx="8" fill="#0f172a" stroke="#a855f7" stroke-width="1.2"/>
        <text x="72" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#c084fc">SCALE GYM</text>

        <!-- Pill 5 -->
        <rect x="152" y="0" width="140" height="34" rx="8" fill="#0f172a" stroke="#f43f5e" stroke-width="1.2"/>
        <text x="222" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#fb7185">MIDI RECORDER</text>
      </g>
    </g>

    <!-- RIGHT COLUMN: 3D Grand Piano & Falling Waterfall Visualizer -->
    <g transform="translate(540, 160)">
      <!-- Waterfall Note Beams Falling Down -->
      <!-- Beam 1 Cyan -->
      <rect x="50" y="20" width="22" height="110" rx="10" fill="url(#cyanFeat)" filter="url(#heavyGlow)" opacity="0.65"/>
      <rect x="50" y="20" width="22" height="110" rx="10" fill="url(#cyanFeat)"/>
      <!-- Beam 2 Gold -->
      <rect x="110" y="60" width="24" height="70" rx="10" fill="url(#goldFeat)" filter="url(#heavyGlow)" opacity="0.75"/>
      <rect x="110" y="60" width="24" height="70" rx="10" fill="url(#goldFeat)"/>
      <!-- Beam 3 Emerald -->
      <rect x="180" y="0" width="22" height="130" rx="10" fill="url(#emeraldFeat)" filter="url(#heavyGlow)" opacity="0.6"/>
      <rect x="180" y="0" width="22" height="130" rx="10" fill="url(#emeraldFeat)"/>
      <!-- Beam 4 Purple -->
      <rect x="250" y="45" width="22" height="85" rx="10" fill="#a855f7" filter="url(#heavyGlow)" opacity="0.6"/>
      <rect x="250" y="45" width="22" height="85" rx="10" fill="#c084fc"/>
      <!-- Beam 5 Rose -->
      <rect x="320" y="10" width="24" height="120" rx="10" fill="#f43f5e" filter="url(#heavyGlow)" opacity="0.65"/>
      <rect x="320" y="10" width="24" height="120" rx="10" fill="#fb7185"/>

      <!-- Audio Spectrum Equalizer Bars Above Keys -->
      <g opacity="0.5" transform="translate(0, 100)">
        <rect x="20" y="20" width="6" height="20" fill="#38bdf8"/>
        <rect x="30" y="10" width="6" height="30" fill="#38bdf8"/>
        <rect x="90" y="5" width="6" height="35" fill="#fbbf24"/>
        <rect x="150" y="15" width="6" height="25" fill="#34d399"/>
        <rect x="220" y="8" width="6" height="32" fill="#c084fc"/>
        <rect x="290" y="12" width="6" height="28" fill="#fb7185"/>
        <rect x="370" y="22" width="6" height="18" fill="#38bdf8"/>
      </g>

      <!-- Perspective Piano Base -->
      <g transform="translate(0, 140)">
        <!-- Piano Body Console -->
        <rect x="0" y="0" width="430" height="170" rx="14" fill="#0b0f19" stroke="#334155" stroke-width="2"/>
        <!-- Fallboard Red Felt -->
        <rect x="4" y="4" width="422" height="6" rx="3" fill="#ef4444"/>

        <!-- White Keys (9 keys displayed) -->
        <!-- White 1 -->
        <rect x="6" y="12" width="44" height="150" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <!-- White 2 (Active Cyan) -->
        <rect x="52" y="12" width="44" height="150" rx="4" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
        <rect x="54" y="130" width="40" height="28" rx="4" fill="#38bdf8" opacity="0.75" filter="url(#featGlow)"/>
        <!-- White 3 -->
        <rect x="98" y="12" width="44" height="150" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <!-- White 4 (Active Gold) -->
        <rect x="144" y="12" width="44" height="150" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>
        <rect x="146" y="130" width="40" height="28" rx="4" fill="#f59e0b" opacity="0.8" filter="url(#featGlow)"/>
        <!-- White 5 -->
        <rect x="190" y="12" width="44" height="150" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <!-- White 6 (Active Emerald) -->
        <rect x="236" y="12" width="44" height="150" rx="4" fill="#d1fae5" stroke="#10b981" stroke-width="2"/>
        <rect x="238" y="130" width="40" height="28" rx="4" fill="#10b981" opacity="0.75" filter="url(#featGlow)"/>
        <!-- White 7 -->
        <rect x="282" y="12" width="44" height="150" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <!-- White 8 (Active Rose) -->
        <rect x="328" y="12" width="44" height="150" rx="4" fill="#ffe4e6" stroke="#f43f5e" stroke-width="2"/>
        <rect x="330" y="130" width="40" height="28" rx="4" fill="#f43f5e" opacity="0.8" filter="url(#featGlow)"/>
        <!-- White 9 -->
        <rect x="374" y="12" width="50" height="150" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>

        <!-- Black Keys -->
        <rect x="34" y="12" width="28" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="80" y="12" width="28" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="172" y="12" width="28" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="218" y="12" width="28" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="264" y="12" width="28" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="356" y="12" width="28" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
        <rect x="402" y="12" width="20" height="96" rx="4" fill="#090d16" stroke="#334155" stroke-width="1"/>
      </g>
    </g>
  </svg>
  `;
}

// 3. SCREENSHOT 1: PIANO & WATERFALL (1920 x 1080)
function getScreenshot1Svg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <linearGradient id="sc1Bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="50%" stop-color="#090d16"/>
        <stop offset="100%" stop-color="#000000"/>
      </linearGradient>

      <linearGradient id="scGold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fde047"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>

      <filter id="scGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Canvas -->
    <rect width="1920" height="1080" fill="url(#sc1Bg)"/>

    <!-- Promotional Header Banner on top -->
    <rect width="1920" height="160" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <text x="960" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" letter-spacing="3" fill="url(#scGold)">
      88-KEY GRAND PIANO WITH FALLING NOTES WATERFALL
    </text>
    <text x="960" y="120" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22" letter-spacing="1" fill="#94a3b8">
      Ultra-low latency audio engine • Full multi-touch support • Octave navigator &amp; pedal control
    </text>

    <!-- App Window Frame Mockup -->
    <g transform="translate(60, 200)">
      <!-- Window Background -->
      <rect width="1800" height="820" rx="20" fill="#040711" stroke="#334155" stroke-width="3"/>
      
      <!-- Top In-App Control Bar -->
      <rect width="1800" height="70" rx="20" fill="#090d16" stroke="#1e293b" stroke-width="1"/>
      <text x="40" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="22" fill="#fbbf24">𝄞 VIRTUKEYS</text>
      <text x="210" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#64748b">SONG: CLAIR DE LUNE (DEBUSSY)</text>
      
      <!-- In-App Playback Badges -->
      <g transform="translate(800, 16)">
        <rect width="120" height="38" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="60" y="25" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#38bdf8">TEMPO: 72 BPM</text>
      </g>
      <g transform="translate(940, 16)">
        <rect width="130" height="38" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5"/>
        <text x="65" y="25" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#34d399">SUSTAIN: ON</text>
      </g>
      <g transform="translate(1090, 16)">
        <rect width="140" height="38" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5"/>
        <text x="70" y="25" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#fbbf24">OCTAVE: C3 - B5</text>
      </g>
      <g transform="translate(1600, 16)">
        <rect width="160" height="38" rx="8" fill="#0284c7"/>
        <text x="80" y="25" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#ffffff">SYNTHESIA MODE</text>
      </g>

      <!-- Waterfall Canvas Area (falling glowing notes) -->
      <g transform="translate(40, 90)">
        <rect width="1720" height="370" rx="12" fill="#070a14" stroke="#1e293b" stroke-width="1.5"/>

        <!-- Vertical Key Track Dividers -->
        ${Array.from({ length: 22 }, (_, i) => `<line x1="${(i + 1) * 78}" y1="0" x2="${(i + 1) * 78}" y2="370" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 6" opacity="0.4"/>`).join('\n')}

        <!-- Falling Colorful Note Bars (Synthesia waterfall) -->
        <!-- Note 1 -->
        <rect x="156" y="80" width="70" height="180" rx="8" fill="#38bdf8" filter="url(#scGlow)" opacity="0.8"/>
        <rect x="156" y="80" width="70" height="180" rx="8" fill="#38bdf8"/>
        <text x="191" y="180" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a">E4</text>

        <!-- Note 2 -->
        <rect x="312" y="20" width="70" height="260" rx="8" fill="#fbbf24" filter="url(#scGlow)" opacity="0.85"/>
        <rect x="312" y="20" width="70" height="260" rx="8" fill="#fbbf24"/>
        <text x="347" y="160" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a">G#4</text>

        <!-- Note 3 -->
        <rect x="468" y="140" width="70" height="160" rx="8" fill="#34d399" filter="url(#scGlow)" opacity="0.8"/>
        <rect x="468" y="140" width="70" height="160" rx="8" fill="#34d399"/>
        <text x="503" y="230" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a">B4</text>

        <!-- Note 4 -->
        <rect x="702" y="60" width="70" height="220" rx="8" fill="#c084fc" filter="url(#scGlow)" opacity="0.8"/>
        <rect x="702" y="60" width="70" height="220" rx="8" fill="#c084fc"/>
        <text x="737" y="180" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a">D#5</text>

        <!-- Note 5 (just hitting keyboard) -->
        <rect x="936" y="210" width="70" height="160" rx="8" fill="#f43f5e" filter="url(#scGlow)" opacity="0.9"/>
        <rect x="936" y="210" width="70" height="160" rx="8" fill="#f43f5e"/>
        <text x="971" y="290" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#ffffff">F#5</text>

        <!-- Note 6 -->
        <rect x="1170" y="40" width="70" height="200" rx="8" fill="#38bdf8" filter="url(#scGlow)" opacity="0.8"/>
        <rect x="1170" y="40" width="70" height="200" rx="8" fill="#38bdf8"/>
        <text x="1205" y="150" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a">G#5</text>

        <!-- Note 7 -->
        <rect x="1404" y="100" width="70" height="270" rx="8" fill="#fbbf24" filter="url(#scGlow)" opacity="0.85"/>
        <rect x="1404" y="100" width="70" height="270" rx="8" fill="#fbbf24"/>
        <text x="1439" y="240" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a">C6</text>
      </g>

      <!-- Grand Piano Keyboard (21 White Keys visible) -->
      <g transform="translate(40, 480)">
        <rect width="1720" height="310" rx="12" fill="#0b0f19" stroke="#334155" stroke-width="2"/>
        <rect x="4" y="4" width="1712" height="10" fill="#dc2626"/>

        <!-- 21 White Keys -->
        ${Array.from({ length: 22 }, (_, i) => {
          const x = 8 + i * 77.5;
          const isPressed = [2, 4, 6, 9, 12, 15, 18].includes(i);
          const color = isPressed ? '#e0f2fe' : '#ffffff';
          const stroke = isPressed ? '#38bdf8' : '#94a3b8';
          return `
            <rect x="${x}" y="18" width="75" height="280" rx="6" fill="${color}" stroke="${stroke}" stroke-width="${isPressed ? 3 : 1}"/>
            ${isPressed ? `<rect x="${x + 2}" y="240" width="71" height="54" rx="4" fill="#38bdf8" opacity="0.7" filter="url(#scGlow)"/>` : ''}
            <text x="${x + 37}" y="280" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="15" fill="#64748b">C${Math.floor(i / 7) + 3}</text>
          `;
        }).join('\n')}

        <!-- Black Keys (15 black keys) -->
        ${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18, 19].map((idx) => {
          const x = 8 + idx * 77.5 + 52;
          return `
            <rect x="${x}" y="18" width="48" height="175" rx="5" fill="#090d16" stroke="#334155" stroke-width="1.5"/>
            <rect x="${x + 4}" y="22" width="8" height="160" rx="3" fill="#ffffff" opacity="0.15"/>
          `;
        }).join('\n')}
      </g>
    </g>
  </svg>
  `;
}

// 4. SCREENSHOT 2: SHEET MUSIC COMPOSER (1920 x 1080)
function getScreenshot2Svg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <linearGradient id="sc2Bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>

      <linearGradient id="scGold2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>

    <rect width="1920" height="1080" fill="url(#sc2Bg)"/>

    <!-- Promotional Header Banner -->
    <rect width="1920" height="160" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <text x="960" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" letter-spacing="3" fill="url(#scGold2)">
      INTERACTIVE DUAL-STAFF SHEET MUSIC COMPOSER
    </text>
    <text x="960" y="120" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22" letter-spacing="1" fill="#94a3b8">
      Real-time Treble &amp; Bass staves • Note duration selection • MIDI export &amp; Instant playback
    </text>

    <!-- App Window Frame -->
    <g transform="translate(60, 200)">
      <rect width="1800" height="820" rx="20" fill="#060913" stroke="#334155" stroke-width="3"/>

      <!-- Composer Toolbar -->
      <rect width="1800" height="74" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#fbbf24">SCORE COMPOSER</text>
      
      <!-- Note tools -->
      <g transform="translate(260, 16)">
        <rect width="90" height="42" rx="8" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="45" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="15" fill="#38bdf8">𝅝 Whole</text>
      </g>
      <g transform="translate(365, 16)">
        <rect width="80" height="42" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1"/>
        <text x="40" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="15" fill="#e2e8f0">𝅗 Half</text>
      </g>
      <g transform="translate(460, 16)">
        <rect width="100" height="42" rx="8" fill="#0284c7"/>
        <text x="50" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="15" fill="#ffffff">𝅘 Quarter</text>
      </g>
      <g transform="translate(575, 16)">
        <rect width="90" height="42" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1"/>
        <text x="45" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="15" fill="#e2e8f0">𝅙 Eighth</text>
      </g>

      <!-- Key & Clef info -->
      <g transform="translate(1360, 16)">
        <rect width="180" height="42" rx="8" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5"/>
        <text x="90" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#fbbf24">KEY: C MAJOR 4/4</text>
      </g>
      <g transform="translate(1560, 16)">
        <rect width="200" height="42" rx="8" fill="#059669"/>
        <text x="100" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#ffffff">▶ PLAY SCORE</text>
      </g>

      <!-- Pristine Sheet Music Paper Canvas -->
      <g transform="translate(40, 100)">
        <rect width="1720" height="680" rx="14" fill="#0a0f1d" stroke="#1e293b" stroke-width="2"/>

        <!-- Measure 1 - 4 dividers -->
        <line x1="430" y1="60" x2="430" y2="620" stroke="#334155" stroke-width="2"/>
        <line x1="860" y1="60" x2="860" y2="620" stroke="#334155" stroke-width="2"/>
        <line x1="1290" y1="60" x2="1290" y2="620" stroke="#334155" stroke-width="2"/>
        <line x1="1680" y1="60" x2="1680" y2="620" stroke="#64748b" stroke-width="4"/>

        <!-- Dual Staff 1: Treble (G Clef) -->
        <g stroke="#64748b" stroke-width="2">
          <line x1="60" y1="120" x2="1680" y2="120"/>
          <line x1="60" y1="150" x2="1680" y2="150"/>
          <line x1="60" y1="180" x2="1680" y2="180"/>
          <line x1="60" y1="210" x2="1680" y2="210"/>
          <line x1="60" y1="240" x2="1680" y2="240"/>
        </g>
        <text x="80" y="210" font-family="serif" font-size="90" fill="#fbbf24">𝄞</text>
        <text x="145" y="175" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#e2e8f0">4</text>
        <text x="145" y="235" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#e2e8f0">4</text>

        <!-- Musical Notes on Treble Staff (Gold & Cyan Glowing) -->
        <g fill="#38bdf8">
          <circle cx="260" cy="180" r="14"/>
          <line x1="272" y1="180" x2="272" y2="100" stroke="#38bdf8" stroke-width="4"/>
          <circle cx="360" cy="150" r="14"/>
          <line x1="372" y1="150" x2="372" y2="80" stroke="#38bdf8" stroke-width="4"/>
          
          <circle cx="520" cy="120" r="14"/>
          <line x1="532" y1="120" x2="532" y2="60" stroke="#38bdf8" stroke-width="4"/>
          <circle cx="640" cy="150" r="14"/>
          <line x1="652" y1="150" x2="652" y2="80" stroke="#38bdf8" stroke-width="4"/>
          <circle cx="760" cy="180" r="14"/>
          <line x1="772" y1="180" x2="772" y2="100" stroke="#38bdf8" stroke-width="4"/>
        </g>

        <!-- Dual Staff 2: Bass (F Clef) -->
        <g stroke="#64748b" stroke-width="2">
          <line x1="60" y1="380" x2="1680" y2="380"/>
          <line x1="60" y1="410" x2="1680" y2="410"/>
          <line x1="60" y1="440" x2="1680" y2="440"/>
          <line x1="60" y1="470" x2="1680" y2="470"/>
          <line x1="50" y1="500" x2="1680" y2="500"/>
        </g>
        <text x="80" y="460" font-family="serif" font-size="75" fill="#fbbf24">𝄢</text>
        <text x="145" y="435" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#e2e8f0">4</text>
        <text x="145" y="495" font-family="system-ui, sans-serif" font-weight="900" font-size="34" fill="#e2e8f0">4</text>

        <!-- Musical Notes on Bass Staff -->
        <g fill="#fbbf24">
          <circle cx="240" cy="440" r="15"/>
          <line x1="254" y1="440" x2="254" y2="360" stroke="#fbbf24" stroke-width="4"/>
          <circle cx="480" cy="410" r="15"/>
          <line x1="494" y1="410" x2="494" y2="330" stroke="#fbbf24" stroke-width="4"/>
          <circle cx="720" cy="470" r="15"/>
          <line x1="734" y1="470" x2="734" y2="390" stroke="#fbbf24" stroke-width="4"/>
          <circle cx="980" cy="440" r="15"/>
          <line x1="994" y1="440" x2="994" y2="360" stroke="#fbbf24" stroke-width="4"/>
        </g>

        <!-- Real-Time Cursor Indicator -->
        <line x1="640" y1="60" x2="640" y2="560" stroke="#ec4899" stroke-width="3" stroke-dasharray="6 4"/>
        <polygon points="630,50 650,50 640,65" fill="#ec4899"/>
      </g>
    </g>
  </svg>
  `;
}

// 5. SCREENSHOT 3: JAM BAND MULTI-TRACK (1920 x 1080)
function getScreenshot3Svg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <linearGradient id="sc3Bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>

      <linearGradient id="scGold3" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="50%" stop-color="#06b6d4"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
    </defs>

    <rect width="1920" height="1080" fill="url(#sc3Bg)"/>

    <rect width="1920" height="160" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <text x="960" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" letter-spacing="3" fill="url(#scGold3)">
      LIVE MULTI-TRACK JAM BAND &amp; GROOVE ENGINE
    </text>
    <text x="960" y="120" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22" letter-spacing="1" fill="#94a3b8">
      Acoustic Drums • Funk Bass • Ambient Synth Pads • Interactive Multi-Instrument Jamming
    </text>

    <!-- App Frame -->
    <g transform="translate(60, 200)">
      <rect width="1800" height="820" rx="20" fill="#060913" stroke="#334155" stroke-width="3"/>

      <!-- Top Mixer Toolbar -->
      <rect width="1800" height="74" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#34d399">JAM SESSION: FUNK GROOVE 118 BPM</text>

      <g transform="translate(1420, 16)">
        <rect width="160" height="42" rx="8" fill="#ef4444"/>
        <circle cx="28" cy="21" r="7" fill="#ffffff"/>
        <text x="95" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#ffffff">REC SESSION</text>
      </g>
      <g transform="translate(1600, 16)">
        <rect width="160" height="42" rx="8" fill="#10b981"/>
        <text x="80" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#ffffff">MASTER: 0.0 dB</text>
      </g>

      <!-- 4 Channel Strips (Drums, Bass, Piano, Synth) -->
      <g transform="translate(40, 100)">
        <!-- Channel 1: DRUMS -->
        <g transform="translate(0, 0)">
          <rect width="400" height="680" rx="14" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
          <rect x="20" y="20" width="360" height="44" rx="8" fill="#1e293b"/>
          <text x="200" y="48" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#fbbf24">🥁 ACOUSTIC DRUMS</text>

          <!-- Drum Pads Grid -->
          <g transform="translate(30, 90)">
            <rect x="0" y="0" width="160" height="110" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
            <text x="80" y="60" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#fbbf24">KICK</text>

            <rect x="180" y="0" width="160" height="110" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
            <text x="260" y="60" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#38bdf8">SNARE</text>

            <rect x="0" y="130" width="160" height="110" rx="10" fill="#1e293b" stroke="#34d399" stroke-width="2"/>
            <text x="80" y="190" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#34d399">HI-HAT</text>

            <rect x="180" y="130" width="160" height="110" rx="10" fill="#1e293b" stroke="#c084fc" stroke-width="2"/>
            <text x="260" y="190" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#c084fc">CRASH</text>
          </g>

          <!-- Volume Fader -->
          <line x1="200" y1="410" x2="200" y2="610" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
          <rect x="175" y="470" width="50" height="24" rx="4" fill="#f59e0b"/>
          <text x="200" y="650" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#94a3b8">VOL: 85%</text>
        </g>

        <!-- Channel 2: BASS -->
        <g transform="translate(440, 0)">
          <rect width="400" height="680" rx="14" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
          <rect x="20" y="20" width="360" height="44" rx="8" fill="#1e293b"/>
          <text x="200" y="48" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#38bdf8">🎸 SLAP &amp; FRET BASS</text>

          <!-- Bass Wave Visualizer -->
          <g transform="translate(30, 90)">
            <rect width="340" height="240" rx="10" fill="#030712" stroke="#38bdf8" stroke-width="1.5"/>
            <path d="M 10 120 Q 80 40, 150 120 T 330 120" fill="none" stroke="#38bdf8" stroke-width="4"/>
            <path d="M 10 120 Q 80 190, 150 120 T 330 120" fill="none" stroke="#0284c7" stroke-width="2" opacity="0.6"/>
          </g>

          <line x1="200" y1="410" x2="200" y2="610" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
          <rect x="175" y="490" width="50" height="24" rx="4" fill="#38bdf8"/>
          <text x="200" y="650" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#94a3b8">VOL: 90%</text>
        </g>

        <!-- Channel 3: GRAND PIANO -->
        <g transform="translate(880, 0)">
          <rect width="400" height="680" rx="14" fill="#0b1120" stroke="#f59e0b" stroke-width="2"/>
          <rect x="20" y="20" width="360" height="44" rx="8" fill="#1e293b"/>
          <text x="200" y="48" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#fbbf24">🎹 CONCERT PIANO (LEAD)</text>

          <!-- Piano Mini Visualizer -->
          <g transform="translate(30, 90)">
            <rect width="340" height="240" rx="10" fill="#030712" stroke="#f59e0b" stroke-width="1.5"/>
            <g transform="translate(10, 20)">
              ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 26}" y="${60 + Math.sin(i * 0.8) * 40}" width="20" height="${100 - Math.sin(i * 0.8) * 40}" rx="4" fill="#f59e0b"/>`).join('\n')}
            </g>
          </g>

          <line x1="200" y1="410" x2="200" y2="610" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
          <rect x="175" y="440" width="50" height="24" rx="4" fill="#fbbf24"/>
          <text x="200" y="650" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#94a3b8">VOL: 95%</text>
        </g>

        <!-- Channel 4: SYNTH PADS -->
        <g transform="translate(1320, 0)">
          <rect width="400" height="680" rx="14" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
          <rect x="20" y="20" width="360" height="44" rx="8" fill="#1e293b"/>
          <text x="200" y="48" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#c084fc">✨ AMBIENT SYNTH PADS</text>

          <g transform="translate(30, 90)">
            <rect width="340" height="240" rx="10" fill="#030712" stroke="#c084fc" stroke-width="1.5"/>
            <circle cx="170" cy="120" r="70" fill="none" stroke="#c084fc" stroke-width="3" stroke-dasharray="8 6"/>
            <circle cx="170" cy="120" r="40" fill="#7e22ce" opacity="0.6"/>
          </g>

          <line x1="200" y1="410" x2="200" y2="610" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
          <rect x="175" y="520" width="50" height="24" rx="4" fill="#c084fc"/>
          <text x="200" y="650" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#94a3b8">VOL: 70%</text>
        </g>
      </g>
    </g>
  </svg>
  `;
}

// 6. SCREENSHOT 4: SCALE GYM & HANON DRILLS (1920 x 1080)
function getScreenshot4Svg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <linearGradient id="sc4Bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>

      <linearGradient id="scGold4" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#c084fc"/>
        <stop offset="50%" stop-color="#e879f9"/>
        <stop offset="100%" stop-color="#f43f5e"/>
      </linearGradient>
    </defs>

    <rect width="1920" height="1080" fill="url(#sc4Bg)"/>

    <rect width="1920" height="160" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <text x="960" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" letter-spacing="3" fill="url(#scGold4)">
      HANON EXERCISES &amp; SCALE GYM COACH
    </text>
    <text x="960" y="120" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22" letter-spacing="1" fill="#94a3b8">
      Master finger dexterity • Major, Minor, Pentatonic &amp; Blues scales • Visual fingering guide
    </text>

    <!-- App Frame -->
    <g transform="translate(60, 200)">
      <rect width="1800" height="820" rx="20" fill="#060913" stroke="#334155" stroke-width="3"/>

      <!-- Scale Header Bar -->
      <rect width="1800" height="74" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#c084fc">DRILL: C MAJOR ASCENDING &amp; DESCENDING</text>

      <g transform="translate(1380, 16)">
        <rect width="180" height="42" rx="8" fill="#1e293b" stroke="#10b981" stroke-width="1.5"/>
        <text x="90" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#34d399">ACCURACY: 98.4%</text>
      </g>
      <g transform="translate(1580, 16)">
        <rect width="180" height="42" rx="8" fill="#a855f7"/>
        <text x="90" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#ffffff">BPM: 120 (4/4)</text>
      </g>

      <!-- Scale & Fingering Visualizer -->
      <g transform="translate(40, 100)">
        <rect width="1720" height="340" rx="14" fill="#0a0f1d" stroke="#1e293b" stroke-width="2"/>

        <text x="50" y="50" font-family="system-ui, sans-serif" font-weight="700" font-size="20" fill="#f8fafc">RECOMMENDED FINGERING (RIGHT HAND: 1-2-3-1-2-3-4-5)</text>

        <!-- Fingering Bubbles (1 to 5) -->
        <g transform="translate(120, 110)">
          ${[
            { note: 'C4', finger: '1 (Thumb)', x: 0, active: true },
            { note: 'D4', finger: '2 (Index)', x: 180, active: true },
            { note: 'E4', finger: '3 (Middle)', x: 360, active: true },
            { note: 'F4', finger: '1 (Thumb)', x: 540, active: false },
            { note: 'G4', finger: '2 (Index)', x: 720, active: false },
            { note: 'A4', finger: '3 (Middle)', x: 900, active: false },
            { note: 'B4', finger: '4 (Ring)', x: 1080, active: false },
            { note: 'C5', finger: '5 (Pinky)', x: 1260, active: false }
          ].map(item => `
            <g transform="translate(${item.x}, 0)">
              <circle cx="60" cy="60" r="50" fill="${item.active ? '#a855f7' : '#1e293b'}" stroke="${item.active ? '#f43f5e' : '#475569'}" stroke-width="3"/>
              <text x="60" y="55" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="24" fill="#ffffff">${item.note}</text>
              <text x="60" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="13" fill="${item.active ? '#fdf4ff' : '#94a3b8'}">${item.finger}</text>
            </g>
          `).join('\n')}
        </g>

        <!-- Hanon Progress Stats -->
        <g transform="translate(60, 260)">
          <text x="0" y="30" font-family="system-ui, sans-serif" font-weight="600" font-size="16" fill="#94a3b8">TECHNIQUE DRILL #1: INDEPENDENCE OF THE 4TH &amp; 5TH FINGERS</text>
          <rect x="0" y="44" width="1600" height="12" rx="6" fill="#1e293b"/>
          <rect x="0" y="44" width="1120" height="12" rx="6" fill="url(#scGold4)"/>
        </g>
      </g>

      <!-- Keyboard Practice Bed -->
      <g transform="translate(40, 460)">
        <rect width="1720" height="330" rx="14" fill="#0b0f19" stroke="#334155" stroke-width="2"/>
        <!-- 21 White Keys -->
        ${Array.from({ length: 22 }, (_, i) => {
          const x = 8 + i * 77.5;
          const isTarget = [3, 4, 5].includes(i);
          return `
            <rect x="${x}" y="18" width="75" height="290" rx="6" fill="${isTarget ? '#fae8ff' : '#ffffff'}" stroke="${isTarget ? '#d946ef' : '#94a3b8'}" stroke-width="${isTarget ? 3 : 1}"/>
            ${isTarget ? `<rect x="${x + 2}" y="250" width="71" height="54" rx="4" fill="#d946ef" opacity="0.6"/>` : ''}
          `;
        }).join('\n')}
        <!-- Black Keys -->
        ${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18, 19].map((idx) => {
          const x = 8 + idx * 77.5 + 52;
          return `
            <rect x="${x}" y="18" width="48" height="180" rx="5" fill="#090d16" stroke="#334155" stroke-width="1.5"/>
          `;
        }).join('\n')}
      </g>
    </g>
  </svg>
  `;
}

// 7. SCREENSHOT 5: RECORDINGS & AUDIO STUDIO (1920 x 1080)
function getScreenshot5Svg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
    <defs>
      <linearGradient id="sc5Bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#020617"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>

      <linearGradient id="scGold5" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="50%" stop-color="#f43f5e"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>

    <rect width="1920" height="1080" fill="url(#sc5Bg)"/>

    <rect width="1920" height="160" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
    <text x="960" y="70" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" letter-spacing="3" fill="url(#scGold5)">
      STUDIO RECORDING, MIDI &amp; HIGH-RES AUDIO EXPORT
    </text>
    <text x="960" y="120" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="22" letter-spacing="1" fill="#94a3b8">
      Multi-session recordings library • Studio waveform visualizer • One-tap WAV &amp; Standard MIDI export
    </text>

    <!-- App Frame -->
    <g transform="translate(60, 200)">
      <rect width="1800" height="820" rx="20" fill="#060913" stroke="#334155" stroke-width="3"/>

      <!-- Recordings Top Bar -->
      <rect width="1800" height="74" rx="20" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#f59e0b">AUDIO &amp; MIDI LIBRARY</text>

      <g transform="translate(1560, 16)">
        <rect width="200" height="42" rx="8" fill="#f59e0b"/>
        <text x="100" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#0f172a">+ NEW RECORDING</text>
      </g>

      <!-- Main Layout: Left Track List, Right Waveform & Player -->
      <g transform="translate(40, 100)">
        <!-- Track List Container (Left) -->
        <rect width="680" height="680" rx="14" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
        <text x="30" y="45" font-family="system-ui, sans-serif" font-weight="700" font-size="18" fill="#f8fafc">RECENT SESSIONS (5)</text>

        <!-- Track 1 (Selected) -->
        <g transform="translate(20, 70)">
          <rect width="640" height="100" rx="10" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
          <text x="24" y="40" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#f8fafc">Moonlight Sonata 1st Movement</text>
          <text x="24" y="70" font-family="system-ui, sans-serif" font-weight="500" font-size="14" fill="#94a3b8">Duration: 05:42 • Grand Piano • 24-bit 48kHz WAV</text>
          <rect x="520" y="30" width="100" height="40" rx="6" fill="#f59e0b"/>
          <text x="570" y="55" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#0f172a">PLAYING</text>
        </g>

        <!-- Track 2 -->
        <g transform="translate(20, 190)">
          <rect width="640" height="100" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1"/>
          <text x="24" y="40" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#f8fafc">Funk Jam Groove in D Minor</text>
          <text x="24" y="70" font-family="system-ui, sans-serif" font-weight="500" font-size="14" fill="#94a3b8">Duration: 03:15 • Drums, Bass &amp; Piano • Multi-Track</text>
        </g>

        <!-- Track 3 -->
        <g transform="translate(20, 310)">
          <rect width="640" height="100" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1"/>
          <text x="24" y="40" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#f8fafc">Hanon Virtuoso Drill No. 6</text>
          <text x="24" y="70" font-family="system-ui, sans-serif" font-weight="500" font-size="14" fill="#94a3b8">Duration: 02:20 • Scale Gym • Standard MIDI</text>
        </g>

        <!-- Track 4 -->
        <g transform="translate(20, 430)">
          <rect width="640" height="100" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1"/>
          <text x="24" y="40" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#f8fafc">Original Score No. 3</text>
          <text x="24" y="70" font-family="system-ui, sans-serif" font-weight="500" font-size="14" fill="#94a3b8">Duration: 01:45 • Sheet Composer • MIDI &amp; WAV</text>
        </g>

        <!-- Waveform Studio Display (Right) -->
        <g transform="translate(720, 0)">
          <rect width="1000" height="680" rx="14" fill="#0b1120" stroke="#1e293b" stroke-width="2"/>
          <text x="40" y="45" font-family="system-ui, sans-serif" font-weight="700" font-size="18" fill="#f8fafc">MASTER STEREO WAVEFORM</text>

          <!-- Waveform Canvas -->
          <g transform="translate(40, 70)">
            <rect width="920" height="340" rx="12" fill="#030712" stroke="#334155" stroke-width="1.5"/>

            <!-- Soundwave bars -->
            <g transform="translate(20, 170)">
              ${Array.from({ length: 80 }, (_, i) => {
                const height = Math.max(12, Math.abs(Math.sin(i * 0.18) * 130 + Math.cos(i * 0.45) * 40));
                const color = i < 45 ? '#f59e0b' : '#334155';
                return `<line x1="${i * 11}" y1="${-height}" x2="${i * 11}" y2="${height}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
              }).join('\n')}
              <!-- Playhead Line -->
              <line x1="495" y1="-150" x2="495" y2="150" stroke="#ffffff" stroke-width="3"/>
            </g>
          </g>

          <!-- Player Controls & Export Buttons -->
          <g transform="translate(40, 450)">
            <!-- Time Indicator -->
            <text x="0" y="30" font-family="system-ui, sans-serif" font-weight="800" font-size="28" fill="#f8fafc">02:34 / 05:42</text>
            
            <!-- Export Options -->
            <g transform="translate(0, 70)">
              <!-- WAV Export -->
              <rect x="0" y="0" width="280" height="60" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
              <text x="140" y="36" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#38bdf8">⬇ EXPORT HIGH-RES WAV</text>

              <!-- MIDI Export -->
              <rect x="310" y="0" width="280" height="60" rx="10" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
              <text x="450" y="36" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#fbbf24">⬇ EXPORT MIDI (.MID)</text>

              <!-- Share -->
              <rect x="620" y="0" width="280" height="60" rx="10" fill="#0284c7"/>
              <text x="760" y="36" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="16" fill="#ffffff">🔗 SHARE AUDIO</text>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>
  `;
}

async function generateAll() {
  console.log('Generating Google Play Store Assets with Sharp...');

  const assets = [
    {
      name: 'google-play-icon-512x512.png',
      svg: getAppIconSvg(),
      width: 512,
      height: 512,
      desc: 'App Icon (512x512 PNG, 32-bit color, no rounded cutout)'
    },
    {
      name: 'google-play-feature-graphic-1024x500.png',
      svg: getFeatureGraphicSvg(),
      width: 1024,
      height: 500,
      desc: 'Feature Graphic / Banner Promozionale (1024x500 PNG)'
    },
    {
      name: 'screenshot-1-piano-waterfall.png',
      svg: getScreenshot1Svg(),
      width: 1920,
      height: 1080,
      desc: 'Screenshot 1: 88-Key Grand Piano & Falling Waterfall (1920x1080)'
    },
    {
      name: 'screenshot-2-sheet-composer.png',
      svg: getScreenshot2Svg(),
      width: 1920,
      height: 1080,
      desc: 'Screenshot 2: Sheet Music Composer (1920x1080)'
    },
    {
      name: 'screenshot-3-jam-band.png',
      svg: getScreenshot3Svg(),
      width: 1920,
      height: 1080,
      desc: 'Screenshot 3: Multi-Track Jam Band (1920x1080)'
    },
    {
      name: 'screenshot-4-scale-gym.png',
      svg: getScreenshot4Svg(),
      width: 1920,
      height: 1080,
      desc: 'Screenshot 4: Hanon Drills & Scale Gym (1920x1080)'
    },
    {
      name: 'screenshot-5-recordings-studio.png',
      svg: getScreenshot5Svg(),
      width: 1920,
      height: 1080,
      desc: 'Screenshot 5: Studio Audio & MIDI Recorder (1920x1080)'
    }
  ];

  for (const item of assets) {
    const filePath = path.join(outputDir, item.name);
    const svgBuffer = Buffer.from(item.svg);
    await sharp(svgBuffer)
      .resize(item.width, item.height)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(filePath);
    
    const stats = fs.statSync(filePath);
    console.log(`✓ Generated ${item.name} (${item.width}x${item.height}, ${(stats.size / 1024).toFixed(1)} KB)`);
  }

  // Also create a convenient ZIP file containing all Google Play assets
  console.log('Archiving into google-play-assets.zip...');
  const zipPath = path.join(outputDir, 'google-play-assets.zip');
  
  try {
    const { ZipArchive } = require('archiver');
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      for (const item of assets) {
        const filePath = path.join(outputDir, item.name);
        archive.file(filePath, { name: item.name });
      }

      const readmeContent = `VIRTUKEYS - GOOGLE PLAY STORE ASSET PACKAGE
===================================================

This package contains all official graphics required by Google Play Console:

1. google-play-icon-512x512.png
   - Resolution: 512 x 512 px
   - Type: 32-bit PNG with alpha
   - Usage: App Icon in Google Play Store listing

2. google-play-feature-graphic-1024x500.png
   - Resolution: 1024 x 500 px
   - Type: 24-bit PNG
   - Usage: Feature Graphic banner at top of Google Play listing

3. SCREENSHOTS (1920 x 1080 Landscape, 16:9):
   - screenshot-1-piano-waterfall.png (88-Key Grand Piano & Falling Notes Cascade)
   - screenshot-2-sheet-composer.png (Dual-Staff Sheet Music Composer & Notation)
   - screenshot-3-jam-band.png (Live Multi-Track Jam Band & Acoustic Drums)
   - screenshot-4-scale-gym.png (Hanon Finger Drills & Scale Technique Gym)
   - screenshot-5-recordings-studio.png (Master Stereo Waveform & MIDI/WAV Export)
`;
      archive.append(readmeContent, { name: 'README.txt' });
      archive.finalize();
    });
    const zipStats = fs.statSync(zipPath);
    console.log(`✓ Zip package created: google-play-assets.zip (${(zipStats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.warn('Archiving failed:', err);
  }
  console.log('All Google Play assets created successfully!');
  console.log('All Google Play assets created successfully!');
}

generateAll().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
