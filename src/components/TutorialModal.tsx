import React, { useState } from 'react';
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
  Play,
  Layers,
  ChevronRight,
  Volume2,
  Timer,
  Palette,
  ArrowRight,
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMode?: (mode: 'piano' | 'sheet' | 'jam' | 'social' | 'recordings') => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenMode,
}) => {
  const [activeTab, setActiveTab] = useState<'midi' | 'masterclass' | 'modes' | 'options' | 'composer'>('midi');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500/20 via-slate-850 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Complete Guide & Tutorial</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                  VIRTUKEYS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Learn how to use every feature, setting, and mode in the app
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800/80 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'midi', label: '🎹 Keyboard & MIDI', icon: Piano },
            { id: 'masterclass', label: '👑 Live Masterclass', icon: Users },
            { id: 'modes', label: '🕹️ Play & Practice', icon: Radio },
            { id: 'options', label: '⚙️ All Options', icon: Sliders },
            { id: 'composer', label: '🎼 Composer & Social', icon: Music },
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
        <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4 text-xs text-slate-300">
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
                  Practice Modes & Visualizations
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Choose how to learn songs based on your skill level and practice goals!
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
                    <span>⚡</span> Arcade Mode (In Tempo)
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Notes stream continuously in real-time. Test your timing, rhythm accuracy, and finger speed!
                  </p>
                </div>
              </div>

              <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
                <span className="font-extrabold text-indigo-300 text-xs block">🎼 Two Sheet Views</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700">
                    <strong className="text-white block mb-0.5">🎹 3D Waterfall View</strong>
                    <span>3D 88-key falling notes cascading towards piano keys.</span>
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
                  Open the Options menu (three dots / sliders icon at top right) to customize every aspect of your Studio:
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5">
                  <Eye className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block">Default Play View Mode</strong>
                    <span className="text-slate-400 text-[11px] block">
                      Choose whether songs automatically start in **Waterfall** or **Traditional Sheet Music**.
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5">
                  <Sliders className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block">Sheet Music Scroll Mode</strong>
                    <span className="text-slate-400 text-[11px] block">
                      Choose between **"Sweeping Line & Page Turns"** (playhead sweeps across staff) or **"Fixed Line & Continuous Scroll"** (line stays stationary while notes slide underneath).
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 flex items-start gap-2.5">
                  <Palette className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white text-xs block">Studio Visual Themes</strong>
                    <span className="text-slate-400 text-[11px] block">
                      Customize piano aesthetics: **Midnight Slate** (dark gold), **Classic Mahogany** (vintage wood), **Cyber Neon** (arcade).
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

          {/* TAB 5: COMPOSER & SOCIAL */}
          {activeTab === 'composer' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-emerald-300 text-sm flex items-center gap-2">
                  <Music className="w-4 h-4 text-emerald-400" />
                  Sheet Music Composer & Social Community
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Create your own musical compositions and explore community shared songs!
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1">
                  <span className="font-bold text-emerald-300 text-xs block">✍️ Sheet Music Composer</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Insert notes note-by-note onto the stave, adjust durations, rests, and BPM, preview audio, and compose custom pieces.
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1">
                  <span className="font-bold text-amber-300 text-xs block">💾 MIDI Export & Live Recordings</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Record live piano performances, download standard MIDI files, or re-listen anytime in the Recordings section.
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-1">
                  <span className="font-bold text-purple-300 text-xs block">🌐 Community Sharing</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Publish your compositions to the Social hub so other pianists, students, and teachers around the world can play them!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>VirtuKeys Studio • Official Guide</span>
          </span>

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
              Close Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
