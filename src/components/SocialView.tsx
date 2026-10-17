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
      value: 'maestro',
      label: '👨‍🏫 Maestro (Insegnante)',
      description: 'Suona e invia frasi didattiche, controlla i progressi e parla in vivavoce',
      badge: 'Insegnante',
    },
    {
      value: 'allievo',
      label: '👨‍🎓 Allievo (Studente)',
      description: 'Riceve le frasi musicali dal Maestro e le replica a tempo o nota per nota',
      badge: 'Studente',
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

  // Masterclass simplified role: 'maestro' | 'allievo'
  const [masterclassRole, setMasterclassRole] = useState<'maestro' | 'allievo'>(() => {
    if (initialInvite.current?.userRole === 'allievo') return 'allievo';
    if (initialInvite.current?.userRole === 'maestro') return 'maestro';
    return 'maestro';
  });

  // Per-mode state dictionary for auto-assigned hosted room codes
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
    if (initialInvite.current && initialInvite.current.userRole === 'maestro') {
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

  // Per-mode selected role for non-masterclass modes
  const [selectedRoles, setSelectedRoles] = useState<Record<SocialRoomMode, string>>(() => {
    const defRoles: Record<SocialRoomMode, string> = {
      masterclass: 'maestro',
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
  const currentRoomCode =
    activeTab === 'masterclass'
      ? masterclassRole === 'maestro'
        ? hostedRoomCodes.masterclass
        : joinInputs.masterclass.trim()
        ? joinInputs.masterclass.trim().toUpperCase()
        : 'AULA-1'
      : joinInputs[activeTab].trim()
      ? joinInputs[activeTab].trim().toUpperCase()
      : hostedRoomCodes[activeTab];

  const currentRole =
    activeTab === 'masterclass' ? masterclassRole : selectedRoles[activeTab];

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
            roomId: rId.trim().toUpperCase(),
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
        subtitle = `Ciao! Ti invito alla lezione di pianoforte in rete.\n📍 Codice Aula: *${room}*\nRuolo: *Allievo (Studente)*`;
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

  // Check if Masterclass Maestro has a match (at least one other user has connected to this room)
  const isMasterclass = activeTab === 'masterclass';
  const isMaestro = isMasterclass && masterclassRole === 'maestro';
  const isAllievo = isMasterclass && masterclassRole === 'allievo';

  const otherConnectedMember = connectedMembers.find(
    (m) => m.username.trim().toLowerCase() !== globalName.trim().toLowerCase()
  );
  const hasStudentMatch = Boolean(otherConnectedMember);

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
            In Masterclass il Maestro ottiene automaticamente la sua aula e attende il match con l'Allievo. L'Allievo inserisce il codice e si collega subito!
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
          { id: 'masterclass', label: 'Masterclass', icon: GraduationCap, tag: 'Maestro & Allievo' },
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

      {/* DEDICATED PANEL FOR THE SELECTED MODE */}
      <div className="bg-slate-900/95 border border-slate-800 p-5 sm:p-7 rounded-3xl space-y-6 shadow-2xl">
        {/* Mode Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-xs uppercase tracking-wider">
                {activeTab === 'masterclass' && 'Didattica Maestro & Allievo'}
                {activeTab === 'battle' && 'Duello 1v1'}
                {activeTab === 'duet' && 'Quattro Mani'}
                {activeTab === 'pianobar' && 'Concerto Live'}
                {activeTab === 'relay' && 'Cooperativa'}
                {activeTab === 'guess' && 'Quiz'}
                {activeTab === 'postcards' && 'Dediche'}
              </span>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                {activeTab === 'masterclass' && 'Masterclass: Lezione Interattiva'}
                {activeTab === 'battle' && 'Piano Battle: Duello a Scorrimento tra Sfidanti'}
                {activeTab === 'duet' && 'Pianoforte a Quattro Mani: Melodia & Basso'}
                {activeTab === 'pianobar' && 'Piano Bar & Sala d\'Ascolto con Pubblico'}
                {activeTab === 'relay' && 'Staffetta Musicale: Una Battuta a Testa'}
                {activeTab === 'guess' && 'Indovina la Canzone: Sfida a Tempo'}
                {activeTab === 'postcards' && 'Audio-Lettere & Dediche Musicali'}
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              {activeTab === 'masterclass' && 'Il Maestro assegna frasi all\'allievo e parla in vivavoce. Il Maestro entra al pianoforte solo quando l\'Allievo si è collegato alla stanza!'}
              {activeTab === 'battle' && 'Entrambi i giocatori sono sfidanti alla pari! Vince chi totalizza più punti sulle note a caduta.'}
              {activeTab === 'duet' && 'Due pianisti si dividono la tastiera: uno esegue la melodia con la mano destra, l\'altro il basso.'}
              {activeTab === 'pianobar' && 'Un pianista esegue al Gran Coda dal vivo mentre il pubblico connesso ascolta e manda applausi.'}
              {activeTab === 'relay' && 'I musicisti sfidanti si passano il testimone suonando battute consecutive della stessa canzone.'}
              {activeTab === 'guess' && 'I concorrenti si sfidano a indovinare il titolo del brano ascoltando il minor numero di note.'}
              {activeTab === 'postcards' && 'Crea piccoli arpeggi e invia messaggi dedicati con spartito sonoro su WhatsApp.'}
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SPECIALIZED STREAMLINED MASTERCLASS WORKFLOW                   */}
        {/* ============================================================== */}
        {isMasterclass ? (
          <div className="space-y-5">
            {/* 1. SELETTORE RUOLO MASTERCLASS: MAESTRO o ALLIEVO */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
              <button
                onClick={() => setMasterclassRole('maestro')}
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  masterclassRole === 'maestro'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg scale-[1.01]'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>👨‍🏫</span>
                <span>Sono il Maestro (Insegnante)</span>
              </button>

              <button
                onClick={() => setMasterclassRole('allievo')}
                className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  masterclassRole === 'allievo'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg scale-[1.01]'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <span>👨‍🎓</span>
                <span>Sono l'Allievo (Studente)</span>
              </button>
            </div>

            {/* 2A. VISTA MAESTRO: ASSEGNAZIONE AUTOMATICA STANZA + BLOCCO ENTRATA FINO AL MATCH */}
            {isMaestro && (
              <div className="bg-slate-950 p-5 rounded-2xl border-2 border-amber-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        La Tua Aula Masterclass da Maestro
                      </h3>
                      <p className="text-slate-400 text-xs">
                        La stanza &egrave; assegnata automaticamente. Condividila con l'allievo.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full font-black uppercase">
                    👑 Maestro
                  </span>
                </div>

                {/* Box codice stanza visibile (nessun codice da inserire per il maestro!) */}
                <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Codice Aula Assegnato Automaticamente:
                    </span>
                    <div className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                      {hostedRoomCodes.masterclass}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCopyLink('masterclass', hostedRoomCodes.masterclass, 'allievo')}
                      className="flex-1 sm:flex-none py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Copia link di invito per l'allievo"
                    >
                      {copiedState === hostedRoomCodes.masterclass ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-amber-400" />
                      )}
                      <span>{copiedState === hostedRoomCodes.masterclass ? 'Link Copiato!' : 'Copia Link 📋'}</span>
                    </button>

                    <button
                      onClick={() => handleShareWhatsApp('masterclass', hostedRoomCodes.masterclass, 'allievo')}
                      className="flex-1 sm:flex-none py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                      title="Invia codice all'allievo su WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Invia su WhatsApp 💬</span>
                    </button>
                  </div>
                </div>

                {/* Stato del Match dell'Allievo */}
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>Stato Connessione Allievo:</span>
                    </span>

                    {hasStudentMatch ? (
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>MATCH TROVATO: ALLIEVO COLLEGATO!</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 animate-spin" />
                        <span>In attesa che l'allievo entri nella stanza...</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <div>
                      {hasStudentMatch ? (
                        <span className="text-emerald-300 font-bold">
                          👨‍🎓 {otherConnectedMember?.username || 'Allievo'} è entrato nell'aula {hostedRoomCodes.masterclass}!
                        </span>
                      ) : (
                        <span>
                          Il Maestro non pu&ograve; entrare al pianoforte finch&eacute; l'Allievo non entra nell'aula.
                        </span>
                      )}
                    </div>

                    {!hasStudentMatch && (
                      <button
                        onClick={() => {
                          setConnectedMembers([
                            { id: 'usr_me', username: globalName, role: 'maestro', score: 0 },
                            { id: 'bot_student', username: 'Allievo Simualto 🤖', role: 'allievo', score: 0 },
                          ]);
                        }}
                        className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold cursor-pointer transition-all shrink-0"
                      >
                        🤖 Simula Allievo (Test)
                      </button>
                    )}
                  </div>
                </div>

                {/* Opzioni Didattiche */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">
                      Spartito di Riferimento Lezione
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
                      Velocit&agrave; Esecuzione Allievo
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
                </div>

                {/* Pulsante Avvio Maestro: BLOCCATO FINCHÉ NON C'È IL MATCH CON L'ALLIEVO */}
                <div className="pt-2">
                  <button
                    onClick={() => handleLaunchSession(hostedRoomCodes.masterclass, 'maestro')}
                    disabled={!hasStudentMatch}
                    className={`w-full py-4 px-6 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-2xl active:scale-95 ${
                      hasStudentMatch
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-slate-950 cursor-pointer animate-pulse'
                        : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {hasStudentMatch ? (
                      <>
                        <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                        <span>ALLIEVO COLLEGATO! AVVIA LEZIONE AL PIANOFORTE ({hostedRoomCodes.masterclass}) 🚀</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
                        <span>IN ATTESA CHE L'ALLIEVO ENTRI NELL'AULA... (0/1 ALLIEVO)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 2B. VISTA ALLIEVO: INSERISCE IL CODICE AULA COMUNICATO DAL MAESTRO */}
            {isAllievo && (
              <div className="bg-slate-950 p-5 rounded-2xl border-2 border-emerald-500/50 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Ingresso Allievo alla Masterclass
                      </h3>
                      <p className="text-slate-400 text-xs">
                        Inserisci il codice stanza che ti ha detto il Maestro o che hai ricevuto nel link.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-black uppercase">
                    👨‍🎓 Allievo
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-bold uppercase block">
                    Codice Aula del Maestro da Inserire:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={joinInputs.masterclass}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setJoinInputs((prev) => ({ ...prev, masterclass: val }));
                      }}
                      placeholder="Es. MASTERCLASS-101"
                      className="flex-1 bg-slate-900 border-2 border-emerald-500/50 text-emerald-300 font-mono font-black text-sm sm:text-base rounded-xl px-4 py-3 outline-none focus:border-emerald-400 uppercase tracking-widest placeholder:normal-case placeholder:font-sans placeholder:text-slate-600"
                    />
                    {joinInputs.masterclass && (
                      <button
                        onClick={() => setJoinInputs((prev) => ({ ...prev, masterclass: '' }))}
                        className="text-slate-400 hover:text-white text-xs px-3 py-3 bg-slate-900 rounded-xl border border-slate-800"
                        title="Cancella"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Non appena inserisci il codice ed entri, il Maestro vedr&agrave; il match e la lezione avr&agrave; inizio!
                  </p>
                </div>

                {/* Pulsante Entra Allievo */}
                <div className="pt-2">
                  <button
                    onClick={() => handleLaunchSession(joinInputs.masterclass, 'allievo')}
                    disabled={!joinInputs.masterclass.trim()}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 active:scale-95 text-slate-950 font-black text-sm sm:text-base rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🚀 ENTRA NELL'AULA DEL MAESTRO ({joinInputs.masterclass.trim() || 'INSERISCI CODICE'})</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* NON-MASTERCLASS MODES (BATTLE, QUATTRO MANI, PIANO BAR, ETC.)  */
          /* ============================================================== */
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card A: Entra con Codice */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm uppercase tracking-wide">
                    <span>🚪</span>
                    <span>Hai un Codice Stanza? Entra qui</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                    {activeTab === 'battle' ? 'Sfidante' : activeTab === 'pianobar' ? 'Pubblico' : 'Partecipante'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">
                    Codice Stanza da Inserire:
                  </label>
                  <input
                    type="text"
                    value={joinInputs[activeTab]}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setJoinInputs((prev) => ({ ...prev, [activeTab]: val }));
                    }}
                    placeholder={`Es. ${activeTab.toUpperCase()}-101`}
                    className="w-full bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono font-black text-xs sm:text-sm rounded-xl px-3 py-2 outline-none uppercase tracking-wider"
                  />
                </div>

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

              {/* Card B: Crea Nuova Stanza */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm uppercase tracking-wide">
                    <span>👑</span>
                    <span>Crea e Ospita una Nuova Stanza</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold uppercase">
                    Host
                  </span>
                </div>

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
                      title="Genera nuovo codice"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Nuovo</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleCopyLink(activeTab, hostedRoomCodes[activeTab], 'sfidante')}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedState === hostedRoomCodes[activeTab] ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{copiedState === hostedRoomCodes[activeTab] ? 'Copiato!' : 'Copia Link 📋'}</span>
                  </button>

                  <button
                    onClick={() => handleShareWhatsApp(activeTab, hostedRoomCodes[activeTab], 'sfidante')}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>WhatsApp 💬</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pulsante Avvio per altre modalità */}
            <div className="pt-2">
              <button
                onClick={() => handleLaunchSession()}
                className="w-full py-3.5 px-6 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-2xl active:scale-95 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                <span>
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
        )}
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
