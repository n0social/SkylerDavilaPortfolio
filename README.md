# SkylerDavila.com

A minimal black-and-white portfolio and blog built with vanilla HTML/CSS/JS. Posts are written in Markdown, projects are simple cards that can link to standalone static demos hosted in the same repo. An admin panel (hidden behind a password gate) lets you manage `posts.json` and `projects.json`, export/import them, or push updates directly to GitHub.

## Features

- Posts load from `data/posts.json` and render as Markdown using [marked](https://github.com/markedjs/marked)
- Projects grid pulls from `data/projects.json` and can link to static demos inside `projects/`
- Hidden admin entry (press `Ctrl`+`Shift`+`A`) with password gate and live Markdown preview
- Optional GitHub API deploy: paste a Personal Access Token (PAT) to auto-commit content changes directly from the browser
- Posts capture timestamps automatically when saved
- Ready for GitHub Pages (static assets only)

## Quick start

1. **Install dependencies** — none. Open `index.html` directly in a browser or host with any static server.
2. **Edit content manually** — update `data/posts.json`, `data/projects.json`, and drop project folders under `projects/`.
3. **Use the admin panel** — open `index.html`, press `Ctrl`+`Shift`+`A`, log in, and create posts/projects. With PAT + repo info configured, saves auto-publish to GitHub; otherwise export the JSON files when finished.

## Admin setup

### Change the password

1. Pick a strong password string.
2. Generate the SHA-256 hash (Node.js example shown):

   ```powershell
   node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('your-new-password').digest('hex'));"
   ```
3. Update `passwordHash` inside `scripts/config.js` with the new value.
4. (Optional) Delete `localStorage` item `skyler-admin-session` from your browser if you had an active session.

### Configure GitHub commits (optional)

1. Create a Personal Access Token with **repo** scope from https://github.com/settings/tokens.
2. In `scripts/config.js`, set:
   - `repoOwner`: your GitHub username
   - `repoName`: the repository name (e.g. `portfolio`)
   - `defaultBranch`: typically `main` or `master`
3. In the admin panel, paste the PAT, provide a commit message, and press **Commit posts.json** or **Commit projects.json** if you ever want to push manually. When the token and repo fields are set, every save/delete automatically publishes the corresponding JSON file.

> ⚠️ Tokens are kept in-memory only. Refreshing the page clears them. Never hardcode a PAT in the repo.

## Content format

### Posts (`data/posts.json`)

Each entry keeps Markdown content plus metadata:

```json
{
  "id": "welcome-post",
  "title": "Launching SkylerDavila.com",
  "publishedAt": "2025-12-01T15:30:00.000Z",
  "tags": ["announcement", "process"],
  "content": "# Markdown body..."
}
```

- `id` should be unique (slug-like). The admin UI auto-generates one from the title.
- `publishedAt` is automatically set to the current ISO timestamp when you create a post.
- `tags` is optional; leave empty for none.

### Projects (`data/projects.json`)

```json
{
  "id": "portfolio-shell",
  "title": "Terminal Portfolio",
  "description": "A retro terminal-style landing page built with vanilla JS and CSS.",
  "url": "projects/terminal-portfolio/index.html",
  "featured": true
}
```

- Host static demos inside `projects/<slug>/` and point `url` at the folder's `index.html`.
- Use `featured: true` to float notable work to the top (simple sort priority).

## Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `skylerdavila.github.io` or any repo with Pages enabled).
2. Push this project to the repo:

   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. In GitHub, go to **Settings → Pages**, choose the `main` branch and `/ (root)` folder.
4. Wait for the Pages build; your site will be served at `https://YOUR_USERNAME.github.io/REPO/` or `https://YOUR_USERNAME.github.io/` if using the special repo name.

### Custom domain (`skylerdavila.com`)

1. In the Pages settings, add `skylerdavila.com` as the custom domain.
2. At your DNS provider, create:
   - `A` records pointing `@` to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (GitHub Pages IPs).
   - Optional `CNAME` for `www` pointing to `YOUR_USERNAME.github.io`.
3. Wait for DNS propagation, then enforce HTTPS in GitHub Pages settings.

## Development tips

- Run a local static server (optional) for live reload, e.g. `npx serve` or VS Code's Live Server.
- Test the admin panel in a Chromium-based browser for best Web Crypto support.
- Keep a backup of `posts.json`/`projects.json` before major edits.

## Project structure

```
├── admin.html              # Password-gated admin area
├── index.html              # Landing page
├── styles.css              # Core styling
├── scripts/
│   ├── admin.js            # Admin logic (login, CRUD, GitHub commits)
│   ├── config.js           # Password hash + repo metadata
│   └── main.js             # Public-facing UI logic
├── data/
│   ├── posts.json          # Markdown posts
│   └── projects.json       # Project entries
└── projects/
    └── terminal-portfolio/ # Example static project
        └── index.html
```

## Hidden entry reminder

On `index.html`, press `Ctrl`+`Shift`+`A` to open the admin panel. There's no visible link, keeping the login flow unobtrusive for visitors.
