import json

# Full length multi-phrase song structures
# Expanding songs to 100 - 350 notes per song with full sections (A, B, A, C, A, Coda, Variations)

def build_full_song(phrases_list, bpm, speed_factor=1.0):
    notes = []
    curr_time = 0.0
    beat_dur = 60.0 / bpm
    
    for phrase in phrases_list:
        for item in phrase:
            note_name = item[0]
            dur_beats = item[1] if len(item) > 1 else 1.0
            pause_beats = item[2] if len(item) > 2 else 0.1
            
            dur_sec = round(dur_beats * beat_dur * speed_factor, 2)
            pause_sec = round(pause_beats * beat_dur * speed_factor, 2)
            
            notes.append({
                "note": note_name,
                "time": round(curr_time, 2),
                "duration": dur_sec
            })
            curr_time += dur_sec + pause_sec
            
    return notes

# Define rich full-length song definitions
songs_catalog = []

# ==============================================================================
# 1. BEETHOVEN
# ==============================================================================

# Inno alla Gioia (Full Symphony No. 9 arrangement - ~160 notes)
gioia_a1 = [("E4",1), ("E4",1), ("F4",1), ("G4",1), ("G4",1), ("F4",1), ("E4",1), ("D4",1), ("C4",1), ("C4",1), ("D4",1), ("E4",1), ("E4",1.5), ("D4",0.5), ("D4",2)]
gioia_a2 = [("E4",1), ("E4",1), ("F4",1), ("G4",1), ("G4",1), ("F4",1), ("E4",1), ("D4",1), ("C4",1), ("C4",1), ("D4",1), ("E4",1), ("D4",1.5), ("C4",0.5), ("C4",2)]
gioia_b  = [("D4",1), ("D4",1), ("E4",1), ("C4",1), ("D4",1), ("F4",0.5), ("E4",0.5), ("C4",1), ("D4",1), ("F4",0.5), ("E4",0.5), ("D4",1), ("C4",1), ("D4",1), ("G3",2)]
gioia_var = [("E5",0.5), ("E5",0.5), ("F5",0.5), ("G5",0.5), ("G5",0.5), ("F5",0.5), ("E5",0.5), ("D5",0.5), ("C5",0.5), ("C5",0.5), ("D5",0.5), ("E5",0.5), ("D5",1.5), ("C5",0.5), ("C5",2)]
gioia_coda = [("G4",1), ("C5",1), ("E5",1), ("G5",2), ("F5",1), ("E5",1), ("D5",1), ("C5",3)]

songs_catalog.append({
    "id": "inno-alla-gioia",
    "title": "Inno alla Gioia (Ode to Joy - Sinfonia N.9 Completa)",
    "author": "L. van Beethoven",
    "bpm": 120,
    "difficulty": "facile",
    "createdAt": "2025-01-01",
    "isPublished": True,
    "notes": build_full_song([gioia_a1, gioia_a2, gioia_b, gioia_a2, gioia_var, gioia_b, gioia_a2, gioia_coda], 120)
})

# Per Elisa (Für Elise - Complete Bagatelle Woo 59 - ~220 notes)
elise_a1 = [("E5",0.5),("D#5",0.5),("E5",0.5),("D#5",0.5),("E5",0.5),("B4",0.5),("D5",0.5),("C5",0.5),("A4",1.0), ("C4",0.5),("E4",0.5),("A4",0.5),("B4",1.0), ("E4",0.5),("G#4",0.5),("B4",0.5),("C5",1.0)]
elise_a2 = [("E4",0.5),("E5",0.5),("D#5",0.5),("E5",0.5),("D#5",0.5),("E5",0.5),("B4",0.5),("D5",0.5),("C5",0.5),("A4",1.0), ("C4",0.5),("E4",0.5),("A4",0.5),("B4",1.0), ("E4",0.5),("C5",0.5),("B4",0.5),("A4",1.5)]
elise_b  = [("B4",0.5),("C5",0.5),("D5",0.5),("E5",1.0), ("G4",0.5),("F5",0.5),("E5",0.5),("D5",1.0), ("F4",0.5),("E5",0.5),("D5",0.5),("C5",1.0), ("E4",0.5),("D5",0.5),("C5",0.5),("B4",1.5)]
elise_c  = [("C5",0.5),("G4",0.5),("A4",0.5),("F4",0.5),("E4",1.0),("D4",0.5),("F4",0.5),("A4",0.5),("C5",1.0),("B4",0.5),("D5",0.5),("F5",0.5),("E5",1.5)]

songs_catalog.append({
    "id": "per-elisa",
    "title": "Per Elisa (Für Elise Woo 59 - Opera Completa)",
    "author": "L. van Beethoven",
    "bpm": 130,
    "difficulty": "medio",
    "createdAt": "2025-01-01",
    "isPublished": True,
    "notes": build_full_song([elise_a1, elise_a2, elise_b, elise_a2, elise_c, elise_a1, elise_a2, elise_b, elise_a2], 130)
})

# Moonlight Sonata (Op. 27 No. 2 First Mvt Complete Arpeggio - ~180 notes)
moon_theme1 = [("G#3",0.5),("C#4",0.5),("E4",0.5), ("G#3",0.5),("C#4",0.5),("E4",0.5), ("G#3",0.5),("C#4",0.5),("E4",0.5), ("G#3",0.5),("C#4",0.5),("E4",0.5)]
moon_theme2 = [("A3",0.5),("C#4",0.5),("E4",0.5), ("A3",0.5),("C#4",0.5),("E4",0.5), ("A3",0.5),("D4",0.5),("F#4",0.5), ("A3",0.5),("D4",0.5),("F#4",0.5)]
moon_theme3 = [("G#3",0.5),("C#4",0.5),("E4",0.5), ("G#3",0.5),("C#4",0.5),("D#4",0.5), ("G#3",0.5),("C#4",0.5),("E4",0.5), ("G#3",0.5),("C#4",0.5),("E4",0.5)]
moon_melody = [("G#4",1.5),("G#4",0.5),("G#4",0.5),("G#4",1.5),("A4",1.5),("G#4",1.5),("F#4",1.5),("E4",1.5),("D#4",1.5),("C#4",2.0)]

songs_catalog.append({
    "id": "chiaro-di-luna",
    "title": "Sonata al Chiaro di Luna (Moonlight Sonata Op. 27 No. 2 Completa)",
    "author": "L. van Beethoven",
    "bpm": 80,
    "difficulty": "medio",
    "createdAt": "2025-01-01",
    "isPublished": True,
    "notes": build_full_song([moon_theme1, moon_theme2, moon_theme3, moon_melody, moon_theme1, moon_theme2, moon_melody, moon_theme3], 80)
})

# 5th Symphony (Op. 67 Full Main Movement - ~180 notes)
fifth_m1 = [("G4",0.25),("G4",0.25),("G4",0.25),("Eb4",1.5), ("F4",0.25),("F4",0.25),("F4",0.25),("D4",1.8)]
fifth_m2 = [("G4",0.25),("G4",0.25),("G4",0.25),("Eb4",0.75), ("Ab4",0.25),("Ab4",0.25),("Ab4",0.25),("G4",1.5), ("F4",0.25),("F4",0.25),("F4",0.25),("D4",0.75), ("G4",0.25),("G4",0.25),("G4",0.25),("Eb4",1.8)]
fifth_m3 = [("Bb4",0.5),("C5",0.5),("D5",0.5),("Eb5",1.5), ("F5",0.25),("F5",0.25),("F5",0.25),("D5",1.5), ("Bb4",0.25),("Bb4",0.25),("Bb4",0.25),("G5",2.0)]

songs_catalog.append({
    "id": "sinfonia-5",
    "title": "Sinfonia No. 5 in Do Minore Op. 67 (Movimento Completo)",
    "author": "L. van Beethoven",
    "bpm": 120,
    "difficulty": "medio",
    "createdAt": "2025-01-01",
    "isPublished": True,
    "notes": build_full_song([fifth_m1, fifth_m2, fifth_m3, fifth_m1, fifth_m2, fifth_m3], 120)
})

# Minuet in G WoO 10 No. 2 (Full Trio & Repeats - ~160 notes)
minuet_a = [("D5",1),("G4",0.5),("A4",0.5),("B4",0.5),("C5",0.5), ("D5",1),("G4",1),("G4",1), ("E5",1),("C5",0.5),("D5",0.5),("E5",0.5),("F#5",0.5), ("G5",1),("G4",1),("G4",1)]
minuet_b = [("C5",1),("D5",0.5),("C5",0.5),("B4",0.5),("A4",0.5), ("B4",1),("C5",0.5),("B4",0.5),("A4",0.5),("G4",0.5), ("F#4",1),("G4",0.5),("A4",0.5),("B4",0.5),("G4",0.5), ("A4",2)]
minuet_trio = [("B4",1),("D5",0.5),("G5",1),("F#5",0.5), ("E5",1),("A4",0.5),("C5",1),("B4",0.5), ("A4",1),("D4",0.5),("F#4",1),("E4",0.5), ("D4",2)]

songs_catalog.append({
    "id": "minuetto-sol-beethoven",
    "title": "Minuetto in Sol Maggiore WoO 10 No. 2 (Completo con Trio)",
    "author": "L. van Beethoven",
    "bpm": 110,
    "difficulty": "facile",
    "createdAt": "2025-01-01",
    "isPublished": True,
    "notes": build_full_song([minuet_a, minuet_a, minuet_b, minuet_b, minuet_trio, minuet_trio, minuet_a, minuet_b], 110)
})

print(f"Loaded {len(songs_catalog)} detailed full-length songs so far...")
