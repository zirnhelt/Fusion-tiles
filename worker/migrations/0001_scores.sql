-- One row per player per daily board, holding their best verified run
CREATE TABLE IF NOT EXISTS scores (
  day        TEXT    NOT NULL,          -- UTC date, YYYY-MM-DD
  player_id  TEXT    NOT NULL,          -- random id kept on the player's device; never returned
  name       TEXT    NOT NULL,
  score      INTEGER NOT NULL,
  max_z      INTEGER NOT NULL,          -- heaviest element forged
  turns      INTEGER NOT NULL,
  actions    TEXT    NOT NULL,          -- the replayed action log (JSON), kept for audits
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,          -- when the current best was set (breaks ties)
  PRIMARY KEY (day, player_id)
);

CREATE INDEX IF NOT EXISTS scores_by_day ON scores (day, score DESC, updated_at);
