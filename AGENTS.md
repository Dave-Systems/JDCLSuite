# AGENTS.md

This repo is the **Jimmy Draft Co League (JDCL)** setup for Mario Super Sluggers (NTSC-U `RMBE01`): a snapshot of bits aggregated from Discord, plus the draft room and league compiler. Help is welcome — open a pull request. If you're using a coding agent, have it read this file.

## Layout

- `Stat-Editor/Gecko-Codes/` — live ParPatch (`ParPatchv*.txt`)
- `Dolphin/` — game settings, save, Mii collection
- `draft-simulator/` — Draft Room (app in `dist/`, no build)
- `sluggers-league/` — tracker `.xlsx` → standings

Stat Editor and Stat Tracker stay external. Do not vendor them.

## Draft Room

```bash
cd draft-simulator && npm test    # Node 20+
cd draft-simulator && npm start   # http://127.0.0.1:4173/
```

Hosted: https://dave-systems.github.io/JDCLSuite/

- Loading a Gecko code only fills the textarea. **Apply code** is what changes the roster.
- Live ParPatch is the newest `ParPatchv*.txt`. Use integer names (`ParPatchv114.txt`, not `ParPatchv1.14.txt`). Tests glob that too — do not pin a version in a `const`.
- Pages reads ParPatch from GitHub `main`, not the Pages artifact.

## Shipping a ParPatch

Replace together: `Stat-Editor/Gecko-Codes/ParPatchvN.txt` (delete the old file), the same bytes in `draft-simulator/tests/fixtures/`, and the `$Par Patch` title, body, and `[Gecko_Enabled]` name in `Dolphin/GameSettings/RMBE01.ini`. Changelog only decoder-proven diffs in the root README, and update the SHA-256 hashes there.

## Mii collection

`Dolphin/Wii/shared2/menu/FaceLib/RFL_DB.dat` is JDCL's Mii collection. Copying it replaces the destination's entire FaceLib database, not one Mii. Do not strip or regenerate it.

Do not commit `.claude/` or `.openai/`.
