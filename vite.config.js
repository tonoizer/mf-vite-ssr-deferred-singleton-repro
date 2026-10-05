import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'ssrRemote',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.js' },
      shared: { vue: { singleton: true } },
      shareStrategy: 'version-first',
      hostInitInjectLocation: 'entry', // must be explicit; plugin default is 'html'
      dts: false,
    }),
  ],
  build: {
    minify: false,
    target: 'esnext',
  },
  ssr: {
    // Keep Vue + federation wrappers in the server bundle so the loadShare
    // singleton path is what Node actually evaluates.
    noExternal: true,
  },
});
