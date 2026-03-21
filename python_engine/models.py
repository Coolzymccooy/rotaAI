from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class Doctor(BaseModel):
    id: str
    name: Optional[str] = None
    skills: List[str] = []
    max_weekly_hours: float = 40.0
    preferences: List[str] = [] # List of preferred shift IDs

class Shift(BaseModel):
    id: str
    start_time: datetime
    end_time: datetime
    required_skills: List[str] = []
    is_night: bool = False
    is_weekend: bool = False

class OptimizationRequest(BaseModel):
    doctors: List[Doctor]
    shifts: List[Shift]
    rules: Dict = Field(default_factory=dict)
    startDate: str
    endDate: str

class Assignment(BaseModel):
    doctorId: str
    shiftId: str
    date: str

class OptimizationResponse(BaseModel):
    assignments: List[Assignment]
    violations: List[str]
    fairnessScore: float
    coverageScore: float
