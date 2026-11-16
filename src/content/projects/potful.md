---
name: Potful
summary: Recipe site at potful.io
detail: 'I built Potful to replace recipe sites with so many ads they barely load on a phone, and to give you one place for your meal plans, grocery trips, nutrition and pantry. It is built with React Router, Express and PostgreSQL, and recipes are written in Cooklang.'
tags: [web app, recipes]
type: web-app
typeLabel: Web app
order: 3
visual: pot
site: https://potful.io
caseStudy:
  intro: 'Potful is a recipe site built to replace recipe sites with so many ads they barely load on a phone. It keeps your recipes in one place and connects them to your meal plans, grocery trips, nutrition and pantry. Recipes are written in Cooklang, every version is kept, and anyone can fork a public recipe to make it their own.'
  facts:
    - label: recipes in
      value: Cooklang
      href: https://cooklang.org
    - label: status
      value: Beta
    - label: started
      value: '2026'
  problem:
    - 'Potful connects your meal plans, grocery trips, nutrition and pantry. You plan the week ahead, shop from a grocery list built from the plan, and know which ingredients you have before you start cooking.'
    - 'Other recipe sites had too many ads, trackers and other bloat, and none of them kept an inventory of your kitchen.'
  approach:
    - 'Make recipes clean and easy to understand. That meant writing them in Cooklang, plain text that makes a recipe repeatable, and an interface that makes sense without packing too much into it.'
    - 'Connect recipes to the rest of the cooking workflow: start with the meal plan, move to grocery shopping, and end in your pantry, ready to cook.'
    - "Every save is a new version with a short note, like a commit message, so you can see what you changed and why. A fork makes your own copy of someone else's public recipe, with credit, so others can create their own dishes inspired by yours."
  shots:
    - shape: wide
      src: ../../assets/shots/potful/landing.webp
      alt: "Potful's landing page on desktop: the headline Potful keeps your recipes the way you cook them, beside a Cooklang recipe card for Weeknight Chili, with Start your cookbook and Browse recipes buttons."
    - shape: tall
      src: ../../assets/shots/potful/recipe.webp
      alt: 'A public Potful recipe on a phone: Slow Cooker Beef Barbacoa, with Cook mode, History and Download .cook buttons, a servings control and the ingredient checklist.'
    - shape: tall
      src: ../../assets/shots/potful/editor.webp
      alt: "Potful's recipe editor on a phone: Weeknight Chili in Cooklang markup, with Markup and Preview tabs, Properties, Save as draft and Publish buttons, and ingredient, cookware and timer shortcuts."
  stack:
    - React Router
    - TypeScript
    - Express
    - PostgreSQL
    - Prisma
    - Tailwind CSS
  result:
    - 'Potful is in open beta at potful.io, and every feature is free to use during the beta.'
    - 'It will move to a subscription model, and mobile apps will follow.'
---
