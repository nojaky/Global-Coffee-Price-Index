import csv
import io
import json
from datetime import date, datetime
from pathlib import Path
from urllib.request import Request, urlopen


SERIES = {
    "arabica": "PCOFFOTMUSDM",
    "robusta": "PCOFFROBUSDM",
    "exchange_rate": "DEXKOUS",
}


def fetch_series(series_id):
    urls = [
        f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}",
        f"https://fred.stlouisfed.org/data/{series_id}.txt",
    ]
    last_error = None

    for url in urls:
        try:
            request = Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 coffee-price-index/1.0",
                    "Accept": "text/csv,text/plain,*/*",
                },
            )
            with urlopen(request, timeout=30) as response:
                text = response.read().decode("utf-8-sig")

            if url.endswith(".txt"):
                values = parse_fred_text(text)
            else:
                values = parse_fred_csv(text, series_id)
            if values:
                return values
        except Exception as error:
            last_error = error

    raise RuntimeError(f"FRED {series_id} 다운로드 실패: {last_error}")


def parse_fred_csv(text, series_id):
    values = {}
    for row in csv.DictReader(io.StringIO(text)):
        raw_value = row.get(series_id, "")
        if raw_value in ("", "."):
            continue
        values[row["observation_date"]] = round(float(raw_value), 5)
    return values


def parse_fred_text(text):
    values = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 2 or len(parts[0]) != 10 or parts[0][4] != "-":
            continue
        if parts[1] == ".":
            continue
        try:
            values[parts[0]] = round(float(parts[1]), 5)
        except ValueError:
            continue
    return values


def main():
    arabica = fetch_series(SERIES["arabica"])
    robusta = fetch_series(SERIES["robusta"])
    exchange_rates = fetch_series(SERIES["exchange_rate"])
    common_dates = sorted(set(arabica) & set(robusta))

    if not common_dates:
        raise RuntimeError("FRED에서 공통 월별 데이터를 찾지 못했습니다.")

    latest = date.fromisoformat(common_dates[-1])
    cutoff_year = latest.year - 10
    rows = [
        {
            "date": item,
            "arabica": arabica[item],
            "robusta": robusta[item],
        }
        for item in common_dates
        if date.fromisoformat(item) >= date(cutoff_year, latest.month, 1)
    ]

    payload = {
        "updatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "latestObservation": common_dates[-1],
        "exchangeRate": exchange_rates[sorted(exchange_rates)[-1]],
        "exchangeRateDate": sorted(exchange_rates)[-1],
        "unit": "U.S. cents per pound",
        "frequency": "Monthly",
        "source": "International Monetary Fund via FRED",
        "series": SERIES,
        "rows": rows,
    }
    output = Path(__file__).with_name("data.json")
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} rows to {output}")


if __name__ == "__main__":
    main()
