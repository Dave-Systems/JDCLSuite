# JDCLSuite

This repository contains the current **Mario Super Sluggers (NTSC-U, `RMBE01`)** setup snapshot from Dolphin, plus JDCL's draft room and league compiler. Snapshot generated **2026-09-10T18:01:06Z**.

## In this repository

**Dolphin snapshot**

- [Par Patch v1.13 Gecko code](Stat-Editor/Gecko-Codes/ParPatchv113.txt) — clean 175-line code to load in Sluggers Stat Editor (external).
- [Dolphin `RMBE01.ini`](Dolphin/GameSettings/RMBE01.ini) — contains only the seven Gecko codes enabled in Dolphin when this snapshot was taken.
- [Mario Super Sluggers save (`gamedata`)](Dolphin/Wii/title/00010000/524d4245/data/gamedata)
- [Dolphin Mii database (`RFL_DB.dat`)](Dolphin/Wii/shared2/menu/FaceLib/RFL_DB.dat)

**Tools**

- [JDCL Draft Room](https://dave-systems.github.io/JDCLSuite/) — inspect the live ParPatch or paste a Gecko Code, then draft players manually across 2–8 teams using their patched stats and chemistry. Source: [`draft-simulator/`](draft-simulator/).
- [sluggers-league](sluggers-league/) — compile a folder of tracker `.xlsx` dumps into league standings, batting, and pitching. Windows: drag the folder onto [`sluggers-league.exe`](sluggers-league/sluggers-league.exe).

## External tools

Not in this repo. Linked because the snapshot and JDCL tools depend on them.

- [Sluggers Stat Editor](https://github.com/Philenarion/Sluggers-Stat-Editor) — third-party editor for Super Sluggers Gecko stat patches. Load [`ParPatchv113.txt`](Stat-Editor/Gecko-Codes/ParPatchv113.txt) from this repo into it.
- [Sluggers Stat Tracker](https://isthatc2.github.io/Sluggers-Stat-Tracker/) — third-party per-game tracker. Its `.xlsx` dumps are the input for [`sluggers-league`](sluggers-league/).

## Par Patch changelog

### v1.13

- All Miis have positive chemistry with their own color (formerly brown was excluded).

### v1.12

### Chemistry

- All color variants have positive chemistry with the other variants in their group.
- Captain chemistry adds a second Mii color while preserving vanilla color chemistry:
  - Birdo — Light Blue
  - Bowser — Orange
  - Bowser Jr. — Light Green
  - Daisy — Green
  - Diddy Kong — Brown and Red
  - Donkey Kong — Yellow
  - Luigi — Blue
  - Mario — White
  - Peach — Light Blue
  - Wario — Purple
  - Waluigi — Blue
  - Yoshi — White
- **Additional documented behavior:** positive self-chemistry is written for 22 Mii slots.

### Fielding abilities

- Baby DK — Ball Dash
- Diddy Kong — Quick Throw
- Dixie Kong — Super Jump
- Donkey Kong — Laser Beam
- Funky Kong — Laser Beam
- Tiny Kong — Super Jump

### Classes

- Luigi — Technique
- Peach — Technique
- Daisy — Balanced
- Wario — Power
- Red Pianta — Power
- Blue Pianta — Balanced
- Boo — Technique
- Blue Noki — Speed
- Green Noki — Technique

### Batting trajectories

- Peach — Mid
- Yoshi — Mid
- King Boo — High
- Red Noki — Mid

### Stats

- Green Koopa — Speed: 64 → 75
- Red Koopa — Slap Hit Power: 30 → 40; Charge Hit Power: 50 → 60
- Blooper — Displayed Pitching: 6 → 7; Curve: 46 → 60
- Blue Noki — Stamina: 42 → 55
- **Additional documented change:** Blue Noki — Displayed Pitching: 5 → 7

## Gecko codes active in Dolphin

The included `RMBE01.ini` omits every disabled code definition from the live Dolphin file. It contains and enables only:

- `$Par Patch v1.13`
- `$CPU vs CPU V2`
- `$Bombs Explode On Contact`
- `$CPU Closeplay Overhaul`
- `$CPU Restore Triple Take Homeruns`
- `$CPU Restore Dynamic Strikeout Camera`
- `$CPU Remove Precharge`

Do not enable another generated stat patch alongside Par Patch v1.13; overlapping writes can produce unpredictable results.

## Installation

Close Dolphin before replacing any file, and back up your existing files first.

- Dolphin game settings: copy [`RMBE01.ini`](Dolphin/GameSettings/RMBE01.ini) to `Dolphin Emulator/GameSettings/RMBE01.ini`.
- Mario Super Sluggers save: copy [`gamedata`](Dolphin/Wii/title/00010000/524d4245/data/gamedata) to `Dolphin Emulator/Wii/title/00010000/524d4245/data/gamedata`.
- Mii database: copy [`RFL_DB.dat`](Dolphin/Wii/shared2/menu/FaceLib/RFL_DB.dat) to `Dolphin Emulator/Wii/shared2/menu/FaceLib/RFL_DB.dat`.
- Stat Editor: place [`ParPatchv113.txt`](Stat-Editor/Gecko-Codes/ParPatchv113.txt) in the editor's `Gecko Codes` folder and load `ParPatchv113`.

`RFL_DB.dat` replaces the destination's entire Mii database, not one Mii. The file can contain Mii names and creator/system identifiers, so treat it as personal data.

After changing Gecko codes, restart the game instead of loading an old save state.

## Snapshot integrity (SHA-256)

- `ParPatchv113.txt`: `098518eabf4d682c8832b89ca91efc4589c93b2df50adcf6fb2ae98b70e6f91c`
- `RMBE01.ini`: `99e12c30845c0ce6e6b9e7ba756a16db7f3d4e9b33a70ce8655c08bc5539514f`
- `gamedata`: `7de8e826605a90a759bce5d709033c92fa91552d0f13785f7c67d07a59e698f3`
- `RFL_DB.dat`: `631e5134ff3ccb9da83ea20328a2cc7bc612436ae5065ab3b4a94e27ca3cb6a0`
