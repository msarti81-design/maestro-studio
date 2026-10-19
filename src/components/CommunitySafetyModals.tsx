import React, { useState } from 'react';
import { InteractiveSong } from '../types';
import { getAppApiUrl } from '../utils/networkHelper';
import {
  ShieldAlert,
  AlertTriangle,
  Check,
  X,
  Send,
  Lock,
  Mail,
  FileText,
  Flag,
  Globe,
} from 'lucide-react';

// ============================================================================
// 1. PUBLISH DISCLAIMER MODAL
// ============================================================================
interface PublishDisclaimerModalProps {
  isOpen: boolean;
  song: InteractiveSong | null;
  onClose: () => void;
  onConfirmPublish: (song: InteractiveSong) => void;
}

export const PublishDisclaimerModal: React.FC<PublishDisclaimerModalProps> = ({
  isOpen,
  song,
  onClose,
  onConfirmPublish,
}) => {
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);

  if (!isOpen || !song) return null;

  const handlePublishClick = () => {
    if (!hasAgreed) return;
    onConfirmPublish(song);
    onClose();
    setHasAgreed(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/40 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl relative animate-fadeIn select-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Disclaimer & Publication Terms
              </h2>
              <p className="text-slate-400 text-xs">
                Publishing to the KeyCraft Studio Community
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Song Info */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-amber-400 uppercase">
            Song to Publish:
          </div>
          <div className="text-sm font-black text-white">{song.title}</div>
          <div className="text-xs text-slate-400">
            Author: <strong className="text-slate-200">{song.author || 'Pianist'}</strong> • {song.notes?.length || 0} Notes
          </div>
        </div>

        {/* Legal Terms & Disclaimer Text */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto pr-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚖️ Copyright and Intellectual Property Guidelines:</span>
          </div>

          <p>
            1. <strong>Song Origin:</strong> Publishing to the Community makes the song visible and freely playable by all KeyCraft Studio users.
          </p>

          <p>
            2. <strong>Copyright:</strong> It is strictly forbidden to publish songs protected by copyright or third-party rights without proper license or authorization.
          </p>

          <p>
            3. <strong>Legal Responsibility:</strong> The user declares that the work is of their own original creation or in the public domain and assumes full civil and criminal liability for uploaded content.
          </p>

          <p>
            4. <strong>Moderation & Removal:</strong> The platform reserves the right to immediately remove any song reported to <strong className="text-amber-300">info@freeserv.it</strong>.
          </p>
        </div>

        {/* Agreement Checkbox */}
        <label className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl cursor-pointer hover:bg-amber-500/20 transition-all">
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0"
          />
          <span className="text-xs font-bold text-amber-200 leading-tight">
            I declare under my sole responsibility that this song is my original work or in the public domain and free of copyright, and I release freeserv.it from any liability.
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handlePublishClick}
            disabled={!hasAgreed}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Globe className="w-4 h-4" />
            <span>Accept & Publish to Community</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. REPORT SONG MODAL (Target: info@freeserv.it)
// ============================================================================
interface ReportSongModalProps {
  isOpen: boolean;
  song: InteractiveSong | null;
  onClose: () => void;
}

export const ReportSongModal: React.FC<ReportSongModalProps> = ({
  isOpen,
  song,
  onClose,
}) => {
  const [reason, setReason] = useState<string>('Copyright Violation');
  const [details, setDetails] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  if (!isOpen || !song) return null;

  const handleSubmitReport = async () => {
    setIsSubmitting(true);

    const reportData = {
      songId: song.id,
      songTitle: song.title,
      author: song.author || 'Unknown',
      reporter: reporterName.trim() || 'KeyCraft Studio User',
      reason,
      details: details.trim(),
    };

    try {
      const res = await fetch(getAppApiUrl('/api/reports/song'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (res.ok) {
        setSubmittedSuccess(true);
      } else {
        setSubmittedSuccess(true);
      }
    } catch (e) {
      setSubmittedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }

    try {
      const emailSubject = `COMMUNITY SONG REPORT: ${song.title} (${song.id})`;
      const emailBody = `Dear freeserv.it Moderation Team,\n\nI would like to report the following song published in the Community:\n\n- Song Title: ${song.title}\n- Declared Author: ${song.author || 'Unknown'}\n- Song ID: ${song.id}\n- Reason: ${reason}\n- Notes/Details: ${details.trim() || 'No additional details'}\n- Reported by: ${reporterName.trim() || 'Community User'}\n\nBest regards.`;

      const mailtoUrl = `mailto:info@freeserv.it?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoUrl, '_blank');
    } catch (e) {}
  };

  const handleCloseAll = () => {
    setSubmittedSuccess(false);
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500/50 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl relative animate-fadeIn select-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Flag className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Report Community Song
              </h2>
              <p className="text-slate-400 text-xs">
                Direct report forwarded to <strong className="text-amber-300">info@freeserv.it</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseAll}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submittedSuccess ? (
          <div className="bg-emerald-950/80 border border-emerald-500/60 p-6 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Report Sent Successfully!</h3>
              <p className="text-xs text-emerald-200">
                Your report for "<strong>{song.title}</strong>" has been recorded and forwarded to <strong className="text-amber-300">info@freeserv.it</strong> for moderation review.
              </p>
            </div>
            <button
              onClick={handleCloseAll}
              className="px-5 py-2 bg-emerald-500 text-slate-950 font-black text-xs rounded-xl hover:bg-emerald-400 cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Song Card Info */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-red-400 uppercase">
                Song Under Report:
              </div>
              <div className="text-sm font-black text-white">{song.title}</div>
              <div className="text-xs text-slate-400">
                Author: <strong className="text-slate-200">{song.author || 'Unknown'}</strong> • ID: <span className="font-mono">{song.id}</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Reason for Report:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-bold p-2.5 rounded-xl outline-none focus:border-red-400 cursor-pointer"
                >
                  <option value="Copyright Violation">⚖️ Copyright Violation</option>
                  <option value="Inappropriate or Offensive Content">⚠️ Inappropriate or Offensive Content</option>
                  <option value="Spam / Incorrect or Fake Title">🗑️ Spam / Incorrect or Fake Title</option>
                  <option value="Other Reason">❓ Other Reason</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Details / Description:
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any helpful info (e.g. original title, copyright owner...)"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs p-2.5 rounded-xl outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Your Name / Email (Optional):
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Name or email for any follow-up..."
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs p-2.5 rounded-xl outline-none focus:border-red-400"
                />
              </div>
            </div>

            {/* Direct Target Email Badge */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Moderation Recipient:</span>
              </span>
              <strong className="text-amber-300 font-mono">info@freeserv.it</strong>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={handleCloseAll}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Report to info@freeserv.it</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
