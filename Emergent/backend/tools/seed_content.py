import json
import os
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient


def now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def load_json(path: Path):
  with path.open('r', encoding='utf-8') as f:
    return json.load(f)


def upsert_many(col, rows, key_field: str):
  n = 0
  for r in rows:
    k = r[key_field]
    doc = dict(r)
    doc.setdefault('created_at', now_iso())
    doc['updated_at'] = now_iso()
    col.update_one({key_field: k}, {'$set': doc, '$setOnInsert': {'created_at': doc['created_at']}}, upsert=True)
    n += 1
  return n


def main() -> None:
  db_uri = os.environ.get('DB_URI')
  db_name = os.environ.get('DB_NAME')
  if not db_uri or not db_name:
    raise SystemExit('Please set DB_URI and DB_NAME')

  repo_root = Path(__file__).resolve().parents[1]
  seed_dir = repo_root / 'seed'

  eas = load_json(seed_dir / 'seed_eas.json')
  indicators = load_json(seed_dir / 'seed_indicators.json')
  tutorials = load_json(seed_dir / 'seed_tutorials.json')

  client = MongoClient(db_uri)
  db = client[db_name]

  n_ea = upsert_many(db.eas, eas, 'id')
  n_ind = upsert_many(db.indicators, indicators, 'id')
  n_tut = upsert_many(db.tutorials, tutorials, 'id')

  print({'eas': n_ea, 'indicators': n_ind, 'tutorials': n_tut})


if __name__ == '__main__':
  main()

