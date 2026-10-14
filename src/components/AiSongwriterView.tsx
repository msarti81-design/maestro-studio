import React, { useState } from 'react';
import { SheetSong } from '../types';
import { Sparkles, Music, Play, ArrowRight, Loader2 } from 'lucide-react';

interface AiSongwriterViewProps {
  onLoadSong: (song: SheetSong) => void;
}

export const AiSongwriterView: React.FC<AiSongwriterViewProps> = ({ onLoadSong }) => {
  const [prompt, setPrompt] = useState<string>("Melancholic lo-fi piano ballad with jazzy chords");
  const [style, setStyle] = useState<string>("lofi");
  const [musicalKey, setMusicalKey] = useState<string>("A minor");
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedSong, setGeneratedSong] = useState<SheetSong | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gemini/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, key: musicalKey }),
      });

      if (!res.ok) throw new Error("Failed to generate composition");
      const data = await res.json();

      const song: SheetSong = {
        id: `ai-${Date.now()}`,
        title: data.title || "AI Composition",
        description: data.description || prompt,
        key: data.key || musicalKey,
        bpm: data.bpm || 110,
        timeSignature: "4/4",
        chords: data.chords || ["C", "Am", "F", "G"],
        melody: data.melody || [],
        bassline: data.bassline || [],
      };

      setGeneratedSong(song);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating the song.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4" />
          Powered by Gemini AI
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">AI Songwriter & Arranger</h2>
        <p className="text-slate-400 max-w-xl mx-auto text-sm">
          Describe any mood, genre, or melody concept, and Gemini will instantly compose a custom score, chord progression, and bassline for you.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Song Description / Prompt</label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Cinematic synthwave chord progression in C minor with driving bass"
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 placeholder-slate-600 focus:border-amber-500 outline-none resize-none text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Musical Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 focus:border-amber-500 outline-none text-sm"
            >
              <option value="jazz">Jazz Swing / Ballad</option>
              <option value="pop">Modern Pop</option>
              <option value="rock">Rock / Anthem</option>
              <option value="lofi">Lo-Fi Chill</option>
              <option value="classical">Classical Baroque</option>
              <option value="edm">Synthwave / EDM</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Musical Key</label>
            <select
              value={musicalKey}
              onChange={(e) => setMusicalKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 focus:border-amber-500 outline-none text-sm"
            >
              <option value="C major">C Major</option>
              <option value="A minor">A Minor</option>
              <option value="G major">G Major</option>
              <option value="E minor">E Minor</option>
              <option value="D minor">D Minor</option>
              <option value="F major">F Major</option>
              <option value="Bb major">B♭ Major</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Composing Score with Gemini...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate AI Composition
            </>
          )}
        </button>

        {error && <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs text-center">{error}</div>}
      </form>

      {/* Generated Result Preview */}
      {generatedSong && (
        <div className="bg-slate-900 border border-amber-500/50 p-8 rounded-3xl shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Generated Composition</div>
              <h3 className="text-2xl font-bold text-white mt-1">{generatedSong.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{generatedSong.description}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Key: <span className="text-white font-bold">{generatedSong.key}</span></div>
              <div className="text-xs text-slate-400 mt-1">Tempo: <span className="text-white font-bold">{generatedSong.bpm} BPM</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase">Chord Progression</div>
            <div className="flex flex-wrap gap-2">
              {generatedSong.chords.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-amber-400 font-bold text-sm rounded-xl">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => onLoadSong(generatedSong)}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 text-white font-semibold rounded-2xl border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            Load into Sheet Composer & Jam Studio
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
