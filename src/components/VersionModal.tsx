import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Globe, Shield, Sparkles } from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, APP_COMMIT, APP_CHANGELOG, checkServerVersion } from '../utils/versionInfo';
import { isNativePlatform } from '../utils/networkHelper';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({ isOpen, onClose }) => {
  const [serverCheck, setServerCheck] = useState<{
    loading: boolean;
    serverVersion: string | null;
    isUpToDate: boolean;
    status: 'synced' | 'server_outdated' | 'client_outdated' | 'offline';
    error?: string;
  }>({
    loading: true,
    serverVersion: null,
    isUpToDate: false,
    status: 'offline',
  });

  const runCheck = async () => {
    setServerCheck((prev) => ({ ...prev, loading: true }));
    const res = await checkServerVersion();
    setServerCheck({
      loading: false,
      serverVersion: res.serverVersion,
      isUpToDate: res.isUpToDate,
      status: res.status,
      error: res.error,
    });
  };

  useEffect(() => {
    if (isOpen) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isNative = isNativePlatform();

  const handleForceReload = () => {
    if (typeof window !== 'undefined') {
      // Force clear cache and refresh
      const cleanUrl = window.location.origin + window.location.pathname + '?_t=' + Date.now() + window.location.hash;
      window.location.href = cleanUrl;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full border border-slate-700 transition-colors"
          title="Chiudi"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">Stato Versione & Aggiornamento</h2>
            <p className="text-slate-400 text-xs">Verifica allineamento tra Browser Web, App e Server</p>
          </div>
        </div>

        {/* Versione Card */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Versione Bundle:</span>
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 font-mono font-black text-xs">v{APP_VERSION}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
            <div>
              <span className="text-slate-500 block">Compilazione:</span>
              <span className="text-slate-300 font-medium">{APP_BUILD_DATE}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Git Commit:</span>
              <span className="text-amber-400 font-mono font-bold">#{APP_COMMIT}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
            <span className="text-slate-500">Piattaforma in uso:</span>
            <span className="font-bold text-slate-300 flex items-center gap-1">
              {isNative ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Android App (APK)</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Browser Web (freeserv.it)</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Server Sync Check Live Status */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Stato Backend Server:</span>
            <button
              onClick={runCheck}
              disabled={serverCheck.loading}
              className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${serverCheck.loading ? 'animate-spin' : ''}`} />
              <span>Ricontrolla</span>
            </button>
          </div>

          {serverCheck.loading ? (
            <div className="text-xs text-amber-300 flex items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Interrogazione backend /api/version in corso...</span>
            </div>
          ) : serverCheck.status === 'synced' ? (
            <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Server Allineato & Aggiornato!</span>
                <span className="text-[10px] text-emerald-400/80 block">
                  Il server VPS risponde con la versione v{serverCheck.serverVersion}.
                </span>
              </div>
            </div>
          ) : serverCheck.status === 'server_outdated' ? (
            <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Server VPS non ancora riavviato</span>
                <span className="text-[10px] text-amber-300/80 block">
                  Il server risponde con v{serverCheck.serverVersion || 'precedente'}. Esegui <code>pm2 restart maestro-studio</code> su Termius.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-300 bg-red-950/60 border border-red-500/40 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <span className="font-bold">Server non raggiungibile</span>
                <span className="text-[10px] text-red-400/80 block">
                  {serverCheck.error || 'Verifica che il backend su VPS sia avviato.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ultime modifiche incluse */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Migliorie dell'aggiornamento:
          </span>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1 text-[11px] text-slate-300">
            {APP_CHANGELOG.map((item, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span className="leading-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottoni Azione */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          {!isNative && (
            <button
              onClick={handleForceReload}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Ricarica pulendo la cache del browser"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Ricarica Cache</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
