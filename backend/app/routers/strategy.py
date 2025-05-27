from fastapi import APIRouter

router = APIRouter(prefix="/strategy", tags=["Strategy"])

@router.get("/ping")
def ping():
    return {"message": "strategy router OK"}
