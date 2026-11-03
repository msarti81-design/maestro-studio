import React, { useState } from 'react';
import { X, Download, Image as ImageIcon, Sparkles, CheckCircle2, ExternalLink, ShieldCheck, Layers } from 'lucide-react';

interface PlayStoreAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AssetInfo {
  title: string;
  filename: string;
  specs: string;
  description: string;
  url: string;
  tag: string;
  tagColor: string;
}

export const PlayStoreAssetsModal: React.FC<PlayStoreAssetsModalProps> = ({ isOpen, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const assets: AssetInfo[] = [
    {
      title: 'Icona App Ufficiale (Hi-Res App Icon)',
      filename: 'google-play-icon-512x512.png',
      specs: '512 x 512 px • PNG a 32 bit con trasparenza • max 1MB',
      description: 'Icona principale per la scheda su Google Play Store. Senza bordi arrotondati pre-ritagliati (Google applica la maschera automatica).',
      url: '/play-store/google-play-icon-512x512.png',
      tag: 'OBBLIGATORIA',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      title: 'Grafica Promozionale (Feature Graphic)',
      filename: 'google-play-feature-graphic-1024x500.png',
      specs: '1024 x 500 px • PNG 24 bit • max 15MB',
      description: 'Banner in cima alla scheda del Google Play Store e nei caroselli in evidenza. Design premium con tastiera concertistica e cascata neon.',
      url: '/play-store/google-play-feature-graphic-1024x500.png',
      tag: 'OBBLIGATORIA',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      title: 'Screenshot 1: Pianoforte Gran Coda & Cascata Waterfall',
      filename: 'screenshot-1-piano-waterfall.png',
      specs: '1920 x 1080 px • Landscape 16:9 • FHD',
      description: 'Schermata principale di esecuzione: cascata di note stile Synthesia a 88 tasti, latenza ultra-bassa, controllo ottave e pedale.',
      url: '/play-store/screenshot-1-piano-waterfall.png',
      tag: 'CONSIGLIATO',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      title: 'Screenshot 2: Compositore Spartiti a Doppio Rigo',
      filename: 'screenshot-2-sheet-composer.png',
      specs: '1920 x 1080 px • Landscape 16:9 • FHD',
      description: 'Editor di spartiti a doppio rigo (Chiave di Violino e Chiave di Basso) con inserimento note, riproduzione live ed esportazione.',
      url: '/play-store/screenshot-2-sheet-composer.png',
      tag: 'CONSIGLIATO',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      title: 'Screenshot 3: Multi-Traccia Jam Band & Batteria Live',
      filename: 'screenshot-3-jam-band.png',
      specs: '1920 x 1080 px • Landscape 16:9 • FHD',
      description: 'Mixer multi-strumento per suonare insieme a batteria acustica, linee di basso funk e tappeti di sintetizzatore d’ambiente.',
      url: '/play-store/screenshot-3-jam-band.png',
      tag: 'CONSIGLIATO',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      title: 'Screenshot 4: Palestra Scale & Esercizi Hanon',
      filename: 'screenshot-4-scale-gym.png',
      specs: '1920 x 1080 px • Landscape 16:9 • FHD',
      description: 'Allenamento dita per agilità e diteggiatura guidata (1-2-3-4-5) su scale maggiori, minori, pentatoniche e blues.',
      url: '/play-store/screenshot-4-scale-gym.png',
      tag: 'CONSIGLIATO',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      title: 'Screenshot 5: Studio Registrazione Audio & MIDI',
      filename: 'screenshot-5-recordings-studio.png',
      specs: '1920 x 1080 px • Landscape 16:9 • FHD',
      description: 'Libreria registrazioni, visualizzatore di forma d’onda master stereo, esportazione istantanea WAV e file MIDI (.mid).',
      url: '/play-store/screenshot-5-recordings-studio.png',
      tag: 'CONSIGLIATO',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500/20 via-slate-850 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <ImageIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Immagini Ufficiali Google Play Store</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  PRONTE PER LA PUBBLICAZIONE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Icona 512x512, Grafica Promozionale 1024x500 e Schermate 16:9 FHD per Google Play Console
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP NOTICE & BULK DOWNLOAD BAR */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tutti i file rispettano le specifiche esatte di Google Play Console al 100%.</span>
          </div>

          <a
            href="/play-store/google-play-assets.zip"
            download="google-play-assets.zip"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>SCARICA PACCHETTO COMPLETO (ZIP)</span>
          </a>
        </div>

        {/* KEYSTORE & CERTIFICATE DOWNLOAD BANNER */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Chiavi di Firma Play Console (release.jks e upload_cert.pem):</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/play-store/release.jks"
              download="release.jks"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica release.jks</span>
            </a>
            <a
              href="/play-store/upload_cert.pem"
              download="upload_cert.pem"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Scarica upload_cert.pem</span>
            </a>
          </div>
        </div>

        {/* ASSET LIST */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[65vh]">
          {assets.map((asset, index) => (
            <div
              key={index}
              className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all flex flex-col md:flex-row items-center gap-4"
            >
              {/* Thumbnail Preview */}
              <div
                onClick={() => setSelectedImage(asset.url)}
                className="w-full md:w-56 h-32 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative group cursor-pointer flex items-center justify-center shrink-0"
              >
                <img
                  src={asset.url}
                  alt={asset.title}
                  className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ingrandisci</span>
                </div>
              </div>

              {/* Info Details */}
              <div className="flex-1 space-y-1.5 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-white text-sm">{asset.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${asset.tagColor}`}>
                    {asset.tag}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{asset.description}</p>

                <div className="text-[11px] font-mono text-amber-400/90 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
                  {asset.specs}
                </div>
              </div>

              {/* Download Button */}
              <div className="shrink-0 w-full md:w-auto">
                <a
                  href={asset.url}
                  download={asset.filename}
                  className="w-full md:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Scarica PNG</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Google Play Store • VirtuKeys Studio</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-5xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white bg-slate-800 hover:bg-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Fullscreen Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-slate-700 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
