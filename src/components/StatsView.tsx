import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Smartphone, Globe, Monitor, RefreshCw, Clock, ArrowLeft, Activity, CheckCircle2 } from 'lucide-react';
import { getAppApiUrl } from '../utils/networkHelper';
import { getDeviceId } from '../utils/deviceIdentity';

interface DeviceStatEntry {
  deviceId: string;
  username: string;
  platform: string;
  firstSeen: string;
  lastSeen: string;
  lastView: string;
  totalPings: number;
  totalSessions: number;
  screen?: string;
  theme?: string;
  lastSong?: string;
}

interface DailyStatEntry {
  date: string;
  uniqueUsers: number;
  pings: number;
}

interface AnalyticsStatsResponse {
  success: boolean;
  totalUniqueDevices: number;
  onlineNow: number;
  activeToday: number;
  active7Days: number;
  platformCounts: Record<string, number>;
  themeCounts?: Record<string, number>;
  topSongs?: { title: string; count: number }[];
  last14Days: DailyStatEntry[];
  devices: DeviceStatEntry[];
}

const THEME_LABELS: Record<string, string> = {
  midnight: '🎹 Ivory Concert',
  mahogany: '🪵 Vintage Wood',
  marble: '🏛️ Carrara Marble',
  gold: '👑 Royal Gold & Pearl',
  carbon: '🏎️ Carbon & Titanium',
  neon: '⚡ Cyber Synth Neon',
};

interface StatsViewProps {
  onBackToHome: () => void;
}

function formatRelativeTime(isoDate: string): { label: string; isOnline: boolean } {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (diffMs < 0 || diffMs <= 3.5 * 60 * 1000) {
      return { label: 'Online now', isOnline: true };
    }
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) {
      return { label: `${mins}m ago`, isOnline: false };
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return { label: `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`, isOnline: false };
    }
    const days = Math.floor(hours / 24);
    if (days < 30) {
      return { label: `${days} ${days === 1 ? 'day' : 'days'} ago`, isOnline: false };
    }
    return {
      label: new Date(isoDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      isOnline: false,
    };
  } catch {
    return { label: '-', isOnline: false };
  }
}

function formatViewLabel(view: string): string {
  switch (view) {
    case 'piano':
      return '🎹 Piano';
    case 'sheet':
      return '🎼 Sheet Music';
    case 'jam':
      return '🎸 Jam Band';
    case 'social':
      return '🏆 Challenges & Room';
    case 'recordings':
      return '💿 Recordings';
    case 'stats':
      return '📊 Analytics';
    default:
      return '🏠 Home Menu';
  }
}

export const StatsView: React.FC<StatsViewProps> = ({ onBackToHome }) => {
  const [stats, setStats] = useState<AnalyticsStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOtherOnly, setFilterOtherOnly] = useState<boolean>(false);

  const myDeviceId = getDeviceId();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getAppApiUrl('/api/analytics/stats'), {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success) {
        setStats(data);
      } else {
        throw new Error(data?.error || 'Unable to load statistics');
      }
    } catch (e: any) {
      setError(e?.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 20000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const allDevices = stats?.devices || [];
  const otherDevicesCount = allDevices.filter((d) => d.deviceId !== myDeviceId).length;
  const displayedDevices = filterOtherOnly
    ? allDevices.filter((d) => d.deviceId !== myDeviceId)
    : allDevices;

  const maxDailyUsers = Math.max(
    1,
    ...(stats?.last14Days?.map((d) => d.uniqueUsers) || [1])
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                VirtuKeys Usage Analytics
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lightweight anonymous monitoring of devices using the Android app and Web Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setFilterOtherOnly(!filterOtherOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              filterOtherOnly
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            {filterOtherOnly ? '👥 Showing Other Users Only' : '👁️ Hide my device'}
          </button>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-200 p-4 rounded-2xl text-xs font-medium">
          ⚠️ Error loading statistics: {error}
        </div>
      )}

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Other Users Besides You */}
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold mb-1">
            <span>Other Users (Besides you)</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums">
            {stats ? otherDevicesCount : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {otherDevicesCount === 0
              ? 'Only this device so far'
              : `${otherDevicesCount} ${otherDevicesCount === 1 ? 'other device has' : 'other devices have'} used the app`}
          </p>
        </div>

        {/* Card 2: Online Now */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span>Online Now</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums">
            {stats ? stats.onlineNow : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Active in the last 3 minutes
          </p>
        </div>

        {/* Card 3: Active Today & 7 Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-sky-400 font-bold mb-1">
            <span>Active Today / 7 Days</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums">
            {stats ? `${stats.activeToday} / ${stats.active7Days}` : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Unique devices (Today / 7d)
          </p>
        </div>

        {/* Card 4: Total Unique Devices */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-1">
            <span>Total Devices</span>
            <Smartphone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums">
            {stats ? stats.totalUniqueDevices : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Android App: {stats?.platformCounts?.['Android App (APK)'] || 0} · Web:{' '}
            {(stats?.platformCounts?.['Browser Mobile'] || 0) +
              (stats?.platformCounts?.['Browser PC'] || 0)}
          </p>
        </div>
      </div>

      {/* Platform Breakdown & 14-Day Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-black text-white">Platforms Used</h2>
          <div className="space-y-2.5 pt-1">
            {[
              {
                key: 'Android App (APK)',
                label: 'Android App (APK / Play Store)',
                icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
                count: stats?.platformCounts?.['Android App (APK)'] || 0,
              },
              {
                key: 'Browser Mobile',
                label: 'Mobile / Tablet Browser',
                icon: <Globe className="w-4 h-4 text-amber-400" />,
                count: stats?.platformCounts?.['Browser Mobile'] || 0,
              },
              {
                key: 'Browser PC',
                label: 'PC / Mac Desktop Browser',
                icon: <Monitor className="w-4 h-4 text-sky-400" />,
                count: stats?.platformCounts?.['Browser PC'] || 0,
              },
            ].map((item) => {
              const total = Math.max(1, stats?.totalUniqueDevices || 1);
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-200 font-semibold">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.count > 0 ? 6 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last 14 Days Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-black text-white">Daily Active Users (Last 14 Days)</h2>
              <p className="text-[11px] text-slate-400">Number of unique active devices day by day</p>
            </div>
          </div>

          <div className="grid grid-cols-14 gap-1.5 items-end h-32 pt-4 border-b border-slate-800 pb-2">
            {(stats?.last14Days || []).map((day) => {
              const heightPct = Math.round((day.uniqueUsers / maxDailyUsers) * 100);
              const shortDate = day.date.slice(8, 10) + '/' + day.date.slice(5, 7);
              return (
                <div key={day.date} className="flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-mono font-bold text-amber-300 tabular-nums">
                    {day.uniqueUsers > 0 ? day.uniqueUsers : ''}
                  </span>
                  <div
                    className={`w-full max-w-[24px] rounded-t-md transition-all ${
                      day.uniqueUsers > 0 ? 'bg-amber-500' : 'bg-slate-800/70'
                    }`}
                    style={{ height: `${ day.uniqueUsers > 0 ? Math.max(14, heightPct) : 6 }%` }}
                    title={`${day.date}: ${day.uniqueUsers} devices (${day.pings} min/pings)`}
                  />
                  <span className="text-[9px] text-slate-400 font-mono">{shortDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3D Keyboard Materials & Top Played Songs Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Favorite 3D Keyboard Materials */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div>
            <h2 className="text-sm font-black text-white">🎨 Favorite 3D Keyboard Styles</h2>
            <p className="text-[11px] text-slate-400">Which finish users pick when playing</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {Object.entries(THEME_LABELS).map(([key, label]) => {
              const count = stats?.themeCounts?.[key] || 0;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-slate-200 truncate">{label}</span>
                  <span className="font-mono font-black text-amber-400 tabular-nums ml-2">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Played Songs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div>
            <h2 className="text-sm font-black text-white">🎵 Most Played Songs</h2>
            <p className="text-[11px] text-slate-400">Songs opened in Waterfall or Sheet mode</p>
          </div>
          {!stats?.topSongs || stats.topSongs.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
              No songs recorded yet. Start a song on the piano to see it here!
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              {stats.topSongs.map((item, idx) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-black text-amber-400 w-4">#{idx + 1}</span>
                    <span className="font-bold text-white truncate">{item.title}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-400 shrink-0 ml-2">
                    {item.count} {item.count === 1 ? 'play' : 'plays'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visitors & Devices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-white">
              Devices &amp; Visitors List ({displayedDevices.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Your current device is marked as &ldquo;You (This device)&rdquo;
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-2.5 px-4 font-bold">User / Device</th>
                <th className="py-2.5 px-4 font-bold">Platform</th>
                <th className="py-2.5 px-4 font-bold">Last Activity</th>
                <th className="py-2.5 px-4 font-bold">Section &amp; Style</th>
                <th className="py-2.5 px-4 font-bold text-right">Sessions / Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {displayedDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {filterOtherOnly
                      ? 'No other devices recorded besides yours so far.'
                      : 'No data available.'}
                  </td>
                </tr>
              ) : (
                displayedDevices.map((d) => {
                  const isMe = d.deviceId === myDeviceId;
                  const rel = formatRelativeTime(d.lastSeen);
                  return (
                    <tr
                      key={d.deviceId}
                      className={isMe ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-800/50'}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{d.username || 'Pianist'}</span>
                          {isMe ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                              <CheckCircle2 className="w-3 h-3 text-amber-400" />
                              You (This device)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-400">
                              · Other User
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {d.deviceId.slice(0, 16)}… {d.screen ? `· Screen ${d.screen}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {d.platform === 'Android App (APK)'
                          ? '🤖 Android App (APK)'
                          : d.platform === 'Browser Mobile'
                          ? '📱 Mobile Browser'
                          : d.platform === 'Browser PC'
                          ? '💻 Desktop Browser'
                          : d.platform}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">
                          {rel.isOnline ? (
                            <span className="text-emerald-400 font-black">🟢 {rel.label}</span>
                          ) : (
                            rel.label
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 tabular-nums">
                          {new Date(d.lastSeen).toLocaleString('en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300 font-medium">
                        <div>{formatViewLabel(d.lastView)}</div>
                        <div className="text-[10px] text-amber-300/90 mt-0.5">
                          {THEME_LABELS[d.theme || 'midnight'] || '🎹 Ivory Concert'}
                          {d.lastSong ? ` · 🎵 ${d.lastSong}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                        <span className="font-bold text-white">{d.totalSessions || 1}</span>{' '}
                        {d.totalSessions === 1 ? 'session' : 'sessions'}
                        <div className="text-[10px] text-slate-500">
                          ~{Math.max(1, d.totalPings || 1)} active min
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
