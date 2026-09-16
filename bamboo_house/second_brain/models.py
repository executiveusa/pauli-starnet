from __future__ import annotations
from dataclasses import dataclass,asdict
from typing import Any

@dataclass(frozen=True)
class SourceFile:
    file_id:str; name:str; size:int; modified_time:str; mime_type:str; owner:str

@dataclass(frozen=True)
class Passage:
    passage_id:str; source_file_id:str; conversation_id:str; title:str; role:str; created_at:str|None; text:str; ordinal:int
    def json(self)->dict[str,Any]: return asdict(self)
