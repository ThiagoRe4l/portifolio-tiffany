import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = Boolean(process.env.CI);

/**
 * E2E mobile primeiro (CLAUDE.md §4): os projetos mobile rodam antes e o
 * desktop só roda se eles passarem. Os testes usam o build de produção
 * (`npm run test:e2e` faz o build antes).
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Local: com o editor (spec 004), o padrão (metade dos núcleos, os três aparelhos juntos)
  // sobrecarregou a máquina e derrubou o WebKit ("Page crashed"). No CI, o padrão segue.
  workers: isCI ? undefined : 3,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['mobile-chromium', 'mobile-webkit'],
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
