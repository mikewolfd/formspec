/** @filedesc Test harness for ChangesetReview component — mounts with fixture data for Playwright E2E tests. */
import { StrictMode, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ChangesetReview } from '../components/ChangesetReview.js';
import type { ChangesetReviewData } from '../components/ChangesetReview.js';
import '../index.css';

/** Default fixture: open changeset with 2 dependency groups, 3 AI entries, 1 user overlay. */
const defaultFixture: ChangesetReviewData = {
  id: 'cs-test-001',
  status: 'open',
  label: 'Add patient demographics fields',
  aiEntries: [
    {
      toolName: 'formspec_field',
      summary: 'Add first name text field',
      affectedPaths: ['items[0]'],
      warnings: [],
    },
    {
      toolName: 'formspec_field',
      summary: 'Add last name text field',
      affectedPaths: ['items[1]'],
      warnings: ['Field key "last_name" conflicts with existing variable'],
    },
    {
      toolName: 'formspec_behavior',
      summary: 'Add required constraint to first name',
      affectedPaths: ['items[0].binds.required'],
      warnings: [],
    },
  ],
  userOverlay: [
    {
      summary: 'Adjusted field label from "Given Name" to "First Name"',
      affectedPaths: ['items[0].label'],
    },
  ],
  dependencyGroups: [
    {
      entries: [0, 2],
      reason: 'Entry #2 depends on field created by entry #0',
    },
    {
      entries: [1],
      reason: 'Independent field addition',
    },
  ],
};

/** Merged fixture: terminal merged state. */
const mergedFixture: ChangesetReviewData = {
  ...defaultFixture,
  id: 'cs-test-002',
  status: 'merged',
  label: 'Merged changeset',
};

/** Rejected fixture: terminal rejected state. */
const rejectedFixture: ChangesetReviewData = {
  ...defaultFixture,
  id: 'cs-test-003',
  status: 'rejected',
  label: 'Rejected changeset',
};

/** Empty fixture: no AI entries or groups. */
const emptyFixture: ChangesetReviewData = {
  id: 'cs-test-004',
  status: 'open',
  label: 'Empty changeset',
  aiEntries: [],
  userOverlay: [],
  dependencyGroups: [],
};

const fixtures: Record<string, ChangesetReviewData> = {
  default: defaultFixture,
  merged: mergedFixture,
  rejected: rejectedFixture,
  empty: emptyFixture,
};

/** Read fixture name from URL search params: ?fixture=merged */
function getFixtureName(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('fixture') ?? 'default';
}

function HarnessApp() {
  const fixtureName = getFixtureName();
  const initialData = fixtures[fixtureName] ?? fixtures.default;
  const [changeset, setChangeset] = useState<ChangesetReviewData>(initialData);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  const onAcceptGroup = useCallback(
    (groupIndex: number) => {
      appendLog(`accept-group:${groupIndex}`);
      // If all groups are accepted, transition to merged
      setChangeset((prev) => ({ ...prev, status: 'merged' }));
    },
    [appendLog],
  );

  const onRejectGroup = useCallback(
    (groupIndex: number) => {
      appendLog(`reject-group:${groupIndex}`);
      setChangeset((prev) => ({ ...prev, status: 'rejected' }));
    },
    [appendLog],
  );

  const onAcceptAll = useCallback(() => {
    appendLog('accept-all');
    setChangeset((prev) => ({ ...prev, status: 'merged' }));
  }, [appendLog]);

  const onRejectAll = useCallback(() => {
    appendLog('reject-all');
    setChangeset((prev) => ({ ...prev, status: 'rejected' }));
  }, [appendLog]);

  return (
    <div data-testid="harness-root" className="max-w-2xl mx-auto py-8">
      <ChangesetReview
        changeset={changeset}
        onAcceptGroup={onAcceptGroup}
        onRejectGroup={onRejectGroup}
        onAcceptAll={onAcceptAll}
        onRejectAll={onRejectAll}
      />
      {/* Action log for assertions — hidden from visual but accessible to tests */}
      <div data-testid="action-log" className="sr-only">
        {log.map((entry, i) => (
          <div key={i} data-testid={`log-entry-${i}`}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HarnessApp />
  </StrictMode>,
);
