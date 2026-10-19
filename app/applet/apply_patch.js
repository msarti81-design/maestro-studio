const fs = require('fs');
let code = fs.readFileSync('src/components/PianoView.tsx', 'utf8');

const target = `          else if (msg.type === 'piano:key_event' && msg.note) {
            audioEngine.playNote(msg.note, '8n', instrument);
            setKeyVisual(msg.note, true);
            setTimeout(() => setKeyVisual(msg.note, false), 220);
          }`;

const replacement = `          else if (msg.type === 'piano:key_event' && msg.note) {
            // In Masterclass mode, student hears notes ONLY when teacher explicitly sends phrase via 'Invia Note'
            if (socialSession?.mode === 'masterclass') {
              setKeyVisual(msg.note, true);
              setTimeout(() => setKeyVisual(msg.note, false), 220);
            } else {
              audioEngine.playNote(msg.note, '8n', instrument);
              setKeyVisual(msg.note, true);
              setTimeout(() => setKeyVisual(msg.note, false), 220);
            }
          }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/PianoView.tsx', code, 'utf8');
  console.log('Successfully patched PianoView.tsx');
} else {
  // Regex replacement
  code = code.replace(
    /else if \(msg\.type === 'piano:key_event' && msg\.note\) \{[\s\S]*?setTimeout\(\(\) => setKeyVisual\(msg\.note, false\), 220\);\s*\}/,
    replacement.trim()
  );
  fs.writeFileSync('src/components/PianoView.tsx', code, 'utf8');
  console.log('Patched PianoView.tsx via regex');
}
