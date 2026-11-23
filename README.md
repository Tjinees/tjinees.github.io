# Tjin's Pizza — Neapolitan Dough Calculator

A lightweight static web app for calculating Neapolitan pizza dough recipes (Biga and Direct methods) and fermentation start times, hosted on GitHub Pages at `tjinees.github.io`.

## Project Structure

```text
.
├── index.html               # Main entry point (GitHub Pages root)
├── css/
│   └── styles.css           # App styles and design tokens
├── js/
│   ├── calculator.js        # Pure dough & yeast calculations
│   ├── schedule.js          # Pure Pizza Time start-time calculations
│   └── app.js               # DOM bindings, UI state, and rendering
├── tests/
│   └── calculator.test.js   # Unit tests (Node built-in test runner)
├── .gitignore
└── README.md
```

## Local Development

No build step is required. Open `index.html` directly in a browser or serve the root directory:

```bash
python3 -m http.server 8000
```

Run unit tests (Node 18+):

```bash
node --test
```
