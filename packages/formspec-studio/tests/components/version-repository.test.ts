import { describe, expect, it, beforeEach } from 'vitest';
import { clearAllLocalVersionScopes, createLocalVersionRepository } from '../../src/components/chat/version-repository.js';

describe('LocalVersionRepository', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('commits and lists versions in reverse chronological order', async () => {
    const repo = createLocalVersionRepository(localStorage);
    await repo.commitVersion({
      scope: 'project-a',
      changelog: { semverImpact: 'compatible', changes: [] },
      snapshot: { definition: 1 },
      summary: 'first',
    });
    await repo.commitVersion({
      scope: 'project-a',
      changelog: { semverImpact: 'breaking', changes: [] },
      snapshot: { definition: 2 },
      summary: 'second',
    });

    const list = await repo.listVersions({ scope: 'project-a' });
    expect(list).toHaveLength(2);
    expect(list[0]?.summary).toBe('second');
    expect(list[1]?.summary).toBe('first');
    expect(list[0]?.semverImpact).toBe('major');
  });

  it('isolates versions by scope', async () => {
    const repo = createLocalVersionRepository(localStorage);
    await repo.commitVersion({
      scope: 'project-a',
      changelog: { semverImpact: 'cosmetic', changes: [] },
      snapshot: { a: true },
    });
    await repo.commitVersion({
      scope: 'project-b',
      changelog: { semverImpact: 'compatible', changes: [] },
      snapshot: { b: true },
    });

    const a = await repo.listVersions({ scope: 'project-a' });
    const b = await repo.listVersions({ scope: 'project-b' });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0]?.scope).toBe('project-a');
    expect(b[0]?.scope).toBe('project-b');
  });

  it('persists parentVersionId for lineage', async () => {
    const repo = createLocalVersionRepository(localStorage);
    const parent = await repo.commitVersion({
      scope: 'lineage',
      changelog: { semverImpact: 'cosmetic', changes: [] },
      snapshot: { v: 1 },
    });
    await repo.commitVersion({
      scope: 'lineage',
      changelog: { semverImpact: 'cosmetic', changes: [] },
      snapshot: { v: 2 },
      parentVersionId: parent.id,
    });
    const list = await repo.listVersions({ scope: 'lineage' });
    const child = list.find((v) => v.parentVersionId != null);
    expect(child?.parentVersionId).toBe(parent.id);
  });

  it('clearAllLocalVersionScopes removes stored versions', async () => {
    const repo = createLocalVersionRepository(localStorage);
    await repo.commitVersion({
      scope: 'wipe-me',
      changelog: { semverImpact: 'cosmetic', changes: [] },
      snapshot: {},
    });
    expect((await repo.listVersions({ scope: 'wipe-me' })).length).toBe(1);
    clearAllLocalVersionScopes(localStorage);
    expect((await repo.listVersions({ scope: 'wipe-me' })).length).toBe(0);
  });
});
