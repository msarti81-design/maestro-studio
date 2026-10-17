/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ViewMode } from './types';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PianoView } from './components/PianoView';
import { SheetComposerView } from './components/SheetComposerView';
import { JamBandView } from './components/JamBandView';
import { SocialView } from './components/SocialView';
import { DeviceIdentityModal } from './components/DeviceIdentityModal';
import { getStoredUsername, verifyAndLockUsername } from './utils/deviceIdentity';
import { audioEngine } from './utils/audioEngine';

import { ActiveSocialSession, SocialSessionResults, SocialRoomMode } from './types';

// Helper to extract room invitation parameters from URL (query string or hash)
function parseRoomInviteFromUrl(): ActiveSocialSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const search = window.location.search;
    const hash = window.location.hash;

    let room = '';
    let mode: SocialRoomMode = 'masterclass';
    let role: string = 'allievo';

    // 1. Search params (?room=MASTERCLASS-101&mode=masterclass&role=allievo)
    if (search) {
      const sp = new URLSearchParams(search);
      if (sp.has('room') || sp.has('roomId') || sp.has('aula')) {
        room = sp.get('room') || sp.get('roomId') || sp.get('aula') || '';
        if (sp.has('mode')) mode = (sp.get('mode') as SocialRoomMode) || 'masterclass';
        if (sp.has('role')) role = sp.get('role') || 'allievo';
      }
    }

    // 2. Hash params (#social?room=MASTERCLASS-101 or #room=MASTERCLASS-101)
    if (!room && hash) {
      const qIdx = hash.indexOf('?');
      if (qIdx !== -1) {
        const hp = new URLSearchParams(hash.substring(qIdx + 1));
        if (hp.has('room') || hp.has('roomId') || hp.has('aula')) {
          room = hp.get('room') || hp.get('roomId') || hp.get('aula') || '';
          if (hp.has('mode')) mode = (hp.get('mode') as SocialRoomMode) || 'masterclass';
          if (hp.has('role')) role = hp.get('role') || 'allievo';
        }
      } else if (hash.startsWith('#room=')) {
        room = hash.substring(6);
      }
    }

    if (room && room.trim()) {
      const cleanRoom = room.trim().toUpperCase();
      if (!mode) {
        if (cleanRoom.startsWith('MASTERCLASS-')) mode = 'masterclass';
        else if (cleanRoom.startsWith('STAFFETTA-')) mode = 'relay';
        else if (cleanRoom.startsWith('DUETTO-')) mode = 'duet';
        else if (cleanRoom.startsWith('BATTLE-')) mode = 'battle';
        else if (cleanRoom.startsWith('QUIZ-')) mode = 'guess';
        else if (cleanRoom.startsWith('PIANOBAR-')) mode = 'pianobar';
        else mode = 'masterclass';
      }

      return {
        mode,
        roomId: cleanRoom,
        userRole: role,
        status: 'active',
      };
    }
  } catch (e) {}

  return null;
}

export default function App() {
  const [pendingInvite, setPendingInvite] = useState<ActiveSocialSession | null>(() => parseRoomInviteFromUrl());
  const [activeSocialSession, setActiveSocialSession] = useState<ActiveSocialSession | null>(null);

  const [currentView, setCurrentView] = useState<ViewMode | 'home'>(() => {
    // If URL has an active room invitation, show the social room invite ready to enter!
    const invite = parseRoomInviteFromUrl();
    if (invite) return 'social';

    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('piano') || path.includes('song')) return 'piano';
      if (path.includes('sheet')) return 'sheet';
      if (path.includes('jam')) return 'jam';
      if (path.includes('social') || path.includes('challenge')) return 'social';

      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith('#piano') || hash.startsWith('#song')) return 'piano';
      if (hash.startsWith('#sheet')) return 'sheet';
      if (hash.startsWith('#jam')) return 'jam';
      if (hash.startsWith('#social') || hash.startsWith('#challenge')) return 'social';

      try {
        const saved = localStorage.getItem('maestro_last_view');
        if (saved === 'piano' || saved === 'sheet' || saved === 'jam' || saved === 'social') {
          return saved;
        }
      } catch (e) {}
    }
    return 'home';
  });

  const [volume, setVolume] = useState<number>(0);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [lastSessionResults, setLastSessionResults] = useState<SocialSessionResults | null>(null);

  // Global Device Identity & Security State
  const [username, setUsername] = useState<string>(() => getStoredUsername());
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState<boolean>(false);

  // Auto-verify and lock username on device mount
  React.useEffect(() => {
    verifyAndLockUsername(username).then((id) => {
      if (id.isVerified) {
        setUsername(id.username);
      }
    });

    // Check for room invitation in URL and listen for URL changes
    const checkUrlInvite = () => {
      const invite = parseRoomInviteFromUrl();
      if (invite) {
        setPendingInvite(invite);
        setCurrentView('social');
      }
    };

    window.addEventListener('hashchange', checkUrlInvite);
    window.addEventListener('popstate', checkUrlInvite);
    return () => {
      window.removeEventListener('hashchange', checkUrlInvite);
      window.removeEventListener('popstate', checkUrlInvite);
    };
  }, [username]);

  const handleSelectView = (view: ViewMode | 'home') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('maestro_last_view', view);
      } catch (e) {}
      if (view === 'home') {
        try {
          history.replaceState(null, '', window.location.pathname);
        } catch (e) {}
      } else {
        window.location.hash = view;
      }
    }
  };

  const handleLaunchSocialChallenge = (session: ActiveSocialSession) => {
    setActiveSocialSession(session);
    setCurrentView('piano');
  };

  const handleExitSocialChallenge = (results: SocialSessionResults) => {
    setLastSessionResults(results);
    setActiveSocialSession(null);
    setCurrentView('social');
  };

  const handleInitAudio = async () => {
    await audioEngine.init();
    setIsAudioActive(true);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume(vol);
  };

  return (
    <div className={`bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 ${
      currentView === 'piano'
        ? 'w-screen h-screen overflow-hidden fixed inset-0 touch-none'
        : 'w-full min-h-screen h-full overflow-y-auto touch-pan-y'
    }`}>
      {currentView !== 'piano' && (
        <Navbar
          currentView={currentView}
          onSelectView={(v) => handleSelectView(v)}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isAudioActive={isAudioActive}
          onInitAudio={handleInitAudio}
          username={username}
          onOpenIdentityModal={() => setIsIdentityModalOpen(true)}
        />
      )}

      <main className={`flex-1 ${currentView === 'piano' ? 'p-0 h-full overflow-hidden' : 'py-4 px-4 sm:px-6 lg:px-8 touch-pan-y'}`}>
        {currentView === 'home' && (
          <HomeView onSelectView={(v) => handleSelectView(v)} onInitAudio={handleInitAudio} />
        )}
        {currentView === 'piano' && (
          <PianoView
            onBackToHome={() => handleSelectView('home')}
            socialSession={activeSocialSession}
            onExitToSocial={handleExitSocialChallenge}
          />
        )}
        {currentView === 'sheet' && <SheetComposerView />}
        {currentView === 'jam' && <JamBandView />}
        {currentView === 'social' && (
          <SocialView
            onLaunchPianoChallenge={handleLaunchSocialChallenge}
            lastResults={lastSessionResults}
            onClearResults={() => setLastSessionResults(null)}
            incomingInvite={pendingInvite}
          />
        )}
      </main>

      <DeviceIdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        onIdentityUpdated={(newIdentity) => {
          if (newIdentity && newIdentity.username) {
            setUsername(newIdentity.username);
          }
        }}
      />
    </div>
  );
}
