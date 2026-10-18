import tempfile
import unittest
from pathlib import Path

from openpyxl import load_workbook

from league_compile import BATTING_COLUMNS, BATTING_SUM, PITCHING_COLUMNS, PITCHING_SUM, compile_league, write_workbook


def _counts(**overrides):
    counts = {key: 0.0 for key in BATTING_SUM}
    counts.update(overrides)
    return counts


def _batter(team, player, position, positions=None, **overrides):
    return {
        "team": team,
        "player": player,
        "position": position,
        "positions": positions or position,
        "counts": _counts(**overrides),
    }


def _pitcher(team, player, innings):
    counts = {key: 0.0 for key in PITCHING_SUM}
    counts["Innings Pitched"] = innings
    return {"team": team, "player": player, "counts": counts}


def _game(batters, name="game.xlsx", pitchers=None):
    return {
        "path": Path(name),
        "info": {"away": "Away", "home": "Home", "away_score": 1, "home_score": 0},
        "batters": batters,
        "pitchers": pitchers or [],
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


class PitcherIdentityTest(unittest.TestCase):
    def test_same_name_miis_who_pitch_stay_split(self):
        brown = "Brown Mii (M)"
        compiled = compile_league([
            _game(
                [_batter("Spitballs", brown, "P", "P, 1B"), _batter("Spitballs", brown, "SS", "SS, P")],
                "g1.xlsx",
                [_pitcher("Spitballs", brown, 5.0), _pitcher("Spitballs", "Waluigi", 1.0), _pitcher("Spitballs", brown, 1.0)],
            ),
            _game(
                [_batter("Spitballs", brown, "P"), _batter("Spitballs", brown, "SS")],
                "g2.xlsx",
                [_pitcher("Spitballs", brown, 7.0)],
            ),
        ])
        rows = {row["player"]: row for row in compiled["pitching"] if row["player"].startswith(brown)}
        self.assertEqual(set(rows), {f"{brown} [P]", f"{brown} [SS]"})
        self.assertEqual(rows[f"{brown} [P]"]["games"], 2)
        self.assertEqual(rows[f"{brown} [P]"]["Innings Pitched"], 12.0)
        self.assertEqual(rows[f"{brown} [SS]"]["games"], 1)
        self.assertEqual(rows[f"{brown} [SS]"]["Innings Pitched"], 1.0)

    def test_named_pitcher_who_relieves_from_a_field_position_stays_one_row(self):
        compiled = compile_league([
            _game([_batter("Fireballs", "Mario", "P")], "g1.xlsx", [_pitcher("Fireballs", "Mario", 4.0)]),
            _game([_batter("Fireballs", "Mario", "3B", "3B, P")], "g2.xlsx", [_pitcher("Fireballs", "Mario", 2.0)]),
        ])
        rows = [row for row in compiled["pitching"] if row["player"].startswith("Mario")]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["player"], "Mario")
        self.assertEqual(rows[0]["games"], 2)
        self.assertEqual(rows[0]["Innings Pitched"], 6.0)

    def test_shared_name_with_one_pitcher_keeps_its_plain_name(self):
        green = "Green Mii (M)"
        compiled = compile_league([
            _game(
                [_batter("Rookies", green, "P"), _batter("Rookies", green, "RF")],
                "g1.xlsx",
                [_pitcher("Rookies", green, 7.0)],
            ),
        ])
        rows = [row["player"] for row in compiled["pitching"]]
        self.assertEqual(rows, [green])


class OutputColumnsTest(unittest.TestCase):
    HELPERS = {"Star Bases Helper", "At-Bats Against Helper", "Total Bases Allowed Helper"}

    def test_every_tracked_play_has_a_column(self):
        self.assertEqual(set(BATTING_SUM) - self.HELPERS - {key for _, key in BATTING_COLUMNS}, set())
        self.assertEqual(set(PITCHING_SUM) - self.HELPERS - {key for _, key in PITCHING_COLUMNS}, set())

    def test_star_slug_is_per_star_swing(self):
        compiled = compile_league([
            _game([_batter("Wilds", "Daisy", "2B", **{"At-Bats": 4, "Star Swings": 2, "Star Bases Helper": 3})], "g1.xlsx"),
            _game([_batter("Wilds", "Daisy", "2B", **{"At-Bats": 3})], "g2.xlsx"),
        ])
        row = next(r for r in compiled["batting"] if r["player"] == "Daisy")
        self.assertEqual(row["Star Slug %"], 1.5)

    def test_workbook_columns_and_frozen_names(self):
        samus = "Samus Aran (Blue, F)"
        compiled = compile_league([
            _game(
                [_batter("Knights", samus, "1B", Hits=2, Singles=1, RBI=4,
                         **{"Home Runs": 1, "Grand Slams": 1, "At-Bats": 4, "Plate Appearances": 4})],
                "g1.xlsx",
                [_pitcher("Knights", samus, 7.0)],
            ),
        ])
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "league.xlsx"
            write_workbook(compiled, dest, 1)
            wb = load_workbook(dest)
            bat, pit = wb["Batting"], wb["Pitching"]
            bat_headers = [c.value for c in bat[1]]
            self.assertEqual(bat_headers, [h for h, _ in BATTING_COLUMNS])
            row = dict(zip(bat_headers, [c.value for c in bat[2]]))
            self.assertEqual((row["H"], row["1B"], row["HR"], row["GS"], row["Solo HR"]), (2, 1, 1, 1, 0))
            self.assertEqual([c.value for c in pit[1]], [h for h, _ in PITCHING_COLUMNS])
            self.assertEqual((bat.freeze_panes, pit.freeze_panes, wb["Standings"].freeze_panes), ("C2", "C2", "A2"))
            self.assertGreater(bat.column_dimensions["B"].width, len(samus))
            self.assertGreater(pit.column_dimensions["B"].width, len(samus))


if __name__ == "__main__":
    unittest.main()
