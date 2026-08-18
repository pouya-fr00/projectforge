import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Project Forge',
  description: 'A local-first CLI that generates production-ready full-stack projects from composable modules.',
  lang: 'en',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/start/introduction' },
      { text: 'Reference', link: '/reference/cli' },
      { text: 'فارسی', link: '/fa/' },
    ],
    sidebar: {
      '/start/': [
        { text: 'Getting Started', items: [
          { text: 'Introduction', link: '/start/introduction' },
          { text: 'Requirements', link: '/start/requirements' },
          { text: 'Quickstart', link: '/start/quickstart' },
        ]},
      ],
      '/guides/': [
        { text: 'Guides', items: [
          { text: 'Create a Project', link: '/guides/create' },
          { text: 'Add Modules', link: '/guides/add-modules' },
          { text: 'Customize Safely', link: '/guides/customize' },
          { text: 'CI Usage', link: '/guides/ci' },
          { text: 'Demo', link: '/guides/demo' },
        ]},
      ],
      '/concepts/': [
        { text: 'Concepts', items: [
          { text: 'How It Works', link: '/concepts/how-it-works' },
          { text: 'Generated vs User-Owned', link: '/concepts/generated-vs-user' },
          { text: 'Transactions and Rollback', link: '/concepts/transactions' },
          { text: 'Module Dependencies', link: '/concepts/dependencies' },
          { text: 'Lockfile and Provenance', link: '/concepts/lockfile' },
        ]},
      ],
      '/reference/': [
        { text: 'Reference', items: [
          { text: 'CLI Commands', link: '/reference/cli' },
          { text: 'Module Catalog', link: '/reference/modules' },
          { text: 'Error Codes', link: '/reference/errors' },
          { text: 'Exit Codes', link: '/reference/exit-codes' },
          { text: 'Config Schema', link: '/reference/config' },
        ]},
      ],
      '/troubleshooting/': [
        { text: 'Troubleshooting', items: [
          { text: 'Overview', link: '/troubleshooting/' },
          { text: 'Installation', link: '/troubleshooting/installation' },
          { text: 'Project Lock', link: '/troubleshooting/project-lock' },
          { text: 'Conflicts', link: '/troubleshooting/conflicts' },
          { text: 'Verification', link: '/troubleshooting/verification' },
          { text: 'Auth / Database', link: '/troubleshooting/auth-database' },
          { text: 'Windows', link: '/troubleshooting/windows' },
        ]},
      ],
      '/fa/': [
        { text: 'راهنمای فارسی', items: [
          { text: 'راهنمای شروع', link: '/fa/' },
        ]},
      ],
      '/contributing/': [
        { text: 'Contributing', items: [
          { text: 'Development Setup', link: '/contributing/development-setup' },
          { text: 'Module Authoring', link: '/contributing/module-authoring' },
          { text: 'Documentation Standard', link: '/contributing/docs-standard' },
          { text: 'Release Process', link: '/contributing/release-process' },
        ]},
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/pouya-fr00/projectforge' },
    ],
    footer: {
      message: 'Released under the MIT License.',
    },
  },
});
