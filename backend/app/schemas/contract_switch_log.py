from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SwitchLogCreate(BaseModel):
    contract_id: Optional[int] = None
    category: str
    provider: str
    switched: bool
    estimated_saving_annual: Optional[int] = None


class SwitchLogResponse(BaseModel):
    id: int
    contract_id: Optional[int]
    category: str
    provider: str
    switched: bool
    estimated_saving_annual: Optional[int]
    switched_at: datetime

    model_config = {"from_attributes": True}


class SwitchLogSummary(BaseModel):
    switch_count: int
    total_saving_annual: int  # 원 단위, switched=True 건의 합산
