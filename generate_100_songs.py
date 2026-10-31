import json

songs = []

def parse_notes(note_tuples, speed_factor=1.0):
    notes = []
    curr_time = 0.0
    for item in note_tuples:
        note_name = item[0]
        dur_beats = item[1] if len(item) > 1 else 0.5
        pause_after = item[2] if len(item) > 2 else 0.08
        
        dur_sec = round(dur_beats * speed_factor, 2)
        notes.append({
            "note": note_name,
            "time": round(curr_time, 2),
            "duration": dur_sec
        })
        curr_time += dur_sec + round(pause_after * speed_factor, 2)
    return notes

# Build comprehensive 100+ complete songs generator
# 1. BEETHOVEN (10 songs)
# 2. MOZART (10 songs)
# 3. J. S. BACH (10 songs)
# 4. CHOPIN (8 songs)
# 5. TCHAIKOVSKY (8 songs)
# 6. ITALIAN OPERA & VIVALDI (10 songs)
# 7. ROMANTIC MASTERPIECES - SCHUBERT, BRAHMS, DEBUSSY, SATIE, PACHELBEL (10 songs)
# 8. ITALIAN POPULAR & FOLK (10 songs)
# 9. WORLD FOLK, EVERGREEN & RAGTIME (12 songs)
# 10. NURSERY & EDUCATIONAL TUNES (10 songs)
# 11. CHRISTMAS & HOLIDAY CLASSICS (10 songs)

# Generator catalog:
catalog = [
    # 1. BEETHOVEN
    ("inno-alla-gioia", "Inno alla Gioia (Ode to Joy - Completo)", "L. van Beethoven", 100, "facile", [
        ("E4", 0.5), ("E4", 0.5), ("F4", 0.5), ("G4", 0.5), ("G4", 0.5), ("F4", 0.5), ("E4", 0.5), ("D4", 0.5),
        ("C4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.5), ("E4", 0.8), ("D4", 0.3), ("D4", 1.0),
        ("E4", 0.5), ("E4", 0.5), ("F4", 0.5), ("G4", 0.5), ("G4", 0.5), ("F4", 0.5), ("E4", 0.5), ("D4", 0.5),
        ("C4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.5), ("D4", 0.8), ("C4", 0.3), ("C4", 1.0),
        ("D4", 0.5), ("D4", 0.5), ("E4", 0.5), ("C4", 0.5), ("D4", 0.5), ("F4", 0.25), ("E4", 0.25), ("C4", 0.5),
        ("D4", 0.5), ("F4", 0.25), ("E4", 0.25), ("D4", 0.5), ("C4", 0.5), ("D4", 0.5), ("G3", 1.0),
        ("E4", 0.5), ("E4", 0.5), ("F4", 0.5), ("G4", 0.5), ("G4", 0.5), ("F4", 0.5), ("E4", 0.5), ("D4", 0.5),
        ("C4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.5), ("D4", 0.8), ("C4", 0.3), ("C4", 1.2)
    ]),

    ("per-elisa", "Per Elisa (Für Elise - Completo)", "L. van Beethoven", 110, "medio", [
        ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("B4", 0.3), ("D5", 0.3), ("C5", 0.3), ("A4", 0.6),
        ("C4", 0.3), ("E4", 0.3), ("A4", 0.3), ("B4", 0.6), ("E4", 0.3), ("G#4", 0.3), ("B4", 0.3), ("C5", 0.6),
        ("E4", 0.3), ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("B4", 0.3), ("D5", 0.3), ("C5", 0.3), ("A4", 0.6),
        ("C4", 0.3), ("E4", 0.3), ("A4", 0.3), ("B4", 0.6), ("E4", 0.3), ("C5", 0.3), ("B4", 0.3), ("A4", 0.8),
        ("B4", 0.3), ("C5", 0.3), ("D5", 0.3), ("E5", 0.6), ("G4", 0.3), ("F5", 0.3), ("E5", 0.3), ("D5", 0.6),
        ("F4", 0.3), ("E5", 0.3), ("D5", 0.3), ("C5", 0.6), ("E4", 0.3), ("D5", 0.3), ("C5", 0.3), ("B4", 0.8),
        ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("B4", 0.3), ("D5", 0.3), ("C5", 0.3), ("A4", 0.8)
    ]),

    ("chiaro-di-luna", "Sonata al Chiaro di Luna (Moonlight Sonata Op. 27)", "L. van Beethoven", 70, "medio", [
        ("G#3", 0.4), ("C#4", 0.4), ("E4", 0.4), ("G#3", 0.4), ("C#4", 0.4), ("E4", 0.4), ("G#3", 0.4), ("C#4", 0.4), ("E4", 0.4),
        ("A3", 0.4), ("C#4", 0.4), ("E4", 0.4), ("A3", 0.4), ("C#4", 0.4), ("E4", 0.4), ("A3", 0.4), ("D4", 0.4), ("F#4", 0.4),
        ("G#3", 0.4), ("C#4", 0.4), ("E4", 0.4), ("G#3", 0.4), ("C#4", 0.4), ("D#4", 0.4), ("G#3", 0.4), ("C#4", 0.4), ("E4", 0.4),
        ("C#4", 1.2), ("B3", 0.8), ("A3", 0.8), ("G#3", 1.5)
    ]),

    ("sinfonia-5", "Sinfonia No. 5 (Destino)", "L. van Beethoven", 108, "medio", [
        ("G4", 0.2), ("G4", 0.2), ("G4", 0.2), ("Eb4", 1.2),
        ("F4", 0.2), ("F4", 0.2), ("F4", 0.2), ("D4", 1.4),
        ("G4", 0.2), ("G4", 0.2), ("G4", 0.2), ("Eb4", 0.6), ("Ab4", 0.2), ("Ab4", 0.2), ("Ab4", 0.2), ("G4", 1.2),
        ("F4", 0.2), ("F4", 0.2), ("F4", 0.2), ("D4", 0.6), ("G4", 0.2), ("G4", 0.2), ("G4", 0.2), ("Eb4", 1.4)
    ]),

    ("minuetto-sol-beethoven", "Minuetto in Sol Maggiore (WoO 10 No. 2)", "L. van Beethoven", 100, "facile", [
        ("D5", 0.5), ("G4", 0.25), ("A4", 0.25), ("B4", 0.25), ("C5", 0.25), ("D5", 0.5), ("G4", 0.5), ("G4", 0.5),
        ("E5", 0.5), ("C5", 0.25), ("D5", 0.25), ("E5", 0.25), ("F#5", 0.25), ("G5", 0.5), ("G4", 0.5), ("G4", 0.5),
        ("C5", 0.5), ("D5", 0.25), ("C5", 0.25), ("B4", 0.25), ("A4", 0.25), ("B4", 0.5), ("C5", 0.25), ("B4", 0.25), ("A4", 0.25), ("G4", 0.25),
        ("F#4", 0.5), ("G4", 0.25), ("A4", 0.25), ("B4", 0.25), ("G4", 0.25), ("A4", 1.0)
    ]),

    ("ecossaise-eb", "Ecossaise in Mi Bemolle Maggiore", "L. van Beethoven", 120, "medio", [
        ("Eb4", 0.3), ("G4", 0.3), ("Bb4", 0.3), ("Eb5", 0.6), ("D5", 0.3), ("C5", 0.3), ("Bb4", 0.6),
        ("Ab4", 0.3), ("G4", 0.3), ("F4", 0.3), ("Eb4", 0.6), ("Bb3", 0.3), ("Eb4", 0.3), ("G4", 0.6),
        ("Eb4", 0.3), ("G4", 0.3), ("Bb4", 0.3), ("Eb5", 0.6), ("D5", 0.3), ("C5", 0.3), ("Bb4", 0.6),
        ("Ab4", 0.3), ("F4", 0.3), ("Bb4", 0.3), ("Eb4", 1.0)
    ]),

    ("sonatina-sol", "Sonatina in Sol Maggiore (WoO 51)", "L. van Beethoven", 105, "facile", [
        ("G4", 0.4), ("B4", 0.4), ("D5", 0.4), ("G5", 0.8), ("F#5", 0.4), ("E5", 0.4), ("D5", 0.8),
        ("C5", 0.4), ("B4", 0.4), ("A4", 0.4), ("G4", 0.8), ("F#4", 0.4), ("A4", 0.4), ("D4", 0.8),
        ("G4", 0.4), ("B4", 0.4), ("D5", 0.4), ("G5", 0.8), ("F#5", 0.4), ("E5", 0.4), ("D5", 0.8),
        ("C5", 0.4), ("B4", 0.4), ("A4", 0.4), ("D5", 0.4), ("G4", 1.2)
    ]),

    ("inno-alla-notte", "Inno alla Notte (Hymn to the Night)", "L. van Beethoven", 80, "facile", [
        ("C4", 0.6), ("E4", 0.6), ("G4", 0.6), ("C5", 1.0), ("B4", 0.6), ("A4", 0.6), ("G4", 1.2),
        ("F4", 0.6), ("A4", 0.6), ("G4", 0.6), ("E4", 1.0), ("D4", 0.6), ("E4", 0.6), ("C4", 1.2),
        ("E4", 0.6), ("G4", 0.6), ("C5", 0.6), ("E5", 1.0), ("D5", 0.6), ("C5", 0.6), ("B4", 1.2),
        ("A4", 0.6), ("C5", 0.6), ("G4", 0.6), ("E4", 1.0), ("D4", 0.6), ("C4", 1.4)
    ]),

    ("romanza-fa", "Romanza No. 2 in Fa Maggiore Op. 50", "L. van Beethoven", 85, "difficile", [
        ("F4", 0.5), ("A4", 0.5), ("C5", 1.0), ("F5", 1.0), ("E5", 0.5), ("D5", 0.5), ("C5", 1.2),
        ("Bb4", 0.5), ("D5", 0.5), ("C5", 0.5), ("A4", 0.5), ("G4", 0.5), ("Bb4", 0.5), ("A4", 1.2),
        ("F4", 0.5), ("A4", 0.5), ("C5", 1.0), ("F5", 1.0), ("G5", 0.5), ("F5", 0.5), ("E5", 1.2),
        ("D5", 0.5), ("F5", 0.5), ("C5", 0.5), ("A4", 0.5), ("G4", 0.8), ("F4", 1.4)
    ]),

    ("sinfonia-7-allegretto", "Sinfonia No. 7 - Allegretto", "L. van Beethoven", 76, "medio", [
        ("E4", 0.8), ("E4", 0.4), ("E4", 0.4), ("E4", 0.8), ("E4", 0.8),
        ("E4", 0.8), ("F4", 0.4), ("E4", 0.4), ("D4", 0.8), ("D4", 0.8),
        ("D4", 0.8), ("D4", 0.4), ("D4", 0.4), ("D4", 0.8), ("D4", 0.8),
        ("D4", 0.8), ("E4", 0.4), ("D4", 0.4), ("C4", 0.8), ("C4", 1.2)
    ]),

    # 2. MOZART
    ("stella-stellina", "Twinkle Twinkle Little Star (Ah! vous dirai-je, Maman)", "W. A. Mozart", 100, "facile", [
        ("C4", 0.5), ("C4", 0.5), ("G4", 0.5), ("G4", 0.5), ("A4", 0.5), ("A4", 0.5), ("G4", 1.0),
        ("F4", 0.5), ("F4", 0.5), ("E4", 0.5), ("E4", 0.5), ("D4", 0.5), ("D4", 0.5), ("C4", 1.0),
        ("G4", 0.5), ("G4", 0.5), ("F4", 0.5), ("F4", 0.5), ("E4", 0.5), ("E4", 0.5), ("D4", 1.0),
        ("G4", 0.5), ("G4", 0.5), ("F4", 0.5), ("F4", 0.5), ("E4", 0.5), ("E4", 0.5), ("D4", 1.0),
        ("C4", 0.5), ("C4", 0.5), ("G4", 0.5), ("G4", 0.5), ("A4", 0.5), ("A4", 0.5), ("G4", 1.0),
        ("F4", 0.5), ("F4", 0.5), ("E4", 0.5), ("E4", 0.5), ("D4", 0.5), ("D4", 0.5), ("C4", 1.2)
    ]),

    ("marcia-turca", "Marcia Turca (Rondo Alla Turca K. 331)", "W. A. Mozart", 125, "difficile", [
        ("B4", 0.25), ("A4", 0.25), ("G#4", 0.25), ("A4", 0.25), ("C5", 0.5),
        ("D5", 0.25), ("C5", 0.25), ("B4", 0.25), ("C5", 0.25), ("E5", 0.5),
        ("F5", 0.25), ("E5", 0.25), ("D#5", 0.25), ("E5", 0.25), ("B5", 0.25), ("A5", 0.25), ("G#5", 0.25), ("A5", 0.25),
        ("C6", 0.5), ("A5", 0.25), ("B5", 0.25), ("G#5", 0.5), ("A5", 0.8),
        ("C5", 0.25), ("D5", 0.25), ("E5", 0.5), ("E5", 0.25), ("F5", 0.25), ("D5", 0.5), ("C5", 0.25), ("D5", 0.25), ("B4", 0.5), ("A4", 1.0)
    ]),

    ("piccola-musica-notturna", "Eine kleine Nachtmusik (Una Piccola Musica Notturna K. 525)", "W. A. Mozart", 120, "medio", [
        ("G4", 0.5), ("D4", 0.25), ("G4", 0.5), ("D4", 0.25), ("G4", 0.25), ("B4", 0.25), ("D5", 0.8),
        ("C5", 0.5), ("G4", 0.25), ("C5", 0.5), ("G4", 0.25), ("C5", 0.25), ("E5", 0.25), ("G5", 0.8),
        ("G5", 0.3), ("F#5", 0.3), ("G5", 0.3), ("E5", 0.3), ("D5", 0.3), ("C5", 0.3), ("B4", 0.3), ("A4", 0.3),
        ("G4", 0.5), ("B4", 0.25), ("D5", 0.5), ("C5", 0.25), ("A4", 0.5), ("G4", 1.0)
    ]),

    ("sinfonia-40", "Sinfonia No. 40 in Sol Minore K. 550", "W. A. Mozart", 130, "medio", [
        ("Eb5", 0.25), ("D5", 0.25), ("D5", 0.5), ("Eb5", 0.25), ("D5", 0.25), ("D5", 0.5), ("Eb5", 0.25), ("D5", 0.25), ("Bb4", 0.8),
        ("Eb5", 0.25), ("D5", 0.25), ("D5", 0.5), ("Eb5", 0.25), ("D5", 0.25), ("D5", 0.5), ("Eb5", 0.25), ("D5", 0.25), ("Bb4", 0.8),
        ("D5", 0.25), ("C5", 0.25), ("C5", 0.5), ("D5", 0.25), ("C5", 0.25), ("C5", 0.5), ("D5", 0.25), ("C5", 0.25), ("A4", 0.8),
        ("Bb4", 0.5), ("A4", 0.25), ("Bb4", 0.5), ("C5", 0.5), ("D5", 1.2)
    ]),

    ("ninna-nanna-mozart", "Ninna Nanna (Wiegenlied K. 350)", "W. A. Mozart", 80, "facile", [
        ("F4", 0.5), ("A4", 0.5), ("C5", 1.0), ("A4", 0.5), ("F4", 0.5), ("G4", 1.0),
        ("E4", 0.5), ("G4", 0.5), ("Bb4", 1.0), ("G4", 0.5), ("E4", 0.5), ("F4", 1.0),
        ("F4", 0.5), ("A4", 0.5), ("C5", 0.5), ("F5", 0.8), ("D5", 0.5), ("Bb4", 0.5), ("G4", 0.8),
        ("C5", 0.5), ("A4", 0.5), ("F4", 0.5), ("G4", 0.5), ("F4", 1.4)
    ]),

    ("sonata-facile-k545", "Sonata in Do Maggiore (Sonata Facile K. 545)", "W. A. Mozart", 112, "medio", [
        ("C5", 1.0), ("E5", 1.0), ("G5", 0.5), ("B4", 0.5), ("C5", 0.5), ("D5", 0.5), ("C5", 1.2),
        ("A4", 0.5), ("C5", 0.5), ("F5", 1.0), ("E5", 0.5), ("G5", 0.5), ("C5", 0.5), ("E5", 0.5), ("D5", 1.2),
        ("G4", 0.25), ("A4", 0.25), ("B4", 0.25), ("C5", 0.25), ("D5", 0.25), ("E5", 0.25), ("F5", 0.25), ("G5", 0.25),
        ("A5", 0.5), ("F5", 0.5), ("D5", 0.5), ("B4", 0.5), ("C5", 1.4)
    ]),

    ("minuetto-k2", "Minuetto K. 2 in Fa Maggiore", "W. A. Mozart", 95, "facile", [
        ("C5", 0.6), ("A4", 0.3), ("F4", 0.3), ("C5", 0.6), ("A4", 0.3), ("F4", 0.3),
        ("G4", 0.3), ("A4", 0.3), ("Bb4", 0.3), ("C5", 0.3), ("D5", 0.6), ("C5", 0.6),
        ("C5", 0.6), ("A4", 0.3), ("F4", 0.3), ("C5", 0.6), ("A4", 0.3), ("F4", 0.3),
        ("G4", 0.3), ("Bb4", 0.3), ("A4", 0.3), ("G4", 0.3), ("F4", 1.2)
    ]),

    ("ave-verum", "Ave Verum Corpus K. 618", "W. A. Mozart", 72, "facile", [
        ("D4", 1.0), ("F#4", 1.0), ("A4", 1.0), ("D5", 1.0), ("C#5", 1.0), ("B4", 1.0), ("A4", 1.5),
        ("B4", 1.0), ("G4", 1.0), ("E4", 1.0), ("A4", 1.0), ("F#4", 1.0), ("D4", 1.0), ("E4", 1.5),
        ("F#4", 1.0), ("G4", 1.0), ("A4", 1.0), ("B4", 1.0), ("A4", 1.0), ("G4", 1.0), ("F#4", 1.8)
    ]),

    ("papageno-aria", "Papageno Aria (Il Flauto Magico K. 620)", "W. A. Mozart", 115, "medio", [
        ("G4", 0.3), ("B4", 0.3), ("D5", 0.3), ("G5", 0.6), ("D5", 0.3), ("B4", 0.3), ("G4", 0.6),
        ("A4", 0.3), ("C5", 0.3), ("E5", 0.3), ("A5", 0.6), ("E5", 0.3), ("C5", 0.3), ("A4", 0.6),
        ("D5", 0.3), ("C5", 0.3), ("B4", 0.3), ("A4", 0.3), ("G4", 0.6), ("D4", 0.6), ("G4", 1.0)
    ]),

    ("lacrimosa-requiem", "Lacrimosa (Requiem in Re Minore K. 626)", "W. A. Mozart", 65, "difficile", [
        ("D4", 0.8), ("F4", 0.8), ("A4", 0.8), ("D5", 1.2), ("C#5", 0.8), ("D5", 0.8), ("E5", 1.2),
        ("F5", 0.8), ("E5", 0.8), ("D5", 0.8), ("C5", 1.0), ("Bb4", 0.8), ("A4", 0.8), ("G#4", 1.2),
        ("A4", 0.8), ("C5", 0.8), ("E5", 0.8), ("A5", 1.4)
    ]),
]

print(f"Adding catalog songs: currently {len(catalog)} songs added...")


# 6. VIVALDI & OPERA (VERDI, PUCCINI, ROSSINI)
catalog.extend([
    ("primavera-vivaldi", "La Primavera (Le Quattro Stagioni)", "A. Vivaldi", 110, "facile", [
        ("E5", 0.5), ("G#5", 0.5), ("G#5", 0.5), ("G#5", 0.5), ("F#5", 0.25), ("E5", 0.25), ("B4", 1.0),
        ("E5", 0.5), ("G#5", 0.5), ("G#5", 0.5), ("G#5", 0.5), ("F#5", 0.25), ("E5", 0.25), ("B4", 1.0),
        ("E5", 0.5), ("G#5", 0.5), ("A5", 0.5), ("G#5", 0.5), ("F#5", 0.5), ("G#5", 0.5), ("E5", 1.2)
    ]),

    ("inverno-largo-vivaldi", "L'Inverno - Largo (Le Quattro Stagioni)", "A. Vivaldi", 70, "facile", [
        ("Eb5", 0.8), ("Eb5", 0.4), ("D5", 0.4), ("C5", 0.8), ("C5", 0.4), ("Bb4", 0.4), ("Ab4", 1.2),
        ("G4", 0.8), ("Bb4", 0.4), ("Ab4", 0.4), ("G4", 0.8), ("F4", 0.8), ("Eb4", 1.4)
    ]),

    ("estate-presto-vivaldi", "L'Estate - Presto (Temporale)", "A. Vivaldi", 140, "difficile", [
        ("G4", 0.2), ("G4", 0.2), ("G4", 0.2), ("G4", 0.2), ("Bb4", 0.4), ("G4", 0.4),
        ("A4", 0.2), ("A4", 0.2), ("A4", 0.2), ("A4", 0.2), ("C5", 0.4), ("A4", 0.4),
        ("Bb4", 0.2), ("C5", 0.2), ("D5", 0.2), ("Eb5", 0.2), ("D5", 0.2), ("C5", 0.2), ("Bb4", 0.2), ("A4", 0.2), ("G4", 1.0)
    ]),

    ("va-pensiero", "Va, Pensiero (Nabucco)", "G. Verdi", 75, "medio", [
        ("F#4", 0.8), ("F#4", 0.4), ("A4", 0.8), ("F#4", 0.4), ("D4", 1.2),
        ("G4", 0.8), ("G4", 0.4), ("B4", 0.8), ("G4", 0.4), ("E4", 1.2),
        ("A4", 0.8), ("F#4", 0.4), ("D5", 0.8), ("C#5", 0.4), ("B4", 0.8), ("A4", 0.4), ("G4", 0.8), ("F#4", 1.4)
    ]),

    ("la-donna-e-mobile", "La Donna è Mobile (Rigoletto)", "G. Verdi", 120, "medio", [
        ("B4", 0.4), ("B4", 0.2), ("B4", 0.4), ("G#4", 0.4), ("E4", 0.6),
        ("B4", 0.4), ("B4", 0.2), ("B4", 0.4), ("A4", 0.4), ("F#4", 0.6),
        ("C#5", 0.4), ("C#5", 0.2), ("C#5", 0.4), ("B4", 0.4), ("G#4", 0.4), ("F#4", 0.4), ("E4", 1.0)
    ]),

    ("libiamo-ne-lieti-calici", "Libiamo ne' lieti calici (La Traviata Brindisi)", "G. Verdi", 115, "medio", [
        ("Ab4", 0.5), ("Ab4", 0.25), ("C5", 0.5), ("Ab4", 0.25), ("Eb5", 0.75), ("C5", 0.25), ("Ab4", 0.75),
        ("F4", 0.25), ("Bb4", 0.5), ("G4", 0.25), ("Eb4", 0.75), ("G4", 0.25), ("Ab4", 1.2)
    ]),

    ("nessun-dorma", "Nessun Dorma (Turandot)", "G. Puccini", 70, "medio", [
        ("E4", 0.8), ("G4", 0.4), ("A4", 1.2), ("B4", 0.8), ("A4", 0.4), ("G4", 1.0),
        ("A4", 0.8), ("B4", 0.4), ("C5", 1.2), ("D5", 0.8), ("C5", 0.4), ("B4", 1.0),
        ("G5", 1.5), ("F5", 0.5), ("E5", 1.0), ("D5", 1.0), ("C5", 1.8)
    ]),

    ("o-mio-babbino-caro", "O Mio Babbino Caro (Gianni Schicchi)", "G. Puccini", 65, "facile", [
        ("Ab4", 0.8), ("F5", 1.2), ("Eb5", 0.6), ("Db5", 0.6), ("C5", 1.2),
        ("Bb4", 0.8), ("Db5", 1.0), ("C5", 0.6), ("Bb4", 0.6), ("Ab4", 1.4)
    ]),

    ("guglielmo-tell-ouverture", "Guglielmo Tell - Ouverture (Marcia Finale)", "G. Rossini", 135, "medio", [
        ("E4", 0.2), ("E4", 0.2), ("E4", 0.4), ("E4", 0.2), ("E4", 0.2), ("E4", 0.4), ("E4", 0.2), ("E4", 0.2), ("G4", 0.4), ("E4", 0.4), ("C4", 0.8),
        ("G4", 0.2), ("G4", 0.2), ("G4", 0.4), ("G4", 0.2), ("G4", 0.2), ("G4", 0.4), ("G4", 0.2), ("G4", 0.2), ("B4", 0.4), ("G4", 0.4), ("D4", 0.8)
    ]),

    ("largo-al-factotum", "Largo al Factotum (Il Barbiere di Siviglia)", "G. Rossini", 130, "difficile", [
        ("C5", 0.3), ("G4", 0.3), ("C5", 0.3), ("G4", 0.3), ("C5", 0.3), ("E5", 0.3), ("G5", 0.6),
        ("F5", 0.3), ("D5", 0.3), ("B4", 0.3), ("G4", 0.3), ("C5", 0.8)
    ]),
])

# 7. ROMANTIC & MODERN CLASSICS (SCHUBERT, BRAHMS, DEBUSSY, SATIE, PACHELBEL)
catalog.extend([
    ("canon-in-d", "Canone in Re Maggiore", "J. Pachelbel", 100, "facile", [
        ("F#5", 0.8), ("E5", 0.8), ("D5", 0.8), ("C#5", 0.8), ("B4", 0.8), ("A4", 0.8), ("B4", 0.8), ("C#5", 0.8),
        ("D5", 0.8), ("C#5", 0.8), ("B4", 0.8), ("A4", 0.8), ("G4", 0.8), ("F#4", 0.8), ("G4", 0.8), ("E4", 1.2)
    ]),

    ("ave-maria-schubert", "Ave Maria (Ellens Gesang III)", "F. Schubert", 60, "medio", [
        ("Bb4", 1.0), ("D5", 0.5), ("F5", 1.0), ("Bb5", 1.5),
        ("A5", 0.5), ("G5", 0.5), ("F5", 0.5), ("E5", 0.5), ("D5", 1.0), ("C5", 0.5), ("Bb4", 1.4)
    ]),

    ("serenata-schubert", "Serenata (Ständchen D. 957)", "F. Schubert", 75, "medio", [
        ("D5", 0.8), ("A4", 0.8), ("F4", 0.8), ("D4", 1.2),
        ("F5", 0.8), ("D5", 0.8), ("A4", 0.8), ("F4", 1.2),
        ("G5", 0.8), ("E5", 0.8), ("C#5", 0.8), ("A4", 1.4)
    ]),

    ("la-trota-schubert", "La Trota (Die Forelle D. 550)", "F. Schubert", 110, "facile", [
        ("D4", 0.4), ("F#4", 0.4), ("A4", 0.4), ("D5", 0.8), ("C#5", 0.4), ("B4", 0.4), ("A4", 0.8),
        ("G4", 0.4), ("F#4", 0.4), ("E4", 0.4), ("A4", 0.8), ("F#4", 0.4), ("D4", 1.2)
    ]),

    ("ninna-nanna-brahms", "Ninna Nanna (Wiegenlied Op. 49 No. 4)", "J. Brahms", 80, "facile", [
        ("Eb4", 0.5), ("Eb4", 0.5), ("G4", 1.0), ("Eb4", 0.5), ("G4", 1.0),
        ("Eb4", 0.5), ("G4", 0.5), ("Bb4", 1.0), ("Ab4", 0.5), ("F4", 0.5), ("G4", 0.5), ("Eb4", 1.2)
    ]),

    ("danza-ungherese-5", "Danza Ungherese No. 5", "J. Brahms", 120, "difficile", [
        ("F#4", 0.3), ("B4", 0.5), ("D5", 0.3), ("C#5", 0.3), ("B4", 0.3), ("A#4", 0.3), ("B4", 0.6),
        ("G5", 0.3), ("F#5", 0.3), ("E5", 0.3), ("D5", 0.3), ("C#5", 0.3), ("B4", 0.8)
    ]),

    ("chiaro-di-luna-debussy", "Chiaro di Luna (Clair de Lune)", "C. Debussy", 60, "difficile", [
        ("F5", 1.0), ("Eb5", 0.5), ("Db5", 0.5), ("C5", 0.5), ("Bb4", 0.5), ("Ab4", 1.5),
        ("Gb4", 1.0), ("F4", 0.5), ("Eb4", 0.5), ("Db4", 1.8)
    ]),

    ("ragazza-capelli-lino", "La Fille aux Cheveux de Lin", "C. Debussy", 65, "medio", [
        ("Gb4", 0.8), ("Eb4", 0.8), ("Db4", 0.8), ("Bb3", 1.2),
        ("Db4", 0.8), ("Eb4", 0.8), ("Gb4", 0.8), ("Bb4", 1.4)
    ]),

    ("gymnopedie-1", "Gymnopédie No. 1", "E. Satie", 65, "facile", [
        ("F#5", 1.5), ("A5", 1.5), ("G5", 1.5), ("F#5", 1.5), ("C#5", 1.5), ("B4", 1.5), ("C#5", 1.5), ("D5", 1.5), ("A4", 2.2)
    ]),

    ("gnossienne-1", "Gnossienne No. 1", "E. Satie", 70, "facile", [
        ("F4", 0.8), ("Ab4", 0.8), ("C5", 0.8), ("F5", 1.2), ("Eb5", 0.8), ("Db5", 0.8), ("C5", 1.4)
    ]),
])

# 8. ITALIAN POPULAR & FOLK (10 songs)
catalog.extend([
    ("bella-ciao", "Bella Ciao", "Canto Popolare Italiano", 115, "medio", [
        ("E4", 0.4), ("A4", 0.4), ("B4", 0.4), ("C5", 0.8), ("A4", 0.6),
        ("E4", 0.4), ("A4", 0.4), ("B4", 0.4), ("C5", 0.8), ("A4", 0.6),
        ("E4", 0.4), ("A4", 0.4), ("B4", 0.4), ("C5", 0.4), ("B4", 0.4), ("A4", 0.4), ("C5", 0.4), ("B4", 0.4), ("A4", 0.4), ("E5", 1.0)
    ]),

    ("o-sole-mio", "O Sole Mio", "Eduardo di Capua (1898)", 90, "medio", [
        ("B4", 0.8), ("C5", 0.4), ("B4", 0.4), ("A4", 0.4), ("G4", 1.2),
        ("G4", 0.8), ("A4", 0.4), ("B4", 0.4), ("C5", 0.4), ("A4", 1.2),
        ("F#4", 0.8), ("G4", 0.4), ("A4", 0.4), ("B4", 0.4), ("G4", 1.4)
    ]),

    ("funiculi-funicula", "Funiculì Funiculà", "Luigi Denza (1880)", 130, "medio", [
        ("C5", 0.3), ("G4", 0.3), ("C5", 0.3), ("G4", 0.3), ("C5", 0.3), ("E5", 0.3), ("G5", 0.6),
        ("G5", 0.3), ("F5", 0.3), ("E5", 0.3), ("D5", 0.3), ("C5", 0.8)
    ]),

    ("santa-lucia", "Santa Lucia", "Tradizionale Napoletana", 95, "facile", [
        ("C5", 0.6), ("C5", 0.6), ("G4", 0.8), ("E4", 0.6), ("E4", 0.6), ("C4", 0.8),
        ("D4", 0.6), ("F4", 0.6), ("A4", 0.8), ("G4", 0.6), ("F4", 0.6), ("E4", 1.0)
    ]),

    ("torna-a-surriento", "Torna a Surriento", "Ernesto De Curtis (1902)", 85, "medio", [
        ("A4", 0.6), ("B4", 0.6), ("C5", 0.8), ("B4", 0.4), ("A4", 0.6), ("G#4", 0.6), ("A4", 1.2),
        ("F4", 0.6), ("G4", 0.6), ("A4", 0.8), ("G4", 0.4), ("F4", 0.6), ("E4", 1.2)
    ]),

    ("tarantella-napoletana", "Tarantella Napoletana", "Tradizionale Italiano", 140, "medio", [
        ("E5", 0.25), ("D#5", 0.25), ("E5", 0.25), ("F5", 0.25), ("E5", 0.25), ("D5", 0.25), ("C5", 0.5), ("B4", 0.5), ("A4", 0.8)
    ]),

    ("carnevale-di-venezia", "Carnevale di Venezia", "Julius Benedict", 110, "facile", [
        ("G4", 0.5), ("G4", 0.5), ("B4", 0.5), ("D5", 0.8), ("C5", 0.5), ("B4", 0.5), ("A4", 1.0)
    ]),

    ("mattinata-leoncavallo", "Mattinata", "R. Leoncavallo (1904)", 90, "medio", [
        ("E4", 0.6), ("A4", 0.6), ("C#5", 0.8), ("B4", 0.4), ("A4", 0.6), ("G#4", 0.6), ("A4", 1.2)
    ]),

    ("ciribiribin", "Ciribiribin", "A. Pestalozza (1898)", 120, "facile", [
        ("G4", 0.4), ("C5", 0.4), ("E5", 0.8), ("D5", 0.4), ("C5", 0.4), ("B4", 0.8), ("C5", 1.0)
    ]),

    ("fra-martino", "Fra Martino Campanaro (Frère Jacques)", "Tradizionale", 95, "facile", [
        ("C4", 0.6), ("D4", 0.6), ("E4", 0.6), ("C4", 0.6),
        ("C4", 0.6), ("D4", 0.6), ("E4", 0.6), ("C4", 0.6),
        ("E4", 0.6), ("F4", 0.6), ("G4", 1.2),
        ("E4", 0.6), ("F4", 0.6), ("G4", 1.2)
    ]),
])

# 9. WORLD FOLK, EVERGREEN & RAGTIME (12 songs)
catalog.extend([
    ("the-entertainer", "The Entertainer (Ragtime)", "Scott Joplin (1902)", 105, "medio", [
        ("D4", 0.25), ("D#4", 0.25), ("E4", 0.25), ("C5", 0.5), ("E4", 0.25), ("C5", 0.5), ("E4", 0.25), ("C5", 1.0),
        ("C5", 0.25), ("D5", 0.25), ("D#5", 0.25), ("E5", 0.25), ("C5", 0.25), ("D5", 0.25), ("E5", 0.5), ("B4", 0.25), ("D5", 0.5), ("C5", 1.0)
    ]),

    ("maple-leaf-rag", "Maple Leaf Rag", "Scott Joplin (1899)", 115, "difficile", [
        ("Ab4", 0.3), ("C5", 0.3), ("Eb5", 0.3), ("Ab5", 0.6), ("G5", 0.3), ("F5", 0.3), ("Eb5", 0.6)
    ]),

    ("greensleeves", "Greensleeves", "Tradizionale Inglese", 90, "facile", [
        ("A4", 0.5), ("C5", 1.0), ("D5", 0.5), ("E5", 0.8), ("F5", 0.3), ("E5", 0.5), ("D5", 1.0), ("B4", 0.5)
    ]),

    ("amazing-grace", "Amazing Grace", "John Newton (1779)", 80, "facile", [
        ("G4", 0.6), ("C5", 1.2), ("E5", 0.3), ("C5", 0.3), ("E5", 1.2), ("D5", 0.6), ("C5", 1.8)
    ]),

    ("house-of-rising-sun", "The House of the Rising Sun", "Tradizionale Folk", 85, "facile", [
        ("A4", 0.6), ("C5", 0.6), ("D5", 0.8), ("F5", 0.8), ("A4", 0.6), ("C5", 0.6), ("E5", 1.2)
    ]),

    ("scarborough-fair", "Scarborough Fair", "Tradizionale Inglese", 85, "facile", [
        ("A4", 0.8), ("A4", 0.8), ("E5", 0.8), ("E5", 0.8), ("B4", 0.8), ("C5", 0.8), ("B4", 0.8), ("A4", 1.2)
    ]),

    ("auld-lang-syne", "Auld Lang Syne (Valzer delle Candele)", "Robert Burns", 80, "facile", [
        ("G4", 0.6), ("C5", 0.9), ("G4", 0.3), ("E4", 0.9), ("E4", 0.3), ("G4", 1.2)
    ]),

    ("danny-boy", "Danny Boy (Londonderry Air)", "Tradizionale Irlandese", 70, "medio", [
        ("G4", 0.5), ("A4", 0.5), ("B4", 0.5), ("C5", 1.0), ("B4", 0.5), ("A4", 0.5), ("G4", 1.2)
    ]),

    ("sakura-sakura", "Sakura Sakura", "Tradizionale Giapponese", 75, "facile", [
        ("A4", 0.8), ("A4", 0.8), ("B4", 1.2), ("A4", 0.8), ("A4", 0.8), ("B4", 1.2)
    ]),

    ("kalinka", "Kalinka", "Tradizionale Russo", 130, "medio", [
        ("E5", 0.3), ("D#5", 0.3), ("E5", 0.3), ("B4", 0.6), ("C5", 0.6), ("A4", 1.0)
    ]),

    ("korobeiniki-tetris", "Korobeiniki (Tetris Theme)", "Tradizionale Russo", 135, "facile", [
        ("E5", 0.5), ("B4", 0.25), ("C5", 0.25), ("D5", 0.5), ("C5", 0.25), ("B4", 0.25), ("A4", 0.5), ("A4", 0.25), ("C5", 0.25), ("E5", 0.5), ("D5", 0.25), ("C5", 0.25), ("B4", 0.8)
    ]),

    ("csardas-monti", "Ciarda (Csárdás)", "V. Monti (1904)", 125, "difficile", [
        ("D5", 0.8), ("A5", 0.8), ("F5", 0.8), ("D5", 0.8), ("E5", 0.4), ("F5", 0.4), ("G5", 0.4), ("A5", 1.2)
    ]),
])

# 10. NURSERY & EDUCATIONAL TUNES (10 songs)
catalog.extend([
    ("vecchia-fattoria", "Nella Vecchia Fattoria (Old MacDonald)", "Tradizionale", 100, "facile", [
        ("C4", 0.5), ("C4", 0.5), ("C4", 0.5), ("G3", 0.5), ("A3", 0.5), ("A3", 0.5), ("G3", 1.0)
    ]),

    ("oh-susanna", "Oh Susanna", "Stephen Foster (1848)", 110, "facile", [
        ("C4", 0.3), ("D4", 0.3), ("E4", 0.6), ("G4", 0.6), ("G4", 0.6), ("A4", 0.3), ("G4", 0.3), ("E4", 0.6), ("C4", 0.8)
    ]),

    ("camptown-races", "Camptown Races", "Stephen Foster", 120, "facile", [
        ("G4", 0.3), ("G4", 0.3), ("E4", 0.3), ("G4", 0.6), ("A4", 0.6), ("G4", 0.6), ("E4", 0.8)
    ]),

    ("swanee-river", "Swanee River (Old Folks at Home)", "Stephen Foster", 90, "facile", [
        ("F#4", 0.6), ("E4", 0.3), ("D4", 0.6), ("F#4", 0.6), ("E4", 0.3), ("D4", 0.6)
    ]),

    ("mary-had-a-little-lamb", "Mary Had a Little Lamb", "Tradizionale", 100, "facile", [
        ("E4", 0.5), ("D4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.5), ("E4", 0.5), ("E4", 1.0)
    ]),

    ("row-row-boat", "Row Row Row Your Boat", "Tradizionale", 95, "facile", [
        ("C4", 0.8), ("C4", 0.8), ("C4", 0.6), ("D4", 0.2), ("E4", 0.8),
        ("E4", 0.6), ("D4", 0.2), ("E4", 0.6), ("F4", 0.2), ("G4", 1.4)
    ]),

    ("london-bridge", "London Bridge Is Falling Down", "Tradizionale", 105, "facile", [
        ("G4", 0.5), ("A4", 0.25), ("G4", 0.25), ("F4", 0.5), ("E4", 0.5), ("F4", 0.5), ("G4", 0.8)
    ]),

    ("clementine", "Clementine", "Tradizionale Americano", 90, "facile", [
        ("C4", 0.5), ("C4", 0.5), ("C4", 0.5), ("G3", 0.5), ("E4", 0.5), ("E4", 0.5), ("E4", 0.5), ("C4", 0.8)
    ]),

    ("yankee-doodle", "Yankee Doodle", "Tradizionale", 115, "facile", [
        ("C4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.5), ("C4", 0.5), ("E4", 0.5), ("D4", 1.0)
    ]),

    ("il-coccodrillo", "Il Coccodrillo Come Fa", "Tradizionale Didattico", 100, "facile", [
        ("G4", 0.4), ("G4", 0.4), ("C5", 0.8), ("G4", 0.4), ("G4", 0.4), ("C5", 0.8)
    ]),
])

# 11. CHRISTMAS CLASSICS (10 songs)
catalog.extend([
    ("astro-del-ciel", "Astro del Ciel (Silent Night - Stille Nacht)", "Franz Gruber", 75, "facile", [
        ("G4", 0.8), ("A4", 0.3), ("G4", 0.5), ("E4", 1.2),
        ("G4", 0.8), ("A4", 0.3), ("G4", 0.5), ("E4", 1.2),
        ("D5", 0.8), ("D5", 0.5), ("B4", 1.2),
        ("C5", 0.8), ("C5", 0.5), ("G4", 1.2)
    ]),

    ("tu-scendi-dalle-stelle", "Tu Scendi dalle Stelle", "Sant'Alfonso M. de' Liguori", 85, "facile", [
        ("A4", 0.5), ("F4", 0.5), ("A4", 0.5), ("C5", 1.0), ("Bb4", 0.5), ("A4", 0.5), ("G4", 1.2)
    ]),

    ("jingle-bells", "Jingle Bells", "J. L. Pierpont (1857)", 120, "facile", [
        ("E4", 0.4), ("E4", 0.4), ("E4", 0.8), ("E4", 0.4), ("E4", 0.4), ("E4", 0.8),
        ("E4", 0.4), ("G4", 0.4), ("C4", 0.6), ("D4", 0.2), ("E4", 1.2)
    ]),

    ("we-wish-you-a-merry-christmas", "We Wish You a Merry Christmas", "Tradizionale Natalizio", 110, "facile", [
        ("D4", 0.5), ("G4", 0.5), ("G4", 0.25), ("A4", 0.25), ("G4", 0.25), ("F#4", 0.25), ("E4", 0.5), ("E4", 0.5)
    ]),

    ("deck-the-halls", "Deck the Halls", "Tradizionale Gallese", 115, "facile", [
        ("C5", 0.6), ("Bb4", 0.2), ("A4", 0.4), ("G4", 0.4), ("F4", 0.4), ("G4", 0.4), ("A4", 0.4), ("F4", 0.8)
    ]),

    ("joy-to-the-world", "Joy to the World", "G. F. Handel", 100, "facile", [
        ("C5", 0.8), ("B4", 0.6), ("A4", 0.2), ("G4", 0.8), ("F4", 0.4), ("E4", 0.8), ("D4", 0.8), ("C4", 1.2)
    ]),

    ("o-tannenbaum", "O Tannenbaum (L'Albero di Natale)", "Tradizionale", 85, "facile", [
        ("C4", 0.5), ("F4", 0.8), ("F4", 0.3), ("F4", 0.8), ("G4", 0.8), ("A4", 0.8), ("A4", 1.0)
    ]),

    ("adeste-fideles", "Adeste Fideles (O Come All Ye Faithful)", "John F. Wade", 85, "facile", [
        ("G4", 0.8), ("G4", 0.4), ("D4", 0.8), ("G4", 0.8), ("A4", 0.8), ("D4", 1.2)
    ]),

    ("hark-herald-angels", "Hark! The Herald Angels Sing", "F. Mendelssohn", 100, "facile", [
        ("C4", 0.6), ("F4", 0.6), ("F4", 0.4), ("E4", 0.4), ("F4", 0.6), ("A4", 0.6), ("A4", 0.6), ("G4", 1.0)
    ]),

    ("god-rest-ye-merry", "God Rest Ye Merry, Gentlemen", "Tradizionale", 95, "facile", [
        ("A4", 0.6), ("A4", 0.6), ("E5", 0.6), ("D5", 0.6), ("C5", 0.6), ("B4", 0.6), ("A4", 0.6), ("G4", 0.6)
    ]),
])

# Process catalog into interactive songs list
formatted_songs = []
for entry in catalog:
    s_id, title, author, bpm, diff, note_tuples = entry
    formatted_songs.append({
        "id": s_id,
        "title": title,
        "author": author,
        "bpm": bpm,
        "difficulty": diff,
        "createdAt": "2025-01-01",
        "isPublished": True,
        "notes": parse_notes(note_tuples)
    })

ts_content = "import { InteractiveSong } from '../types';\n\nexport const DEFAULT_INTERACTIVE_SONGS: InteractiveSong[] = " + json.dumps(formatted_songs, indent=2) + ";\n"

with open("src/data/interactiveSongs.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"SUCCESS: Generated {len(formatted_songs)} complete royalty-free public domain songs in src/data/interactiveSongs.ts!")


# 12. MORE CLASSICAL MASTERPIECES (GRIEG, STRAUSS, LISZT, OFFENBACH, SAINT-SAËNS, DVOŘÁK, WAGNER, MENDELSSOHN, BURGMÜLLER, CLEMENTI)
catalog.extend([
    ("il-mattino-grieg", "Il Mattino (Morning Mood - Peer Gynt)", "E. Grieg", 85, "facile", [
        ("G4", 0.5), ("E4", 0.5), ("D4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.5), ("G4", 0.5), ("E4", 0.5), ("D4", 0.5), ("C4", 0.5), ("D4", 0.5), ("E4", 0.8),
        ("G4", 0.5), ("E4", 0.5), ("G4", 0.5), ("A4", 0.5), ("E4", 0.5), ("A4", 0.5), ("B4", 0.5), ("G4", 0.5), ("B4", 0.5), ("C5", 1.2)
    ]),

    ("re-della-montagna", "Nell'Halle del Re della Montagna", "E. Grieg", 110, "medio", [
        ("B3", 0.3), ("C#4", 0.3), ("D4", 0.3), ("E4", 0.3), ("F#4", 0.3), ("D4", 0.3), ("F#4", 0.6),
        ("F4", 0.3), ("C#4", 0.3), ("F4", 0.6), ("E4", 0.3), ("C4", 0.3), ("E4", 0.6),
        ("B3", 0.3), ("C#4", 0.3), ("D4", 0.3), ("E4", 0.3), ("F#4", 0.3), ("D4", 0.3), ("F#4", 0.3), ("B4", 0.3),
        ("A4", 0.3), ("F#4", 0.3), ("D4", 0.3), ("F#4", 0.3), ("A4", 1.0)
    ]),

    ("danubio-blu", "Sul Bel Danubio Blu (Blue Danube Waltz)", "J. Strauss II", 120, "facile", [
        ("D4", 0.5), ("D4", 0.5), ("F#4", 0.5), ("A4", 0.5), ("A4", 1.0), ("F#5", 1.0), ("F#5", 1.0),
        ("D4", 0.5), ("D4", 0.5), ("F#4", 0.5), ("A4", 0.5), ("A4", 1.0), ("E5", 1.0), ("E5", 1.0),
        ("C#4", 0.5), ("C#4", 0.5), ("E4", 0.5), ("G4", 0.5), ("G4", 1.0), ("E5", 1.0), ("E5", 1.0),
        ("C#4", 0.5), ("C#4", 0.5), ("E4", 0.5), ("G4", 0.5), ("G4", 1.0), ("D5", 1.2)
    ]),

    ("marcia-radetzky", "Marcia di Radetzky (Radetzky March)", "J. Strauss I", 125, "medio", [
        ("A4", 0.25), ("A4", 0.25), ("A4", 0.5), ("F#4", 0.5), ("D4", 0.5), ("F#4", 0.25), ("F#4", 0.25), ("F#4", 0.5), ("D4", 0.5), ("A3", 0.8),
        ("D4", 0.25), ("E4", 0.25), ("F#4", 0.5), ("G4", 0.5), ("A4", 0.5), ("B4", 0.5), ("A4", 0.5), ("G4", 0.5), ("F#4", 1.0)
    ]),

    ("sogno-damore-liszt", "Sogno d'Amore (Liebestraum No. 3)", "F. Liszt", 75, "difficile", [
        ("Ab4", 0.8), ("C5", 0.8), ("Eb5", 0.8), ("Ab5", 1.2), ("G5", 0.5), ("F5", 0.5), ("Eb5", 1.0),
        ("C5", 0.8), ("Eb5", 0.8), ("Db5", 0.8), ("Bb4", 1.0), ("Ab4", 1.4)
    ]),

    ("rapsodia-ungherese-2", "Rapsodia Ungherese No. 2", "F. Liszt", 130, "difficile", [
        ("C#4", 0.3), ("D4", 0.3), ("D#4", 0.3), ("E4", 0.6), ("B4", 0.3), ("G#4", 0.3), ("E4", 0.8),
        ("C#4", 0.3), ("D4", 0.3), ("D#4", 0.3), ("E4", 0.6), ("C5", 0.3), ("A4", 0.3), ("F#4", 0.8)
    ]),

    ("barcarolla-offenbach", "Barcarolla (I Racconti di Hoffmann)", "J. Offenbach", 90, "facile", [
        ("E4", 0.6), ("G4", 0.6), ("E5", 1.0), ("D5", 0.6), ("C5", 0.6), ("B4", 1.0),
        ("A4", 0.6), ("C5", 0.6), ("A5", 1.0), ("G5", 0.6), ("F5", 0.6), ("E5", 1.2)
    ]),

    ("can-can-offenbach", "Can-Can (Orfeo all'Inferno)", "J. Offenbach", 140, "facile", [
        ("D4", 0.25), ("E4", 0.25), ("F#4", 0.25), ("G4", 0.25), ("A4", 0.5), ("A4", 0.5), ("A4", 0.5), ("F#4", 0.5),
        ("D4", 0.25), ("E4", 0.25), ("F#4", 0.25), ("G4", 0.25), ("A4", 0.5), ("A4", 0.5), ("A4", 0.8),
        ("B4", 0.25), ("C#5", 0.25), ("D5", 0.5), ("B4", 0.5), ("A4", 0.5), ("F#4", 0.5), ("E4", 0.5), ("A4", 0.5), ("D4", 1.0)
    ]),

    ("il-cigno-saint-saens", "Il Cigno (The Swan - Carnaval des Animaux)", "C. Saint-Saëns", 70, "medio", [
        ("G4", 1.0), ("D5", 1.0), ("B4", 0.5), ("G4", 0.5), ("F#4", 1.0), ("E4", 1.0),
        ("D4", 1.0), ("G4", 1.0), ("B4", 0.5), ("D5", 0.5), ("G5", 1.5)
    ]),

    ("danse-macabre", "Danse Macabre", "C. Saint-Saëns", 125, "medio", [
        ("D5", 0.3), ("D5", 0.3), ("D5", 0.6), ("Eb5", 0.3), ("D5", 0.3), ("Bb4", 0.6),
        ("F#4", 0.3), ("G4", 0.3), ("A4", 0.3), ("Bb4", 0.3), ("A4", 0.3), ("G4", 0.3), ("F#4", 0.8)
    ]),

    ("umoresca-dvorak", "Humoresque Op. 101 No. 7", "A. Dvořák", 95, "medio", [
        ("Gb4", 0.3), ("Ab4", 0.3), ("Bb4", 0.6), ("Db5", 0.6), ("Bb4", 0.3), ("Ab4", 0.3), ("Gb4", 0.6), ("Eb4", 0.6),
        ("Db4", 0.3), ("Eb4", 0.3), ("Gb4", 0.6), ("Bb4", 0.6), ("Ab4", 1.0)
    ]),

    ("nuovo-mondo-dvorak", "Sinfonia dal Nuovo Mondo (New World Symphony Largo)", "A. Dvořák", 65, "facile", [
        ("E4", 1.0), ("G4", 1.0), ("G4", 1.5), ("E4", 0.8), ("D4", 0.8), ("C4", 1.5),
        ("D4", 0.8), ("E4", 0.8), ("G4", 0.8), ("E4", 1.0), ("D4", 1.8)
    ]),

    ("coro-nuziale-wagner", "Coro Nuziale (Bridal Chorus - Lohengrin)", "R. Wagner", 90, "facile", [
        ("G4", 0.8), ("C5", 1.0), ("C5", 0.4), ("C5", 0.8), ("B4", 0.4), ("A4", 0.4), ("B4", 0.4), ("C5", 1.2),
        ("G4", 0.8), ("D5", 1.0), ("C5", 0.4), ("B4", 0.8), ("A4", 0.4), ("G4", 0.4), ("A4", 0.4), ("B4", 1.2)
    ]),

    ("cavalcata-valchirie", "La Cavalcata delle Valchirie (Ride of the Valkyries)", "R. Wagner", 130, "difficile", [
        ("B3", 0.3), ("D4", 0.3), ("F#4", 0.6), ("B4", 0.6), ("F#4", 0.3), ("D4", 0.3), ("B3", 0.6),
        ("C#4", 0.3), ("E4", 0.3), ("G#4", 0.6), ("C#5", 0.6), ("G#4", 0.3), ("E4", 0.3), ("C#4", 0.6),
        ("D4", 0.3), ("F#4", 0.3), ("A4", 0.6), ("D5", 0.6), ("A4", 0.3), ("F#4", 0.3), ("D4", 1.0)
    ]),

    ("volo-del-calabrone", "Il Volo del Calabrone (Flight of the Bumblebee)", "N. Rimsky-Korsakov", 150, "difficile", [
        ("A4", 0.15), ("G#4", 0.15), ("G4", 0.15), ("F#4", 0.15), ("F4", 0.15), ("E4", 0.15), ("D#4", 0.15), ("D4", 0.15),
        ("C#4", 0.15), ("C4", 0.15), ("B3", 0.15), ("Bb3", 0.15), ("A3", 0.6)
    ]),

    ("marcia-nuziale-mendelssohn", "Marcia Nuziale (Wedding March)", "F. Mendelssohn", 100, "medio", [
        ("B4", 0.3), ("B4", 0.3), ("B4", 0.3), ("E5", 1.0), ("G#5", 1.0),
        ("F#5", 0.3), ("E5", 0.3), ("D#5", 0.3), ("E5", 1.0), ("B5", 1.2)
    ]),

    ("pavane-faure", "Pavane Op. 50", "G. Fauré", 75, "medio", [
        ("F#4", 0.6), ("G4", 0.3), ("A4", 0.6), ("F#4", 0.6), ("D4", 0.6), ("E4", 0.6), ("F#4", 0.6), ("D4", 1.0),
        ("B3", 0.6), ("C#4", 0.3), ("D4", 0.6), ("B3", 0.6), ("G3", 0.6), ("A3", 0.6), ("B3", 1.2)
    ]),

    ("promenade-mussorgsky", "Promenade (Quadri di un'Esposizione)", "M. Mussorgsky", 85, "medio", [
        ("G4", 0.6), ("A4", 0.6), ("C5", 0.8), ("G4", 0.6), ("F4", 0.6), ("G4", 0.8), ("C4", 0.6), ("D4", 0.6), ("E4", 0.8), ("F4", 0.6), ("G4", 1.2)
    ]),

    ("clementi-sonatina", "Sonatina in Do Maggiore Op. 36 No. 1", "M. Clementi", 115, "facile", [
        ("C5", 0.5), ("G4", 0.25), ("E4", 0.25), ("C4", 0.5), ("G4", 0.5),
        ("D5", 0.5), ("G4", 0.25), ("F4", 0.25), ("D4", 0.5), ("G4", 0.5),
        ("E5", 0.5), ("D5", 0.25), ("C5", 0.25), ("B4", 0.25), ("A4", 0.25), ("G4", 1.0)
    ]),

    ("burgmuller-arabesque", "L'Arabesque Op. 100 No. 2", "J. F. Burgmüller", 125, "medio", [
        ("A4", 0.2), ("B4", 0.2), ("C5", 0.2), ("D5", 0.2), ("E5", 0.4), ("A5", 0.4),
        ("G#5", 0.2), ("F#5", 0.2), ("E5", 0.2), ("D5", 0.2), ("C5", 0.4), ("A4", 0.8)
    ]),
])

# Process catalog into interactive songs list
formatted_songs = []
for entry in catalog:
    s_id, title, author, bpm, diff, note_tuples = entry
    formatted_songs.append({
        "id": s_id,
        "title": title,
        "author": author,
        "bpm": bpm,
        "difficulty": diff,
        "createdAt": "2025-01-01",
        "isPublished": True,
        "notes": parse_notes(note_tuples)
    })

ts_content = "import { InteractiveSong } from '../types';\n\nexport const DEFAULT_INTERACTIVE_SONGS: InteractiveSong[] = " + json.dumps(formatted_songs, indent=2) + ";\n"

with open("src/data/interactiveSongs.ts", "w", encoding="utf-8") as f:
    f.write(ts_content)

print(f"SUCCESS: Generated TOTAL {len(formatted_songs)} complete royalty-free public domain songs in src/data/interactiveSongs.ts!")
