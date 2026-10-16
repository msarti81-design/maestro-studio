import React, { useState, useEffect, useRef } from 'react';
import { SocialRoomMode, MusicalPostcard, SheetSong } from '../types';
import { PRESET_SONGS } from '../data/songs';
import { audioEngine } from '../utils/audioEngine';
import { CanvasPiano } from './CanvasPiano';
import { ALL_PIANO_KEYS } from '../data/pianoKeys';
import {
  Users,
  GraduationCap,
  Sparkles,
  Trophy,
  HelpCircle,
  Radio,
  Send,
  Volume2,
  Flame,
  Award,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  Heart,
  Music,
  Zap,
  Repeat,
  Plus,
  Share2,
  Clock,
  Coins,
  Smile,
  ShieldAlert,
  ArrowRight,
  EyeOff,
} from 'lucide-react';

export const SocialView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SocialRoomMode>('masterclass');

  // Masterclass State
  const [selectedSong, setSelectedSong] = useState<SheetSong>(PRESET_SONGS[0]);
  const [masterclassSpeed, setMasterclassSpeed] = useState<number>(100);
  const [isMasterclassActive, setIsMasterclassActive] = useState<boolean>(false);
  const [currentMasterNoteIdx, setCurrentMasterNoteIdx] = useState<number>(-1);
  const [masterHighlightKeys, setMasterHighlightKeys] = useState<string[]>([]);
  const [waitCorrectNoteMode, setWaitCorrectNoteMode] = useState<boolean>(true);

  // Staffetta / Relay State
  const [relayCurrentTurn, setRelayCurrentTurn] = useState<'giocatore1' | 'giocatore2'>('giocatore1');
  const [relayScore1, setRelayScore1] = useState<number>(0);
  const [relayScore2, setRelayScore2] = useState<number>(0);
  const [relayNotesHistory, setRelayNotesHistory] = useState<{ player: string; note: string; time: string }[]>([]);
  const [relayPenalties, setRelayPenalties] = useState<number>(0);

  // Duet / Quattro Mani State
  const [duetLeftTarget, setDuetLeftTarget] = useState<string>('G2');
  const [duetRightTarget, setDuetRightTarget] = useState<string>('C4');
  const [duetScore, setDuetScore] = useState<number>(0);

  // Piano Battle State
  const [battleScore, setBattleScore] = useState<number>(0);
  const [battleCombo, setBattleCombo] = useState<number>(0);
  const [battleIsFogActive, setBattleIsFogActive] = useState<boolean>(false);
  const [battleTargetNote, setBattleTargetNote] = useState<string>('C4');
  const [battleHitFeedback, setBattleHitFeedback] = useState<string | null>(null);

  // Indovina la Canzone (Name That Tune) State
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState<number>(0);
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Piano Bar Virtuale State
  const [pianobarApplaudCount, setPianobarApplaudCount] = useState<number>(142);
  const [pianobarCoins, setPianobarCoins] = useState<number>(50);
  const [pianobarSongQueue, setPianobarSongQueue] = useState<string[]>([
    'Per Elisa - L. v. Beethoven',
    'Sonata al Chiaro di Luna',
    'Marcia Turca - W. A. Mozart',
  ]);
  const [newRequestInput, setNewRequestInput] = useState<string>('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; symbol: string; x: number }[]>([]);

  // Postcards / Audio-Lettere State
  const [postcardTitle, setPostcardTitle] = useState<string>('Un pensiero in musica 🎵');
  const [postcardMessage, setPostcardMessage] = useState<string>('Ti dedico questa melodia eseguita con il Pianoforte Gran Coda!');
  const [postcardSender, setPostcardSender] = useState<string>('Maestro Anonimo');
  const [postcardTheme, setPostcardTheme] = useState<'gold' | 'night' | 'jazz' | 'rose'>('gold');
  const [postcardsInbox, setPostcardsInbox] = useState<MusicalPostcard[]>([
    {
      id: 'pc_1',
      sender: 'Marco S.',
      recipient: 'Tutti',
      title: 'Bentornato al Pianoforte!',
      message: 'Ecco un piccolo arpeggio di benvenuto in Do Maggiore.',
      melody: [
        { note: 'C4', duration: '4n', time: 0 },
        { note: 'E4', duration: '4n', time: 1 },
        { note: 'G4', duration: '4n', time: 2 },
        { note: 'C5', duration: '2n', time: 3 },
      ],
      bpm: 100,
      createdAt: 'Oggi',
    },
  ]);

  // Masterclass Playback Logic
  const masterclassIntervalRef = useRef<any>(null);

  const startMasterclassPlayback = () => {
    setIsMasterclassActive(true);
    let step = 0;
    const notes = selectedSong.melody;
    const intervalMs = (60 / selectedSong.bpm) * 1000 * (100 / masterclassSpeed);

    if (masterclassIntervalRef.current) clearInterval(masterclassIntervalRef.current);

    masterclassIntervalRef.current = setInterval(() => {
      if (step >= notes.length) {
        clearInterval(masterclassIntervalRef.current);
        setIsMasterclassActive(false);
        setCurrentMasterNoteIdx(-1);
        setMasterHighlightKeys([]);
        return;
      }

      const noteObj = notes[step];
      setCurrentMasterNoteIdx(step);
      setMasterHighlightKeys([noteObj.note]);
      audioEngine.playNote(noteObj.note, noteObj.duration, 'piano');

      step++;
    }, intervalMs);
  };

  const stopMasterclassPlayback = () => {
    if (masterclassIntervalRef.current) clearInterval(masterclassIntervalRef.current);
    setIsMasterclassActive(false);
    setCurrentMasterNoteIdx(-1);
    setMasterHighlightKeys([]);
  };

  // Trigger floating emojis in Piano Bar
  const triggerFloatingEmoji = (symbol: string) => {
    const id = Date.now() + Math.random();
    const x = Math.floor(Math.random() * 80) + 10;
    setFloatingEmojis((prev) => [...prev, { id, symbol, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  };

  // Handle Applause
  const handleAudienceApplause = () => {
    audioEngine.playApplauseSound();
    setPianobarApplaudCount((prev) => prev + 1);
    triggerFloatingEmoji('👏');
    triggerFloatingEmoji('💖');
  };

  // Name That Tune Questions
  const QUIZ_QUESTIONS = [
    {
      song: PRESET_SONGS[0], // Per Elisa
      previewNote: 'E5',
      options: ['Per Elisa', 'Sonata al Chiaro di Luna', 'Inno alla Gioia', 'Marcia Turca'],
      correctIndex: 0,
    },
    {
      song: PRESET_SONGS[1], // Chiaro di Luna
      previewNote: 'C#4',
      options: ['Sinfonia n. 5', 'Sonata al Chiaro di Luna', 'Il Canone di Pachelbel', 'Primavera'],
      correctIndex: 1,
    },
    {
      song: PRESET_SONGS[2], // Marcia Turca
      previewNote: 'B4',
      options: ['Aida', 'Marcia Turca', 'L\'Inverno', 'Nessun Dorma'],
      correctIndex: 1,
    },
  ];

  const currentQuiz = QUIZ_QUESTIONS[quizQuestionIndex % QUIZ_QUESTIONS.length];

  const playQuizSnippet = () => {
    audioEngine.playNote(currentQuiz.previewNote, '2n', 'piano');
    setTimeout(() => audioEngine.playNote('D#5', '4n', 'piano'), 200);
    setTimeout(() => audioEngine.playNote('E5', '4n', 'piano'), 400);
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (quizAnswered) return;
    setQuizAnswered(true);
    if (optionIdx === currentQuiz.correctIndex) {
      setQuizFeedback('correct');
      audioEngine.playChimeSound();
      setQuizScore((prev) => prev + 150 + quizTimer * 10);
    } else {
      setQuizFeedback('wrong');
      audioEngine.playBuzzerSound();
    }
  };

  const handleNextQuizQuestion = () => {
    setQuizQuestionIndex((prev) => prev + 1);
    setQuizAnswered(false);
    setQuizFeedback(null);
    setQuizTimer(15);
  };

  // Staffetta Note Input
  const handleRelayNotePlayed = (note: string) => {
    audioEngine.playNote(note, '4n', 'piano');
    const player = relayCurrentTurn === 'giocatore1' ? 'Giocatore 1' : 'Giocatore 2';
    setRelayNotesHistory((prev) => [{ player, note, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);

    if (relayCurrentTurn === 'giocatore1') {
      setRelayScore1((prev) => prev + 20);
      setRelayCurrentTurn('giocatore2');
    } else {
      setRelayScore2((prev) => prev + 20);
      setRelayCurrentTurn('giocatore1');
    }
  };

  const handleRelayPenalty = () => {
    audioEngine.playBuzzerSound();
    setRelayPenalties((prev) => prev + 1);
  };

  // Battle Hit
  const handleBattleKeyHit = (note: string) => {
    audioEngine.playNote(note, '4n', 'piano');
    if (note === battleTargetNote) {
      const pts = 100 * (battleCombo + 1);
      setBattleScore((prev) => prev + pts);
      setBattleCombo((prev) => prev + 1);
      setBattleHitFeedback('PERFETTO! +' + pts);
      audioEngine.playChimeSound();

      // Pick next target note
      const nextNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
      const next = nextNotes[Math.floor(Math.random() * nextNotes.length)];
      setBattleTargetNote(next);
    } else {
      setBattleCombo(0);
      setBattleHitFeedback('MANCATO! 0 PUNTI');
      audioEngine.playBuzzerSound();
    }

    setTimeout(() => setBattleHitFeedback(null), 1200);
  };

  // Postcard Save
  const handleSavePostcard = () => {
    const newCard: MusicalPostcard = {
      id: `pc_${Date.now()}`,
      sender: postcardSender,
      recipient: 'Amici',
      title: postcardTitle,
      message: postcardMessage,
      melody: [
        { note: 'C4', duration: '4n', time: 0 },
        { note: 'E4', duration: '4n', time: 1 },
        { note: 'G4', duration: '4n', time: 2 },
        { note: 'B4', duration: '4n', time: 3 },
      ],
      bpm: 110,
      createdAt: 'Proprio ora',
    };

    setPostcardsInbox((prev) => [newCard, ...prev]);
    alert('💌 Cartolina Musicale salvata e condivisa con successo!');
  };

  const playPostcardMelody = (card: MusicalPostcard) => {
    card.melody.forEach((m, idx) => {
      setTimeout(() => {
        audioEngine.playNote(m.note, m.duration, 'piano');
      }, idx * 400);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 select-none pb-12">
      {/* BRAND & SECTION HEADER */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            <span>Studio Multi-Utente & Gamification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-2">
            <span>Maestro Social & Challenge</span>
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-slate-400 text-xs max-w-xl">
            Duelli musicali, lezioni maestro-allievo, staffetta a turni, quiz indovina la canzone e sala d'ascolto virtuale.
          </p>
        </div>

        {/* Global Player Level Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-2xl flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Monete Virtuali</div>
              <div className="text-sm font-black text-amber-300">{pianobarCoins} Gelo</div>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-2xl flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Punteggio Duelli</div>
              <div className="text-sm font-black text-yellow-300">{battleScore + quizScore} PTS</div>
            </div>
          </div>
        </div>
      </div>

      {/* REVOLUTIONIZED SOCIAL MENU SELECTOR TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto">
        {[
          { id: 'masterclass', label: 'Masterclass', icon: GraduationCap, tag: 'Didattica' },
          { id: 'relay', label: 'Staffetta', icon: Repeat, tag: 'Coop' },
          { id: 'duet', label: 'Quattro Mani', icon: Users, tag: 'Duetto' },
          { id: 'battle', label: 'Piano Battle', icon: Zap, tag: 'Duello' },
          { id: 'guess', label: 'Indovina Song', icon: HelpCircle, tag: 'Quiz' },
          { id: 'pianobar', label: 'Piano Bar', icon: Radio, tag: 'Live' },
          { id: 'postcards', label: 'Audio-Lettere', icon: Send, tag: 'Social' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SocialRoomMode)}
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold text-center active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-b from-amber-500 to-amber-400 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
              <span className="truncate w-full">{tab.label}</span>
              <span
                className={`text-[8px] uppercase tracking-wider px-1 rounded ${
                  isActive ? 'bg-slate-950/30 text-amber-100' : 'bg-slate-950/60 text-slate-400'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: MASTERCLASS IN-APP (Maestro e Allievo) */}
      {activeTab === 'masterclass' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <span>Modalit&agrave; Maestro e Allievo (Masterclass)</span>
              </h2>
              <p className="text-slate-400 text-xs">
                Il Maestro trasmette le note premute e rallenta l'esecuzione. L'Allievo segue i tasti illuminati in tempo reale.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-bold">Brano Lezione:</span>
              <select
                value={selectedSong.id}
                onChange={(e) => {
                  stopMasterclassPlayback();
                  const found = PRESET_SONGS.find((s) => s.id === e.target.value);
                  if (found) setSelectedSong(found);
                }}
                className="bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-amber-400"
              >
                {PRESET_SONGS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.key})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Controls Bar: Speed & Playback */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <span className="text-xs text-slate-400 font-bold uppercase">Velocit&agrave; Esecuzione:</span>
              <div className="flex items-center gap-1">
                {[50, 75, 100].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setMasterclassSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      masterclassSpeed === spd
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Attesa Tasto Allievo:</span>
              <button
                onClick={() => setWaitCorrectNoteMode(!waitCorrectNoteMode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  waitCorrectNoteMode
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}
              >
                {waitCorrectNoteMode ? 'Guida Attiva ✓' : 'Continuo ➔'}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2">
              {!isMasterclassActive ? (
                <button
                  onClick={startMasterclassPlayback}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/20"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Avvia Lezione Maestro</span>
                </button>
              ) : (
                <button
                  onClick={stopMasterclassPlayback}
                  className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Ferma Dimostrazione</span>
                </button>
              )}
            </div>
          </div>

          {/* Maestro Interactive Piano Keyboard */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>Pianoforte Guidato dall'Insegnante (Premi i tasti per esercitarti):</span>
              {currentMasterNoteIdx >= 0 && (
                <span className="text-amber-400 font-mono">
                  Nota {currentMasterNoteIdx + 1} di {selectedSong.melody.length}: {selectedSong.melody[currentMasterNoteIdx]?.note}
                </span>
              )}
            </div>
            <div className="h-56 bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-2xl relative">
              <CanvasPiano
                keys={ALL_PIANO_KEYS.slice(21, 52)} // Mid 3 octaves
                getTransposedNote={(n) => n}
                currentlyPressedNotesRef={{ current: new Set(masterHighlightKeys) } as any}
                onNoteDown={(n) => {
                  audioEngine.playNote(n, '4n', 'piano');
                }}
                onNoteUp={() => {}}
                sustain={false}
                showWaterfall={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: STAFFETTA MUSICALE (Pass the Melody) */}
      {activeTab === 'relay' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-amber-400" />
                <span>Staffetta Musicale (Pass the Melody)</span>
              </h2>
              <p className="text-slate-400 text-xs">
                Suonate una battuta a testa alternandovi a turno per completare la melodia. Attenzione a non sbagliare nota!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 ${
                  relayCurrentTurn === 'giocatore1'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <span>Turno: Giocatore 1</span>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 ${
                  relayCurrentTurn === 'giocatore2'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <span>Turno: Giocatore 2</span>
              </div>
            </div>
          </div>

          {/* Scores & Penalties */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Giocatore 1</div>
              <div className="text-xl font-black text-amber-400">{relayScore1} PTS</div>
            </div>
            <div>
              <div className="text-[10px] text-red-400 uppercase font-bold">Penalit&agrave; Errori</div>
              <div className="text-xl font-black text-red-400">{relayPenalties}</div>
              <button
                onClick={handleRelayPenalty}
                className="mt-1 text-[9px] bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-0.5 rounded border border-red-500/40"
              >
                Simula Errore ⚠️
              </button>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Giocatore 2</div>
              <div className="text-xl font-black text-emerald-400">{relayScore2} PTS</div>
            </div>
          </div>

          {/* Live Keyboard Input for Relay */}
          <div className="h-52 bg-slate-950 p-2 rounded-2xl border border-slate-800">
            <CanvasPiano
              keys={ALL_PIANO_KEYS.slice(28, 49)}
              getTransposedNote={(n) => n}
              currentlyPressedNotesRef={{ current: new Set() } as any}
              onNoteDown={handleRelayNotePlayed}
              onNoteUp={() => {}}
              sustain={false}
              showWaterfall={false}
            />
          </div>

          {/* Note Feed */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase">Storico Battute Staffetta:</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {relayNotesHistory.length === 0 ? (
                <span className="text-xs text-slate-600 italic">Nessuna nota suonata. Tocca i tasti per iniziare la staffetta!</span>
              ) : (
                relayNotesHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <span className="text-amber-400 font-mono">{h.note}</span>
                    <span className="text-[10px] text-slate-500">({h.player})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3: PIANOFORTE A QUATTRO MANI (Duet) */}
      {activeTab === 'duet' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>Divisione delle Parti (Pianoforte a Quattro Mani)</span>
            </h2>
            <p className="text-slate-400 text-xs">
              Mano Sinistra (Accompagnamento Basso) e Mano Destra (Melodia). Suonate insieme in perfetta armonia!
            </p>
          </div>

          {/* Split Keyboards View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Hand: Bass Accompaniment */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>MANO SINISTRA (Accompagnamento / Basso)</span>
                <span className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px]">
                  Bassi (C2 - B3)
                </span>
              </div>
              <div className="h-44 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <CanvasPiano
                  keys={ALL_PIANO_KEYS.slice(12, 33)}
                  getTransposedNote={(n) => n}
                  currentlyPressedNotesRef={{ current: new Set() } as any}
                  onNoteDown={(n) => {
                    audioEngine.playNote(n, '2n', 'bass');
                    setDuetScore((prev) => prev + 25);
                  }}
                  onNoteUp={() => {}}
                  sustain={false}
                  showWaterfall={false}
                />
              </div>
            </div>

            {/* Right Hand: Piano Melody */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-amber-400">
                <span>MANO DESTRA (Melodia Principale)</span>
                <span className="bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px]">
                  Soprani (C4 - B5)
                </span>
              </div>
              <div className="h-44 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <CanvasPiano
                  keys={ALL_PIANO_KEYS.slice(36, 57)}
                  getTransposedNote={(n) => n}
                  currentlyPressedNotesRef={{ current: new Set() } as any}
                  onNoteDown={(n) => {
                    audioEngine.playNote(n, '4n', 'piano');
                    setDuetScore((prev) => prev + 25);
                  }}
                  onNoteUp={() => {}}
                  sustain={false}
                  showWaterfall={false}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center text-xs font-bold">
            <span className="text-slate-400">Sincronizzazione Armonica Duetto:</span>
            <span className="text-emerald-400 font-mono text-sm">{duetScore} Punti Armonia</span>
          </div>
        </div>
      )}

      {/* MODULE 4: PIANO BATTLE (Duello Musicale "Guitar Hero" Style) */}
      {activeTab === 'battle' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Duelli Musicali (Piano Battle)</span>
              </h2>
              <p className="text-slate-400 text-xs">
                Colpisci le note al momento giusto per accumulare punti combo e lanciare bonus o la nebbia sullo spartito!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setBattleIsFogActive(!battleIsFogActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                  battleIsFogActive
                    ? 'bg-purple-500 text-white font-black animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                }`}
              >
                <EyeOff className="w-4 h-4 text-purple-300" />
                <span>{battleIsFogActive ? 'Nebbia Attiva 🌫️' : 'Lancia Nebbia Opponente'}</span>
              </button>
            </div>
          </div>

          {/* Battle Scoreboard */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Punteggio</div>
              <div className="text-2xl font-black text-amber-400">{battleScore}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Moltiplicatore Combo</div>
              <div className="text-2xl font-black text-emerald-400">x{battleCombo + 1}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Prossima Nota da Colpire</div>
              <div className="text-2xl font-black text-yellow-300 font-mono">{battleTargetNote}</div>
            </div>
          </div>

          {/* Interactive Battle Keyboard with Fog Overlay Option */}
          <div className="relative h-52 bg-slate-950 p-2 rounded-2xl border border-slate-800 overflow-hidden">
            {battleIsFogActive && (
              <div className="absolute inset-0 bg-purple-950/70 backdrop-blur-md z-20 flex items-center justify-center text-purple-200 font-black text-sm pointer-events-none animate-pulse">
                🌫️ NEBBIA BATTAGLIA ATTIVA: Spartito Oscurato!
              </div>
            )}

            {battleHitFeedback && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-4 py-1 rounded-full font-black text-xs z-30 shadow-lg animate-bounce">
                {battleHitFeedback}
              </div>
            )}

            <CanvasPiano
              keys={ALL_PIANO_KEYS.slice(28, 49)}
              getTransposedNote={(n) => n}
              currentlyPressedNotesRef={{ current: new Set([battleTargetNote]) } as any}
              onNoteDown={handleBattleKeyHit}
              onNoteUp={() => {}}
              sustain={false}
              showWaterfall={true}
            />
          </div>
        </div>
      )}

      {/* MODULE 5: INDOVINA LA CANZONE (Name That Tune Quiz) */}
      {activeTab === 'guess' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>Indovina la Canzone (Name That Tune)</span>
            </h2>
            <p className="text-slate-400 text-xs">
              Ascolta l'anteprima audio del brano e indovina il titolo prima che scadano i 15 secondi!
            </p>
          </div>

          {/* Quiz Card */}
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-5 text-center max-w-xl mx-auto">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Domanda {quizQuestionIndex + 1} di {QUIZ_QUESTIONS.length}</span>
              <span className="text-amber-400 font-mono text-sm">Punti Totali: {quizScore}</span>
            </div>

            {/* Audio Snippet Trigger Button */}
            <div className="py-4">
              <button
                onClick={playQuizSnippet}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-2xl shadow-xl flex items-center gap-2 mx-auto transition-all active:scale-95"
              >
                <Volume2 className="w-5 h-5" />
                <span>Ascolta Anteprima Audio 🔊</span>
              </button>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuiz.options.map((opt, idx) => {
                let btnStyle = 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800';
                if (quizAnswered) {
                  if (idx === currentQuiz.correctIndex) {
                    btnStyle = 'bg-emerald-500 text-slate-950 font-black border-emerald-400';
                  } else {
                    btnStyle = 'bg-slate-900 text-slate-600 border-slate-850 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(idx)}
                    disabled={quizAnswered}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-center ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizAnswered && (
              <div className="pt-3">
                <button
                  onClick={handleNextQuizQuestion}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
                >
                  <span>Prossimo Brano</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 6: PIANO BAR VIRTUALE & SALA D'ASCOLTO */}
      {activeTab === 'pianobar' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5 relative overflow-hidden">
          {/* Floating Emoji Layer */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {floatingEmojis.map((e) => (
              <div
                key={e.id}
                className="absolute bottom-10 text-2xl animate-bounce transition-all duration-1000"
                style={{ left: `${e.x}%` }}
              >
                {e.symbol}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400" />
                <span>Sala d'Ascolto & Piano Bar Virtuale</span>
              </h2>
              <p className="text-slate-400 text-xs">
                Ascolta l'esibizione live al pianoforte, fai applausi con audio reale, lancia emoji e richiedi brani in scaletta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAudienceApplause}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/20"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Applaudi 👏 ({pianobarApplaudCount})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Stage View */}
            <div className="md:col-span-2 bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-black text-red-400 uppercase tracking-widest">LIVE SUL PALCO</span>
                </div>
                <span className="text-xs text-slate-400 font-bold">18 Ascoltatori Collegati 🎧</span>
              </div>

              {/* Virtual Stage Graphic */}
              <div className="h-44 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-2 relative overflow-hidden">
                <div className="text-5xl font-serif text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                  🎹 𝄞
                </div>
                <div className="text-sm font-black text-white">Esecuzione in Corso: "Per Elisa - Gran Coda"</div>
                <div className="text-xs text-amber-400 font-medium">Pianista Live: Maestro Virtuale</div>
              </div>

              {/* Interactive Audience Reactions */}
              <div className="flex items-center justify-around bg-slate-900 p-2 rounded-xl border border-slate-800">
                {['👏 Applausi', '🌟 Brava!', '💖 Amore', '🔥 Fuoco', '🍾 Brindisi'].map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      audioEngine.playNote('C5', '8n', 'piano');
                      triggerFloatingEmoji(emoji.split(' ')[0]);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-lg transition-colors active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Song Request Queue */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2">
                  Scaletta e Richieste Brani:
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {pianobarSongQueue.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-between"
                    >
                      <span className="truncate">{s}</span>
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Request Input */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Richiedi un brano..."
                  value={newRequestInput}
                  onChange={(e) => setNewRequestInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => {
                    if (newRequestInput.trim()) {
                      setPianobarSongQueue((prev) => [...prev, newRequestInput.trim()]);
                      setNewRequestInput('');
                    }
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all active:scale-95"
                >
                  Invia Richiesta al Pianista 📜
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 7: MESSAGGI MUSICALI & AUDIO-LETTERE (Postcards) */}
      {activeTab === 'postcards' && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-5">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-400" />
              <span>Messaggi Musicali & Cartoline Interattive (Audio-Lettere)</span>
            </h2>
            <p className="text-slate-400 text-xs">
              Registra una breve melodia al pianoforte, aggiungi una dedica speciale e invia una cartolina musicale riproducibile!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Postcard Creator Form */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Crea Nuova Cartolina Musicale</h3>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Mittente</label>
                <input
                  type="text"
                  value={postcardSender}
                  onChange={(e) => setPostcardSender(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Titolo Cartolina</label>
                <input
                  type="text"
                  value={postcardTitle}
                  onChange={(e) => setPostcardTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Messaggio Dedica</label>
                <textarea
                  rows={3}
                  value={postcardMessage}
                  onChange={(e) => setPostcardMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <button
                onClick={handleSavePostcard}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl transition-all active:scale-95 shadow-md"
              >
                Invia e Salva Cartolina Musicale 💌
              </button>
            </div>

            {/* Postcards Inbox List */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Cartoline Musicali Ricevute ({postcardsInbox.length})
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {postcardsInbox.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl space-y-2 shadow-md"
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-amber-300">{card.title}</span>
                      <span className="text-[10px] text-slate-500">{card.createdAt}</span>
                    </div>

                    <p className="text-slate-300 text-xs italic">"{card.message}"</p>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 font-bold">Da: {card.sender}</span>
                      <button
                        onClick={() => playPostcardMelody(card)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-slate-950" />
                        <span>Ascolta Melodia 🎶</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
