import argparse
import os

import pandas as pd
import yaml

METRIC_BETTER = {
    "mae": "min",
    "rmse": "min",
    "psnr": "max",
    "ssim": "max",
    "iou": "max",
    "bin_accuracy": "max",
}


def load_report(path: str):
    with open(path, "r") as f:
        return yaml.safe_load(f)


def extract_mean_metrics(report: dict):
    rows = []

    for metric in METRIC_BETTER.keys():
        if metric in report:
            value = report[metric]["mean"]
            rows.append((metric, float(value)))

    return rows


def append_to_csv(csv_path, model, sea, rows):
    new_rows = [
        {
            "model": model,
            "sea": sea,
            "metric": metric,
            "value": value,
        }
        for metric, value in rows
    ]

    df_new = pd.DataFrame(new_rows)

    if os.path.exists(csv_path):
        df_old = pd.read_csv(csv_path)
        df = pd.concat([df_old, df_new], ignore_index=True)
    else:
        df = df_new

    df = df.drop_duplicates(subset=["model", "sea", "metric"], keep="last")

    df.to_csv(csv_path, index=False)


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--model", required=True)
    parser.add_argument("--sea", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--csv", required=True)

    args = parser.parse_args()

    report = load_report(args.report)
    rows = extract_mean_metrics(report)
    append_to_csv(args.csv, args.model, args.sea, rows)

    print(f"- updated CSV: {args.csv}")


if __name__ == "__main__":
    main()
