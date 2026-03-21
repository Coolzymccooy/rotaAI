from fastapi import FastAPI, HTTPException
from models import OptimizationRequest, OptimizationResponse
from optimizer import RotaOptimizer
import socket
import os

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


def find_available_port(start_port: int, max_attempts: int = 20) -> int:
    """Find an available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", port))
                return port
            except OSError:
                print(f"Port {port} is in use, trying {port + 1}...")
    raise RuntimeError(f"No available port found between {start_port} and {start_port + max_attempts - 1}")


if __name__ == "__main__":
    import uvicorn

    preferred_port = int(os.environ.get("PORT", "8000"))
    port = find_available_port(preferred_port)

    if port != preferred_port:
        print(f"Port {preferred_port} was unavailable. Using port {port} instead.")

    print(f"Starting optimization engine on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
