# listing_schema.py
# app/models/listing_schema.py

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

@dataclass
class Listing:
    id: str
    raw_row_index: int
    address_full: str
    address_comp: Dict[str, str]
    fields: Dict[str, Any]
    coords: Dict[str, float]  # or None values
    numeric_cache: Dict[str, Optional[float]]
    status_raw: str

    def to_dict(self):
        return asdict(self)
