/** @filedesc shadcn adapter for Tabs — tabbed content panels. */
import React, { useRef, useLayoutEffect } from 'react';
import type { TabsBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { createReactAdapter } from './factory';

const TABLIST = 'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground';
const TAB = 'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm';

function ShadcnTabs({ behavior }: { behavior: TabsBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const tabBarRef = useRef<HTMLDivElement>(null!);
    const panelRefs = useRef<HTMLDivElement[]>([]);
    const buttonRefs = useRef<HTMLButtonElement[]>([]);

    useLayoutEffect(() => {
        // Render tab content
        for (let i = 0; i < behavior.tabCount; i++) {
            const panel = panelRefs.current[i];
            if (panel) behavior.renderTab(i, panel);
        }

        const dispose = behavior.bind({
            root: rootRef.current,
            tabBar: tabBarRef.current,
            panels: panelRefs.current,
            buttons: buttonRefs.current,
        });
        return dispose;
    }, [behavior]);

    return (
        <div ref={rootRef} className="space-y-4">
            <div ref={tabBarRef} role="tablist" className={TABLIST}>
                {behavior.tabLabels.map((label, i) => (
                    <button
                        key={i}
                        ref={(el) => { if (el) buttonRefs.current[i] = el; }}
                        type="button"
                        role="tab"
                        className={TAB}
                        aria-selected={i === behavior.defaultTab}
                        onClick={() => behavior.setActiveTab(i)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {behavior.tabLabels.map((label, i) => (
                <div
                    key={i}
                    ref={(el) => { if (el) panelRefs.current[i] = el; }}
                    role="tabpanel"
                    aria-label={label}
                    className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
            ))}
        </div>
    );
}

export const renderTabs: AdapterRenderFn<TabsBehavior> = createReactAdapter(ShadcnTabs);
