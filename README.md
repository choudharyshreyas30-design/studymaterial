# Robot Rescue: Power Up the Bot!
A static mini-game for Robotronics, IET-DAVV. Plain HTML, CSS and JavaScript. No build step, no dependencies, no backend.

## Files
- `index.html` (must stay in the project root)
- `css/style.css`, `js/game.js`, `js/config.js` (analytics settings)
- `assets/logo.png`, `assets/favicon.png`

## Test locally
Open `index.html` in a browser. Everything works from a double-click.

## Deploy to Vercel (free Hobby plan) using GitHub
1. Create a free account at github.com and click **New repository** (any name, public or private).
2. Upload the CONTENTS of this folder (so `index.html` is at the top level of the repo, not inside a sub-folder): **Add file > Upload files**, drag everything in, then **Commit changes**.
3. Go to vercel.com and sign up with GitHub (free Hobby plan).
4. Click **Add New > Project**, pick your repository, then **Import**.
5. Leave Framework Preset as **Other**. Leave Build Command and Output Directory empty. Root Directory: `./`.
6. Click **Deploy**. When it finishes you get a `.vercel.app` link.
7. To choose the name: **Project > Settings > Domains**, and add `robotronics-recruitment.vercel.app` if it is free. If Vercel says it is taken, pick a similar name. Always check the Deployments tab shows a green "Ready" status.

Updating later: edit files on GitHub and commit. Vercel redeploys automatically.

## Optional analytics (off by default)
Edit `js/config.js`. With both values empty the site makes no tracking requests.
- **GoatCounter** (free for non-commercial use, no cookies, recommended): sign up at goatcounter.com, then set `goatcounterCode: "yourcode"`. Events appear as paths named `event/game_started`, `event/game_completed`, `event/instagram_clicked`, `event/study_material_clicked`.
- **Google Analytics 4** (free, uses cookies): set `ga4MeasurementId: "G-XXXXXXXXXX"`. The same four events are sent.

Read the numbers honestly: a completion is a play, not a unique student. An Instagram click does not prove a follow. A Drive click does not prove a download. Browser local storage cannot give totals across visitors, so none is used.

## Pre-share test checklist
- [ ] The Vercel link opens on your phone (mobile data, not just Wi-Fi) and on a laptop
- [ ] Start button works, three questions appear with four options each, no placeholder text
- [ ] Correct and incorrect answers both show a label and an explanation
- [ ] Timer runs out correctly and counts as no points
- [ ] Results show score, rank, and both buttons
- [ ] Instagram button opens robotronics._iet in a new tab and the game page stays open
- [ ] Study material button opens the Drive folder, and the Drive folder is shared as "Anyone with the link: Viewer"
- [ ] The footer "Skip the game" link opens the Drive folder
- [ ] Play again returns to the start screen
- [ ] Keyboard only: Tab to buttons, Enter to press, keys 1 to 4 answer
- [ ] Sound toggle works, and the page is quiet if toggled off
- [ ] If analytics is on, test events appear in your dashboard
