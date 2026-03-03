import { render } from 'preact';
import { FormspecRender } from 'formspec-webcomponent';
import { App } from './App';
import './styles.css';

customElements.define('formspec-render', FormspecRender);

render(<App />, document.getElementById('app')!);
