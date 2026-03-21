from fastapi import FastAPI, HTTPException
from models import OptimizationRequest, OptimizationResponse
from optimizer import RotaOptimizer

app = FastAPI(
    title="RotaAI Optimization Engine",
    description="Constraint-based scheduling engine for medical rostering",
    version="1.0.0"
)

@app.post("/api/v1/optimize", response_model=OptimizationResponse)
async def optimize_rota(request: OptimizationRequest):
    try:
        optimizer = RotaOptimizer(request)
        # Run the iterative improvement algorithm
        result = optimizer.solve(iterations=2000)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "optimization-engine"}

if __name__ == "__main__":
    import uvicorn
    # Run the server on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
