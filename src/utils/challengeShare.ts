import { getPublicShareBaseUrl } from './networkHelper';

// Challenge Link & Social Sharing Engine for organic viral growth

export interface ChallengeData {
  songId: string;
  songTitle: string;
  challengerName: string;
  targetScore: number;
}

export function generateChallengeUrl(songId: string, songTitle: string, challengerName: string, score: number): string {
  if (typeof window === 'undefined') return '';

  const baseUrl = getPublicShareBaseUrl();
  const url = new URL(baseUrl);
  url.searchParams.set('challenge', songId);
  url.searchParams.set('title', songTitle);
  url.searchParams.set('by', challengerName);
  url.searchParams.set('score', String(score));

  return url.toString();
}

export function parseChallengeFromUrl(): ChallengeData | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);
    const songId = url.searchParams.get('challenge');
    if (!songId) return null;

    return {
      songId,
      songTitle: url.searchParams.get('title') || 'Musical Piece',
      challengerName: url.searchParams.get('by') || 'A Friend',
      targetScore: parseInt(url.searchParams.get('score') || '0', 10),
    };
  } catch (e) {
    return null;
  }
}

export async function shareChallenge(data: ChallengeData): Promise<{ success: boolean; method: 'native' | 'clipboard' }> {
  const shareUrl = generateChallengeUrl(data.songId, data.songTitle, data.challengerName, data.targetScore);
  const shareText = `🎹 Piano Challenge! I scored ${data.targetScore} points on "${data.songTitle}". Can you beat me? Play for free here: ${shareUrl}`;

  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({
        title: `Piano Challenge: ${data.songTitle}`,
        text: shareText,
        url: shareUrl,
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      return { success: true, method: 'clipboard' };
    }
  } catch (e) {}

  return { success: false, method: 'clipboard' };
}
