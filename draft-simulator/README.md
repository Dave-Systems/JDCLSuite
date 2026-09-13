# JDCL Draft Room

Inspect a Mario Super Sluggers NTSC-U (`RMBE01`) Gecko stat patch and conduct a manual draft for 2–8 named teams. Each team drafts 9 or 12 players in snake or linear order. Includes 71 playable character variants and 24 optional Mii color/gender slots; every slot can be drafted once.

## Run from JDCLSuite

Hosted: [https://dave-systems.github.io/JDCLSuite/](https://dave-systems.github.io/JDCLSuite/). That copy reads ParPatch from GitHub `main`.

With Node.js 20 or newer, run `npm start` from this directory, then open `http://127.0.0.1:4173/`. On the same Wi‑Fi/Ethernet, a phone can use `http://<this-pc-ip>:4173/` (the server binds all interfaces). No installation or build is needed. The app source is in `dist/`, with a small dependency-free local server in `server.mjs`.

The local server reads the current ParPatch text file directly from the sibling `Stat-Editor/Gecko-Codes` directory on every request. It picks the newest numerically named `ParPatchv*.txt` file and disables caching. The loader names this source **Live JDCLSuite working copy** and shows the actual path and read time.

When hosted, the app fetches the current ParPatch from [JDCLSuite's GitHub main branch](https://github.com/Dave-Systems/JDCLSuite/tree/main/Stat-Editor/Gecko-Codes), labels it **Live JDCLSuite · GitHub main**, and links to the source file. It reads the file through GitHub's API by content hash, so a reload is not served a CDN-cached old copy. Each hosted load uses two unauthenticated API requests, and GitHub allows 60 an hour per network. Hosted versions see changes pushed to GitHub; local uncommitted changes are visible only through the local server. Both versions fetch when opened and when **Reload live ParPatch** is clicked. A failed live read shows an error; there is no fallback to a stale bundled copy.

**Loading only fills the text box. It never applies the code.** The user must click **Apply code** before patched stats enter the roster. Pasting a code or opening a text file also only stages it. The currently applied patch is labeled separately from the loader. Each application starts from vanilla defaults. Choosing vanilla is explicit. Draft settings lock when a draft starts; undo restores the previous turn, and resetting or replacing an active draft asks before clearing picks. State is held in the current browser page and is lost on reload.

## Supported codes and limits

- Big-endian direct byte/fill (`00/01`), halfword/fill (`02/03`), word (`04/05`), block (`06/07`) and serial (`08/09`) writes, with the default Gecko base address. Standard reset/end markers are accepted.
- All 30 core character fields, directional chemistry, per-character size/catch/hitbox tables, and pitch timing/change-up tables.
- Unknown enum values and writes outside modeled tables are reported. Global trajectory/speed tables, team stars, star boosts and game logic are not modeled. Unsupported executable instructions, conditions, pointers, assembly hooks, malformed lines and truncated payloads reject the entire import without changing the active roster.
- Paste a stat code, optionally with a `$name` and comments, rather than a full Dolphin `.ini`. This is a roster inspector, not a Gecko interpreter or game simulator.
- Drafts have no CPU picks or predicted ratings. All picks are manual. Mii entries are stat slots, not personal Miis from a Dolphin save. Directional chemistry links count reciprocal relationships separately and exclude self-links in team totals.
- No Gecko text is uploaded. The app only fetches baseline assets, live public ParPatch text when hosted, and its fonts.

## Data provenance

Factual default values and address layouts were extracted from [Philenarion / Sluggers Stat Editor](https://github.com/Philenarion/Sluggers-Stat-Editor/blob/ab866526dcc4f430ef5dc7b1dd180f11f6a4f8ca/editorV3.py), v4.1 at commit `ab866526dcc4f430ef5dc7b1dd180f11f6a4f8ca`. The JSON preserves all 101 game IDs, including six unused IDs so Mii addresses remain correct. Defaults are the editor's tables, not independently measured game-memory values. No upstream application code or artwork is included. Full attribution is retained in `dist/data/baseline.json`.

The decoder is an independent implementation using the [Gecko code specification](https://gamehacking.org/faqs/wiicodetypes.html). Importantly, float values are compared after float32 encoding, avoiding false stat changes from decimal rounding.

## Verification

Run `npm test`. Tests cover the independently verified Par Patch v1.12 fixture (173 lines, 153 instructions, 26 stat changes, 202 chemistry changes), partial writes, payload padding, Stat Editor word padding and record headers, repeated writes, float tables, invalid imports, directionality, Mii indices, multi-team order, capacity, duplicates, undo, completion, and live source loading without a fallback snapshot. The fixture under `tests/fixtures/` is used only by tests.
