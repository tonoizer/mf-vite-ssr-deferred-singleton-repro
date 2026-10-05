import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import App from './App.js';

export async function render() {
  const app = createSSRApp(App);
  return renderToString(app);
}
