# Cardroom Lab 2.2 · Live table monitoring

The Felt Edition 2.0 interface uses **Tabler 1.7.5** in dark mode, a horizontal navigation bar, and a full cardroom lobby with green and burgundy felt tables. Ivory playing cards and red chips are used throughout. Custom theme styles are in `dist/felt.css`. The dashboard, navigation, cards, buttons, forms, and tables are based on Tabler. Its pinned stylesheet is bundled locally at `dist/vendor/tabler-1.7.5.min.css` so there are no runtime CDN requests. The MIT license is included in `dist/vendor/TABLER-LICENSE.txt`.

The Coach is available from the header button. The main workspace focuses on card entry, calculations, play, and results.

## Read a game screenshot

Use **Read screenshot** in the header. Choose or drop a PNG, JPEG, or WebP image (up to 12 MB / 40 megapixels), or paste an image with Ctrl+V. Drag over the preview to crop the table; **Precise crop** also provides keyboard-editable crop percentages. Only the selected region is supplied to the model, resized to a maximum 2,048-pixel longest side.

For automatic recognition, expand **Vision connection**, enter the localhost Ollama origin, and use **Find vision models** to discover installed image-capable models. A vision model must already be installed and running through Ollama; a text-only model cannot read screenshots. The app checks `/api/show` for image support, then sends a base64 image to `/api/chat` with a JSON card schema. The coach’s text model and the screenshot model are configured independently. No cloud API key is collected. Browser local-network/origin permissions may be required for the hosted app; the local app can be easier to connect. See [Ollama vision](https://docs.ollama.com/capabilities/vision) and [structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

You may also use **Add a card** to transcribe directly beside the image without connecting a model. Every included card can be corrected or reassigned. Poker requires known ranks and suits; blackjack needs ranks and exactly one dealer upcard. Ignore decorative cards and unreadable/hidden cards. Check the review confirmation before applying; a model response never edits the calculator automatically.

- **Update the current round** replaces the blackjack player hand and upcard. It does not append those cards again.
- **Start a new round** archives the prior visible hand before entering the next one. Round-shuffled games reset instead.
- Under **Other seen**, only cards explicitly checked **New to shoe** are appended. Leave previously counted cards unchecked.
- Image and crop fingerprints detect identical imports and flag near-identical images. An exact repeat cannot add observations or reopen an archived round in the same shoe. Similar images require a different-deal acknowledgment before extending the shoe. This is an aid, not a physical-card tracker across arbitrary screenshots.
- **Apply reviewed cards** fills the calculator. **Apply & analyze** also runs its numerical engine. A bust hand can be tracked without running an action simulation.

Screenshot files and model replies stay in memory during review. Backups contain only the applied cards, connection settings, and up to 80 small fingerprint records; they do not contain images. Closing the screenshot dialog cancels an active recognition request, clears the temporary image preview, and releases the selected file. Existing workspaces and older backups are migrated without resetting their cards or journal.

A complete, local-first browser application for **free-play blackjack and Texas Hold’em practice**. No account, paid API, package installation, or external game connection is needed for the calculators. The private hosted version is the easiest way to use it.

## Open the application

Private hosted app: https://cardroom-lab-practice-rm2611.selectecho1.chatgpt.site

For a local copy, run `node server.mjs` in this folder and open http://127.0.0.1:4178. On Windows, `Launch Cardroom Lab.cmd` starts this server if Node.js is on PATH. Node 20 or newer is recommended. No npm dependencies are required. Open through HTTP, rather than double-clicking `index.html`, so browser modules and calculation workers load correctly.

The local and hosted versions have separate browser storage. Use Export backup / Import backup to move your workspace between them. The app can be installed from a supporting browser’s app menu. Its service worker caches the application after the first successful visit for offline use; private-host authentication can still require an online visit in some browsers.

## Included

- Overview with real journal totals and a chip-balance chart. New workspaces start with 10,000 play chips and zero recorded results.
- Manual blackjack analyzer: rank entry, dealer upcard, finite-shoe inventory, Hi-Lo running/true counts, exact unconditioned next-card bust probability, chart-based recommendations, and simulated action EV with sampling intervals.
- Separate shoe tracker with observation history, undo, and explicit shuffle resets. Visible hand cards are removed once. Archive moves the current hand to prior observations; round-shuffle mode clears the previous round instead.
- Full blackjack practice game: US dealer peek, natural payouts, hit/stand/double/split/late surrender, up to four hands, chip accounting, dealer soft-17 rules, no-DAS handling, one-card split aces, and journal recording. A separate practice shoe reshuffles at 75% penetration or every round, depending on settings.
- Hold’em calculator: hero, community cards, one known opponent, dead cards, 1–5 total opponents, duplicate detection, 10k/20k/50k Monte Carlo trials, exact small-scenario enumeration, equity including split pots, hand distributions, pot odds, and estimated call EV.
- Strategy drills scored against the selected table rules and 20-card counting sprints, with persistent accuracy totals.
- Journal with manual results, automatic practice results, filtering, deletion, JSON backup/import with validation, and full CSV export.
- Statistical coach with contextual explanations, optional generative local AI, responsive layouts, keyboard-accessible controls, and an in-app field guide.

## Local AI chat (optional)

The default **statistical coach** is a transparent rule-based explainer, not an LLM. All math works without a model.

For generative AI, install and start Ollama from its official distribution, download a model that fits your machine (for example, `ollama pull llama3.2`), and confirm it is running. In the app’s Settings, select **Local AI via Ollama**, set the origin to `http://127.0.0.1:11434`, and enter the installed model’s exact name. The app uses `POST /api/chat`, with streaming disabled. No API key is used or collected.

The local version at `http://127.0.0.1:4178` is the simplest integration because Ollama accepts loopback origins by default. For the private hosted version, your browser may require local-network permission and Ollama must allow the exact hosted origin through `OLLAMA_ORIGINS`. See the official [Ollama FAQ](https://docs.ollama.com/faq) and [chat API](https://docs.ollama.com/api/chat). Keep the service bound to loopback. No system configuration is changed by this app.

Only the question, visible cards, rules, and current computed results are supplied to the local model. Hidden practice shoe order and dealer hole cards are excluded. The calculator is authoritative for displayed odds; model prose can be mistaken. Connection failures produce an explicit message plus a statistical-coach explanation. An actual model installation is not bundled or downloaded automatically.

## Math and assumptions

**Blackjack:** 4, 6, or 8 decks; US hole card / peek; double any initial two cards; selectable S17/H17, DAS, late surrender, and 3:2 or 6:5 naturals. Simulations sample without replacement from the entered remaining composition. Dealer hole cards are drawn first, conditioned on a passed blackjack peek. After the selected first action, play follows the baseline chart. EV is net return per initial chip, including added double/split exposure. The 95% intervals describe sampling error only. Simulation rankings are estimates, not an exact optimal finite-shoe strategy solver.

Chart source: [Wizard of Odds multi-deck strategy](https://wizardofodds.com/games/blackjack/strategy/4-decks/). Count definition: [Wizard of Odds Hi-Lo](https://wizardofodds.com/games/blackjack/card-counting/high-low/).

**Poker:** Standard Hold’em, best five out of seven cards. Unknown opponents are uniformly random legal combinations. Exact enumeration is used for one known opponent with 0–2 missing board cards and a complete river against one unknown opponent. Other scenarios are Monte Carlo sampled. Equity awards `1 / number of tied winners` for split pots. No rake, ranges, future betting, bluffing, fold equity, tournament ICM, or side pots are modeled. Enter the entire current pot including the opponent’s outstanding bet but excluding your pending call. Call EV = equity × (pot + call) − call.

No tool predicts shuffled cards, another player’s next bet, or guaranteed wins. Counting information carries forward only through the same persistent finite shoe. The app accepts manual observations and provides its own sandbox practice table; it reads only the screen source you explicitly share and does not place bets or control third-party games.

## Persistence

Browser local storage contains journal entries, manual observations, rules, and training totals. Chat and in-progress practice rounds are temporary. Reloading during a round voids it; only settled rounds affect saved results. Export before clearing site data. Backups are schema-validated and import requires a review step before replacement. The journal is limited to 10,000 entries, and CSV export includes all records. Using one active tab avoids conflicting edits.

## Verification

Run `node --test tests/*.test.mjs`. This includes exhaustive five-card category frequencies across all **2,598,960** hands, seven-card edge cases, exact and sampled poker split pots, deterministic simulation cases, blackjack chart/rule cases, card inventory, ace handling, pot arithmetic, and journal arithmetic.

Run syntax checks with `node --check dist/app.mjs`, `node --check dist/engine.mjs`, `node --check dist/worker.mjs`, and `node --check server.mjs`. No build step or dependencies are needed. `dist/` is the complete deployable application.

## Live screen monitoring (2.2)

Open **Share screen** in the header. Choose Blackjack or Hold’em, enter an installed Ollama vision model (or Find vision models), then click **Share & monitor** and choose the game tab/window in the browser’s native picker. Screen capture requires a supported desktop browser on HTTPS or localhost; an embedded browser may block it, in which case open the hosted link in Chrome or Edge. Audio is disabled. No frames are recorded, uploaded to the Site, included in backups, or stored in the service worker. Recognition sends only the selected capture area to your localhost vision endpoint.

The monitor runs one request at a time, with a selectable 2/5/10-second delay after each completed read. Model latency adds to that delay. Two matching reads confirm a layout. It counts newly exposed cards once, updates the active hand and dealer upcard, retains cards from other seats and revealed dealer cards in the count, and preserves prior observations when a confirmed clear table or a changed visible hand number starts the next round. Poker cards reset each hand; blackjack respects the selected persistent-shoe or shuffle-every-round rule. No OCR system can infer unseen discarded/burnt cards or detect every shuffle.

Use **Continue** to resume the current table and count, **Next round** when the old cards have gone but no clear interval was recognized, and **Fresh shoe** after a shuffle. Repeated old layouts are held after a manual round advance. If a layout changes ambiguously or exceeds the physical deck inventory, counting is held for review. The tracked-card panel shows exactly what the ledger contains. Pause recognition before dragging a capture area or editing its percentages. Changing the capture area during a round can require a new round or shoe to establish a consistent view.

The count and chart update automatically. Hold’em equity recalculates for legal complete streets. For automatic blackjack action EV, enable the US-peek confirmation only when the selected rules apply and dealer blackjack has been ruled out. Action EV is not run once multiple dealer cards are visible or the active hand is bust. The simulator does not model future bets or guarantee wins.

Closing the monitor panel keeps sharing active, with a persistent **Screen is shared** bar and **Stop sharing** control. Pause stops recognition but keeps the stream active. Stop, the browser’s own sharing Stop, page exit, or setup failure stop every media track and clear the preview and temporary frame buffer. Recognition errors retry while holding the last valid cards. Keep the source visible and the app open; browsers can throttle background tabs and minimize/occlude captured windows. Tracking metadata and counted ranks can be resumed after stopping; no automatic permission or capture resumes on reload.

Verification includes repeated/jittering frames, duplicate ranks, hits, hole-card reveals, clear/ambiguous round boundaries, hidden cards, impossible inventories, shuffle mode, resume, legal poker cards, request serialization, late permission/results, pause, browser Stop and setup/network failures. A running local vision model and a user-selected capture source are required for real recognition; neither is bundled.
