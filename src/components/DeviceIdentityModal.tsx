import React, { useState, useEffect } from 'react';
import {
  getDeviceId,
  getStoredUsername,
  getStoredTransferCode,
  verifyAndLockUsername,
  transferAccountWithCode,
  DeviceUserIdentity,
} from '../utils/deviceIdentity';
import {
  ShieldCheck,
  Smartphone,
  Key,
  Copy,
  Check,
  X,
  Lock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

interface DeviceIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIdentityUpdated: (identity: DeviceUserIdentity) => void;
}

export const DeviceIdentityModal: React.FC<DeviceIdentityModalProps> = ({
  isOpen,
  onClose,
  onIdentityUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'transfer'>('profile');
  const [deviceId] = useState<string>(() => getDeviceId());
  const [currentName, setCurrentName] = useState<string>(() => getStoredUsername());
  const [transferCode, setTransferCode] = useState<string>(() => getStoredTransferCode());
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Transfer Form State
  const [importUsername, setImportUsername] = useState<string>('');
  const [importCode, setImportCode] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      handleCheckRegistration(currentName);
    }
  }, [isOpen]);

  const handleCheckRegistration = async (nameToVerify: string) => {
    setStatusMessage('Verifica in corso...');
    setIsError(false);
    const result = await verifyAndLockUsername(nameToVerify);

    setIsVerified(result.isVerified);
    if (result.isVerified) {
      setCurrentName(result.username);
      setTransferCode(result.transferCode);
      setStatusMessage('✓ Dispositivo associato e nome utente protetto!');
      onIdentityUpdated(result);
    } else {
      setIsError(true);
      setStatusMessage(result.error || '⛔ Questo nome utente appartiene a un altro dispositivo!');
    }
  };

  const handleCopyTransferCode = () => {
    if (transferCode) {
      navigator.clipboard?.writeText(transferCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!importUsername.trim() || !importCode.trim()) {
      setStatusMessage('Inserisci sia il nome utente che il codice di trasferimento!');
      setIsError(true);
      return;
    }

    setIsTransferring(true);
    setStatusMessage('Verifica codice di trasferimento in corso...');
    setIsError(false);

    const result = await transferAccountWithCode(importUsername, importCode);
    setIsTransferring(false);

    if (result.success && result.identity) {
      setCurrentName(result.identity.username);
      setTransferCode(result.identity.transferCode);
      setIsVerified(true);
      setStatusMessage('🎉 Account trasferito con successo su questo dispositivo!');
      onIdentityUpdated(result.identity);
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setIsError(true);
      setStatusMessage(result.error || '❌ Codice o nome utente non valido!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full border border-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Identit&agrave; Dispositivo & Sicurezza</h2>
            <p className="text-slate-400 text-xs">Associazione hardware univoca e trasferimento account tra dispositivi.</p>
          </div>
        </div>

        {/* Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Questo Dispositivo</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'transfer'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Trasferisci su Nuovo Phone</span>
          </button>
        </div>

        {/* TAB 1: THIS DEVICE IDENTITY */}
        {activeTab === 'profile' && (
          <div className="space-y-4 pt-1">
            {/* Username Input & Save */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase block">Nome Utente Riservato</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-amber-300 font-black text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => handleCheckRegistration(currentName)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all active:scale-95"
                >
                  Riserva / Salva
                </button>
              </div>
            </div>

            {/* Status Feedback Message */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  isError
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                }`}
              >
                {isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <UserCheck className="w-4 h-4 shrink-0" />}
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Unique Secret Transfer Code Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Codice di Trasferimento Segreto:</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                  Usa per accedere su altri dispositivi
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="font-mono text-base font-black text-amber-400 tracking-wider">
                  {transferCode || 'Generazione codice...'}
                </div>
                <button
                  onClick={handleCopyTransferCode}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedCode ? 'Copiato!' : 'Copia Codice'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                🔒 Questo codice ti permette di trasferire il tuo nome utente e i tuoi punti su un altro smartphone o browser senza che nessuno possa rubare la tua identit&agrave;.
              </p>
            </div>

            {/* Hardware ID Display */}
            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
              <span>ID Dispositivo Hardware:</span>
              <span className="text-slate-400 truncate max-w-[200px]">{deviceId}</span>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSFER PROFILE FROM ANOTHER DEVICE */}
        {activeTab === 'transfer' && (
          <div className="space-y-4 pt-1">
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-300 font-medium">
              🔑 Se possiedi già un nome utente creato su un altro dispositivo, inseriscilo qui insieme al tuo **Codice di Trasferimento** per associare questo dispositivo.
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Nome Utente da Importare</label>
                <input
                  type="text"
                  placeholder="Es. Maestro_Marco"
                  value={importUsername}
                  onChange={(e) => setImportUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Codice di Trasferimento Segreto</label>
                <input
                  type="text"
                  placeholder="Es. PASS-884920"
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 uppercase"
                />
              </div>

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    isError
                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <UserCheck className="w-4 h-4 shrink-0" />}
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                onClick={handleExecuteTransfer}
                disabled={isTransferring}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>{isTransferring ? 'Trasferimento in corso...' : 'COLLEGA QUESTO DISPOSITIVO ALL\'ACCOUNT 🔑'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
