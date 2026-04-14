/** @filedesc Pure string/object path helpers used by Project authoring APIs. */

/**
 * Levenshtein distance for fuzzy path matching.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

/**
 * Unified path resolution for addField/addGroup/addContent.
 *
 * - When `parentPath` is given, `path` is treated as relative: split on dots,
 *   last segment = key, preceding segments prepended to parentPath.
 * - When `parentPath` is NOT given, `path` is split on dots: last = key,
 *   preceding = parentPath.
 */
export function resolvePath(
  path: string,
  parentPath?: string,
): { key: string; parentPath?: string; fullPath: string } {
  const segments = path.split('.');
  const key = segments.pop()!;
  const relativeParts = segments;

  let effectiveParent: string | undefined;
  if (parentPath) {
    if (relativeParts.length > 0) {
      const prefix = relativeParts.join('.');
      if (prefix === parentPath || prefix.startsWith(parentPath + '.')) {
        effectiveParent = prefix;
      } else {
        effectiveParent = `${parentPath}.${prefix}`;
      }
    } else {
      effectiveParent = parentPath;
    }
  } else {
    effectiveParent = relativeParts.length > 0 ? relativeParts.join('.') : undefined;
  }

  const fullPath = effectiveParent ? `${effectiveParent}.${key}` : key;
  return { key, parentPath: effectiveParent, fullPath };
}
