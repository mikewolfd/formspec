/** @filedesc Entry point for the webcomponent stories dev app; registers the custom element. */
import { render } from 'preact';
import '@formspec-org/webcomponent/formspec-default.css';
import { FormspecRender } from '@formspec-org/webcomponent';
import { App } from './App';
import './styles.css';

customElements.define('formspec-render', FormspecRender);

render(<App />, document.getElementById('app')!);
