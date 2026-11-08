const fs = require('fs');

function buildMelody(bpm, phrases) {
  const secPerBeat = 60 / bpm;
  let currentTime = 0;
  const notes = [];

  for (const item of phrases) {
    if (Array.isArray(item)) {
      const noteName = item[0];
      const beats = item[1];
      const durSec = Math.round(beats * secPerBeat * 100) / 100;
      
      if (noteName !== 'REST' && noteName !== 'R') {
        notes.push({
          note: noteName,
          time: Math.round(currentTime * 100) / 100,
          duration: Math.max(0.12, Math.round((durSec * 0.92) * 100) / 100)
        });
      }
      currentTime += durSec;
    }
  }

  return notes;
}

function transposePhrases(phrases, semitones) {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return phrases.map(p => {
    const note = p[0];
    const beats = p[1];
    if (note === 'REST' || note === 'R') return [note, beats];
    
    let name = note.slice(0, -1);
    let oct = parseInt(note.slice(-1), 10);
    
    if (name === "Db") name = "C#";
    if (name === "Eb") name = "D#";
    if (name === "Gb") name = "F#";
    if (name === "Ab") name = "G#";
    if (name === "Bb") name = "A#";
    
    let idx = noteNames.indexOf(name);
    if (idx === -1) return [note, beats];
    
    let total = oct * 12 + idx + semitones;
    let newOct = Math.floor(total / 12);
    let newIdx = total % 12;
    if (newIdx < 0) { newIdx += 12; newOct -= 1; }
    
    return [noteNames[newIdx] + newOct, beats];
  });
}

const SONGS_BUILDER = [];
const SONG_DEFINITIONS = [
  // 1-10 BEETHOVEN
  { id: "inno-alla-gioia", title: "Inno alla Gioia (Ode to Joy - Completo)", author: "L. van Beethoven", bpm: 112, difficulty: "facile", base: [["E4",1],["E4",1],["F4",1],["G4",1],["G4",1],["F4",1],["E4",1],["D4",1],["C4",1],["C4",1],["D4",1],["E4",1],["E4",1.5],["D4",0.5],["D4",2]], mid: [["D4",1],["D4",1],["E4",1],["C4",1],["D4",1],["E4",0.5],["F4",0.5],["E4",1],["C4",1],["D4",1],["E4",0.5],["F4",0.5],["E4",1],["D4",1],["C4",1],["D4",1],["G3",2]] },
  { id: "per-elisa", title: "Per Elisa (Für Elise - Completo)", author: "L. van Beethoven", bpm: 130, difficulty: "medio", base: [["E5",0.5],["D#5",0.5],["E5",0.5],["D#5",0.5],["E5",0.5],["B4",0.5],["D5",0.5],["C5",0.5],["A4",1],["R",0.5],["C4",0.5],["E4",0.5],["A4",0.5],["B4",1],["R",0.5],["E4",0.5],["G#4",0.5],["B4",0.5],["C5",1]], mid: [["C5",0.5],["D5",0.5],["E5",1],["G4",0.5],["F5",0.5],["E5",0.5],["D5",1],["F4",0.5],["E5",0.5],["D5",0.5],["C5",1]] },
  { id: "chiaro-di-luna", title: "Sonata al Chiaro di Luna (Moonlight Sonata Op. 27)", author: "L. van Beethoven", bpm: 54, difficulty: "difficile", base: [["G#3",0.33],["C#4",0.33],["E4",0.33],["G#3",0.33],["C#4",0.33],["E4",0.33],["G#4",1.5],["G#4",0.33],["G#4",0.33],["G#4",0.33],["G#4",1.5],["G#4",0.33],["A4",0.33],["G#4",0.33],["F#4",1],["E4",0.5],["D#4",1],["C#4",1]], mid: [["C#4",1],["E4",1],["G#4",1],["C#5",1],["B4",1],["A4",1],["G#4",2]] },
  { id: "sinfonia-5", title: "Sinfonia No. 5 (Destino)", author: "L. van Beethoven", bpm: 108, difficulty: "medio", base: [["G4",0.25],["G4",0.25],["G4",0.25],["Eb4",1.5],["R",0.5],["F4",0.25],["F4",0.25],["F4",0.25],["D4",2],["R",0.5]], mid: [["G4",0.25],["G4",0.25],["G4",0.25],["Eb4",0.5],["Ab4",0.25],["Ab4",0.25],["Ab4",0.25],["F4",0.5],["Bb4",0.25],["Bb4",0.25],["Bb4",0.25],["G4",0.5]] },
  { id: "minuetto-sol-beethoven", title: "Minuetto in Sol Maggiore (WoO 10 No. 2)", author: "L. van Beethoven", bpm: 116, difficulty: "facile", base: [["D5",1],["G4",0.5],["A4",0.5],["B4",0.5],["C5",0.5],["D5",1],["G4",1],["G4",1],["E5",1],["C5",0.5],["D5",0.5],["E5",0.5],["F#5",0.5],["G5",1],["G4",1],["G4",1]], mid: [["C5",1],["D5",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["B4",1],["C5",0.5],["B4",0.5],["A4",0.5],["G4",0.5],["A4",1],["D4",1],["F#4",1],["G4",2]] },
  { id: "ecossaise-eb", title: "Ecossaise in Mi Bemolle Maggiore", author: "L. van Beethoven", bpm: 130, difficulty: "facile", base: [["Eb4",1],["G4",1],["Bb4",1],["Eb5",1],["D5",0.5],["C5",0.5],["Bb4",1],["Ab4",1],["G4",2]] },
  { id: "sonatina-sol", title: "Sonatina in Sol Maggiore (WoO 51)", author: "L. van Beethoven", bpm: 112, difficulty: "facile", base: [["G4",1],["B4",1],["D5",1.5],["C5",0.5],["B4",1],["A4",1],["G4",2],["A4",1],["D4",2]] },
  { id: "inno-alla-notte", title: "Inno alla Notte (Hymn to the Night)", author: "L. van Beethoven", bpm: 76, difficulty: "facile", base: [["C4",1.5],["E4",0.5],["G4",2],["A4",1.5],["G4",0.5],["E4",2],["F4",1],["D4",1],["C4",2]] },
  { id: "romanza-fa", title: "Romanza No. 2 in Fa Maggiore Op. 50", author: "L. van Beethoven", bpm: 68, difficulty: "medio", base: [["F4",2],["A4",1],["C5",1],["F5",1.5],["E5",0.5],["D5",1],["C5",2],["Bb4",1],["A4",1],["G4",2]] },
  { id: "sinfonia-7-allegretto", title: "Sinfonia No. 7 - Allegretto", author: "L. van Beethoven", bpm: 84, difficulty: "medio", base: [["E4",1],["E4",0.5],["E4",0.5],["E4",1],["E4",1],["B3",1],["B3",0.5],["B3",0.5],["B3",1],["B3",1],["C4",1],["C4",0.5],["C4",0.5],["C4",1],["B3",1],["A3",2]] },

  // 11-20 MOZART
  { id: "stella-stellina", title: "Twinkle Twinkle Little Star (Ah! vous dirai-je, Maman)", author: "W. A. Mozart", bpm: 100, difficulty: "facile", base: [["C4",1],["C4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],["F4",1],["F4",1],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2]], mid: [["G4",1],["G4",1],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2]] },
  { id: "marcia-turca", title: "Marcia Turca (Rondo Alla Turca K. 331)", author: "W. A. Mozart", bpm: 128, difficulty: "difficile", base: [["B4",0.5],["A4",0.5],["G#4",0.5],["A4",0.5],["C5",1],["R",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["G#4",0.5],["A4",0.5],["E5",1],["R",0.5],["E5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["C5",0.5],["D5",1],["C5",0.5],["B4",0.5],["A4",0.5],["G#4",0.5],["A4",0.5],["B4",1.5]], mid: [["F#5",0.5],["D5",0.5],["E5",0.5],["F#5",0.5],["G5",1],["A5",1],["F#5",0.5],["D5",0.5],["E5",0.5],["F#5",0.5],["D5",1],["A4",1]] },
  { id: "piccola-musica-notturna", title: "Eine kleine Nachtmusik (K. 525)", author: "W. A. Mozart", bpm: 132, difficulty: "medio", base: [["G4",1],["R",0.5],["D4",0.5],["G4",1],["R",0.5],["D4",0.5],["G4",0.5],["D4",0.5],["G4",0.5],["B4",0.5],["D5",2],["C5",1],["R",0.5],["A4",0.5],["C5",1],["R",0.5],["A4",0.5],["C5",0.5],["A4",0.5],["F#4",0.5],["A4",0.5],["D4",2]], mid: [["B4",1],["B4",0.5],["C5",0.5],["D5",1],["D5",1],["E5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["A4",2]] },
  { id: "sinfonia-40", title: "Sinfonia No. 40 in Sol Minore K. 550", author: "W. A. Mozart", bpm: 140, difficulty: "medio", base: [["Eb5",0.5],["D5",0.5],["D5",1],["Eb5",0.5],["D5",0.5],["D5",1],["Eb5",0.5],["D5",0.5],["Bb4",1.5],["R",0.5],["Eb5",0.5],["D5",0.5],["D5",1],["Eb5",0.5],["D5",0.5],["D5",1],["Eb5",0.5],["D5",0.5],["G4",1.5]], mid: [["G5",1],["F5",0.5],["Eb5",0.5],["D5",1],["C5",1],["Bb4",1],["A4",1],["G4",2]] },
  { id: "ninna-nanna-mozart", title: "Ninna Nanna (Wiegenlied K. 350)", author: "W. A. Mozart", bpm: 80, difficulty: "facile", base: [["C4",1],["E4",1],["G4",1.5],["E4",0.5],["C4",1],["D4",1],["E4",2],["F4",1],["A4",1],["G4",1.5],["E4",0.5],["D4",1],["D4",1],["C4",2]], mid: [["G4",1],["G4",1],["F4",1.5],["D4",0.5],["E4",1],["E4",1],["D4",2]] },
  { id: "sonata-facile-k545", title: "Sonata in Do Maggiore (Sonata Facile K. 545)", author: "W. A. Mozart", bpm: 120, difficulty: "medio", base: [["C5",2],["E5",1],["G5",1],["B4",1.5],["C5",0.5],["D5",1],["C5",1],["A4",1],["C5",1],["G4",2],["F4",1],["A4",1],["D4",2]], mid: [["D5",0.5],["E5",0.5],["F5",0.5],["G5",0.5],["A5",1],["G5",1],["F5",1],["E5",1],["D5",2]] },
  { id: "minuetto-k2", title: "Minuetto K. 2 in Fa Maggiore", author: "W. A. Mozart", bpm: 104, difficulty: "facile", base: [["F4",1],["A4",1],["C5",1],["F5",2],["E5",1],["D5",1],["C5",1],["Bb4",1],["A4",2]] },
  { id: "ave-verum", title: "Ave Verum Corpus K. 618", author: "W. A. Mozart", bpm: 72, difficulty: "facile", base: [["D4",2],["F#4",2],["A4",2],["D5",2],["C#5",2],["B4",2],["A4",2],["G4",2],["F#4",2]] },
  { id: "papageno-aria", title: "Papageno Aria (Il Flauto Magico K. 620)", author: "W. A. Mozart", bpm: 120, difficulty: "facile", base: [["G4",1],["B4",1],["D5",1],["G5",2],["F#5",1],["E5",1],["D5",1],["C5",1],["B4",2]] },
  { id: "lacrimosa-requiem", title: "Lacrimosa (Requiem in Re Minore K. 626)", author: "W. A. Mozart", bpm: 60, difficulty: "medio", base: [["D4",1.5],["E4",0.5],["F4",1],["G4",1],["A4",2],["Bb4",2],["A4",1],["G4",1],["F4",2]] },

  // 21-23 VIVALDI
  { id: "primavera-vivaldi", title: "La Primavera (Le Quattro Stagioni)", author: "A. Vivaldi", bpm: 116, difficulty: "facile", base: [["E5",1],["G#5",0.5],["F#5",0.5],["E5",1],["B4",1],["C#5",0.5],["D#5",0.5],["E5",1],["B4",1],["C#5",0.5],["D#5",0.5],["E5",2]], mid: [["B5",1],["A5",0.5],["G#5",0.5],["F#5",1],["E5",1],["D#5",0.5],["C#5",0.5],["B4",2]] },
  { id: "inverno-largo-vivaldi", title: "L'Inverno - Largo (Le Quattro Stagioni)", author: "A. Vivaldi", bpm: 64, difficulty: "facile", base: [["Eb5",1.5],["D5",0.5],["C5",1],["Bb4",1],["Ab4",1.5],["G4",0.5],["F4",2]] },
  { id: "estate-presto-vivaldi", title: "L'Estate - Presto (Temporale)", author: "A. Vivaldi", bpm: 150, difficulty: "difficile", base: [["G4",0.25],["G4",0.25],["G4",0.25],["G4",0.25],["Bb4",0.5],["G4",0.5],["D5",0.5],["Bb4",0.5],["G5",1],["F5",1],["Eb5",1],["D5",1]] },

  // 24-30 VERDI / PUCCINI / ROSSINI
  { id: "va-pensiero", title: "Va, Pensiero (Nabucco)", author: "G. Verdi", bpm: 72, difficulty: "medio", base: [["F4",1.5],["G4",0.5],["A4",1],["F4",1],["Bb4",1.5],["A4",0.5],["G4",2],["C5",1.5],["Bb4",0.5],["A4",1],["G4",1],["F4",2]], mid: [["A4",1],["A4",1],["Bb4",1],["C5",1],["D5",1.5],["C5",0.5],["Bb4",1],["A4",1],["G4",2]] },
  { id: "la-donna-e-mobile", title: "La Donna è Mobile (Rigoletto)", author: "G. Verdi", bpm: 120, difficulty: "facile", base: [["B4",0.75],["B4",0.25],["B4",0.5],["G#4",0.5],["E4",1],["R",0.5],["B4",0.75],["B4",0.25],["B4",0.5],["G#4",0.5],["E4",1],["R",0.5],["C#5",0.75],["C#5",0.25],["C#5",0.5],["B4",0.5],["A4",1],["G#4",1],["F#4",1],["E4",2]], mid: [["F#4",1],["F#4",0.5],["G#4",0.5],["A4",1],["A4",1],["G#4",1],["G#4",0.5],["A4",0.5],["B4",2]] },
  { id: "libiamo-ne-lieti-calici", title: "Libiamo ne' lieti calici (Brindisi La Traviata)", author: "G. Verdi", bpm: 132, difficulty: "medio", base: [["Bb4",1],["F4",0.5],["D4",0.5],["Bb3",1],["F4",1],["Bb4",1],["F4",0.5],["D4",0.5],["Bb3",1],["C4",1],["D4",1],["Eb4",1],["F4",1],["G4",1],["F4",2]], mid: [["F5",1],["D5",0.5],["Bb4",0.5],["F4",1],["D5",1],["C5",1],["Bb4",1],["A4",1],["G4",1],["F4",2]] },
  { id: "nessun-dorma", title: "Nessun Dorma (Turandot)", author: "G. Puccini", bpm: 66, difficulty: "difficile", base: [["D4",1],["E4",1],["F#4",1.5],["E4",0.5],["F#4",1],["A4",2],["G4",1],["F#4",1],["E4",2],["D4",2]], mid: [["A4",1.5],["B4",0.5],["C#5",2],["D5",2],["C#5",1],["B4",1],["A4",3],["D5",4]] },
  { id: "o-mio-babbino-caro", title: "O Mio Babbino Caro (Gianni Schicchi)", author: "G. Puccini", bpm: 70, difficulty: "medio", base: [["Ab4",1.5],["G4",0.5],["F4",1],["Eb4",1],["C4",2],["Eb4",2],["Ab4",1.5],["Bb4",0.5],["C5",2],["Bb4",2]], mid: [["Db5",1.5],["C5",0.5],["Bb4",1],["Ab4",1],["F4",2],["Eb4",2],["Ab4",4]] },
  { id: "guglielmo-tell-ouverture", title: "Guglielmo Tell - Ouverture (Marcia Finale)", author: "G. Rossini", bpm: 150, difficulty: "medio", base: [["G4",0.5],["G4",0.5],["G4",0.5],["C5",1],["G4",0.5],["G4",0.5],["G4",0.5],["E5",1],["C5",0.5],["C5",0.5],["C5",0.5],["G5",1],["E5",1],["C5",1],["G4",1]], mid: [["D5",0.5],["E5",0.5],["F5",0.5],["G5",0.5],["A5",1],["G5",1],["F5",1],["E5",1],["D5",1],["C5",2]] },
  { id: "largo-al-factotum", title: "Largo al Factotum (Il Barbiere di Siviglia)", author: "G. Rossini", bpm: 144, difficulty: "difficile", base: [["C5",0.5],["G4",0.5],["E4",0.5],["C4",1],["C5",0.5],["G4",0.5],["E4",0.5],["C4",1],["D4",1],["E4",1],["F4",1],["G4",2]] },

  // 31-40 PACHELBEL, SCHUBERT, BRAHMS, DEBUSSY, SATIE
  { id: "canon-in-d", title: "Canone in Re Maggiore", author: "J. Pachelbel", bpm: 84, difficulty: "facile", base: [["F#5",1],["E5",1],["D5",1],["C#5",1],["B4",1],["A4",1],["B4",1],["C#5",1]], mid: [["D5",0.5],["C#5",0.5],["B4",0.5],["A4",0.5],["G4",0.5],["F#4",0.5],["G4",0.5],["E4",0.5],["F#4",0.5],["A4",0.5],["D5",0.5],["F#5",0.5],["A5",0.5],["A4",0.5],["B4",0.5],["C#5",0.5]] },
  { id: "ave-maria-schubert", title: "Ave Maria (Ellens Gesang III)", author: "F. Schubert", bpm: 60, difficulty: "medio", base: [["C4",1],["C4",0.5],["E4",0.5],["G4",1.5],["A4",0.5],["G4",1],["E4",1],["C4",2]], mid: [["C5",1.5],["B4",0.5],["A4",1],["G4",1],["F4",1],["E4",1],["D4",2],["C4",2]] },
  { id: "serenata-schubert", title: "Serenata (Ständchen D. 957)", author: "F. Schubert", bpm: 76, difficulty: "medio", base: [["A4",1],["F4",1],["D4",2],["R",1],["A4",1],["F4",1],["D4",2],["R",1],["A4",1],["Bb4",1],["A4",1],["G4",1],["F4",1],["E4",1],["D4",2]], mid: [["F4",1],["G4",1],["A4",1.5],["Bb4",0.5],["C5",2],["Bb4",1],["A4",1],["G4",2]] },
  { id: "la-trota-schubert", title: "La Trota (Die Forelle D. 550)", author: "F. Schubert", bpm: 108, difficulty: "facile", base: [["D4",1],["F#4",1],["A4",1.5],["B4",0.5],["A4",1],["F#4",1],["D4",2]] },
  { id: "ninna-nanna-brahms", title: "Ninna Nanna (Wiegenlied Op. 49 No. 4)", author: "J. Brahms", bpm: 82, difficulty: "facile", base: [["E4",0.5],["E4",0.5],["G4",1.5],["E4",0.5],["E4",0.5],["G4",2],["E4",0.5],["G4",0.5],["C5",1.5],["B4",0.5],["A4",1],["A4",0.5],["G4",2]], mid: [["D4",0.5],["E4",0.5],["F4",1],["D4",1],["E4",0.5],["F4",0.5],["G4",2]] },
  { id: "danza-ungherese-5", title: "Danza Ungherese No. 5", author: "J. Brahms", bpm: 124, difficulty: "difficile", base: [["F#4",0.5],["B4",1],["C#5",0.5],["D5",0.5],["B4",0.5],["A#4",0.5],["B4",1],["G4",1],["E4",2]], mid: [["G4",0.5],["C5",1],["D5",0.5],["E5",0.5],["C5",0.5],["B4",0.5],["C5",1],["A4",1],["F#4",2]] },
  { id: "chiaro-di-luna-debussy", title: "Chiaro di Luna (Clair de Lune)", author: "C. Debussy", bpm: 52, difficulty: "difficile", base: [["F5",1.5],["Eb5",0.5],["Db5",1],["C5",1],["Bb4",1.5],["Ab4",0.5],["F4",2],["Eb4",2]], mid: [["Ab4",1],["C5",1],["Eb5",1.5],["F5",0.5],["Gb5",2],["F5",1],["Eb5",1],["Db5",3]] },
  { id: "ragazza-capelli-lino", title: "La Fille aux Cheveux de Lin", author: "C. Debussy", bpm: 60, difficulty: "medio", base: [["Gb4",1.5],["E4",0.5],["Db4",1],["Bb3",2],["Db4",1],["Eb4",2]] },
  { id: "gymnopedie-1", title: "Gymnopédie No. 1", author: "E. Satie", bpm: 66, difficulty: "facile", base: [["F#4",2],["A4",2],["G4",2],["F#4",2],["C#4",2],["B3",2],["C#4",2],["D4",4]], mid: [["E4",2],["F#4",2],["G4",2],["A4",2],["B4",2],["C5",2],["B4",4]] },
  { id: "gnossienne-1", title: "Gnossienne No. 1", author: "E. Satie", bpm: 60, difficulty: "medio", base: [["A4",2],["G#4",1],["B4",1],["A4",2],["F4",2],["E4",4]] },

  // 41-50 ITALIAN POPULAR / FOLK
  { id: "bella-ciao", title: "Bella Ciao", author: "Canto Popolare Italiano", bpm: 130, difficulty: "facile", base: [["E4",0.5],["A4",0.5],["B4",0.5],["C5",1],["A4",1],["R",0.5],["E4",0.5],["A4",0.5],["B4",0.5],["C5",1],["A4",1],["R",0.5],["E4",0.5],["A4",0.5],["B4",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["C5",0.5],["E5",2],["E5",0.5],["E5",0.5],["E5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["C5",1],["E5",1]], mid: [["E5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["A4",2],["B4",1],["C5",1],["B4",1],["G#4",1],["A4",2]] },
  { id: "o-sole-mio", title: "O Sole Mio", author: "Eduardo di Capua (1898)", bpm: 90, difficulty: "facile", base: [["E4",1],["E4",0.5],["D4",0.5],["C4",1],["B3",1],["C4",1.5],["D4",0.5],["E4",2],["D4",1],["D4",0.5],["C4",0.5],["B3",1],["A3",1],["B3",2],["C4",2]], mid: [["G4",2],["F4",1],["E4",1],["D4",1.5],["E4",0.5],["F4",2],["A4",2],["G4",1],["F4",1],["E4",2],["D4",2],["C4",3]] },
  { id: "funiculi-funicula", title: "Funiculì Funiculà", author: "Luigi Denza (1880)", bpm: 136, difficulty: "medio", base: [["G4",0.5],["G4",0.5],["G4",0.5],["E4",1],["R",0.5],["G4",0.5],["G4",0.5],["G4",0.5],["E4",1],["R",0.5],["G4",0.5],["A4",0.5],["G4",0.5],["F4",0.5],["E4",0.5],["D4",0.5],["C4",2]], mid: [["C5",1],["C5",0.5],["B4",0.5],["A4",0.5],["G4",0.5],["C5",2],["D5",1],["D5",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["G4",2]] },
  { id: "santa-lucia", title: "Santa Lucia", author: "Tradizionale Napoletana", bpm: 104, difficulty: "facile", base: [["G4",1],["G4",1],["C5",2],["B4",1],["A4",1],["A4",2],["F4",1],["A4",1],["D5",2],["C5",1],["B4",1],["G4",2]], mid: [["E5",1],["D5",1],["C5",1.5],["B4",0.5],["A4",1],["F4",1],["D5",1],["C5",1],["B4",1.5],["A4",0.5],["G4",2]] },
  { id: "torna-a-surriento", title: "Torna a Surriento", author: "Ernesto De Curtis (1902)", bpm: 92, difficulty: "medio", base: [["E4",1],["F4",1],["G4",1.5],["E4",0.5],["F4",1],["G4",1],["A4",2],["G4",1],["F4",1],["E4",1.5],["D4",0.5],["C4",2]], mid: [["C5",1.5],["B4",0.5],["A4",1],["G4",1],["A4",1],["B4",1],["C5",2],["B4",1],["A4",1],["G4",2]] },
  { id: "tarantella-napoletana", title: "Tarantella Napoletana", author: "Tradizionale Italiano", bpm: 144, difficulty: "facile", base: [["A4",0.5],["B4",0.5],["C5",0.5],["A4",0.5],["B4",0.5],["C5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["G#4",0.5],["A4",0.5],["B4",1]], mid: [["E5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["G#4",0.5],["A4",1],["B4",1],["C5",1],["A4",1]] },
  { id: "carnevale-di-venezia", title: "Carnevale di Venezia", author: "Julius Benedict", bpm: 110, difficulty: "facile", base: [["C4",1],["E4",1],["G4",1],["C5",2],["B4",1],["A4",1],["G4",1],["F4",1],["E4",2]] },
  { id: "mattinata-leoncavallo", title: "Mattinata", author: "R. Leoncavallo (1904)", bpm: 88, difficulty: "medio", base: [["D4",1],["F#4",1],["A4",1.5],["B4",0.5],["A4",1],["F#4",1],["D4",2]] },
  { id: "ciribiribin", title: "Ciribiribin", author: "A. Pestalozza (1898)", bpm: 140, difficulty: "facile", base: [["C5",1],["G4",1],["E4",1],["C4",2],["D4",1],["F4",1],["A4",1],["G4",2]] },
  { id: "fra-martino", title: "Fra Martino Campanaro (Frère Jacques)", author: "Tradizionale", bpm: 112, difficulty: "facile", base: [["C4",1],["D4",1],["E4",1],["C4",1],["C4",1],["D4",1],["E4",1],["C4",1],["E4",1],["F4",1],["G4",2],["E4",1],["F4",1],["G4",2]] },

  // 51-62 RAGTIME & FOLK CLASSICS
  { id: "the-entertainer", title: "The Entertainer (Ragtime)", author: "Scott Joplin (1902)", bpm: 110, difficulty: "difficile", base: [["D4",0.25],["D#4",0.25],["E4",0.25],["C5",0.5],["E4",0.25],["C5",0.5],["E4",0.25],["C5",1.5],["C5",0.25],["D5",0.25],["D#5",0.25],["E5",0.25],["C5",0.25],["D5",0.25],["E5",0.5],["B4",0.25],["D5",0.5],["C5",2]], mid: [["D4",0.25],["D#4",0.25],["E4",0.25],["C5",0.5],["E4",0.25],["C5",0.5],["E4",0.25],["C5",1.5],["A4",0.25],["G4",0.25],["F#4",0.25],["A4",0.25],["C5",0.25],["E5",0.5],["D5",0.25],["C5",0.25],["A4",0.25],["D5",2]] },
  { id: "maple-leaf-rag", title: "Maple Leaf Rag", author: "Scott Joplin (1899)", bpm: 120, difficulty: "difficile", base: [["Ab4",0.5],["C5",0.5],["Eb5",0.5],["Ab5",0.5],["R",0.5],["Eb5",0.5],["C5",0.5],["Ab4",0.5],["G4",0.5],["Bb4",0.5],["Eb5",0.5],["G5",0.5],["R",0.5],["Eb5",0.5],["Bb4",0.5],["G4",0.5]], mid: [["Ab4",0.5],["C5",0.5],["Eb5",0.5],["Ab5",1],["G5",0.5],["F5",0.5],["Eb5",1],["C5",1],["Ab4",2]] },
  { id: "greensleeves", title: "Greensleeves", author: "Tradizionale Inglese", bpm: 100, difficulty: "facile", base: [["A4",1],["C5",2],["D5",1],["E5",1.5],["F5",0.5],["E5",1],["D5",2],["B4",1],["G4",1.5],["A4",0.5],["B4",1],["C5",2],["A4",1],["A4",1.5],["G#4",0.5],["A4",1],["B4",2],["E4",1]], mid: [["G5",3],["G5",1.5],["F5",0.5],["E5",1],["D5",2],["B4",1],["G4",1.5],["A4",0.5],["B4",1],["C5",2],["A4",1],["A4",1.5],["G#4",0.5],["A4",3]] },
  { id: "amazing-grace", title: "Amazing Grace", author: "John Newton (1779)", bpm: 84, difficulty: "facile", base: [["D4",1],["G4",2],["B4",0.5],["G4",0.5],["B4",2],["A4",1],["G4",2],["E4",1],["D4",2],["D4",1],["G4",2],["B4",0.5],["G4",0.5],["B4",2],["A4",1],["D5",3]], mid: [["B4",1],["D5",2],["B4",0.5],["G4",0.5],["B4",2],["A4",1],["G4",2],["E4",1],["D4",2],["D4",1],["G4",2],["B4",0.5],["G4",0.5],["B4",2],["A4",1],["G4",3]] },
  { id: "house-of-rising-sun", title: "The House of the Rising Sun", author: "Tradizionale Folk", bpm: 108, difficulty: "medio", base: [["A4",1],["C5",1],["D5",1],["F5",2],["A4",1],["C5",1],["E5",1],["E5",2],["A4",1],["C5",1],["D5",1],["F5",2],["A4",1],["E5",1],["A4",3]], mid: [["C5",1],["D5",1],["F5",1],["D5",1],["C5",1],["A4",2],["C5",1],["D5",1],["E5",3]] },
  { id: "scarborough-fair", title: "Scarborough Fair", author: "Tradizionale Inglese", bpm: 90, difficulty: "facile", base: [["A4",2],["A4",1],["E5",2],["E5",1],["B4",1.5],["C5",0.5],["B4",1],["A4",3]] },
  { id: "auld-lang-syne", title: "Auld Lang Syne (Valzer delle Candele)", author: "Robert Burns", bpm: 96, difficulty: "facile", base: [["C4",1],["F4",1.5],["F4",0.5],["F4",1],["A4",1],["G4",1.5],["F4",0.5],["G4",1],["A4",1],["F4",1.5],["F4",0.5],["A4",1],["C5",1],["D5",3]] },
  { id: "danny-boy", title: "Danny Boy (Londonderry Air)", author: "Tradizionale Irlandese", bpm: 72, difficulty: "medio", base: [["C4",1],["F4",1.5],["E4",0.5],["F4",1],["A4",1],["G4",1.5],["F4",0.5],["D4",1],["C4",2]] },
  { id: "sakura-sakura", title: "Sakura Sakura", author: "Tradizionale Giapponese", bpm: 80, difficulty: "facile", base: [["A4",1],["A4",1],["B4",2],["A4",1],["A4",1],["B4",2],["A4",1],["B4",1],["C5",1],["B4",1],["A4",1],["F4",1],["E4",2]] },
  { id: "kalinka", title: "Kalinka", author: "Tradizionale Russo", bpm: 130, difficulty: "medio", base: [["E5",0.5],["D5",0.5],["C5",0.5],["B4",0.5],["A4",1],["A4",1],["E4",1],["E4",1],["A4",1],["B4",1],["C5",1],["D5",1],["E5",2]] },
  { id: "korobeiniki-tetris", title: "Korobeiniki (Tetris Theme)", author: "Tradizionale Russo", bpm: 144, difficulty: "facile", base: [["E5",1],["B4",0.5],["C5",0.5],["D5",1],["C5",0.5],["B4",0.5],["A4",1],["A4",0.5],["C5",0.5],["E5",1],["D5",0.5],["C5",0.5],["B4",1.5],["C5",0.5],["D5",1],["E5",1],["C5",1],["A4",1],["A4",2]] },
  { id: "csardas-monti", title: "Ciarda (Csárdás)", author: "V. Monti (1904)", bpm: 120, difficulty: "difficile", base: [["D5",2],["A4",2],["F5",1.5],["E5",0.5],["D5",1],["C#5",1],["D5",2]] },

  // 63-72 NURSERY & CHILD SONGS
  { id: "vecchia-fattoria", title: "Nella Vecchia Fattoria (Old MacDonald)", author: "Tradizionale", bpm: 116, difficulty: "facile", base: [["C4",1],["C4",1],["C4",1],["G3",1],["A3",1],["A3",1],["G3",2],["E4",1],["E4",1],["D4",1],["D4",1],["C4",2]] },
  { id: "oh-susanna", title: "Oh Susanna", author: "Stephen Foster (1848)", bpm: 124, difficulty: "facile", base: [["C4",0.5],["D4",0.5],["E4",1],["G4",1],["G4",1],["A4",1],["G4",1],["E4",1],["C4",1.5],["D4",0.5],["E4",1],["E4",1],["D4",1],["C4",1],["D4",2]] },
  { id: "camptown-races", title: "Camptown Races", author: "Stephen Foster", bpm: 130, difficulty: "facile", base: [["G4",1],["G4",0.5],["E4",0.5],["G4",1],["C5",1],["E5",1],["C5",1],["G4",2],["E4",1],["D4",2]] },
  { id: "swanee-river", title: "Swanee River (Old Folks at Home)", author: "Stephen Foster", bpm: 90, difficulty: "facile", base: [["F#4",1],["E4",0.5],["D4",0.5],["F#4",1],["E4",0.5],["D4",0.5],["B3",1],["D4",1],["A3",2]] },
  { id: "mary-had-a-little-lamb", title: "Mary Had a Little Lamb", author: "Tradizionale", bpm: 110, difficulty: "facile", base: [["E4",1],["D4",1],["C4",1],["D4",1],["E4",1],["E4",1],["E4",2],["D4",1],["D4",1],["D4",2],["E4",1],["G4",1],["G4",2]] },
  { id: "row-row-boat", title: "Row Row Row Your Boat", author: "Tradizionale", bpm: 104, difficulty: "facile", base: [["C4",1],["C4",1],["C4",1],["D4",0.5],["E4",1],["E4",1],["D4",0.5],["E4",1],["F4",0.5],["G4",2]] },
  { id: "london-bridge", title: "London Bridge Is Falling Down", author: "Tradizionale", bpm: 116, difficulty: "facile", base: [["G4",1],["A4",0.5],["G4",0.5],["F4",1],["E4",1],["F4",1],["G4",2],["D4",1],["E4",1],["F4",2],["E4",1],["F4",1],["G4",2]] },
  { id: "clementine", title: "Clementine", author: "Tradizionale Americano", bpm: 108, difficulty: "facile", base: [["C4",1],["C4",1],["C4",1],["G3",1],["E4",1],["E4",1],["E4",1],["C4",1],["C4",1],["E4",1],["G4",2],["F4",1],["E4",1],["D4",3]] },
  { id: "yankee-doodle", title: "Yankee Doodle", author: "Tradizionale", bpm: 120, difficulty: "facile", base: [["C4",1],["C4",1],["D4",1],["E4",1],["C4",1],["E4",1],["D4",2],["C4",1],["C4",1],["D4",1],["E4",1],["C4",2],["B3",2]] },
  { id: "il-coccodrillo", title: "Il Coccodrillo Come Fa", author: "Tradizionale Didattico", bpm: 112, difficulty: "facile", base: [["C4",1],["E4",1],["G4",1],["G4",1],["A4",1],["A4",1],["G4",2],["F4",1],["F4",1],["E4",1],["E4",1],["D4",2],["C4",2]] },

  // 73-82 HOLIDAY & CHRISTMAS
  { id: "astro-del-ciel", title: "Astro del Ciel (Silent Night - Stille Nacht)", author: "Franz Gruber", bpm: 80, difficulty: "facile", base: [["G4",1.5],["A4",0.5],["G4",1],["E4",3],["G4",1.5],["A4",0.5],["G4",1],["E4",3],["D5",2],["D5",1],["B4",3],["C5",2],["C5",1],["G4",3]], mid: [["A4",2],["A4",1],["C5",1.5],["B4",0.5],["A4",1],["G4",1.5],["A4",0.5],["G4",1],["E4",3],["D5",2],["D5",1],["F5",1.5],["D5",0.5],["B4",1],["C5",3],["G4",3],["E4",3],["C4",3]] },
  { id: "tu-scendi-dalle-stelle", title: "Tu Scendi dalle Stelle", author: "Sant'Alfonso M. de' Liguori", bpm: 96, difficulty: "facile", base: [["G4",1],["A4",0.5],["G4",0.5],["F4",1],["E4",2],["G4",1],["C5",2],["B4",1],["A4",2],["G4",2],["F4",1],["E4",1],["D4",1],["C4",2]], mid: [["G4",1],["G4",1],["A4",1],["B4",2],["C5",1],["D5",2],["C5",1],["B4",2],["A4",1],["G4",3]] },
  { id: "jingle-bells", title: "Jingle Bells", author: "J. L. Pierpont (1857)", bpm: 130, difficulty: "facile", base: [["E4",1],["E4",1],["E4",2],["E4",1],["E4",1],["E4",2],["E4",1],["G4",1],["C4",1.5],["D4",0.5],["E4",4],["F4",1],["F4",1],["F4",1.5],["F4",0.5],["F4",1],["E4",1],["E4",1],["E4",0.5],["E4",0.5],["E4",1],["D4",1],["D4",1],["E4",1],["D4",2],["G4",2]], mid: [["E4",1],["E4",1],["E4",2],["E4",1],["E4",1],["E4",2],["E4",1],["G4",1],["C4",1.5],["D4",0.5],["E4",4],["F4",1],["F4",1],["F4",1.5],["F4",0.5],["F4",1],["E4",1],["E4",1],["E4",0.5],["E4",0.5],["G4",1],["G4",1],["F4",1],["D4",1],["C4",4]] },
  { id: "we-wish-you-a-merry-christmas", title: "We Wish You a Merry Christmas", author: "Tradizionale Natalizio", bpm: 120, difficulty: "facile", base: [["D4",1],["G4",1],["G4",0.5],["A4",0.5],["G4",0.5],["F#4",0.5],["E4",1],["E4",1],["E4",1],["A4",1],["A4",0.5],["B4",0.5],["A4",0.5],["G4",0.5],["F#4",1],["D4",1],["D4",1],["B4",1],["B4",0.5],["C5",0.5],["B4",0.5],["A4",0.5],["G4",1],["E4",1],["D4",0.5],["D4",0.5],["E4",1],["A4",1],["F#4",1],["G4",2]], mid: [["D4",1],["G4",1],["G4",1],["G4",1],["F#4",2],["F#4",1],["G4",1],["F#4",1],["E4",1],["D4",2]] },
  { id: "deck-the-halls", title: "Deck the Halls", author: "Tradizionale Gallese", bpm: 130, difficulty: "facile", base: [["G4",1.5],["F4",0.5],["E4",1],["D4",1],["C4",1],["D4",1],["E4",1],["C4",1],["D4",0.5],["E4",0.5],["F4",0.5],["D4",0.5],["E4",1.5],["D4",0.5],["C4",1],["B3",1],["C4",2]] },
  { id: "joy-to-the-world", title: "Joy to the World", author: "G. F. Handel", bpm: 100, difficulty: "facile", base: [["C5",2],["B4",1.5],["A4",0.5],["G4",2],["F4",1],["E4",2],["D4",2],["C4",3]] },
  { id: "o-tannenbaum", title: "O Tannenbaum (L'Albero di Natale)", author: "Tradizionale", bpm: 90, difficulty: "facile", base: [["C4",1],["F4",1],["F4",1],["F4",1.5],["G4",0.5],["A4",1],["A4",1],["A4",2]] },
  { id: "adeste-fideles", title: "Adeste Fideles (O Come All Ye Faithful)", author: "John F. Wade", bpm: 88, difficulty: "facile", base: [["G4",2],["G4",1],["D4",1],["G4",2],["A4",2],["D5",2],["C5",1],["B4",1],["A4",2],["G4",2]] },
  { id: "hark-herald-angels", title: "Hark! The Herald Angels Sing", author: "F. Mendelssohn", bpm: 104, difficulty: "facile", base: [["C4",1],["F4",1],["F4",1.5],["E4",0.5],["F4",1],["A4",1],["A4",1],["G4",1],["C5",1],["C5",1],["C5",1.5],["Bb4",0.5],["A4",1],["G4",1],["A4",2]] },
  { id: "god-rest-ye-merry", title: "God Rest Ye Merry, Gentlemen", author: "Tradizionale", bpm: 116, difficulty: "medio", base: [["A4",1],["A4",1],["E5",1],["E5",1],["D5",1],["C5",1],["B4",1],["A4",1],["G4",1],["A4",1],["B4",1],["C5",1],["D5",1],["E5",2]] },

  // 83-102 ROMANTIC & ORCHESTRAL MASTERPIECES
  { id: "il-mattino-grieg", title: "Il Mattino (Morning Mood - Peer Gynt)", author: "E. Grieg", bpm: 108, difficulty: "facile", base: [["E4",1],["C#4",1],["B3",1],["A3",1],["B3",1],["C#4",1],["E4",1],["C#4",1],["B3",1],["A3",1],["B3",1],["C#4",1],["B3",1],["C#4",1],["E4",1],["C#4",1],["E4",1],["F#4",1],["C#4",1],["F#4",1],["E4",1],["C#4",1],["B3",1],["A3",2]] },
  { id: "re-della-montagna", title: "Nell'Halle del Re della Montagna", author: "E. Grieg", bpm: 120, difficulty: "medio", base: [["B3",0.5],["C#4",0.5],["D4",0.5],["E4",0.5],["F#4",0.5],["D4",0.5],["F#4",1],["F4",0.5],["C#4",0.5],["F4",1],["E4",0.5],["C4",0.5],["E4",1],["B3",0.5],["C#4",0.5],["D4",0.5],["E4",0.5],["F#4",0.5],["D4",0.5],["F#4",0.5],["B4",0.5],["A4",0.5],["F#4",0.5],["D4",0.5],["F#4",0.5],["A4",1]] },
  { id: "danubio-blu", title: "Sul Bel Danubio Blu (Blue Danube Waltz)", author: "J. Strauss II", bpm: 160, difficulty: "facile", base: [["A3",1],["A3",1],["C#4",1],["E4",1],["A4",1],["A4",1],["F#5",2],["F#5",2],["F#5",1],["F#5",1],["D5",1],["A4",1],["F#4",1],["F#4",1],["A4",2],["A4",2]] },
  { id: "marcia-radetzky", title: "Marcia di Radetzky (Radetzky March)", author: "J. Strauss I", bpm: 132, difficulty: "medio", base: [["A4",0.5],["A4",0.5],["A4",0.5],["D5",1],["F#5",1],["A4",0.5],["A4",0.5],["A4",0.5],["D5",1],["F#5",1],["A4",0.5],["A4",0.5],["A4",0.5],["D5",0.5],["C#5",0.5],["B4",0.5],["A4",0.5],["G4",1],["E4",1],["D4",2]] },
  { id: "sogno-damore-liszt", title: "Sogno d'Amore (Liebestraum No. 3)", author: "F. Liszt", bpm: 72, difficulty: "difficile", base: [["Ab4",1],["C5",1],["Eb5",1.5],["Db5",0.5],["C5",1],["Bb4",1],["Ab4",1],["G4",1],["F4",1],["Eb4",2]] },
  { id: "rapsodia-ungherese-2", title: "Rapsodia Ungherese No. 2", author: "F. Liszt", bpm: 110, difficulty: "difficile", base: [["C#4",0.5],["D4",0.5],["C#4",0.5],["B3",0.5],["C#4",1],["F#4",2],["C#4",0.5],["D4",0.5],["C#4",0.5],["B3",0.5],["C#4",1],["A4",2]] },
  { id: "barcarolla-offenbach", title: "Barcarolla (I Racconti di Hoffmann)", author: "J. Offenbach", bpm: 92, difficulty: "facile", base: [["A4",1.5],["F#4",0.5],["A4",1],["D5",2],["B4",1],["A4",1.5],["G4",0.5],["F#4",1],["E4",3]] },
  { id: "can-can-offenbach", title: "Can-Can (Orfeo all'Inferno)", author: "J. Offenbach", bpm: 152, difficulty: "medio", base: [["D5",1],["D5",1],["D5",0.5],["C#5",0.5],["B4",0.5],["A4",0.5],["G4",1],["G4",1],["G4",0.5],["F#4",0.5],["E4",0.5],["D4",0.5],["E4",1],["F#4",1],["G4",1],["A4",1],["D5",2]] },
  { id: "il-cigno-saint-saens", title: "Il Cigno (The Swan - Carnaval des Animaux)", author: "C. Saint-Saëns", bpm: 68, difficulty: "medio", base: [["G4",2],["D5",2],["B4",1.5],["A4",0.5],["G4",1],["F#4",1],["E4",2],["D4",2]] },
  { id: "danse-macabre", title: "Danse Macabre", author: "C. Saint-Saëns", bpm: 128, difficulty: "difficile", base: [["D4",1],["A4",1],["D5",1],["F5",1],["G#5",2],["G5",1],["F5",1],["D5",2]] },
  { id: "umoresca-dvorak", title: "Humoresque Op. 101 No. 7", author: "A. Dvořák", bpm: 90, difficulty: "medio", base: [["G4",0.5],["A4",0.5],["B4",0.5],["D5",0.5],["B4",0.5],["G4",0.5],["A4",1],["G4",0.5],["A4",0.5],["B4",0.5],["D5",0.5],["B4",0.5],["G4",0.5],["A4",2]] },
  { id: "nuovo-mondo-dvorak", title: "Sinfonia dal Nuovo Mondo (New World Symphony Largo)", author: "A. Dvořák", bpm: 60, difficulty: "facile", base: [["E4",1.5],["G4",0.5],["G4",2],["E4",1.5],["D4",0.5],["C4",2],["D4",1],["E4",1],["G4",1],["E4",1],["D4",3]] },
  { id: "coro-nuziale-wagner", title: "Coro Nuziale (Bridal Chorus - Lohengrin)", author: "R. Wagner", bpm: 84, difficulty: "facile", base: [["C4",1.5],["F4",0.5],["F4",1],["F4",2],["C4",1.5],["G4",0.5],["E4",1],["F4",2],["C4",1.5],["A4",0.5],["G4",1],["F4",1],["E4",1],["D4",1],["C4",2]] },
  { id: "cavalcata-valchirie", title: "La Cavalcata delle Valchirie (Ride of the Valkyries)", author: "R. Wagner", bpm: 140, difficulty: "difficile", base: [["B3",0.5],["D4",0.5],["F#4",1],["B4",1],["D5",1.5],["C#5",0.5],["B4",1],["F#4",1],["D4",1],["B3",2]] },
  { id: "volo-del-calabrone", title: "Il Volo del Calabrone (Flight of the Bumblebee)", author: "N. Rimsky-Korsakov", bpm: 160, difficulty: "difficile", base: [["A4",0.25],["G#4",0.25],["G4",0.25],["F#4",0.25],["F4",0.25],["E4",0.25],["D#4",0.25],["D4",0.25],["C#4",0.25],["C4",0.25],["B3",0.25],["A#3",0.25],["A3",1]] },
  { id: "marcia-nuziale-mendelssohn", title: "Marcia Nuziale (Wedding March)", author: "F. Mendelssohn", bpm: 104, difficulty: "medio", base: [["B4",1],["B4",0.5],["B4",0.5],["B4",2],["C5",1],["A4",1],["F#4",1],["D4",2],["B4",1],["C5",1],["D5",1],["E5",2]] },
  { id: "pavane-faure", title: "Pavane Op. 50", author: "G. Fauré", bpm: 80, difficulty: "medio", base: [["F#4",1.5],["G4",0.5],["A4",1],["F#4",1],["B4",1.5],["A4",0.5],["G4",1],["F#4",1],["E4",2]] },
  { id: "promenade-mussorgsky", title: "Promenade (Quadri di un'Esposizione)", author: "M. Mussorgsky", bpm: 96, difficulty: "medio", base: [["G4",1],["F4",1],["C4",1],["D4",1],["E4",1],["F4",1],["G4",1],["C4",1],["A4",1],["G4",2]] },
  { id: "clementi-sonatina", title: "Sonatina in Do Maggiore Op. 36 No. 1", author: "M. Clementi", bpm: 124, difficulty: "facile", base: [["C4",1],["E4",1],["G4",1],["C5",2],["G4",1],["E4",1],["C4",2],["D4",1],["F4",1],["A4",1],["D5",2]] },
  { id: "burgmuller-arabesque", title: "L'Arabesque Op. 100 No. 2", author: "J. F. Burgmüller", bpm: 136, difficulty: "medio", base: [["A4",0.25],["B4",0.25],["C5",0.25],["D5",0.25],["E5",1],["E5",1],["E5",1],["D5",0.25],["C5",0.25],["B4",0.25],["A4",0.25],["B4",1],["E4",2]] }
];

for (const spec of SONG_DEFINITIONS) {
  const phrases = [
    ...spec.base,
    ...(spec.mid || spec.base),
    ...spec.base,
    ...transposePhrases(spec.base, 12),
    ...(spec.mid || spec.base),
    ...spec.base
  ];
  SONGS_BUILDER.push({
    id: spec.id,
    title: spec.title,
    author: spec.author,
    bpm: spec.bpm,
    difficulty: spec.difficulty,
    phrases: phrases
  });
}

const finalInteractiveSongs = SONGS_BUILDER.map(s => {
  const notes = buildMelody(s.bpm, s.phrases);
  return {
    id: s.id,
    title: s.title,
    author: s.author,
    bpm: s.bpm,
    difficulty: s.difficulty,
    createdAt: "2025-01-01",
    isPublished: true,
    notes: notes
  };
});

console.log("Total complete songs generated:", finalInteractiveSongs.length);
console.log("Sample song 1 note count:", finalInteractiveSongs[0].id, finalInteractiveSongs[0].notes.length);
console.log("Sample song 50 note count:", finalInteractiveSongs[49].id, finalInteractiveSongs[49].notes.length);
console.log("Sample song 100 note count:", finalInteractiveSongs[99].id, finalInteractiveSongs[99].notes.length);

const fileContent = `import { InteractiveSong } from '../types';

export const DEFAULT_INTERACTIVE_SONGS: InteractiveSong[] = ${JSON.stringify(finalInteractiveSongs, null, 2)};
`;

fs.writeFileSync('./src/data/interactiveSongs.ts', fileContent, 'utf8');
console.log("Successfully generated complete 102 songs in interactiveSongs.ts!");
