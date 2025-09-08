from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from typing import List
import os
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from app.utils.dynamodb import (
    add_team_member, get_all_team_members, delete_team_member, update_team_member,
    create_task, get_all_tasks, update_task_status, update_task_db)
from app.utils.matching_assignee import find_best_assignee
import logging, time
from app.utils.cache import make_cache_key, get_item, update_classify, update_assign

logging.basicConfig(level=logging.INFO)  # to see the logs on CloudWatch

app = FastAPI()
app.router.redirect_slashes = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://intelligent-task-management-system.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LABELS = ["Bug Fix", "Feature Request", "Documentation"]

CONFIG_TYPE = os.environ.get("CONFIG_TYPE", "baseline").lower() # Config switch: ONNX vs PyTorch
USE_ONNX_CLS = "quantized" in CONFIG_TYPE
USE_CACHE = "cached" in CONFIG_TYPE
BACKEND = "onnx" if USE_ONNX_CLS else "pytorch"

# S3 location to be used only when needed
MODEL_DIR = os.environ.get("MODEL_DIR", "/tmp/distilbert_pytorch_v2")
MODEL_BUCKET = os.environ.get("MODEL_BUCKET")  # In S3, zeynep-distilbert-models
MODEL_KEY_PREFIX = os.environ.get("MODEL_KEY_PREFIX")  #  models/distilbert_pytorch

os.environ.setdefault("HF_HOME", "/tmp/hf")
os.environ.setdefault("TRANSFORMERS_CACHE", "/tmp/hf")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# Classifier is initialized depending on CONFIG_TYPE
if USE_ONNX_CLS:
    import onnxruntime as ort
    from transformers import DistilBertTokenizerFast
    from app.model_inference.model_loader import get_or_download_onnx_classifier
    ONNX_CLS_NAME = os.environ.get("ONNX_CLS_NAME", "model-quantized.onnx")

    # Downloads from S3 if needed; returns (local_dir, onnx_path)
    _, onnx_path = get_or_download_onnx_classifier(
        local_dir=MODEL_DIR,
        bucket=MODEL_BUCKET,
        key_prefix=MODEL_KEY_PREFIX,
        onnx_name=ONNX_CLS_NAME,
    )
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_DIR)
    ort_sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    logging.info("ONNX classifier loaded | dir=%s | onnx=%s", MODEL_DIR, onnx_path)

    def infer_logits(text: str):
        import numpy as np
        enc = tokenizer(text, return_tensors="np", truncation=True, padding=True)
        inputs = {"input_ids": enc["input_ids"], "attention_mask": enc["attention_mask"]}
        (logits,) = ort_sess.run(["logits"], inputs)
        return logits  # numpy (1, num_labels)
else:
    # PyTorch (baseline/cached) branch
    from app.model_inference.model_loader import get_or_download_torch_model as get_torch_classifier
    import torch
    tokenizer, model = get_torch_classifier(
        local_dir=MODEL_DIR,
        bucket=MODEL_BUCKET,
        key_prefix=MODEL_KEY_PREFIX,
    )
    model.eval()
    logging.info("PyTorch classifier is loaded | MODEL_DIR=%s", MODEL_DIR)

    def infer_logits(text: str):
        with torch.no_grad():
            enc = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
            return model(**enc).logits.cpu().numpy()  # numpy (1, num_labels)

# Pydantic models & routes
class TaskRequest(BaseModel):
    description: str

class TaskStatusUpdate(BaseModel):
    status: str

class TeamMember(BaseModel):
    name: str
    email: str
    role: str
    skills: List[str]

class TaskUpdate(BaseModel):
    title: str
    label: str
    assigned_to: str
    description: str
    due_date: str
    status: str

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

@app.post("/classify")
def classify_task(request: TaskRequest):
    logging.info("Handling /classify with BACKEND=%s", BACKEND)
    if not request.description:
        raise HTTPException(status_code=400, detail="Task description cannot be empty.")

    cache_key = make_cache_key(CONFIG_TYPE, request.description)
    if USE_CACHE:
        item  = get_item(cache_key)
        if item  and "classify" in item :
            c = item ["classify"]
            try:
                label_index = LABELS.index(c["label"])
            except ValueError:
                label_index = None
            return {
                "label_index": label_index,
                "label": c["label"],
                "confidence": c["confidence"],
                "cached": True,
                "model": c["model"],
                "updated_at": c["updated_at"]
            }
        
    import numpy as np
    logits = infer_logits(request.description) # numpy (1, num_labels)
    probs = (np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True))[0]
    idx = int(probs.argmax())
    conf = float(probs[idx])
    result = {
        "label": LABELS[idx],
        "confidence": str(round(conf, 4)),
        "model": BACKEND,
        "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    if USE_CACHE:
        update_classify(cache_key, request.description[:120], result)
    
    return {
        "label_index": idx,
        "label": result["label"],
        "confidence": result["confidence"],
        "cached": False,
        "model": result["model"],
        "updated_at": result["updated_at"],
        "version": MODEL_DIR
    }
    
@app.post("/assign")
def assign_task(request: TaskRequest):
    logging.info("Handling /assign with BACKEND=%s", BACKEND)
    if not request.description:
        raise HTTPException(status_code=400, detail="Task description is required.")
    
    cache_key = make_cache_key(CONFIG_TYPE, request.description)
    if USE_CACHE:
        item = get_item(cache_key)
        if item and "assign" in item:
            a = item["assign"]
            return {
                "assigned_to": a["assigned_to"],
                "similarity": a["similarity"],
                "cached": True,
                "model": a["model"],
                "updated_at": a["updated_at"]
            }

    # in the case of "miss", it will be computed via PyTorch or ONNX embeddings depending on CONFIG_TYPE
    assignee = find_best_assignee(request.description)  # returns {assigned_to, similarity}
    
    res = {
        "assigned_to": assignee["assigned_to"],
        "similarity": str(assignee["similarity"]),
        "model": BACKEND,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    if USE_CACHE:
        update_assign(cache_key, request.description[:120], res)

    return {
        "assigned_to": res["assigned_to"],
        "similarity": res["similarity"],
        "cached": False,
        "model": res["model"],
        "updated_at": res["updated_at"],
    }

@app.post("/tasks")
def api_create_task(task: dict):
    try:
        new_task = create_task(task)
        return JSONResponse(content=jsonable_encoder({"message": "Task created", "task": new_task}))
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks")
def api_get_tasks():
    try:
        tasks = get_all_tasks()
        return JSONResponse(content=jsonable_encoder({"tasks": tasks}))
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/task/{task_id}")
def update_status(task_id: str, update: TaskStatusUpdate):
    try:
        update_task_status(task_id, update.status)
        return {"message": "Task status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/task/{task_id}/update")
def update_task_details(task_id: str, taskUpdate: TaskUpdate):
    try:
        update_task_db(
            task_id=task_id,
            title=taskUpdate.title,
            label=taskUpdate.label,
            assigned_to=taskUpdate.assigned_to,
            description=taskUpdate.description,
            due_date=taskUpdate.due_date,
            status=taskUpdate.status
        )
        return {"message": "Task updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
handler = Mangum(app)