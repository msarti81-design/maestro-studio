import React, { useState, useEffect, useRef } from 'react';
import { SocialRoomMode, MusicalPostcard, SheetSong, ActiveSocialSession, SocialSessionResults } from '../types';
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
  Wifi,
  WifiOff,
  Globe,
  Copy,
  Check,
  MessageCircle,
  Lock,
  Unlock,
  AlertCircle,
  User,
} from 'lucide-react';

interface SocialViewProps {
  onLaunchPianoChallenge: (session: ActiveSocialSession) => void;
  lastResults?: SocialSessionResults | null;
  onClearResults?: () => void;
}

export const SocialView: React.FC<SocialViewProps> = ({
  onLaunchPianoChallenge,
  lastResults,
  onClearResults,
}) => {
  const [activeTab, setActiveTab] = useState<SocialRoomMode>('masterclass');

  // Global Username Management
  const [globalName, setGlobalName] = useState<string>(() => getUsername());

  // Room Setup & Connection State
  const [userRole, setUserRole] = useState<'maestro' | 'allievo' | 'spettatore' | 'giocatore'>('maestro');
  const [roomId, setRoomId] = useState<string>('AULA-MAESTRO-101');
  const [selectedSong, setSelectedSong] = useState<SheetSong>(PRESET_SONGS[0]);
  const [masterclassSpeed, setMasterclassSpeed] = useState<number>(100);

  // WebSocket Live Lobby Presence
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
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

  // Update room code prefix when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'masterclass':
        setRoomId(`MASTERCLASS-${Math.floor(100 + Math.random() * 900)}`);
        setUserRole('maestro');
        break;
      case 'relay':
        setRoomId(`STAFFETTA-${Math.floor(100 + Math.random() * 900)}`);
        setUserRole('giocatore');
        break;
      case 'duet':
        setRoomId(`DUETTO-${Math.floor(100 + Math.random() * 900)}`);
        setUserRole('giocatore');
        break;
      case 'battle':
        setRoomId(`BATTLE-${Math.floor(100 + Math.random() * 900)}`);
        setUserRole('giocatore');
        break;
      case 'guess':
        setRoomId(`QUIZ-${Math.floor(100 + Math.random() * 900)}`);
        setUserRole('giocatore');
        break;
      case 'pianobar':
        setRoomId(`PIANOBAR-${Math.floor(100 + Math.random() * 900)}`);
        setUserRole('spettatore');
        break;
      case 'postcards':
        setRoomId(`POSTCARD-${Math.floor(100 + Math.random() * 900)}`);
        break;
    }
  }, [activeTab]);

  // Connect WebSocket on Room Setup
  useEffect(() => {
    connectRoomWebSocket(roomId, globalName, userRole);
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [roomId, activeTab]);

  const connectRoomWebSocket = (rId: string, name: string, role: string) => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnecting(true);
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            type: 'room:join',
            roomId: rId,
            username: name,
            role,
            mode: activeTab,
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

      ws.onerror = () => {
        setIsConnecting(false);
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnecting(false);
        setIsConnected(false);
      };
    } catch (e) {
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const handleGlobalNameChange = (newName: string) => {
    setGlobalName(newName);
    saveGlobalUsername(newName);
    if (isConnected && socketRef.current) {
      connectRoomWebSocket(roomId, newName, userRole);
    }
  };

  // WhatsApp Invite Link Generator
  const handleShareWhatsApp = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${baseUrl}/#social?mode=${activeTab}&room=${roomId}`;

    let textMessage = '';
    switch (activeTab) {
      case 'masterclass':
        textMessage = `👨‍🏫 *INVITO MASTERCLASS PIANOFORTE MAESTRO STUDIO*\nCiao! Ti invito alla lezione di pianoforte in rete.\n\n📍 *Codice Aula:* ${roomId}\n🔗 *Unisciti qui:* ${shareUrl}`;
        break;
      case 'relay':
        textMessage = `🎹 *STAFFETTA MUSICALE - PASS THE MELODY*\nSei pronto a suonare una battuta a testa? Unisciti alla mia stanza!\n\n📍 *Codice Stanza:* ${roomId}\n🔗 *Gioca qui:* ${shareUrl}`;
        break;
      case 'duet':
        textMessage = `🎹 *DUELLO A QUATTRO MANI PIANOFORTE*\nSuoniamo insieme! Tu la melodia e io il basso.\n\n📍 *Codice Stanza:* ${roomId}\n🔗 *Unisciti qui:* ${shareUrl}`;
        break;
      case 'battle':
        textMessage = `⚡ *PIANO BATTLE CHALLENGE*\nTi sfido a un duello sul pianoforte a scorrimento stile Guitar Hero!\n\n📍 *Codice Stanza:* ${roomId}\n🔗 *Entra nel duello:* ${shareUrl}`;
        break;
      case 'guess':
        textMessage = `❓ *INDOVINA LA CANZONE - QUIZ PIANISTICO*\nIndovina per primo i brani suonati al pianoforte!\n\n📍 *Codice Stanza:* ${roomId}\n🔗 *Gioca ora:* ${shareUrl}`;
        break;
      case 'pianobar':
        textMessage = `📻 *PIANO BAR VIRTUALE & SALA D'ASCOLTO*\nEntra ad ascoltare l'esibizione live al pianoforte Gran Coda!\n\n📍 *Codice Stanza:* ${roomId}\n🔗 *Ascolta qui:* ${shareUrl}`;
        break;
      default:
        textMessage = `🎹 *MAESTRO STUDIO SOCIAL*\nUnisciti alla mia stanza sul pianoforte virtuale!\n\n📍 *Codice:* ${roomId}\n🔗 ${shareUrl}`;
        break;
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
    window.open(waUrl, '_blank');
  };

  // Check if enough players are connected (Minimum 2 required for Masterclass, Relay, Duet, Battle)
  const isRoomReadyToStart = connectedMembers.length >= 2 || activeTab === 'postcards';

  // Launch Full Screen Piano Challenge
  const handleStartPianoChallenge = () => {
    if (!isRoomReadyToStart) {
      alert(`⚠️ In attesa dell'allievo/sfidante! Condividi l'invito su WhatsApp o attendi che la seconda persona entri nel codice stanza "${roomId}".`);
      return;
    }

    const session: ActiveSocialSession = {
      mode: activeTab,
      roomId: roomId.trim() || 'AULA-1',
      userRole,
      song: selectedSong,
      status: 'active',
    };
    onLaunchPianoChallenge(session);
  };

  const playPostcardMelody = (card: MusicalPostcard) => {
    card.melody.forEach((m, idx) => {
      setTimeout(() => {
        audioEngine.playNote(m.note, m.duration, 'piano');
      }, idx * 400);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 select-none pb-12">
      {/* GLOBAL USER PROFILE & HEADER */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            <span>Configurazione Connessione & Sala d'Attesa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center md:justify-start gap-2">
            <span>Social & Challenge Studio</span>
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-slate-400 text-xs max-w-xl">
            Scegli la modalità, invita l'allievo/sfidante via WhatsApp e avvia il pianoforte soltanto quando la stanza è pronta!
          </p>
        </div>

        {/* Global User Profile Bar */}
        <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-sm">
            👨‍🏫
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <User className="w-3 h-3 text-amber-400" />
              <span>Profilo Utente Globale</span>
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

      {/* SUMMARY RESULTS CARD (Only rendered when real notes were played!) */}
      {lastResults && lastResults.notesPlayed > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-2 border-amber-400 p-5 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  ESITI ULTIMA ESECUZIONE ({lastResults.mode.toUpperCase()})
                </h3>
                <p className="text-xs text-amber-300/90 font-medium">
                  Stanza: <span className="font-mono font-bold">{lastResults.roomId}</span> • Durata: {lastResults.durationSeconds}s
                </p>
              </div>
            </div>

            {onClearResults && (
              <button
                onClick={onClearResults}
                className="text-slate-400 hover:text-white text-xs font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800"
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

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Condividi Risultati su WhatsApp 💬</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE SELECTOR TABS */}
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
              className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold text-center active:scale-95 cursor-pointer ${
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

      {/* ROOM SETUP & MANDATORY ONLINE WAITING ROOM LOBBY */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-7 rounded-3xl space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Sala d'Attesa & Setup Stanza: {activeTab.toUpperCase()}</span>
            </h2>
            <p className="text-slate-400 text-xs">
              L'avvio sul pianoforte richiede che l'allievo o lo sfidante sia connesso nella stessa stanza.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Codice Stanza:</span>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-amber-400 w-36 uppercase text-center"
            />
          </div>
        </div>

        {/* MODE SPECIFIC OPTIONS */}
        {activeTab === 'masterclass' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Ruolo nella Lezione</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 text-amber-300 font-bold text-xs rounded-xl px-3 py-2 outline-none"
              >
                <option value="maestro">👨‍🏫 Insegnante / Maestro</option>
                <option value="allievo">👨‍🎓 Allievo / Studente</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Brano Spartito Lezione</label>
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
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Velocit&agrave; Rallentatore</label>
              <div className="flex items-center gap-1 pt-0.5">
                {[50, 75, 100].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setMasterclassSpeed(spd)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
        )}

        {/* LIVE WAITING ROOM PRESENCE BOX (MANDATORY REQUIREMENT) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Partecipanti in Stanza ({connectedMembers.length}/2 Connessi)</span>
            </div>

            {isRoomReadyToStart ? (
              <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Stanza Pronta per la Sfida!</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>In Attesa che l'Allievo si Unisca...</span>
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
                {userRole}
              </span>
            </div>

            {/* Slot 2: Connected Peer or Waiting Placeholder */}
            {connectedMembers.length >= 2 ? (
              <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs font-bold animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300">
                    {connectedMembers.find((m) => m.username !== globalName)?.username || 'Allievo Connesso'}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded font-black uppercase">
                  Online
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl flex items-center justify-between text-xs font-bold text-slate-500 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span>In attesa di un Allievo o Sfidante...</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setConnectedMembers([
                        { id: 'usr_me', username: globalName, role: userRole, score: 0 },
                        {
                          id: 'bot_student',
                          username: userRole === 'maestro' ? 'Allievo Bot 🤖' : 'Maestro Bot 👨‍🏫',
                          role: userRole === 'maestro' ? 'allievo' : 'maestro',
                          score: 0,
                        },
                      ]);
                    }}
                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold transition-all"
                  >
                    🤖 Simula Allievo
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    WhatsApp 💬
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS: WHATSAPP SHARE & ENFORCED PIANO LAUNCH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Direct WhatsApp Share Button */}
          <button
            onClick={handleShareWhatsApp}
            className="py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white shrink-0" />
            <span>Condividi Invito Allievo su WhatsApp 💬</span>
          </button>

          {/* Enforced Piano Challenge Launch (Locked if alone) */}
          <button
            onClick={handleStartPianoChallenge}
            disabled={!isRoomReadyToStart}
            className={`py-3.5 px-5 font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
              isRoomReadyToStart
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            {isRoomReadyToStart ? (
              <>
                <Unlock className="w-5 h-5 text-slate-950 shrink-0" />
                <span>AVVIA SFIDA SUL PIANOFORTE VERO E PROPRIO 🎹 (2/2)</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-slate-500 shrink-0" />
                <span>IN ATTESA DELL'ALLIEVO SU WHATSAPP... 🔒</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AUDIO-LETTERE POSTCARDS SECTION */}
      {activeTab === 'postcards' && (
        <div className="bg-slate-900/90 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            <span>Messaggi Musicali & Cartoline Interattive</span>
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
                onClick={handleShareWhatsApp}
                className="w-full py-2 bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5"
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
                    className="text-[10px] text-amber-400 font-bold flex items-center gap-1 pt-1"
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
