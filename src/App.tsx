/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ViewMode, SheetSong } from './types';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PianoView } from './components/PianoView';
import { SheetComposerView } from './components/SheetComposerView';
import { JamBandView } from './components/JamBandView';
import { AiSongwriterView } from './components/AiSongwriterView';
import { audioEngine } from './utils/audioEngine';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode | 'home'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('piano') || path.includes('song')) return 'piano';
      if (path.includes('sheet')) return 'sheet';
      if (path.includes('jam')) return 'jam';
      if (path.includes('ai')) return 'ai';

      const hash = window.location.hash.toLowerCase();
      if (hash === '#piano' || hash === '#song') return 'piano';
      if (hash === '#sheet') return 'sheet';
      if (hash === '#jam') return 'jam';
      if (hash === '#ai') return 'ai';

      const saved = localStorage.getItem('maestro_last_view');
      if (saved === 'piano' || saved === 'sheet' || saved === 'jam' || saved === 'ai') {
        return saved;
      }
    }
    return 'home';
  });
  const [volume, setVolume] = useState<number>(0);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);

  const handleSelectView = (view: ViewMode | 'home') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maestro_last_view', view);
      if (view === 'home') {
        history.replaceState(null, '', window.location.pathname);
      } else {
        window.location.hash = view;
      }
    }
  };

  const handleInitAudio = async () => {
    await audioEngine.init();
    setIsAudioActive(true);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
  };

  const handleLoadAiSong = (song: SheetSong) => {
    handleSelectView('sheet');
  };

  return (
    <div className={`bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 ${
      currentView === 'piano'
        ? 'w-screen h-screen overflow-hidden fixed inset-0 touch-none'
        : 'w-full min-h-screen h-full overflow-y-auto touch-pan-y'
    }`}>
      {currentView !== 'piano' && (
        <Navbar
          currentView={currentView === 'home' ? 'piano' : currentView}
          onSelectView={(v) => handleSelectView(v)}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isAudioActive={isAudioActive}
          onInitAudio={handleInitAudio}
        />
      )}

      <main className={`flex-1 ${currentView === 'piano' ? 'p-0 h-full overflow-hidden' : 'py-8 px-4 sm:px-6 lg:px-8 touch-pan-y'}`}>
        {currentView === 'home' && (
          <HomeView onSelectView={(v) => handleSelectView(v)} onInitAudio={handleInitAudio} />
        )}
        {currentView === 'piano' && (
          <PianoView onBackToHome={() => handleSelectView('home')} />
        )}
        {currentView === 'sheet' && <SheetComposerView />}
        {currentView === 'jam' && <JamBandView />}
        {currentView === 'ai' && <AiSongwriterView onLoadSong={handleLoadAiSong} />}
      </main>
    </div>
  );
}
