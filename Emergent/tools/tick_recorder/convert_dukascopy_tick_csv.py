import argparse
import csv
from datetime import datetime, timezone


def ts_to_iso(ms: str) -> str:
  v = int(ms)
  dt = datetime.fromtimestamp(v / 1000, tz=timezone.utc)
  return dt.isoformat()


def main() -> None:
  ap = argparse.ArgumentParser()
  ap.add_argument("--in", dest="inp", required=True)
  ap.add_argument("--out", dest="out", required=True)
  args = ap.parse_args()

  with open(args.inp, "r", encoding="utf-8", newline="") as f_in:
    r = csv.DictReader(f_in)
    required = {"timestamp", "askPrice", "bidPrice"}
    if not required.issubset(set(r.fieldnames or [])):
      raise SystemExit(f"Unexpected header: {r.fieldnames}")

    with open(args.out, "w", encoding="utf-8", newline="") as f_out:
      w = csv.DictWriter(f_out, fieldnames=["ts", "bid", "ask", "volume"])
      w.writeheader()
      for row in r:
        ts = ts_to_iso(row["timestamp"])
        bid = row["bidPrice"]
        ask = row["askPrice"]
        vol = row.get("bidVolume") or ""
        w.writerow({"ts": ts, "bid": bid, "ask": ask, "volume": vol})


if __name__ == "__main__":
  main()

