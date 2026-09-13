# sluggers-league

Compile every [Sluggers Stat Tracker](https://isthatc2.github.io/Sluggers-Stat-Tracker/) `.xlsx` in a folder into one league workbook (Standings, Batting, Pitching, Games).

## Easy (Windows)

1. Download `sluggers-league.exe`.
2. Drag the folder of game `.xlsx` files onto the exe.
3. Open `league_compiled.xlsx` in that folder.

Or from a terminal:

```text
sluggers-league.exe "C:\path\to\game-xlsx-folder"
sluggers-league.exe "C:\path\to\game-xlsx-folder" -o league.xlsx
```

No Python install required. With no folder argument it uses `./output` or the current directory if those contain tracker workbooks.

## From source

```text
pip install openpyxl
python league_compile.py "C:\path\to\game-xlsx-folder"
```

Python 3.12+. Rates are recomputed from summed counting stats. Players with the same name on one roster are split by primary position.
