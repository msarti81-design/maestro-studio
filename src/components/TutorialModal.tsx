import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Piano,
  Radio,
  Sliders,
  Users,
  Eye,
  Music,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Volume2,
  Timer,
  Palette,
  ArrowRight,
  Star,
  Share2,
  Check,
  MessageSquare,
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMode?: (mode: 'piano' | 'sheet' | 'jam' | 'social' | 'recordings') => void;
  initialTab?: 'onboarding' | 'midi' | 'masterclass' | 'modes' | 'options' | 'faq';
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=it.freeserv.virtukeys';
const WEB_STUDIO_URL = 'https://freeserv.it/Song';

const DEFAULT_CHECKLIST = [
  { id: 'play_piano', label: 'Play the 88-Key Concert Grand Piano & try a 3D luxury key material', mode: 'piano' as const },
  { id: 'waterfall_fx', label: 'Practice a song in Falling Notes Waterfall with 13 Visual FX', mode: 'piano' as const },
  { id: 'sheet_composer', label: 'Create or edit a score in the Sheet Music Composer', mode: 'sheet' as const },
  { id: 'jam_band', label: 'Play along with live drums & bass in Jam Band Studio', mode: 'jam' as const },
  { id: 'social_masterclass', label: 'Explore Live Multiplayer Masterclass & Community Hub', mode: 'social' as const },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenMode,
  initialTab = 'onboarding',
}) => {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'midi' | 'masterclass' | 'modes' | 'options' | 'faq'>(initialTab);
  const [walkthroughStep, setWalkthroughStep] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['play_piano'];
    try {
      const saved = localStorage.getItem('virtukeys_onboarding_checklist_v1');
      return saved ? JSON.parse(saved) : ['play_piano'];
    } catch {
      return ['play_piano'];
    }
  });

  // Share & Rating State
  const [shareText, setShareText] = useState<string>(
    `🎹 Check out VirtuKeys Studio! Play an 88-key grand piano with 13 visual FX, sheet music composer, multi-track jam band & live masterclasses:\n📲 Google Play: ${PLAY_STORE_URL}\n🌐 Web: ${WEB_STUDIO_URL}`
  );
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const toggleChecklistTask = (id: string) => {
    setCompletedTasks((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('virtukeys_onboarding_checklist_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSpeakGuide = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text =
      'Welcome to VirtuKeys Studio! Step 1: Play the 88-key grand piano with 10 luxury 3D key materials and zero latency. Step 2: Learn songs with the falling notes waterfall, 13 visual effects, or traditional sheet music. Step 3: Compose scores in the Sheet Composer or jam with live drums and bass. Step 4: Connect with teachers and friends in real-time multiplayer masterclasses!';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleShareApp = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'VirtuKeys Studio - 88-Key Piano & Masterclass',
          text: shareText,
          url: PLAY_STORE_URL,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {}
  };

  const walkthroughSteps = [
    {
      title: '1. 88-Key Concert Grand Piano & 10 Luxury Materials',
      desc: 'Play with zero latency using multi-touch glissando or a USB/Bluetooth MIDI keyboard. Tap the material button at the top to switch between Concert Ivory, 24K Gold, Emerald Jade, Magma Ruby, Arctic Sapphire, and more!',
      badge: '🎹 Step 1 of 4',
      mode: 'piano' as const,
      actionLabel: 'Try Concert Piano',
    },
    {
      title: '2. Falling Notes Waterfall, 13 Viral FX & Sheet Music',
      desc: 'Open the Song Library to learn over 100 classical & modern songs. Switch between Wait-for-Note Learn Mode, Finger Guide (1-5), and Arcade Mode, or record vertical 9:16 Reels with 13 spectacular visual effects!',
      badge: '✨ Step 2 of 4',
      mode: 'piano' as const,
      actionLabel: 'Explore Songs & FX',
    },
    {
      title: '3. Multi-Track Jam Band & Sheet Music Composer',
      desc: 'Want to improvise or write music? Use Jam Band for real-time drums and bass accompaniment, or open the Sheet Composer to write scores note-by-note and export to MIDI.',
      badge: '🎼 Step 3 of 4',
      mode: 'jam' as const,
      actionLabel: 'Open Jam Band',
    },
    {
      title: '4. Real-Time Multiplayer Masterclass & Community',
      desc: 'Connect remotely as Teacher & Student with live 2-way voice chat and synchronized keyboard sharing, or challenge other pianists in Duet, Relay, and Quiz modes!',
      badge: '👑 Step 4 of 4',
      mode: 'social' as const,
      actionLabel: 'Open Masterclass Hub',
    },
  ];

  const checklistProgress = Math.round((completedTasks.length / DEFAULT_CHECKLIST.length) * 100);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-500/20 via-slate-850 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Interactive Walkthrough & Help</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                  VIRTUKEYS
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Dynamic onboarding, checklist, FAQs, rating & sharing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSpeakGuide}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                isSpeaking
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
              title="Accessibility: Listen to audio walkthrough (Text-to-Speech)"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800/80 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'onboarding', label: '🚀 Walkthrough & Checklist', icon: Sparkles },
            { id: 'midi', label: '🎹 Keyboard & MIDI', icon: Piano },
            { id: 'masterclass', label: '👑 Live Masterclass', icon: Users },
            { id: 'modes', label: '🕹️ Play & Practice', icon: Radio },
            { id: 'options', label: '⚙️ All Options', icon: Sliders },
            { id: 'faq', label: '⭐ Rate, Share & FAQ', icon: HelpCircle },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS CONTAINER */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[65vh] space-y-4 text-xs text-slate-300">
          {/* TAB 0: INTERACTIVE WALKTHROUGH & ONBOARDING CHECKLIST */}
          {activeTab === 'onboarding' && (
            <div className="space-y-4">
              {/* Dynamic Interactive Step-by-Step Tour */}
              <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-indigo-500/10 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    {walkthroughSteps[walkthroughStep].badge}
                  </span>
                  <div className="flex items-center gap-1">
                    {walkthroughSteps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setWalkthroughStep(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          walkthroughStep === idx ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                        }`}
                        title={`Go to step ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {walkthroughSteps[walkthroughStep].title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {walkthroughSteps[walkthroughStep].desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWalkthroughStep((s) => (s > 0 ? s - 1 : walkthroughSteps.length - 1))}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setWalkthroughStep((s) => (s + 1) % walkthroughSteps.length)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      Next Step →
                    </button>
                  </div>

                  {onOpenMode && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenMode(walkthroughSteps[walkthroughStep].mode);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 shadow cursor-pointer"
                    >
                      <span>{walkthroughSteps[walkthroughStep].actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Onboarding Progress Checklist */}
              <div className="bg-slate-800/50 border border-slate-700/70 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-white text-xs block">
                      ✅ New Pianist Onboarding Checklist
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Complete these steps as you explore VirtuKeys Studio
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl">
                    {checklistProgress}% Done
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  {DEFAULT_CHECKLIST.map((item) => {
                    const isDone = completedTasks.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistTask(item.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                              isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className={`text-[11px] font-semibold ${isDone ? 'line-through opacity-80' : ''}`}>
                            {item.label}
                          </span>
                        </div>
                        {onOpenMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDone) toggleChecklistTask(item.id);
                              onClose();
                              onOpenMode(item.mode);
                            }}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 rounded text-[10px] font-bold transition-colors shrink-0"
                          >
                            Go →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: KEYBOARD & MIDI */}
          {activeTab === 'midi' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                  <Piano className="w-4 h-4 text-amber-400" />
                  Digital Piano Connection (USB-OTG & Bluetooth)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  VirtuKeys Studio supports plug-and-play connection with any USB or Bluetooth MIDI keyboard or digital piano!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1.5">
                  <span className="font-bold text-white text-xs block">🔌 USB-OTG Cable</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Connect your piano keyboard via USB-OTG. The app detects pressed keys automatically with zero configuration!
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1.5">
                  <span className="font-bold text-white text-xs block">📶 Bluetooth MIDI</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    If your keyboard supports Bluetooth MIDI, enable Bluetooth on your device to connect wirelessly.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <span className="font-extrabold text-amber-300 text-xs block">🎹 On-Screen Touch Keyboard</span>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Octave Shift (`&lt;` and `&gt;`):</strong> Shift the visible keys towards lower or higher octaves.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Glissando & Multi-Touch:</strong> Slide your fingers across keys for glissandos or play multi-finger chords.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE MASTERCLASS */}
          {activeTab === 'masterclass' && (
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/30 p-3.5 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-purple-300 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Virtual Classroom & Masterclass (Teacher ↔ Student)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  The virtual classroom lets teachers and students connect in real-time remotely with 2-way live voice audio and interactive key sharing!
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1">
                  <span className="font-bold text-amber-300 text-xs block">👑 Teacher Role</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    The teacher plays a musical phrase or selects a song and assigns it to the student, guiding the lesson with live voice audio.
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1">
                  <span className="font-bold text-indigo-300 text-xs block">🎓 Student Role</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    The student sees the teacher's recorded phrase on screen along with fingering hints (1-5) and educational feedback.
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1">
                  <span className="font-bold text-emerald-300 text-xs block">🎙️ Live Voice Audio & Interactive Feedback</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Turn on the microphone for real-time conversation. When the student completes a phrase, turn passes back with a celebration chime!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAY & PRACTICE */}
          {activeTab === 'modes' && (
            <div className="space-y-4">
              <div className="bg-indigo-500/10 border border-indigo-500/30 p-3.5 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-indigo-300 text-sm flex items-center gap-2">
                  <Radio className="w-4 h-4 text-indigo-400" />
                  Practice Modes & 13 Visual FX
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Choose how to learn songs based on your skill level and customize falling note effects!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1.5">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <span>💡</span> Learn Note-by-Note (Wait Mode)
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    The song pauses and waits until you press the correct piano key. Perfect for learning at your own pace!
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1.5">
                  <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                    <span>⚡</span> Arcade & Demo Modes
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Notes stream continuously in real-time with 13 selectable visual FX (Tesla Lightning, Fireworks, Aurora, 24K Gold Notes, Matrix).
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <span className="font-extrabold text-indigo-300 text-xs block">🎼 Two Sheet Views</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700">
                    <strong className="text-white block mb-0.5">🎹 3D Waterfall View</strong>
                    <span>3D falling notes cascading towards piano keys with custom visual effects.</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700">
                    <strong className="text-white block mb-0.5">🎼 Traditional Sheet View</strong>
                    <span>Dual staff notation (Treble Clef & Bass Clef) with authentic music notation.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALL OPTIONS (3 DOTS MENU) */}
          {activeTab === 'options' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  All Settings & Options (3-Dots Menu)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Open the Options menu (three dots icon at top right of the piano) to customize every aspect of your Studio:
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5">
                  <Eye className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block">Default Play View & Scroll Mode</strong>
                    <span className="text-slate-400 text-[11px] block">
                      Choose whether songs start in Waterfall or Traditional Sheet Music, with Sweeping or Continuous Scroll.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5">
                  <Palette className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block">10 Luxury 3D Key Materials</strong>
                    <span className="text-slate-400 text-[11px] block">
                      Switch between Concert Ivory, Vintage Wood, Carrara Marble, 24K Royal Gold, Emerald Jade, Magma Ruby, Arctic Sapphire, Cosmic Amethyst, Titanium Carbon, and Cyber Synth.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5">
                  <Timer className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block">Acoustic Metronome & Speed (BPM)</strong>
                    <span className="text-slate-400 text-[11px] block">
                      Enable the acoustic click track and adjust performance tempo from 40 to 240 BPM.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RATE APP, SHARE APP, FEEDBACK & FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {/* 1. RATE YOUR APP ON GOOGLE PLAY */}
              <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-slate-900 border border-amber-500/40 p-4 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>Rate VirtuKeys on Google Play</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Enjoying the piano studio? Your 5-star review helps fellow musicians discover VirtuKeys!
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setSelectedStars(star)}
                        className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= selectedStars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Rate on Google Play Store</span>
                  </a>
                </div>
              </div>

              {/* 2. SHARE APP WITH CUSTOMIZABLE MESSAGE */}
              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-cyan-300 text-xs flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Share VirtuKeys with Friends & Musicians</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Editable message</span>
                </div>
                <textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-[11px] text-slate-200 focus:border-cyan-400 outline-none resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareApp}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedShare ? 'Link & Message Copied!' : 'Share App Now'}</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* 3. USER FEEDBACK COLLECTION */}
              <div className="bg-slate-800/60 border border-slate-700/80 p-3.5 rounded-2xl space-y-2">
                <span className="font-extrabold text-purple-300 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Send Feedback or Feature Request</span>
                </span>
                {feedbackSent ? (
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs">
                    ✅ Thank you! Your feedback has been recorded to help improve future updates.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what feature or song you'd love to see next..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={() => {
                        if (!feedbackText.trim()) return;
                        setFeedbackSent(true);
                        setFeedbackText('');
                      }}
                      className="px-3.5 py-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>

              {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
              <div className="space-y-2">
                <span className="font-extrabold text-amber-300 text-xs block">❓ Frequently Asked Questions (FAQ)</span>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-1">
                  <strong className="text-white text-xs block">How do I record a vertical video for TikTok / Shorts / Reels?</strong>
                  <p className="text-slate-400 text-[11px]">
                    Open the Piano, select a song or play live, tap the red <strong>🎬 Video</strong> button on the top bar, and choose <strong>📱 Vertical Reel 9:16</strong>.
                  </p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-1">
                  <strong className="text-white text-xs block">How do I simplify complex MIDI songs for one hand?</strong>
                  <p className="text-slate-400 text-[11px]">
                    In the Falling Notes Waterfall top bar, tap <strong>🪄 1 Mano</strong> to automatically filter out chords and keep only the lead melody!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Rate App</span>
            </a>
            <button
              onClick={handleShareApp}
              className="px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold rounded-xl text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>{copiedShare ? 'Copied!' : 'Share App'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMode && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMode('piano');
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
              >
                <span>🎹 Open Piano</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
