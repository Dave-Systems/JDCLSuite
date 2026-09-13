# JDCL Draft Room

Inspect a Mario Super Sluggers NTSC-U (`RMBE01`) Gecko stat patch and conduct a manual draft for 2–8 named teams. Each team drafts 9 or 12 players in snake or linear order. Includes 71 playable character variants, each draftable once, and 12 optional Mii colors that any team can draft any number of times under custom names.

## Run from JDCLSuite

Hosted: [https://dave-systems.github.io/JDCLSuite/](https://dave-systems.github.io/JDCLSuite/). That copy reads ParPatch from GitHub `main`.

With Node.js 20 or newer, run `npm start` from this directory, then open `http://127.0.0.1:4173/`. On the same Wi‑Fi/Ethernet, a phone can use `http://<this-pc-ip>:4173/` (the server binds all interfaces). No installation or build is needed. The app source is in `dist/`, with a small dependency-free local server in `server.mjs`.

The local server reads the current ParPatch text file directly from the sibling `Stat-Editor/Gecko-Codes` directory on every request. It picks the newest numerically named `ParPatchv*.txt` file and disables caching. The loader names this source **Live JDCLSuite working copy** and shows the actual path and read time.

When hosted, the app fetches the current ParPatch from [JDCLSuite's GitHub main branch](https://github.com/Dave-Systems/JDCLSuite/tree/main/Stat-Editor/Gecko-Codes), labels it **Live JDCLSuite · GitHub main**, and links to the source file. It reads the file through GitHub's API by content hash, so a reload is not served a CDN-cached old copy. Each hosted load uses two unauthenticated API requests, and GitHub allows 60 an hour per network. Hosted versions see changes pushed to GitHub; local uncommitted changes are visible only through the local server. Both versions fetch when opened and when **Reload live ParPatch** is clicked. A failed live read shows an error; there is no fallback to a stale bundled copy.

## Scouting the player pool

- **Filters:** every modeled stat can be filtered. Enumerated stats (class, bats, throws, captain, star pitch/swing, abilities, trajectory, hit curve) use a select; numeric stats and the size/catch/pitch-timing tables use inclusive min/max ranges. Chemistry filters find players with good chemistry with the team on the clock, no bad chemistry with it, good chemistry with a chosen player, or no bad chemistry with a chosen player. Filters combine, and **Clear all filters** resets them.
- **Sorting:** every column heading is a sort button. The first click uses the column's natural order (highest first for numbers, A–Z for text), the second reverses it, and the third returns to roster order. The sorted column is announced with `aria-sort`.
- **Columns:** **Columns** shows or hides any stat. Defaults are Bats, Throws, Slap power, Charge power, Pitching rating, Speed and Chem. When the Bats or Throws column is hidden, handedness moves to the player's subtitle; the inspector always shows it.
- **Chemistry links:** before a draft, or while the team on the clock has no players, Chem counts the pool players linked to each player by good (♥) or bad (✕) chemistry. Once that team has a player, it counts and names that team's players instead. A link counts if either player's chemistry toward the other is good or bad, so one-way links from patches still appear. The inspector lists good and bad chemistry separately and shows direction.

## Drafting Miis

With **Include Mii slots** on, the pool lists each of the 12 Mii colors once, marked Unlimited, with how many have been drafted so far. Picking a Mii opens a dialog that asks for its league name and gender. The game has a male and a female slot for each color, which share every stat and relationship except batting side (male bats right, female bats left) and chemistry between same-color Miis, so the gender chooses the slot. Names are required, up to 24 characters, and must be unique across the draft (ignoring case); undoing a pick frees its name. Because Miis are unlimited, any number of teams and players per team can be drafted when they are included.

In the pool, a Mii color shows both batting sides (R/L) and matches a stat filter when either slot does. Drafted Miis appear under their names in the dugouts, the Chem column, the inspector and exports. Team chemistry counts links between every pair of roster spots, so two Miis from the same slot use that slot's self-chemistry (the ParPatch makes it good for every color except Brown).

**Loading only fills the text box. It never applies the code.** The user must click **Apply code** before patched stats enter the roster. Pasting a code or opening a text file also only stages it. The currently applied patch is labeled separately from the loader. Each application starts from vanilla defaults. Choosing vanilla is explicit. Draft settings lock when a draft starts; undo restores the previous turn, and resetting or replacing an active draft asks before clearing picks. State is held in the current browser page and is lost on reload.

## Exporting completed teams

Once every team has its full roster, **Export teams** becomes available beside the draft controls. Preview and download a text report (`.txt`), a spreadsheet-friendly CSV (`.csv`), or structured JSON (`.json`). All formats include team and player names, round and overall pick numbers, draft settings, the applied patch name, and the export time. CSV and JSON also include the original game player IDs, including Mii slots. Mii picks are listed by their league name with their color and gender (a separate Character and Mii gender column in CSV, and `character` and `miiGender` fields in JSON, format version 2). The applied patch name reflects the roster used for the draft, even if a different code is staged in the loader.

Exports download locally without changing the draft. Undoing a pick disables export until the draft is complete again; resetting disables it for the new draft. These files are roster reports, not saved sessions that can be imported back into the app, and do not include the Gecko code or player stat tables.

## Supported codes and limits

- Big-endian direct byte/fill (`00/01`), halfword/fill (`02/03`), word (`04/05`), block (`06/07`) and serial (`08/09`) writes, with the default Gecko base address. Standard reset/end markers are accepted.
- All 30 core character fields, directional chemistry, per-character size/catch/hitbox tables, and pitch timing/change-up tables.
- Unknown enum values and writes outside modeled tables are reported. Global trajectory/speed tables, team stars, star boosts and game logic are not modeled. Unsupported executable instructions, conditions, pointers, assembly hooks, malformed lines and truncated payloads reject the entire import without changing the active roster.
- Paste a stat code, optionally with a `$name` and comments, rather than a full Dolphin `.ini`. This is a roster inspector, not a Gecko interpreter or game simulator.
- Drafts have no CPU picks or predicted ratings. All picks are manual. Mii entries are stat slots, not personal Miis from a Dolphin save. Directional chemistry links count reciprocal relationships separately; a roster spot never links to itself, but two drafted Miis from the same slot do.
- No Gecko text is uploaded. The app only fetches its baseline assets, the live ParPatch text (the local server's `/api/parpatch`, or GitHub's API when hosted), and its fonts.

## Data provenance

Factual default values and address layouts were extracted from [Philenarion / Sluggers Stat Editor](https://github.com/Philenarion/Sluggers-Stat-Editor/blob/ab866526dcc4f430ef5dc7b1dd180f11f6a4f8ca/editorV3.py), v4.1 at commit `ab866526dcc4f430ef5dc7b1dd180f11f6a4f8ca`. The JSON preserves all 101 game IDs, including six unused IDs so Mii addresses remain correct. Defaults are the editor's tables, not independently measured game-memory values. No upstream application code or artwork is included. Full attribution is retained in `dist/data/baseline.json`.

Character portraits in `dist/portraits/` are Mario Super Sluggers artwork © Nintendo, via [sluggers.fyi](https://www.sluggers.fyi/characters), and are credited in the app footer and About section. `dist/data/portraits.json` maps game player IDs to portrait folders, and `tests/fixtures/portraits-manifest.json` records each image's source URL and SHA-256. Mii slots have no portrait and show an initials badge in the Mii's color.

The decoder is an independent implementation using the [Gecko code specification](https://gamehacking.org/faqs/wiicodetypes.html). Importantly, float values are compared after float32 encoding, avoiding false stat changes from decimal rounding.

## Verification

Run `npm test`. Tests cover the independently verified Par Patch v1.12 fixture (173 lines, 153 instructions, 26 stat changes, 202 chemistry changes), partial writes, payload padding, Stat Editor word padding and record headers, repeated writes, float tables, invalid imports, directionality, Mii indices, multi-team order, capacity, duplicates, unlimited named Mii picks and their gender slots, undo, completion, portrait coverage and checksums, live source loading without a fallback snapshot, stat and chemistry filters, header sort cycling, either-direction chemistry links, and a sanity check of the vanilla baseline against a second reference roster. Fixtures under `tests/fixtures/` are used only by tests.
