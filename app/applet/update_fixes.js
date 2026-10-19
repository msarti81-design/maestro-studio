const fs = require('fs');

// 1. Update audioEngine.ts
let audioEngineCode = fs.readFileSync('src/utils/audioEngine.ts', 'utf8');
audioEngineCode = audioEngineCode.replace(
  'this.masterGain = new Tone.Gain(1.35);',
  'this.masterGain = new Tone.Gain(1.85);'
);
fs.writeFileSync('src/utils/audioEngine.ts', audioEngineCode, 'utf8');
console.log('audioEngine.ts updated successfully.');

// 2. Update PianoView.tsx for Masterclass teacher notes isolation & WebRTC voice connection resilience
let pianoViewCode = fs.readFileSync('src/components/PianoView.tsx', 'utf8');

const oldKeyEventHandling = `else if (msgType === 'piano:key_event' && (payload.note || msg.note)) {
          const note = payload.note || msg.note;
          audioEngine.playNote(note, '8n', instrument);
          setKeyVisual(note, true);
          setTimeout(() => setKeyVisual(note, false), 220);
        }`;

const newKeyEventHandling = `else if (msgType === 'piano:key_event' && (payload.note || msg.note)) {
          // In Masterclass mode, student hears notes ONLY when teacher explicitly sends/assigns a phrase via "Invia Note"
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

if (pianoViewCode.includes(oldKeyEventHandling)) {
  pianoViewCode = pianoViewCode.replace(oldKeyEventHandling, newKeyEventHandling);
} else {
  pianoViewCode = pianoViewCode.replace(
    /else if \(msgType === 'piano:key_event'[\s\S]*?setTimeout\(\(\) => setKeyVisual\(note, false\), 220\);\s*\}/,
    `else if (msgType === 'piano:key_event' && (payload.note || msg.note)) {
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
        }`
  );
}

// Add ICE connection state monitoring / restartIce for WebRTC resilience
const webrtcOfferTarget = `pc.onicecandidate = (evt) => {
                if (evt.candidate) {
                  sendRoomEvent('webrtc:candidate', { candidate: evt.candidate });
                }
              };`;

const webrtcOfferReplacement = `pc.onicecandidate = (evt) => {
                if (evt.candidate) {
                  sendRoomEvent('webrtc:candidate', { candidate: evt.candidate });
                }
              };
              pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                  try { pc.restartIce(); } catch (e) {}
                }
              };`;

pianoViewCode = pianoViewCode.replace(webrtcOfferTarget, webrtcOfferReplacement);

fs.writeFileSync('src/components/PianoView.tsx', pianoViewCode, 'utf8');
console.log('PianoView.tsx updated successfully.');
