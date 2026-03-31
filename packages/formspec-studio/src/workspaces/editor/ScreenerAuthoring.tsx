/** @filedesc Full screener authoring surface for ManageView — questions, routes, and toggle. */
import { useDefinition } from '../../state/useDefinition';
import { ScreenerToggle } from './screener/ScreenerToggle';
import { ScreenerQuestions } from './screener/ScreenerQuestions';

interface ScreenerItem {
  key: string;
  type: string;
  [k: string]: unknown;
}

interface Route {
  condition: string;
  target: string;
}

interface Screener {
  items?: ScreenerItem[];
  routes?: Route[];
}

export function ScreenerAuthoring() {
  const definition = useDefinition();
  const screener = definition?.screener as Screener | undefined;
  const isActive = Boolean(screener);
  const questionCount = screener?.items?.length ?? 0;
  const routeCount = screener?.routes?.length ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted/70 italic">
        Answers are used for routing only and are not saved in the form response.
      </p>

      <ScreenerToggle
        isActive={isActive}
        questionCount={questionCount}
        routeCount={routeCount}
      />

      {isActive && (
        <div className="space-y-6 mt-2">
          <ScreenerQuestions />

          <div>
            <h4 className="text-[12px] font-bold text-muted uppercase tracking-wider mb-3">
              Routing Rules
            </h4>
            <div className="py-4 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center">
              <p className="text-[12px] text-muted/60 italic">Route editor — coming soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
