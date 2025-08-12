#sheet_fetcher.py
# app/services/sheet_fetcher.py

import os
import pandas as pd
from flask import current_app

def read_local_listing_sheet() -> list[list[str]]:
    """
    상가임대차.xlsx 를 읽어 2차원 배열(문자열) 반환.
    첫 행은 헤더.
    """
    filename = current_app.config["LISTING_SHEET_FILENAME"]
    data_dir = current_app.config["DATA_DIR"]
    path = os.path.join(data_dir, "raw", filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Listing sheet not found: {path}")

    df = pd.read_excel(path, dtype=str).fillna("")
    rows = [df.columns.tolist()] + df.values.tolist()
    return rows
