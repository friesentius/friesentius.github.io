---
name: Kanso
summary: Obsidian theme
detail: 'A theme for Obsidian designed around focus, ported from the kanso.nvim colour scheme for Neovim, in five variants: Zen, Ink, Mist, Void and Pearl.'
tags: [obsidian, theme, css]
type: theme
typeLabel: Obsidian theme
order: 2
visual: kanso
repo: https://github.com/friesentius/obsidian-kanso
licence: MIT
caseStudy:
  intro: 'Kanso is an Obsidian theme designed for focus. It is based on kanso.nvim, the Neovim theme by webhooked, and it is for people who want a clean, noiseless place to write their notes.'
  facts:
    - label: based on
      value: kanso.nvim
      href: https://github.com/webhooked/kanso.nvim
    - label: variants
      value: Zen, Ink, Mist, Void and Pearl
    - label: listing
      value: Obsidian community themes
      href: https://community.obsidian.md/themes/kanso
    - label: started
      value: '2026'
  problem:
    - 'I wanted to bring a theme I loved, kanso.nvim, into a program I loved, Obsidian, so my notes would look and feel like my editor.'
    - "There are plenty of good Obsidian themes. They just weren't Kanso."
  approach:
    - "Every colour comes from kanso.nvim. Its palette lives in one set of variables, and Obsidian's own colours for text, links, headings, tags and code are mapped onto them, so a note reads in the same colours as code in Neovim."
    - "kanso.nvim's options carry over too: the active line highlight is its cursorline, and Dim inactive panes, Minimal mode and Saturated foreground are ported from its own settings, each a toggle in Style Settings."
    - "Zen, Ink and Mist match kanso.nvim's dark variants: they share one set of colours and change only the background tones. Void puts the same colours on true black for OLED screens, and Pearl is kanso.nvim's light palette under the same variables."
  shots:
    - shape: wide
      src: ../../assets/shots/kanso/zen.webp
      alt: 'Kanso Zen, the default dark variant, in Obsidian on desktop: a note with coloured headings, a tag, a callout, styled task checkboxes and a code block, beside the file explorer with folder icons.'
    - shape: wide
      src: ../../assets/shots/kanso/pearl.webp
      alt: 'Kanso Pearl, the light variant, in Obsidian on desktop: the same note and file explorer in its light palette.'
  stack:
    - CSS
    - Style Settings (optional)
    - Stylelint
  result:
    - 'Kanso is listed in the Obsidian community themes. It styles Obsidian itself, Canvas included, and plugins like Excalidraw, Dataview, Kanban and Calendar.'
    - 'Next is styling for more Obsidian plugins.'
---
