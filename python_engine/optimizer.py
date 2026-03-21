import random
import statistics
from typing import List, Dict, Tuple
from models import OptimizationRequest, OptimizationResponse, Assignment, Doctor, Shift

class RotaOptimizer:
    def __init__(self, request: OptimizationRequest):
        self.doctors = {d.id: d for d in request.doctors}
        self.shifts = {s.id: s for s in request.shifts}
        self.rules = request.rules
        
        # Hard Constraints
        self.min_rest_hours = self.rules.get('min_rest_hours', 11.0)
        
        # State
        self.assignments: Dict[str, str] = {}  # shift_id -> doctor_id
        self.unassigned: List[str] = []
        
    def solve(self, iterations=2000) -> OptimizationResponse:
        """
        Main optimization loop using a Greedy Initialization + Stochastic Hill Climbing approach.
        """
        # 1. Initial Constraint Satisfaction (Greedy)
        self._initial_greedy_assignment()
        
        current_score = self._calculate_score()
        
        # 2. Iterative Improvement / Repair Algorithm
        for _ in range(iterations):
            if not self.assignments:
                break
                
            # Pick a random assigned shift to try and optimize
            shift_id = random.choice(list(self.assignments.keys()))
            current_doc_id = self.assignments[shift_id]
            
            # Find a new valid doctor
            possible_docs = list(self.doctors.keys())
            random.shuffle(possible_docs)
            
            for new_doc_id in possible_docs:
                if new_doc_id == current_doc_id:
                    continue
                    
                # Temporarily unassign to check validity of new assignment
                del self.assignments[shift_id]
                
                if self._can_assign(new_doc_id, shift_id):
                    self.assignments[shift_id] = new_doc_id
                    new_score = self._calculate_score()
                    
                    # If the move improves fairness/preferences, keep it
                    if new_score > current_score:
                        current_score = new_score
                        break 
                    else:
                        # Revert if it doesn't improve the global score
                        self.assignments[shift_id] = current_doc_id
                else:
                    # Revert if hard constraints are violated
                    self.assignments[shift_id] = current_doc_id

        # 3. Format Output
        fairness_score, coverage_score = self._calculate_metrics()
        violations = [f"Uncovered shift: {s_id}" for s_id in self.unassigned]
        
        final_assignments = [
            Assignment(
                doctorId=doc_id,
                shiftId=shift_id,
                date=self.shifts[shift_id].start_time.isoformat()
            )
            for shift_id, doc_id in self.assignments.items()
        ]
        
        return OptimizationResponse(
            assignments=final_assignments,
            violations=violations,
            fairnessScore=fairness_score,
            coverageScore=coverage_score
        )

    def _initial_greedy_assignment(self):
        """Assigns shifts to the first available doctor that meets all hard constraints."""
        sorted_shifts = sorted(self.shifts.values(), key=lambda s: s.start_time)
        
        for shift in sorted_shifts:
            assigned = False
            doc_ids = list(self.doctors.keys())
            random.shuffle(doc_ids) # Randomize to distribute load evenly initially
            
            for doc_id in doc_ids:
                if self._can_assign(doc_id, shift.id):
                    self.assignments[shift.id] = doc_id
                    assigned = True
                    break
                    
            if not assigned:
                self.unassigned.append(shift.id)

    def _can_assign(self, doc_id: str, shift_id: str) -> bool:
        """Evaluates all HARD constraints."""
        doc = self.doctors[doc_id]
        shift = self.shifts[shift_id]
        
        # Constraint 1: Skill Coverage
        if shift.required_skills:
            if not all(skill in doc.skills for skill in shift.required_skills):
                return False
                
        doc_shifts = [self.shifts[s_id] for s_id, d_id in self.assignments.items() if d_id == doc_id]
        
        # Constraint 2: Max Weekly Hours
        total_hours = sum((s.end_time - s.start_time).total_seconds() / 3600.0 for s in doc_shifts)
        shift_hours = (shift.end_time - shift.start_time).total_seconds() / 3600.0
        if total_hours + shift_hours > doc.max_weekly_hours:
            return False
            
        # Constraint 3: Overlap and Rest Periods
        for ds in doc_shifts:
            # Check Overlap
            if max(shift.start_time, ds.start_time) < min(shift.end_time, ds.end_time):
                return False
                
            # Check Rest period between shifts
            gap1 = (shift.start_time - ds.end_time).total_seconds() / 3600.0
            gap2 = (ds.start_time - shift.end_time).total_seconds() / 3600.0
            
            if 0 <= gap1 < self.min_rest_hours or 0 <= gap2 < self.min_rest_hours:
                return False
                
        return True

    def _calculate_score(self) -> float:
        """
        Scoring function for SOFT constraints. Higher score is better.
        Optimizes for: Preferences met, and equal distribution of nights/weekends.
        """
        score = 0.0
        
        night_counts = {d: 0 for d in self.doctors}
        weekend_counts = {d: 0 for d in self.doctors}
        
        for shift_id, doc_id in self.assignments.items():
            shift = self.shifts[shift_id]
            doc = self.doctors[doc_id]
            
            if shift.is_night:
                night_counts[doc_id] += 1
            if shift.is_weekend:
                weekend_counts[doc_id] += 1
                
            # Soft Constraint: Preferences
            if shift_id in doc.preferences:
                score += 10.0
                
        # Soft Constraint: Fairness (Penalize high variance in undesirable shifts)
        if len(self.doctors) > 1:
            night_std = statistics.pstdev(list(night_counts.values()))
            weekend_std = statistics.pstdev(list(weekend_counts.values()))
            
            # Subtract standard deviation from the score to penalize unfairness
            score -= (night_std * 20.0)
            score -= (weekend_std * 20.0)
            
        return score
        
    def _calculate_metrics(self) -> Tuple[float, float]:
        """Calculates the final normalized scores (0-100) for the API response."""
        night_counts = {d: 0 for d in self.doctors}
        weekend_counts = {d: 0 for d in self.doctors}
        
        for shift_id, doc_id in self.assignments.items():
            shift = self.shifts[shift_id]
            if shift.is_night:
                night_counts[doc_id] += 1
            if shift.is_weekend:
                weekend_counts[doc_id] += 1
                
        fairness_score = 100.0
        if len(self.doctors) > 1:
            night_std = statistics.pstdev(list(night_counts.values()))
            weekend_std = statistics.pstdev(list(weekend_counts.values()))
            # Normalize std dev to a 0-100 score
            penalty = (night_std + weekend_std) * 10
            fairness_score = max(0.0, min(100.0, 100.0 - penalty))
            
        total_shifts = len(self.shifts)
        coverage_score = (len(self.assignments) / total_shifts * 100.0) if total_shifts > 0 else 100.0
        
        return round(fairness_score, 2), round(coverage_score, 2)
