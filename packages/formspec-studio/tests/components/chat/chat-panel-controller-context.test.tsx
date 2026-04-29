/** @filedesc ChatPanel works with lifted ChatSessionControllerProvider or with explicit repositories (ADR 0082). */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createProject, type Project } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../src/state/useSelection';
import { ChatSessionControllerProvider } from '../../../src/state/ChatSessionControllerContext';
import { useChatSessionController } from '../../../src/hooks/useChatSessionController';
import { ChatPanel } from '../../../src/components/ChatPanel';
import { createLocalChatThreadRepository } from '../../../src/components/chat/chat-thread-repository';
import { createLocalVersionRepository } from '../../../src/components/chat/version-repository';

vi.mock('@formspec-org/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@formspec-org/chat')>();
  return {
    ...actual,
    GeminiAdapter: actual.MockAdapter,
  };
});

function ProviderHarness({ project }: { project: Project }) {
  const controller = useChatSessionController({
    project,
    getWorkspaceContext: () => ({ selection: null, viewport: null }),
  });
  return (
    <ChatSessionControllerProvider controller={controller}>
      <ChatPanel project={project} onClose={() => {}} hideHeader />
    </ChatSessionControllerProvider>
  );
}

describe('ChatPanel + ChatSessionControllerProvider', () => {
  it('keeps the composer after rerender when the controller is supplied via context', () => {
    const project = createProject();
    const tree = (
      <ProjectProvider project={project}>
        <SelectionProvider>
          <ProviderHarness project={project} />
        </SelectionProvider>
      </ProjectProvider>
    );
    const { rerender } = render(tree);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByText('API key required')).toBeInTheDocument();
    rerender(tree);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByText('API key required')).toBeInTheDocument();
  });

  it('accepts explicit repositories when mounted outside ChatSessionControllerProvider', () => {
    const project = createProject();
    const threads = createLocalChatThreadRepository();
    const versions = createLocalVersionRepository();
    const tree = (
      <ProjectProvider project={project}>
        <SelectionProvider>
          <ChatPanel
            project={project}
            onClose={() => {}}
            hideHeader
            chatThreadRepository={threads}
            chatProjectScope="e2e-chat-scope"
            versionRepository={versions}
            versionScope="e2e-chat-scope"
          />
        </SelectionProvider>
      </ProjectProvider>
    );
    const { rerender } = render(tree);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByText('API key required')).toBeInTheDocument();
    rerender(tree);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    expect(screen.getByText('API key required')).toBeInTheDocument();
  });
});
