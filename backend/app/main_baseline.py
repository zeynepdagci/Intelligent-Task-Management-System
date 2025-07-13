from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from app.model_inference.model_loader import get_or_download_model
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from .utils.dynamodb import add_team_member
from .utils.dynamodb import get_all_team_members
from .utils.dynamodb import delete_team_member
from .utils.dynamodb import update_team_member

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Only your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


LABELS = ["Bug Fix", "Feature Request", "Documentation"]

# For local dev, use local path; for AWS, provide bucket and key, and use /tmp
tokenizer, model = get_or_download_model("models/distilbert_pytorch")
# Example for Lambda (uncomment when ready): 
# tokenizer, model = get_or_download_model("/tmp/distilbert_pytorch", bucket="your-bucket", key="distilbert_pytorch.tar.gz")

class TaskRequest(BaseModel):
    description: str

class TeamMember(BaseModel):
    name: str
    email: str
    role: str
    skills: List[str]

@app.get("/team_members")
def get_members():
    return get_all_team_members()

@app.post("/add_team_member")
def add_member(member: TeamMember):
    try:
        add_team_member(
            name=member.name,
            email=member.email,
            role=member.role,
            skills=member.skills
        )
        return {"message": "Team member added successfully"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/team_member/{email}")
def delete_member(email: str):
    try:
        delete_team_member(email)
        return {"message": "Team member deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/team_member/{email}")
def update_member(email: str, member: TeamMember):
    try:
        update_team_member(
            name=member.name,
            email=email,
            role=member.role,
            skills=member.skills
        )
        return {"message": "Team member updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/")
def classify_task(request: TaskRequest):
    import torch
    inputs = tokenizer(request.description, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_class = logits.argmax(dim=1).item()
    return {
        "label_index": predicted_class,
        "label": LABELS[predicted_class]
    }