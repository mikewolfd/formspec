import { InquestApp } from './inquest-app/InquestApp';
import { StudioApp } from './studio-app/StudioApp';

export function selectAppSurface(pathname: string): 'studio' | 'inquest' {
  return pathname.startsWith('/inquest') ? 'inquest' : 'studio';
}

interface AppProps {
  pathname?: string;
}

export function App({ pathname }: AppProps = {}) {
  const currentPathname = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/studio/');
  return selectAppSurface(currentPathname) === 'inquest' ? <InquestApp /> : <StudioApp />;
}
