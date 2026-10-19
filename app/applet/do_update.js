const fs = require('fs');
let code = fs.readFileSync('src/components/PianoView.tsx', 'utf8');

const target = `else if (msgType === 'piano:key_event' && (payload.note || msg.note)) {
          const note = payload.note || msg.note;
          audioEngine.playNote(note, '8n', instrument);
          setKeyVisual(note, true);
          setTimeout(() => setKeyVisual(note, false), 220);
        }`;

const replacement = `else if (msgType === 'piano:key_event' && (payload.note || msg.note)) {
          // In Masterclass mode, student hears notes ONLY when teacher explicitly sends a phrase via 'Invia Note'
          if (socialSession?.mode === 'masterclass') {
            const note = payload.note || msg.note;
            setKeyVisual(note, true);
            setTimeout(() => setKeyVisual(note, false), 220);
          } else {
            const note = payload.note || msg.note;
            audioEngine.playNote(note, '8n', instrument);
            setKeyVisual(note, true);
            setTimeout(() => setKeyVisual(note, false), 220);
          }
        }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/PianoView.tsx', code, 'utf8');
  console.log('PianoView.tsx updated successfully');
} else {
  code = code.replace(
    /else if \(msgType === 'piano:key_event' && \(payload\.note \|\| msg\.note\)\) \{[\s\S]*?setTimeout\(\(\) => setKeyVisual\(note, false\), 220\);\s*\}/,
    replacement
  );
  fs.writeFileSync('src/components/PianoView.tsx', code, 'utf8');
  console.log('PianoView.tsx updated via regex');
}
