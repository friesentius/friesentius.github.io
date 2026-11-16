---
name: Neokeys
summary: Obsidian leader-key plugin with a mobile touch dial
detail: 'I wanted to work faster in Obsidian from the keyboard, the way I already do in Neovim, tmux and herdr: press a leader key, then a short sequence of keys, and a which-key popup shows what each key does. On a phone or tablet, a touch dial runs the same keymap.'
tags: [obsidian, plugin, mobile]
type: plugin
typeLabel: Obsidian plugin
order: 1
visual: dial
repo: https://github.com/friesentius/obsidian-neokeys
licence: MIT
caseStudy:
  intro: 'Neokeys brings leader keys and key sequences to Obsidian. It is built for people who like the customizability and efficiency of Neovim, tmux and herdr: press a leader key, type a short sequence, and a which-key popup walks you through a keymap you shape yourself. On phones and tablets, a touch dial runs the same keymap.'
  facts:
    - label: platforms
      value: Desktop and mobile
    - label: listing
      value: Obsidian community plugins
      href: https://community.obsidian.md/plugins/neokeys
    - label: started
      value: '2026'
  problem:
    - 'Obsidian only has hotkeys: one key combination per command, with no key sequences like a leader key in Neovim. On phones and tablets there is no keyboard to run commands from at all.'
    - 'I looked at the existing plugins first. Some add key sequences, like Spacekeys, which Neokeys is loosely based on, but none of them did both key sequences and mobile support.'
  approach:
    - 'Key sequences like Neovim, tmux and herdr: press the leader, then a few keys to walk a keymap of groups, commands and files, with a which-key popup showing what each key does. The keymap is edited as a tree in settings, or as Spacekeys-compatible YAML.'
    - 'Make it work on mobile: on phones and tablets, a dial pinned to a bottom corner of the screen replaces typing and runs the same keymap as the desktop.'
    - 'The dial maps commands the same way key sequences do. Press the leader button and the first keys fan out on a ring; drag onto a group and its keys open on the next ring out, then let go on a command to run it. It sits in a corner so it is easy to use one handed.'
  illustration: dial
  shots:
    - shape: wide
      src: ../../assets/shots/neokeys/which-key-popup.webp
      alt: 'Neokeys in Obsidian on desktop, dark theme: after the leader key and t, the which-key popup at the bottom of the window shows the Text group, with keys f, h, l, - and a for Formatting, Heading, Link, List and Add.'
    - shape: tall
      src: ../../assets/shots/neokeys/dial-root.webp
      alt: 'Neokeys on a phone, dark theme: the touch dial open in the bottom right corner, with File, Text, Window and the command palette on a ring around the leader button, and a pill at the top reading Neokeys, Root menu.'
    - shape: tall
      src: ../../assets/shots/neokeys/dial-heading.webp
      alt: 'Neokeys on a phone, dark theme: mid-drag on the touch dial through Text and Heading, with Heading 2 highlighted on the outer ring and the pill reading Text, Heading, Heading 2: Set as heading 2.'
  stack:
    - Obsidian plugin API
    - TypeScript
    - esbuild
    - Jest
    - ESLint
  result:
    - 'Neokeys is available in the Obsidian community plugins directory. Install it, set a leader key, and edit the keymap as a tree or as YAML; on a phone or tablet, the touch dial runs the same keymap.'
    - "Next, I'm looking into adding custom macros, like in Vim, as something you can map to a key sequence."
---
