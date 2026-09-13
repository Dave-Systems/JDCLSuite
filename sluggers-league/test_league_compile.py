import unittest
from pathlib import Path

from league_compile import BATTING_SUM, compile_league


def _counts(**overrides):
    counts = {key: 0.0 for key in BATTING_SUM}
    counts.update(overrides)
    return counts


def _batter(team, player, position, **overrides):
    return {
        "team": team,
        "player": player,
        "position": position,
        "positions": position,
        "counts": _counts(**overrides),
    }


def _game(batters, name="game.xlsx"):
    return {
        "path": Path(name),
        "info": {"away": "Away", "home": "Home", "away_score": 1, "home_score": 0},
        "batters": batters,
        "pitchers": [],
    }


class CompressBattingTest(unittest.TestCase):
    def test_position_mover_becomes_one_row(self):
        compiled = compile_league([
            _game([_batter("Fireballs", "Mario", "CF", Hits=1, **{"At-Bats": 4})], "g1.xlsx"),
            _game([_batter("Fireballs", "Mario", "SS", Hits=2, **{"At-Bats": 3})], "g2.xlsx"),
        ])
        rows = [row for row in compiled["batting"] if row["player"] == "Mario"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["games"], 2)
        self.assertEqual(rows[0]["Hits"], 3)
        self.assertEqual(rows[0]["position"], "CF/SS")

    def test_overlapping_same_name_stays_split(self):
        compiled = compile_league([
            _game([
                _batter("Bows", "Yellow Mii (M)", "LF", Hits=1, **{"At-Bats": 3}),
                _batter("Bows", "Yellow Mii (M)", "RF", Hits=1, **{"At-Bats": 3}),
            ], "g1.xlsx"),
            _game([
                _batter("Bows", "Yellow Mii (M)", "LF", Hits=1, **{"At-Bats": 3}),
                _batter("Bows", "Yellow Mii (M)", "RF", Hits=1, **{"At-Bats": 3}),
            ], "g2.xlsx"),
        ])
        rows = [row for row in compiled["batting"] if row["player"] == "Yellow Mii (M)"]
        self.assertEqual(len(rows), 2)
        self.assertEqual(sorted(row["position"] for row in rows), ["LF", "RF"])
        self.assertEqual({row["games"] for row in rows}, {2})


if __name__ == "__main__":
    unittest.main()
