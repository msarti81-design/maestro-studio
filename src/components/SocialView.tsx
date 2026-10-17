import React, { useState, useEffect, useRef } from 'react';
import {
  SocialRoomMode,
  MusicalPostcard,
  SheetSong,
  ActiveSocialSession,
  SocialSessionResults,
  SocialUserRole,
} from '../types';
import { PRESET_SONGS } from '../data/songs';
import { audioEngine } from '../utils/audioEngine';
import { getUsername, setUsername as saveGlobalUsername } from '../utils/songStorage';
import {
  Users,
  GraduationCap,
  Sparkles,
  Trophy,
  HelpCircle,
  Radio,
  Send,
  Play,
  CheckCircle2,
  Zap,
  Repeat,
  ArrowRight,
  Copy,
  Check,
  MessageCircle,
  AlertCircle,
  User,
  Music,
  RefreshCw,
  Sliders,
  Award,
  Crown,
  Eye,
  Swords,
  Layers,
} from 'lucide-react';

interface SocialViewProps {
  onLaunchPianoChallenge: (session: ActiveSocialSession) => void;
  lastResults?: SocialSessionResults | null;
  onClearResults?: () => void;
  incomingInvite?: ActiveSocialSession | null;
}

// Role configurations per mode
interface RoleOption {
  value: string;
  label: string;
  description: string;
  badge: string;
}

const MODE_ROLES: Record<SocialRoomMode, RoleOption[]> = {
  masterclass: [
    {
      value: 'allievo',
      label: '👨‍🎓 Allievo (Studente)',
      description: 'Riceve le frasi musicali dal Maestro e le replica a tempo o nota per nota',
      badge: 'Studente',
    },
    {
      value: 'maestro',
      label: '👨‍🏫 Maestro (Insegnante)',
      description: 'Suona e invia frasi didattiche, controlla i progressi e parla in vivavoce',
      badge: 'Insegnante',
    },
  ],
  battle: [
    {
      value: 'sfidante',
      label: '⚔️ Sfidante (Giocatore)',
      description: 'Gareggia in parità di gioco per il punteggio più alto sulle note a caduta',
      badge: 'Sfidante 1v1',
    },
    {
      value: 'pubblico',
      label: '👀 Pubblico (Spettatore)',
      description: 'Assiste al duello in diretta e invia applausi ed emoji',
      badge: 'Spettatore',
    },
  ],
  duet: [
    {
      value: 'sfidante_destra',
      label: '🖐️ Sfidante Mano Destra (Melodia)',
      description: 'Esegue la linea melodica principale del brano a quattro mani',
      badge: 'Melodia',
    },
    {
      value: 'sfidante_sinistra',
      label: '🖐️ Sfidante Mano Sinistra (Basso & Accordi)',
      description: 'Esegue l’accompagnamento e il basso del brano a quattro mani',
      badge: 'Basso/Accordi',
    },
    {
      value: 'pubblico',
      label: '👀 Pubblico (Spettatore)',
      description: 'Ascolta il duetto a quattro mani in streaming',
      badge: 'Spettatore',
    },
  ],
  pianobar: [
    {
      value: 'pubblico',
      label: '🥂 Pubblico (in Ascolto)',
      description: 'Entra nel Piano Bar per ascoltare il concerto dal vivo al Gran Coda',
      badge: 'Pubblico',
    },
    {
      value: 'pianista',
      label: '🎹 Pianista Esecutore',
      description: 'Suona dal vivo al pianoforte Gran Coda per tutto il pubblico connesso',
      badge: 'Pianista Live',
    },
  ],
  relay: [
    {
      value: 'sfidante',
      label: '🏃 Musicista Staffetta (Sfidante)',
      description: 'Suona una battuta a turno alternandosi con gli altri compagni di squadra',
      badge: 'Staffetta',
    },
    {
      value: 'pubblico',
      label: '👀 Pubblico (Ascolto)',
      description: 'Ascolta l’evoluzione del brano suonato a staffetta',
      badge: 'Pubblico',
    },
  ],
  guess: [
    {
      value: 'sfidante',
      label: '🧠 Sfidante Quiz (Concorrente)',
      description: 'Ascolta le note e indovina il titolo del brano più velocemente degli altri',
      badge: 'Concorrente',
    },
    {
      value: 'pubblico',
      label: '👀 Pubblico (Spettatore)',
      description: 'Assiste alla sfida di indovina la canzone',
      badge: 'Spettatore',
    },
  ],
  postcards: [
    {
      value: 'giocatore',
      label: '💌 Mittente / Destinatario',
      description: 'Invia e riceve dediche e melodie personalizzate',
      badge: 'Audio-Lettere',
    },
  ],
};

function generateRandomRoomCode(mode: SocialRoomMode): string {
  const num = Math.floor(100 + Math.random() * 900);
  switch (mode) {
    case 'masterclass':
      return `MASTERCLASS-${num}`;
    case 'battle':
      return `BATTLE-${num}`;
    case 'duet':
      return `DUETTO-${num}`;
    case 'pianobar':
      return `PIANOBAR-${num}`;
    case 'relay':
      return `STAFFETTA-${num}`;
    case 'guess':
      return `QUIZ-${num}`;
    case 'postcards':
      return `POSTCARD-${num}`;
    default:
      return `ROOM-${num}`;
  }
}

export const SocialView: React.FC<SocialViewProps> = ({
  onLaunchPianoChallenge,
  lastResults,
  onClearResults,
  incomingInvite,
}) => {
  // Read any initial URL parameters
  const getInitialInvite = () => {
    if (incomingInvite) return incomingInvite;
    if (typeof window === 'undefined') return null;
    try {
      const search = window.location.search;
      const hash = window.location.hash;
      let room = '';
      let mode: SocialRoomMode = 'masterclass';
      let role = 'allievo';

      if (search) {
        const sp = new URLSearchParams(search);
        if (sp.has('room') || sp.has('roomId') || sp.has('aula')) {
          room = sp.get('room') || sp.get('roomId') || sp.get('aula') || '';
          if (sp.has('mode')) mode = (sp.get('mode') as SocialRoomMode) || 'masterclass';
          if (sp.has('role')) role = sp.get('role') || 'allievo';
        }
      }
      if (!room && hash && hash.includes('?')) {
        const qIdx = hash.indexOf('?');
        const hp = new URLSearchParams(hash.substring(qIdx + 1));
        if (hp.has('room') || hp.has('roomId') || hp.has('aula')) {
          room = hp.get('room') || hp.get('roomId') || hp.get('aula') || '';
          if (hp.has('mode')) mode = (hp.get('mode') as SocialRoomMode) || 'masterclass';
          if (hp.has('role')) role = hp.get('role') || 'allievo';
        }
      }

      if (room && room.trim()) {
        const cleanRoom = room.trim().toUpperCase();
        return {
          mode,
          roomId: cleanRoom,
          userRole: role,
          status: 'active' as const,
        };
      }
    } catch (e) {}
    return null;
  };

  const initialInvite = useRef(getInitialInvite());

  // Active Tab / Mode Selection
  const [activeTab, setActiveTab] = useState<SocialRoomMode>(() => {
    return initialInvite.current?.mode || 'masterclass';
  });

  // Global Username
  const [globalName, setGlobalName] = useState<string>(() => getUsername());

  // Per-mode state dictionary for hosted room codes
  const [hostedRoomCodes, setHostedRoomCodes] = useState<Record<SocialRoomMode, string>>(() => {
    const defaultCodes: Record<SocialRoomMode, string> = {
      masterclass: generateRandomRoomCode('masterclass'),
      battle: generateRandomRoomCode('battle'),
      duet: generateRandomRoomCode('duet'),
      pianobar: generateRandomRoomCode('pianobar'),
      relay: generateRandomRoomCode('relay'),
      guess: generateRandomRoomCode('guess'),
      postcards: generateRandomRoomCode('postcards'),
    };
    if (initialInvite.current) {
      defaultCodes[initialInvite.current.mode] = initialInvite.current.roomId;
    }
    return defaultCodes;
  });

  // Per-mode input field for joining an existing room code
  const [joinInputs, setJoinInputs] = useState<Record<SocialRoomMode, string>>(() => {
    const initInputs: Record<SocialRoomMode, string> = {
      masterclass: '',
      battle: '',
      duet: '',
      pianobar: '',
      relay: '',
      guess: '',
      postcards: '',
    };
    if (initialInvite.current) {
      initInputs[initialInvite.current.mode] = initialInvite.current.roomId;
    }
    return initInputs;
  });

  // Per-mode selected role
  const [selectedRoles, setSelectedRoles] = useState<Record<SocialRoomMode, string>>(() => {
    const defRoles: Record<SocialRoomMode, string> = {
      masterclass: 'allievo',
      battle: 'sfidante',
      duet: 'sfidante_destra',
      pianobar: 'pubblico',
      relay: 'sfidante',
      guess: 'sfidante',
      postcards: 'giocatore',
    };
    if (initialInvite.current) {
      defRoles[initialInvite.current.mode] = (initialInvite.current.userRole as string) || defRoles[initialInvite.current.mode];
    }
    return defRoles;
  });

  // Mode Options
  const [selectedSong, setSelectedSong] = useState<SheetSong>(PRESET_SONGS[0]);
  const [masterclassSpeed, setMasterclassSpeed] = useState<number>(100);
  const [masterclassExerciseType, setMasterclassExerciseType] = useState<'arcade' | 'learn'>('arcade');
  const [battleDifficulty, setBattleDifficulty] = useState<'facile' | 'normale' | 'virtuoso'>('normale');

  // Copy status
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Active connected room in view
  const currentRoomCode = joinInputs[activeTab].trim()
    ? joinInputs[activeTab].trim().toUpperCase()
    : hostedRoomCodes[activeTab];
  const currentRole = selectedRoles[activeTab];

  // WebSocket Live Lobby Presence
  const [connectedMembers, setConnectedMembers] = useState<
    { id: string; username: string; role: string; score: number }[]
  >([]);
  const socketRef = useRef<WebSocket | null>(null);

  // Postcards State
  const [postcardTitle, setPostcardTitle] = useState<string>('Un pensiero in musica 🎵');
  const [postcardMessage, setPostcardMessage] = useState<string>('Ti dedico questa melodia eseguita con il Pianoforte Gran Coda!');
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

  // Connect WebSocket to currently active room and role
  useEffect(() => {
    connectRoomWebSocket(currentRoomCode, globalName, currentRole, activeTab);
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [currentRoomCode, currentRole, activeTab, globalName]);

  const connectRoomWebSocket = (rId: string, name: string, role: string, mode: SocialRoomMode) => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomId: rId,
            username: name,
            role,
            mode,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room:state') {
            setConnectedMembers(msg.members || []);
          } else if (msg.type === 'postcard:new' && msg.postcard) {
            setPostcardsInbox((prev) => [msg.postcard, ...prev]);
          }
        } catch (e) {}
      };
    } catch (e) {}
  };

  const handleGlobalNameChange = (newName: string) => {
    setGlobalName(newName);
    saveGlobalUsername(newName);
  };

  const handleRegenerateHostedCode = (mode: SocialRoomMode) => {
    const newCode = generateRandomRoomCode(mode);
    setHostedRoomCodes((prev) => ({ ...prev, [mode]: newCode }));
    // Clear manual join input so active room becomes the newly generated one
    setJoinInputs((prev) => ({ ...prev, [mode]: '' }));
  };

  // Helper to build a dual-format URL (query + hash) that never breaks
  const getShareUrl = (mode: SocialRoomMode, room: string, role: string) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = window.location.pathname;
    const base = `${origin}${path}`.replace(/\/+$/, '');
    const cleanRoom = room.trim().toUpperCase();
    const query = `room=${encodeURIComponent(cleanRoom)}&mode=${encodeURIComponent(mode)}&role=${encodeURIComponent(role)}`;
    return `${base}/?${query}#social?${query}`;
  };

  // Copy Link
  const handleCopyLink = async (mode: SocialRoomMode, room: string, role: string) => {
    try {
      const url = getShareUrl(mode, room, role);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedState(room);
      setTimeout(() => setCopiedState(null), 2500);
    } catch (e) {}
  };

  // Share via WhatsApp
  const handleShareWhatsApp = (mode: SocialRoomMode, room: string, role: string) => {
    const shareUrl = getShareUrl(mode, room, role);
    let title = '';
    let subtitle = '';

    switch (mode) {
      case 'masterclass':
        title = '👨‍🏫 INVITO MASTERCLASS PIANOFORTE MAESTRO STUDIO';
        subtitle = `Ciao! Ti invito alla lezione di pianoforte in rete.\n📍 Codice Aula da inserire: *${room}*\nRuolo: *Allievo / Studente*`;
        break;
      case 'battle':
        title = '⚡ PIANO BATTLE 1v1 - DUELLO AL PIANOFORTE';
        subtitle = `Ti sfido a un duello sul pianoforte a scorrimento a caduta!\n📍 Codice Sfida: *${room}*\nRuolo: *Sfidante*`;
        break;
      case 'duet':
        title = '🎹 PIANOFORTE A QUATTRO MANI';
        subtitle = `Suoniamo insieme a quattro mani! Tu la melodia e io il basso.\n📍 Codice Stanza: *${room}*`;
        break;
      case 'pianobar':
        title = '🍸 SALA CONCERTO & PIANO BAR LIVE';
        subtitle = `Entra ad ascoltare la mia esecuzione live al Gran Coda!\n📍 Codice Sala: *${room}*\nRuolo: *Pubblico in Ascolto*`;
        break;
      case 'relay':
        title = '🏃 STAFFETTA MUSICALE';
        subtitle = `Giochiamo insieme a staffetta sul pianoforte (una battuta a testa)!\n📍 Codice Stanza: *${room}*`;
        break;
      case 'guess':
        title = '❓ INDOVINA LA CANZONE - QUIZ PIANISTICO';
        subtitle = `Indovina per primo i brani suonati al pianoforte!\n📍 Codice Stanza: *${room}*`;
        break;
      default:
        title = '🎹 PIANOFORTE SOCIAL & CHALLENGE';
        subtitle = `Unisciti alla mia stanza sul pianoforte!\n📍 Codice: *${room}*`;
        break;
    }

    const textMessage = `${title}\n\n${subtitle}\n\n🔗 *Clicca qui per entrare direttamente:*\n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
    window.open(waUrl, '_blank');
  };

  // Launch Piano Session
  const handleLaunchSession = (customRoom?: string, customRole?: string) => {
    const targetRoom = (customRoom || currentRoomCode).trim().toUpperCase();
    const targetRole = customRole || currentRole;

    const session: ActiveSocialSession = {
      mode: activeTab,
      roomId: targetRoom || 'AULA-1',
      userRole: targetRole,
      song: selectedSong,
      status: 'active',
    };

    audioEngine.init().catch(() => {});
    onLaunchPianoChallenge(session);
  };

  const playPostcardMelody = (card: MusicalPostcard) => {
    card.melody.forEach((m, idx) => {
      setTimeout(() => {
        audioEngine.playNote(m.note, m.duration, 'piano');
      }, idx * 400);
    });
  };

  // Determine role title description in the UI
  const availableRoles = MODE_ROLES[activeTab] || [];

  return (
    <div className="max-w-5xl mx-auto space-y-5 select-none pb-12">
      {/* GLOBAL USER PROFILE & HEADER (CLEAN & NO CLUTTER) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            <span>Multiplayer & Social Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center md:justify-start gap-2">
            <span>Sale Virtuali & Didattica Musicale</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-slate-400 text-xs max-w-xl">
            Seleziona la modalit&agrave;: troverai al suo interno il campo per inserire il codice stanza, i ruoli dedicati (Maestro/Allievo, Sfidanti o Pubblico) e la sala d'attesa.
          </p>
        </div>

        {/* User Identity Display */}
        <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-2xl flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-sm">
            👤
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <User className="w-3 h-3 text-amber-400" />
              <span>Il Tuo Nome Utente</span>
            </div>
            <input
              type="text"
              value={globalName}
              onChange={(e) => handleGlobalNameChange(e.target.value)}
              className="bg-slate-900 text-xs font-black text-amber-300 outline-none w-36 px-2 py-0.5 rounded border border-amber-500/30 focus:border-amber-400 mt-0.5"
              placeholder="Il tuo nome..."
            />
          </div>
        </div>
      </div>

      {/* SUMMARY RESULTS CARD (If notes were played) */}
      {lastResults && lastResults.notesPlayed > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-2 border-amber-400 p-5 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  ESITI ULTIMA SESSIONE ({lastResults.mode.toUpperCase()})
                </h3>
                <p className="text-xs text-amber-300/90 font-medium">
                  Stanza: <span className="font-mono font-bold">{lastResults.roomId}</span> • Durata: {lastResults.durationSeconds}s
                </p>
              </div>
            </div>

            {onClearResults && (
              <button
                onClick={onClearResults}
                className="text-slate-400 hover:text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer"
              >
                Chiudi Esiti ✖
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Punteggio Finale</div>
              <div className="text-xl font-black text-amber-400">{lastResults.score} PTS</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Combo Massimo</div>
              <div className="text-xl font-black text-emerald-400">x{lastResults.comboMax || 1}</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Precisione Note</div>
              <div className="text-xl font-black text-yellow-300">{lastResults.accuracy}%</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Note Eseguite</div>
              <div className="text-xl font-black text-indigo-400">{lastResults.notesPlayed}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODE SELECTOR TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
        {[
          { id: 'masterclass', label: 'Masterclass', icon: GraduationCap, tag: 'Maestro / Allievo' },
          { id: 'battle', label: 'Piano Battle', icon: Swords, tag: 'Duello Sfidanti' },
          { id: 'duet', label: 'Quattro Mani', icon: Layers, tag: 'Due Pianisti' },
          { id: 'pianobar', label: 'Piano Bar', icon: Radio, tag: 'Live & Pubblico' },
          { id: 'relay', label: 'Staffetta', icon: Repeat, tag: 'Coop Sfidanti' },
          { id: 'guess', label: 'Indovina Song', icon: HelpCircle, tag: 'Quiz Musicale' },
          { id: 'postcards', label: 'Audio-Lettere', icon: Send, tag: 'Dediche' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SocialRoomMode)}
              className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold text-center active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-amber-500 to-amber-400 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
              <span className="truncate w-full">{tab.label}</span>
              <span
                className={`text-[8px] uppercase tracking-wider px-1 rounded truncate max-w-full ${
                  isActive ? 'bg-slate-950/30 text-amber-100' : 'bg-slate-950/60 text-slate-400'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* DEDICATED PANEL FOR THE SELECTED MODE (Everything relative to this mode is inside here!) */}
      <div className="bg-slate-900/95 border border-slate-800 p-5 sm:p-7 rounded-3xl space-y-6 shadow-2xl">
        {/* Mode Title & Description Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-xs uppercase tracking-wider">
                {activeTab === 'masterclass' && 'Didattica 1-a-1'}
                {activeTab === 'battle' && 'Duello 1v1'}
                {activeTab === 'duet' && 'Quattro Mani'}
                {activeTab === 'pianobar' && 'Concerto Live'}
                {activeTab === 'relay' && 'Cooperativa'}
                {activeTab === 'guess' && 'Quiz'}
                {activeTab === 'postcards' && 'Dediche'}
              </span>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                {activeTab === 'masterclass' && 'Masterclass Didattica: Maestro & Allievo'}
                {activeTab === 'battle' && 'Piano Battle: Duello a Scorrimento tra Sfidanti'}
                {activeTab === 'duet' && 'Pianoforte a Quattro Mani: Melodia & Basso'}
                {activeTab === 'pianobar' && 'Piano Bar & Sala d\'Ascolto con Pubblico'}
                {activeTab === 'relay' && 'Staffetta Musicale: Una Battuta a Testa'}
                {activeTab === 'guess' && 'Indovina la Canzone: Sfida a Tempo'}
                {activeTab === 'postcards' && 'Audio-Lettere & Dediche Musicali'}
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              {activeTab === 'masterclass' && 'Il Maestro suona e assegna frasi all\'allievo con vivavoce audio bidirezionale in tempo reale.'}
              {activeTab === 'battle' && 'Entrambi i giocatori sono sfidanti alla pari! Vince chi totalizza pi&ugrave; punti sul brano.'}
              {activeTab === 'duet' && 'Due pianisti si dividono la tastiera: uno esegue la melodia con la mano destra, l\'altro il basso.'}
              {activeTab === 'pianobar' && 'Un pianista esegue al Gran Coda dal vivo mentre il pubblico connesso ascolta e manda applausi.'}
              {activeTab === 'relay' && 'I musicisti sfidanti si passano il testimone suonando battute consecutive della stessa canzone.'}
              {activeTab === 'guess' && 'I concorrenti si sfidano a indovinare il titolo del brano ascoltando il minor numero di note.'}
              {activeTab === 'postcards' && 'Crea piccoli arpeggi e invia messaggi dedicati con spartito sonoro su WhatsApp.'}
            </p>
          </div>
        </div>

        {/* 1. SEZIONE CODICE STANZA & PARTECIPAZIONE (PROPRIO QUI SOTTO LA SCELTA!) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card A: Hai gi&agrave; un Codice Stanza? (Per l'Allievo, Sfidante o Pubblico) */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm uppercase tracking-wide">
                <span>🚪</span>
                <span>Hai un Codice Stanza? Entra qui</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                {activeTab === 'masterclass' && 'Per l\'Allievo'}
                {activeTab === 'battle' && 'Per lo Sfidante'}
                {activeTab === 'pianobar' && 'Per il Pubblico'}
                {(activeTab === 'duet' || activeTab === 'relay' || activeTab === 'guess') && 'Per il Partecipante'}
              </span>
            </div>

            <p className="text-slate-400 text-[11px]">
              Se ti hanno comunicato il codice stanza (o hai aperto un link), digitalo qui sotto per unirti subito:
            </p>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">
                Codice Stanza da Inserire:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinInputs[activeTab]}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setJoinInputs((prev) => ({ ...prev, [activeTab]: val }));
                  }}
                  placeholder={
                    activeTab === 'masterclass'
                      ? 'Es. MASTERCLASS-101'
                      : activeTab === 'battle'
                      ? 'Es. BATTLE-202'
                      : activeTab === 'pianobar'
                      ? 'Es. PIANOBAR-303'
                      : 'Es. CODICE-STANZA'
                  }
                  className="flex-1 bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono font-black text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:text-slate-600"
                />
                {joinInputs[activeTab] && (
                  <button
                    onClick={() => setJoinInputs((prev) => ({ ...prev, [activeTab]: '' }))}
                    className="text-slate-400 hover:text-white text-xs px-2 py-2 bg-slate-900 rounded-xl border border-slate-800"
                    title="Cancella codice inserito"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Ruolo per chi si unisce */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">
                Il Tuo Ruolo in questa Stanza:
              </label>
              <select
                value={selectedRoles[activeTab]}
                onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                className="w-full bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl px-3 py-2 outline-none"
              >
                {availableRoles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleLaunchSession(joinInputs[activeTab], selectedRoles[activeTab])}
              disabled={!joinInputs[activeTab].trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 active:scale-95 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🚀 ENTRA IN QUESTA STANZA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card B: Vuoi Creare e Ospitare tu la Stanza? (Per Maestro, Primo Sfidante, Pianista Esecutore) */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm uppercase tracking-wide">
                <span>👑</span>
                <span>Crea e Ospita una Nuova Stanza</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold uppercase">
                {activeTab === 'masterclass' && 'Per il Maestro'}
                {activeTab === 'battle' && 'Sfidante Host'}
                {activeTab === 'pianobar' && 'Pianista Host'}
                {(activeTab === 'duet' || activeTab === 'relay' || activeTab === 'guess') && 'Host Stanza'}
              </span>
            </div>

            <p className="text-slate-400 text-[11px]">
              Il tuo codice stanza generato per questa modalit&agrave;. Invialo all'allievo o all'altro sfidante:
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">
                Codice Stanza Assegnato:
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 border border-slate-800 text-amber-400 font-mono font-black text-xs sm:text-sm rounded-xl px-3 py-2 flex items-center justify-between">
                  <span>{hostedRoomCodes[activeTab]}</span>
                  <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                    Attiva
                  </span>
                </div>
                <button
                  onClick={() => handleRegenerateHostedCode(activeTab)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                  title="Genera un codice stanza diverso"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Nuovo</span>
                </button>
              </div>
            </div>

            {/* Condivisione con WhatsApp & Copia Link */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() =>
                  handleCopyLink(
                    activeTab,
                    hostedRoomCodes[activeTab],
                    activeTab === 'masterclass' ? 'allievo' : 'sfidante'
                  )
                }
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Copia link completo per l'allievo/sfidante"
              >
                {copiedState === hostedRoomCodes[activeTab] ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copiedState === hostedRoomCodes[activeTab] ? 'Copiato!' : 'Copia Link 📋'}</span>
              </button>

              <button
                onClick={() =>
                  handleShareWhatsApp(
                    activeTab,
                    hostedRoomCodes[activeTab],
                    activeTab === 'masterclass' ? 'allievo' : 'sfidante'
                  )
                }
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                title="Invia invito direttamente su WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>WhatsApp 💬</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. OPZIONI SPECIFICHE DELLA MODALITÀ */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-300">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Configurazione & Brano per {activeTab.toUpperCase()}</span>
          </div>

          {activeTab === 'masterclass' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Spartito / Brano Lezione
                </label>
                <select
                  value={selectedSong.id}
                  onChange={(e) => {
                    const found = PRESET_SONGS.find((s) => s.id === e.target.value);
                    if (found) setSelectedSong(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none"
                >
                  {PRESET_SONGS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Velocit&agrave; Rallentatore
                </label>
                <div className="flex items-center gap-1 pt-0.5">
                  {[50, 75, 100].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setMasterclassSpeed(spd)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        masterclassSpeed === spd
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Modalit&agrave; didattica allievo
                </label>
                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    onClick={() => setMasterclassExerciseType('arcade')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      masterclassExerciseType === 'arcade'
                        ? 'bg-purple-600 text-white font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎮 Arcade a Tempo
                  </button>
                  <button
                    onClick={() => setMasterclassExerciseType('learn')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      masterclassExerciseType === 'learn'
                        ? 'bg-blue-600 text-white font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    📖 Impara Nota per Nota
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'battle' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Brano per il Duello 1v1
                </label>
                <select
                  value={selectedSong.id}
                  onChange={(e) => {
                    const found = PRESET_SONGS.find((s) => s.id === e.target.value);
                    if (found) setSelectedSong(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none"
                >
                  {PRESET_SONGS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Livello Difficolt&agrave; Duello
                </label>
                <div className="flex items-center gap-1 pt-0.5">
                  {(['facile', 'normale', 'virtuoso'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setBattleDifficulty(diff)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        battleDifficulty === diff
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'duet' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Spartito a Quattro Mani
                </label>
                <select
                  value={selectedSong.id}
                  onChange={(e) => {
                    const found = PRESET_SONGS.find((s) => s.id === e.target.value);
                    if (found) setSelectedSong(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none"
                >
                  {PRESET_SONGS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Uno sfidante suona la <strong className="text-amber-300">Mano Destra (melodia)</strong>, l'altro suona la <strong className="text-emerald-300">Mano Sinistra (bassi)</strong>!
                </span>
              </div>
            </div>
          )}

          {activeTab === 'pianobar' && (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Timbro Pianoforte: <strong>Gran Coda Concert Grand</strong> in streaming dal vivo</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded font-bold uppercase">
                Sala Live
              </span>
            </div>
          )}

          {(activeTab === 'relay' || activeTab === 'guess') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Brano Musicale
                </label>
                <select
                  value={selectedSong.id}
                  onChange={(e) => {
                    const found = PRESET_SONGS.find((s) => s.id === e.target.value);
                    if (found) setSelectedSong(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none"
                >
                  {PRESET_SONGS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 3. PARTECIPANTI IN QUESTA STANZA & SALA D'ATTESA (LIVE WEB SOCKET) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>
                Partecipanti Connessi a <strong className="text-amber-400 font-mono">{currentRoomCode}</strong> ({connectedMembers.length}/2)
              </span>
            </div>

            {connectedMembers.length >= 2 || activeTab === 'postcards' ? (
              <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stanza Pronta per Iniziare!</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'masterclass' && 'In attesa dell\'Allievo o Maestro...'}
                  {activeTab === 'battle' && 'In attesa dell\'altro Sfidante...'}
                  {activeTab === 'pianobar' && 'In attesa del Pubblico / Esecutore...'}
                  {activeTab !== 'masterclass' && activeTab !== 'battle' && activeTab !== 'pianobar' && 'In attesa dei partecipanti...'}
                </span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Slot 1: You */}
            <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-amber-300">{globalName} (Tu)</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded font-black uppercase">
                {currentRole}
              </span>
            </div>

            {/* Slot 2: Connected Peer or Waiting Placeholder */}
            {connectedMembers.length >= 2 ? (
              <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300">
                    {connectedMembers.find((m) => m.username !== globalName)?.username || 'Partecipante Connesso'}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded font-black uppercase">
                  {connectedMembers.find((m) => m.username !== globalName)?.role || 'Online'}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl flex items-center justify-between text-xs font-bold text-slate-500 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span className="truncate">
                    {activeTab === 'masterclass' && 'In attesa di Allievo o Maestro...'}
                    {activeTab === 'battle' && 'In attesa di un secondo Sfidante...'}
                    {activeTab === 'pianobar' && 'In attesa del Pubblico in sala...'}
                    {activeTab !== 'masterclass' && activeTab !== 'battle' && activeTab !== 'pianobar' && 'In attesa di partecipanti...'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const simName =
                        activeTab === 'masterclass'
                          ? currentRole === 'maestro'
                            ? 'Allievo Bot 👨‍🎓'
                            : 'Maestro Bot 👨‍🏫'
                          : activeTab === 'battle'
                          ? 'Sfidante Bot 🤖'
                          : activeTab === 'pianobar'
                          ? 'Pubblico Bot 🥂'
                          : 'Compagno Bot 🤖';
                      const simRole =
                        activeTab === 'masterclass'
                          ? currentRole === 'maestro'
                            ? 'allievo'
                            : 'maestro'
                          : activeTab === 'battle'
                          ? 'sfidante'
                          : activeTab === 'pianobar'
                          ? 'pubblico'
                          : 'giocatore';

                      setConnectedMembers([
                        { id: 'usr_me', username: globalName, role: currentRole, score: 0 },
                        {
                          id: 'bot_peer',
                          username: simName,
                          role: simRole,
                          score: 0,
                        },
                      ]);
                    }}
                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    🤖 Simula Compagno
                  </button>
                  <button
                    onClick={() => handleShareWhatsApp(activeTab, currentRoomCode, currentRole)}
                    className="text-[10px] text-emerald-400 hover:underline font-bold whitespace-nowrap cursor-pointer"
                  >
                    WhatsApp 💬
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. PULSANTE PRINCIPALE DI AVVIO / INGRESSO AL PIANOFORTE */}
        <div className="pt-2">
          <button
            onClick={() => handleLaunchSession()}
            className="w-full py-3.5 px-6 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-2xl active:scale-95 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950 shrink-0" />
            <span>
              {activeTab === 'masterclass' && `AVVIA LEZIONE MASTERCLASS (STANZA: ${currentRoomCode}) 🎹`}
              {activeTab === 'battle' && `ENTRA NEL DUELLO 1v1 COME SFIDANTE (${currentRoomCode}) ⚔️`}
              {activeTab === 'duet' && `SUONA A QUATTRO MANI (${currentRoomCode}) 🖐️`}
              {activeTab === 'pianobar' && `ENTRA AL PIANO BAR LIVE (${currentRoomCode}) 🍸`}
              {activeTab === 'relay' && `INIZIA LA STAFFETTA MUSICALE (${currentRoomCode}) 🏃`}
              {activeTab === 'guess' && `SFIDA A INDOVINA LA CANZONE (${currentRoomCode}) ❓`}
              {activeTab === 'postcards' && `APRI IL PIANOFORTE DELLE CARTOLINE 💌`}
            </span>
          </button>
        </div>
      </div>

      {/* AUDIO-LETTERE (POSTCARDS) SECTION */}
      {activeTab === 'postcards' && (
        <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            <span>Messaggi Musicali & Cartoline Sonore</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <input
                type="text"
                placeholder="Titolo Cartolina..."
                value={postcardTitle}
                onChange={(e) => setPostcardTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none"
              />
              <textarea
                rows={2}
                placeholder="Messaggio dedica..."
                value={postcardMessage}
                onChange={(e) => setPostcardMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none resize-none"
              />
              <button
                onClick={() => handleShareWhatsApp(activeTab, hostedRoomCodes.postcards, 'giocatore')}
                className="w-full py-2 bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Invia Cartolina via WhatsApp 💬</span>
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
              <span className="text-xs font-bold text-amber-400 uppercase block">Cartoline Ricevute:</span>
              {postcardsInbox.map((card) => (
                <div key={card.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-300">{card.title}</div>
                  <div className="text-slate-400 italic">"{card.message}"</div>
                  <button
                    onClick={() => playPostcardMelody(card)}
                    className="text-[10px] text-amber-400 font-bold flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-amber-400" />
                    <span>Ascolta Melodia 🎶</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
