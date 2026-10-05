import { defineComponent, h } from 'vue';
export default defineComponent({
  name: 'App',
  setup() {
    return () => h('h1', { id: 'ssr-ok' }, 'SSR shared vue singleton');
  },
});
