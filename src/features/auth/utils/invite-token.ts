export function extractInviteToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  const tokenMatch = /[?&]token=([^&#\s]+)/i.exec(trimmed);
  if (tokenMatch?.[1]) {
    try {
      return decodeURIComponent(tokenMatch[1]).trim();
    } catch {
      return tokenMatch[1].trim();
    }
  }

  return trimmed;
}
