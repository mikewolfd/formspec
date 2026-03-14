export function studioPath(search?: string): string {
  return `/studio/${search ? `?${search}` : ''}`;
}

export function inquestPath(sessionId?: string, search?: string): string {
  const base = sessionId ? `/inquest/session/${sessionId}` : '/inquest/';
  return `${base}${search ? `?${search}` : ''}`;
}
