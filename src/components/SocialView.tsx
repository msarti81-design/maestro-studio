import React, { useState, useEffect, useRef } from 'react';
import {
  SocialRoomMode,
  SheetSong,
  ActiveSocialSession,
  SocialSessionResults,
  SocialUserRole,
} from '../types';
import { PRESET_SONGS } from '../data/songs';
import { audioEngine } from '../utils/audioEngine';
import { getUsername, setUsername as saveGlobalUsername } from '../utils/songStorage';
import { getAppWebSocketUrl, getAppApiUrl, getOrCreateClientId } from '../utils/networkHelper';
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
      label: '👨‍🏫 Master (Teacher)',
      description: 'Play and send instructional phrases, control progress, and speak hands-free',
      badge: 'Teacher',
    },
    {
      value: 'allievo',
      label: '👨‍🎓 Student (Learner)',
      description: 'Receive musical phrases from the Master and replicate them in time or note by note',
      badge: 'Student',
    },
  ],
  battle: [
    {
      value: 'sfidante',
      label: '⚔️ Challenger (Player)',
      description: 'Compete on equal footing for the highest score on falling notes',
      badge: '1v1 Challenger',
    },
    {
      value: 'pubblico',
      label: '👀 Audience (Spectator)',
      description: 'Watch the live duel and send applause and emojis',
      badge: 'Spectator',
    },
  ],
  duet: [
    {
      value: 'sfidante_destra',
      label: '🖐️ Right Hand Challenger (Melody)',
      description: 'Execute the main melodic line of the four-hands piece',
      badge: 'Melody',
    },
    {
      value: 'sfidante_sinistra',
      label: '🖐️ Left Hand Challenger (Bass & Chords)',
      description: 'Execute the accompaniment and bass of the four-hands piece',
      badge: 'Bass/Chords',
    },
    {
      value: 'pubblico',
      label: '👀 Audience (Spectator)',
      description: 'Listen to the four-hands duet in streaming',
      badge: 'Spectator',
    },
  ],
  pianobar: [
    {
      value: 'pubblico',
      label: '🥂 Audience (Listening)',
      description: 'Enter the Piano Bar to listen to live concert grand performance',
      badge: 'Audience',
    },
    {
      value: 'pianista',
      label: '🎹 Performer Pianist',
      description: 'Play live on the Concert Grand piano for all connected audience',
      badge: 'Live Pianist',
    },
  ],
  relay: [
    {
      value: 'sfidante',
      label: '🏃 Relay Musician (Challenger)',
      description: 'Play a measure in turn alternating with teammates',
      badge: 'Relay',
    },
    {
      value: 'pubblico',
      label: '👀 Audience (Listening)',
      description: 'Listen to the evolving relay performance',
      badge: 'Audience',
    },
  ],
  guess: [
    {
      value: 'sfidante',
      label: '🧠 Quiz Challenger (Contestant)',
      description: 'Listen to notes and guess the song title faster than others',
      badge: 'Contestant',
    },
    {
      value: 'pubblico',
      label: '👀 Audience (Spectator)',
      description: 'Watch the name-that-tune challenge',
      badge: 'Spectator',
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
      return `DUET-${num}`;
    case 'pianobar':
      return `PIANOBAR-${num}`;
    case 'relay':
      return `RELAY-${num}`;
    case 'guess':
      return `QUIZ-${num}`;
    default:
      return `ROOM-${num}`;
  }
}

export function normalizeRoomCode(rawCode: string, defaultMode: SocialRoomMode = 'masterclass'): string {
  if (!rawCode) return '';
  let clean = rawCode.trim().toUpperCase().replace(/^#/, '').replace(/\s+/g, '-');
  if (!clean) return '';

  // If user typed pure digits (e.g. "542" or "101")
  if (/^\d+$/.test(clean)) {
    switch (defaultMode) {
      case 'masterclass':
        return `MASTERCLASS-${clean}`;
      case 'battle':
        return `BATTLE-${clean}`;
      case 'duet':
        return `DUET-${clean}`;
      case 'pianobar':
        return `PIANOBAR-${clean}`;
      case 'relay':
        return `RELAY-${clean}`;
      case 'guess':
        return `QUIZ-${clean}`;
      default:
        return `MASTERCLASS-${clean}`;
    }
  }

  // If user typed e.g. "ROOM-542", "ROOM 542", "ROOM542"
  if (/^(ROOM|AULA)-?\d+$/.test(clean)) {
    return clean.replace(/^(ROOM|AULA)-?/, 'MASTERCLASS-');
  }

  if (/^MASTERCLASS\d+$/.test(clean)) {
    return clean.replace(/^MASTERCLASS/, 'MASTERCLASS-');
  }

  return clean;
}

const RoomCodeValidator: React.FC<{ roomCode: string; maestroMember: any; clientSessionId?: string }> = ({ roomCode, maestroMember, clientSessionId }) => {
  const [roomData, setRoomData] = useState<{ exists: boolean; members: any[] } | null>(null);

  useEffect(() => {
    let active = true;
    const checkRoom = async () => {
      try {
        const cParam = clientSessionId ? `?clientId=${encodeURIComponent(clientSessionId)}` : '';
        const res = await fetch(getAppApiUrl(`/api/room/${encodeURIComponent(roomCode)}/state${cParam}`));
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setRoomData({
              exists: Boolean(data.exists),
              members: Array.isArray(data.members) ? data.members : [],
            });
          }
        }
      } catch (e) {}
    };
    checkRoom();
    const interval = setInterval(checkRoom, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomCode, clientSessionId]);

  if (!roomData) {
    return (
      <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
        <span className="animate-spin">⏳</span>
        <span>Checking room existence...</span>
      </div>
    );
  }

  if (!roomData.exists) {
    return (
      <div className="text-[11px] text-red-400 bg-red-950/80 border border-red-500/60 px-3 py-2 rounded-xl font-bold flex items-center gap-2">
        <span>❌</span>
        <span>Room ({roomCode}) does not exist or Master is not online! Check the code.</span>
      </div>
    );
  }

  const hasMaestro = maestroMember || (roomData?.members && roomData.members.some((m) => m.role && m.role.toLowerCase() === 'maestro'));

  return (
    <div className="space-y-1.5 pt-1">
      <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
        <span>✓ Destination Room:</span>
        <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-white">{roomCode}</span>
      </div>

      {hasMaestro ? (
        <div className="bg-emerald-950/80 border border-emerald-400/60 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-300 font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <span>👑</span>
            <span>Master <strong>{maestroMember?.username || 'Teacher'}</strong> is online in this room!</span>
          </div>
          <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] uppercase shadow">
            Ready 🟢
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-emerald-300 bg-slate-900 border border-emerald-500/30 px-3 py-2 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⏳</span>
            <span>Room ready for entry! Enter piano: Master will connect here.</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase shrink-0">
            Free 🟢
          </span>
        </div>
      )}
    </div>
  );
};

export const SocialView: React.FC<SocialViewProps> = ({
  onLaunchPianoChallenge,
  lastResults,
  onClearResults,
  incomingInvite,
}) => {
  // Persistent unique client session ID so maestro and student are always distinguished even with same username
  const clientSessionIdRef = useRef<string>(getOrCreateClientId());

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
        const cleanRoom = normalizeRoomCode(room, mode);
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
  // Keep incomingInvite in sync if URL params change after mount
  useEffect(() => {
    if (incomingInvite) {
      if (incomingInvite.mode) setActiveTab(incomingInvite.mode);
      if (incomingInvite.mode === 'masterclass') {
        const targetRole = incomingInvite.userRole === 'allievo' ? 'allievo' : 'maestro';
        setMasterclassRole(targetRole);
        const norm = normalizeRoomCode(incomingInvite.roomId, 'masterclass');
        setJoinInputs((prev) => ({ ...prev, masterclass: norm }));
      } else {
        const norm = normalizeRoomCode(incomingInvite.roomId, incomingInvite.mode);
        setJoinInputs((prev) => ({ ...prev, [incomingInvite.mode]: norm }));
        if (incomingInvite.userRole) {
          setSelectedRoles((prev) => ({ ...prev, [incomingInvite.mode]: incomingInvite.userRole as string }));
        }
      }
    }
  }, [incomingInvite]);

  // Active connected room in view (with auto-normalization e.g. 542 -> MASTERCLASS-542)
  const rawTargetCode =
    activeTab === 'masterclass'
      ? masterclassRole === 'maestro'
        ? hostedRoomCodes.masterclass
        : joinInputs.masterclass.trim()
      : joinInputs[activeTab].trim() || hostedRoomCodes[activeTab];

  const currentRoomCode =
    normalizeRoomCode(rawTargetCode, activeTab) ||
    (activeTab === 'masterclass' ? (masterclassRole === 'maestro' ? hostedRoomCodes.masterclass : 'AULA-1') : hostedRoomCodes[activeTab]);

  const currentRole =
    activeTab === 'masterclass' ? masterclassRole : selectedRoles[activeTab];

  // WebSocket & HTTP Live Lobby Presence
  const [connectedMembers, setConnectedMembers] = useState<
    { id: string; username: string; role: string; score: number }[]
  >([]);
  const socketRef = useRef<WebSocket | null>(null);

  // Connect WebSocket & HTTP Polling Heartbeat to currently active room and role
  useEffect(() => {
    if (!currentRoomCode || currentRoomCode.length < 3) return;

    let isMounted = true;
    const clientSessionId = clientSessionIdRef.current;

    // 1. Initial HTTP Join & Heartbeat
    const syncHttp = async () => {
      try {
        const joinRes = await fetch(getAppApiUrl('/api/room/join'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: currentRoomCode,
            username: globalName,
            role: currentRole,
            mode: activeTab,
            clientId: clientSessionId,
          }),
        });
        if (joinRes.ok) {
          const data = await joinRes.json();
          if (isMounted && Array.isArray(data.members)) {
            setConnectedMembers(data.members);
          }
        }
      } catch (e) {}
    };

    syncHttp();

    // 2. Poll room state every 1.5 seconds (bulletproof fallback across networks and proxies)
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const cParam = clientSessionId ? `?clientId=${encodeURIComponent(clientSessionId)}` : '';
        const res = await fetch(getAppApiUrl(`/api/room/${encodeURIComponent(currentRoomCode)}/state${cParam}`));
        if (res.ok) {
          const stateData = await res.json();
          if (isMounted && Array.isArray(stateData.members)) {
            setConnectedMembers(stateData.members);
          }
        }
      } catch (e) {}
    }, 1500);

    // 3. WebSocket Real-Time Connection
    connectRoomWebSocket(currentRoomCode, globalName, currentRole, activeTab, clientSessionId);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [currentRoomCode, currentRole, activeTab, globalName]);

  const connectRoomWebSocket = (
    rId: string,
    name: string,
    role: string,
    mode: SocialRoomMode,
    cliId: string
  ) => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const wsUrl = getAppWebSocketUrl();

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
            clientId: cliId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'room:state' && Array.isArray(msg.members)) {
            setConnectedMembers(msg.members);
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
    const cleanRoom = normalizeRoomCode(room, mode);
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
        title = '👨‍🏫 KEYCRAFT STUDIO PIANO MASTERCLASS INVITATION';
        subtitle = `Hello! I invite you to an online piano masterclass.\n📍 Room Code: *${room}*\nRole: *Student*`;
        break;
      case 'battle':
        title = '⚡ PIANO BATTLE 1v1 - PIANO DUEL';
        subtitle = `I challenge you to a piano duel on the falling notes waterfall!\n📍 Challenge Code: *${room}*\nRole: *Challenger*`;
        break;
      case 'duet':
        title = '🎹 FOUR-HANDS PIANO';
        subtitle = `Let's play four hands together! You play the melody and I'll play the bass.\n📍 Room Code: *${room}*`;
        break;
      case 'pianobar':
        title = '🍸 CONCERT HALL & LIVE PIANO BAR';
        subtitle = `Join and listen to my live performance on the Grand Piano!\n📍 Room Code: *${room}*\nRole: *Listening Audience*`;
        break;
      case 'relay':
        title = '🏃 MUSICAL RELAY';
        subtitle = `Let's play a relay game on the piano (one measure each)!\n📍 Room Code: *${room}*`;
        break;
      case 'guess':
        title = '❓ GUESS THE SONG - PIANO QUIZ';
        subtitle = `Be the first to guess the songs played on the piano!\n📍 Room Code: *${room}*`;
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

  // Launch Piano Session with active room verification for Allievo
  const handleLaunchSession = async (customRoom?: string, customRole?: string) => {
    const rawTarget = customRoom || currentRoomCode;
    const targetRoom = normalizeRoomCode(rawTarget, activeTab);
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

  // Check if Masterclass Maestro has a match (at least one other user has connected to this room)
  const clientSessionId = clientSessionIdRef.current;
  const isMasterclass = activeTab === 'masterclass';
  const isMaestro = isMasterclass && masterclassRole === 'maestro';
  const isAllievo = isMasterclass && masterclassRole === 'allievo';

  const otherConnectedMember = connectedMembers.find((m) => {
    if (m.id && m.id === clientSessionId) return false;
    // Any member that is not us is considered a match
    return true;
  });

  const hasStudentMatch = Boolean(otherConnectedMember) || connectedMembers.length >= 2;

  // For Allievo: check if Maestro is present in the room
  const maestroMember = connectedMembers.find((m) => {
    if (m.id && m.id === clientSessionId) return false;
    return m.role && (m.role.toLowerCase() === 'maestro' || m.role.toLowerCase() === 'teacher');
  }) || connectedMembers.find((m) => m.id !== clientSessionId && m.role && m.role.toLowerCase() !== 'allievo');

  // Sound chime when student match is found for Maestro
  const hadMatchRef = useRef(false);
  useEffect(() => {
    if (isMaestro && hasStudentMatch && !hadMatchRef.current) {
      hadMatchRef.current = true;
      try {
        audioEngine.playNote('C5', '8n', 'piano');
        setTimeout(() => audioEngine.playNote('E5', '8n', 'piano'), 150);
        setTimeout(() => audioEngine.playNote('G5', '4n', 'piano'), 300);
      } catch (e) {}
    } else if (!hasStudentMatch) {
      hadMatchRef.current = false;
    }
  }, [hasStudentMatch, isMaestro]);

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
            In Masterclass, the Teacher automatically gets their classroom and waits for a student match. The Student enters the code and connects instantly!
          </p>
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
                  LAST SESSION RESULTS ({lastResults.mode.toUpperCase()})
                </h3>
                <p className="text-xs text-amber-300/90 font-medium">
                  Room: <span className="font-mono font-bold">{lastResults.roomId}</span> • Duration: {lastResults.durationSeconds}s
                </p>
              </div>
            </div>

            {onClearResults && (
              <button
                onClick={onClearResults}
                className="text-slate-400 hover:text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer"
              >
                Close Results ✖
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Final Score</div>
              <div className="text-xl font-black text-amber-400">{lastResults.score} PTS</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Max Combo</div>
              <div className="text-xl font-black text-emerald-400">x{lastResults.comboMax || 1}</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Note Accuracy</div>
              <div className="text-xl font-black text-yellow-300">{lastResults.accuracy}%</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Executed Notes</div>
              <div className="text-xl font-black text-indigo-400">{lastResults.notesPlayed}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODE SELECTOR TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
        {[
          { id: 'masterclass', label: 'Masterclass', icon: GraduationCap, tag: 'Teacher & Student' },
          { id: 'battle', label: 'Piano Battle', icon: Swords, tag: 'Challenger Duel' },
          { id: 'duet', label: 'Four Hands', icon: Layers, tag: 'Two Pianists' },
          { id: 'pianobar', label: 'Piano Bar', icon: Radio, tag: 'Live & Audience' },
          { id: 'relay', label: 'Relay', icon: Repeat, tag: 'Coop Challengers' },
          { id: 'guess', label: 'Guess Song', icon: HelpCircle, tag: 'Music Quiz' },
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
                {activeTab === 'masterclass' && 'Teacher & Student Masterclass'}
                {activeTab === 'battle' && '1v1 Duel'}
                {activeTab === 'duet' && 'Four Hands'}
                {activeTab === 'pianobar' && 'Live Concert'}
                {activeTab === 'relay' && 'Cooperative'}
                {activeTab === 'guess' && 'Quiz'}
              </span>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                {activeTab === 'masterclass' && 'Masterclass: Interactive Lesson'}
                {activeTab === 'battle' && 'Piano Battle: 1v1 Scrolling Duel Between Challengers'}
                {activeTab === 'duet' && 'Four-Hands Piano: Melody & Bass'}
                {activeTab === 'pianobar' && 'Piano Bar & Listening Room with Audience'}
                {activeTab === 'relay' && 'Musical Relay: One Measure Each'}
                {activeTab === 'guess' && 'Guess the Song: Timed Challenge'}
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              {activeTab === 'masterclass' && 'The Teacher assigns phrases to the student and speaks hands-free. The Teacher enters the piano room only when the Student has connected!'}
              {activeTab === 'battle' && 'Both players are equal challengers! The one with the highest score on falling notes wins.'}
              {activeTab === 'duet' && 'Two pianists split the keyboard: one plays the melody with the right hand, the other the bass.'}
              {activeTab === 'pianobar' && 'A live pianist performs on the Grand Piano while the connected audience listens and sends applause.'}
              {activeTab === 'relay' && 'Challenging musicians pass the baton by playing consecutive measures of the same song.'}
              {activeTab === 'guess' && 'Competitors challenge each other to guess the song title by listening to the fewest notes possible.'}
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
                <span>I am the Teacher (Instructor)</span>
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
                <span>I am the Student (Learner)</span>
              </button>
            </div>

            {/* 2A. TEACHER VIEW: AUTOMATIC ROOM ASSIGNMENT + UNLOCKED LAUNCH */}
            {isMaestro && (
              <div className="bg-slate-950 p-5 rounded-2xl border-2 border-amber-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Your Teacher Masterclass Room
                      </h3>
                      <p className="text-slate-400 text-xs">
                        The room is automatically assigned. Share it with the student.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full font-black uppercase">
                    👑 Teacher
                  </span>
                </div>

                {/* Room code box */}
                <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Automatically Assigned Room Code:
                    </span>
                    <div className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                      {hostedRoomCodes.masterclass}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      The student can also type just the number: <strong className="text-amber-300">{hostedRoomCodes.masterclass.replace('MASTERCLASS-', '')}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleCopyLink('masterclass', hostedRoomCodes.masterclass, 'allievo')}
                      className="flex-1 sm:flex-none py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Copy invite link for student"
                    >
                      {copiedState === hostedRoomCodes.masterclass ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-amber-400" />
                      )}
                      <span>{copiedState === hostedRoomCodes.masterclass ? 'Link Copied!' : 'Copy Link 📋'}</span>
                    </button>

                    <button
                      onClick={() => handleShareWhatsApp('masterclass', hostedRoomCodes.masterclass, 'allievo')}
                      className="flex-1 sm:flex-none py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                      title="Send code to student on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Send on WhatsApp 💬</span>
                    </button>
                  </div>
                </div>

                {/* Student Match Status */}
                <div className="space-y-2">
                  {hasStudentMatch ? (
                    <div className="bg-emerald-950/80 border-2 border-emerald-400 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🎉</span>
                        <div>
                          <div className="text-emerald-300 font-black text-sm uppercase tracking-wide">
                            MATCH FOUND: STUDENT CONNECTED!
                          </div>
                          <div className="text-slate-200 text-xs font-semibold">
                            👨‍🎓 {otherConnectedMember?.username || 'The student'} has entered room {hostedRoomCodes.masterclass}!
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black text-xs rounded-full uppercase shadow text-center shrink-0">
                        Ready at Piano 🟢
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-900/80 border border-amber-500/30 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                        <span className="text-xs text-amber-200">
                          Waiting for the student to enter code <strong>{hostedRoomCodes.masterclass}</strong> (or just <strong>{hostedRoomCodes.masterclass.replace('MASTERCLASS-', '')}</strong>)...
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setConnectedMembers((prev) => [
                            { id: clientSessionId, username: globalName, role: 'maestro', score: 0 },
                            { id: 'sim_allievo_' + Date.now(), username: 'Test Student 👨‍🎓', role: 'allievo', score: 0 },
                          ]);
                        }}
                        className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold cursor-pointer transition-all shrink-0 self-start sm:self-center"
                      >
                        🤖 Simulate Student for Testing
                      </button>
                    </div>
                  )}
                </div>

                {/* Lesson Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">
                      Lesson Reference Sheet
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
                      Student Performance Speed
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

                {/* Teacher Launch Button: ALWAYS ACTIVE */}
                <div className="pt-2 space-y-1.5">
                  <button
                    onClick={() => handleLaunchSession(hostedRoomCodes.masterclass, 'maestro')}
                    className={`w-full py-4 px-6 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-2xl active:scale-95 cursor-pointer ${
                      hasStudentMatch
                        ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-slate-950 animate-pulse'
                        : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 shadow-amber-500/20'
                    }`}
                  >
                    {hasStudentMatch ? (
                      <>
                        <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                        <span>STUDENT CONNECTED! START PIANO LESSON ({hostedRoomCodes.masterclass}) 🚀</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                        <span>ENTER PIANO AS TEACHER ({hostedRoomCodes.masterclass}) 🎹</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-0.5 text-[11px] text-slate-400">
                    {hasStudentMatch ? (
                      <span className="text-emerald-400 font-bold">✓ The student is ready in your room! Click above to play together.</span>
                    ) : (
                      <span>You can enter the piano right away to warm up: the student will connect directly to your room with code <strong>{hostedRoomCodes.masterclass.replace('MASTERCLASS-', '')}</strong>!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2B. VISTA ALLIEVO: INSERISCE IL CODICE AULA COMUNICATO DAL MAESTRO */}
            {isAllievo && (() => {
              const normalizedInputRoom = normalizeRoomCode(joinInputs.masterclass, 'masterclass');
              return (
                <div className="bg-slate-950 p-5 rounded-2xl border-2 border-emerald-500/50 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white">
                          Student Masterclass Entry
                        </h3>
                        <p className="text-slate-400 text-xs">
                          Enter the Teacher&apos;s room code (e.g. <strong>{hostedRoomCodes.masterclass.replace('MASTERCLASS-', '')}</strong> or <strong>{hostedRoomCodes.masterclass}</strong>).
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-black uppercase">
                      👨‍🎓 Student
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-300 font-bold uppercase block">
                      Teacher Room Code to Enter:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={joinInputs.masterclass}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setJoinInputs((prev) => ({ ...prev, masterclass: val }));
                        }}
                        placeholder={`E.g. ${hostedRoomCodes.masterclass.replace('MASTERCLASS-', '')} or ${hostedRoomCodes.masterclass}`}
                        className="flex-1 bg-slate-900 border-2 border-emerald-500/50 text-emerald-300 font-mono font-black text-sm sm:text-base rounded-xl px-4 py-3 outline-none focus:border-emerald-400 uppercase tracking-widest placeholder:normal-case placeholder:font-sans placeholder:text-slate-600"
                      />
                      {joinInputs.masterclass && (
                        <button
                          onClick={() => setJoinInputs((prev) => ({ ...prev, masterclass: '' }))}
                          className="text-slate-400 hover:text-white text-xs px-3 py-3 bg-slate-900 rounded-xl border border-slate-800"
                          title="Clear"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {joinInputs.masterclass.trim() && (
                      <RoomCodeValidator roomCode={normalizedInputRoom} maestroMember={maestroMember} clientSessionId={clientSessionId} />
                    )}
                  </div>

                  {/* Pulsante Entra Allievo */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const targetRoom = normalizedInputRoom;
                        if (!targetRoom) return;
                        handleLaunchSession(targetRoom, 'allievo');
                      }}
                      disabled={!joinInputs.masterclass.trim()}
                      className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-40 active:scale-95 text-slate-950 font-black text-sm sm:text-base rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>🚀 ENTER TEACHER ROOM ({normalizedInputRoom || 'ENTER CODE'})</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })()}
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
                    <span>Have a Room Code? Enter here</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                    {activeTab === 'battle' ? 'Challenger' : activeTab === 'pianobar' ? 'Audience' : 'Participant'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">
                    Enter Room Code:
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
                    <span>{copiedState === hostedRoomCodes[activeTab] ? 'Copied!' : 'Copy Link 📋'}</span>
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
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
