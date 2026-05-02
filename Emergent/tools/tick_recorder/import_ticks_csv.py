import csv
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable

import requests


@dataclass
class Tick:
  ts: datetime
  bid: float
  ask: float
  volume: float | None = None


def parse_iso(ts: str) -> datetime:
  return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def read_ticks(path: str) -> Iterable[Tick]:
  with open(path, "r", encoding="utf-8", newline="") as f:
    r = csv.DictReader(f)
    for row in r:
      yield Tick(
        ts=parse_iso(row["ts"]),
        bid=float(row["bid"]),
        ask=float(row["ask"]),
        volume=float(row["volume"]) if row.get("volume") else None,
      )


def main() -> None:
  base_url = os.environ["BACKEND_URL"].rstrip("/")
  token = os.environ["ADMIN_TOKEN"].strip()
  csv_path = os.environ["TICKS_CSV"]

  ticks = list(read_ticks(csv_path))
  payload = [
    {
      "ts": t.ts.isoformat(),
      "bid": t.bid,
      "ask": t.ask,
      **({"volume": t.volume} if t.volume is not None else {}),
    }
    for t in ticks
  ]

  r = requests.post(
    f"{base_url}/api/admin/ticks/xauusd/batch",
    json=payload,
    headers={"X-Admin-Token": token},
    timeout=60,
  )
  r.raise_for_status()
  print(r.json())


if __name__ == "__main__":
  main()

