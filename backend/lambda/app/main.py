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
    create_task, get_all_tasks, update_task_status, update_task_db, delete_the_task)
from app.utils.matching_assignee import find_best_assignee
import logging, time
from app.utils.cache import make_cache_key, get_item, update_classify, update_assign

# Logging in CloudWatch
import logging

root = logging.getLogger()
root.setLevel(logging.INFO)
for h in root.handlers:
    h.setLevel(logging.INFO)

logger = logging.getLogger(__name__)
logger.propagate = True

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
MODEL_KEY_PREFIX = os.environ.get("MODEL_KEY_PREFIX")  #  models/distilbert_pytorch_v2

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

    def infer_logits(text: str):
        import numpy as np
        enc = tokenizer(text, return_tensors="np", truncation=True, padding=True)
        inputs = {"input_ids": enc["input_ids"], "attention_mask": enc["attention_mask"]}
        (logits,) = ort_sess.run(["logits"], inputs)
        return logits
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

    def infer_logits(text: str):
        with torch.no_grad():
            enc = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
            return model(**enc).logits.cpu().numpy()

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
    print("ENTER /classify")
    logger.info("Handling /classify with BACKEND=%s", BACKEND)

    if not request.description:
        raise HTTPException(status_code=400, detail="Task description cannot be empty.")

    if USE_CACHE:
        cache_key = make_cache_key(CONFIG_TYPE, request.description)
        item  = get_item(cache_key)
        if item  and "classify" in item :
            c = item ["classify"]
            return {
                "label": c["label"],
                "updated_at": c["updated_at"],
                "cached": True,
                "inference_ms": 0.0,
            }
        
    import numpy as np
    t0 = time.perf_counter()
    logits = infer_logits(request.description)
    inf_ms = (time.perf_counter() - t0) * 1000.0
    probs = (np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True))[0]
    idx = int(probs.argmax())
    conf = float(probs[idx])
    result = {
        "label": LABELS[idx],
        "confidence": str(round(conf, 4)),
        "model": BACKEND,
        "updated_at": datetime.now(timezone.utc).isoformat()
        }

    return {
        "label": result["label"],
        "confidence": result["confidence"],
        "cached": False,
        "model": result["model"],
        "updated_at": result["updated_at"],
        "version": MODEL_DIR,
        "inference_ms": float(inf_ms)
    }
    
@app.post("/assign")
def assign_task(request: TaskRequest):
    print("ENTER /assign")
    logger.info("Handling /assign with BACKEND=%s", BACKEND)

    if not request.description:
        raise HTTPException(status_code=400, detail="Task description is required.")
    
    if USE_CACHE:
        cache_key = make_cache_key(CONFIG_TYPE, request.description)
        item = get_item(cache_key)
        if item and "assign" in item:
            a = item["assign"]
            return {
                "assigned_to": a["assigned_to"],
                "updated_at": a["updated_at"],
                "cached": True,
                "inference_ms": 0.0,
            }

    # in the case of "miss", it will be computed via PyTorch or ONNX embeddings depending on CONFIG_TYPE
    assignee = find_best_assignee(request.description)  # returns {assigned_to, similarity}
    
    result = {
        "assigned_to": assignee["assigned_to"],
        "similarity": str(assignee["similarity"]),
        "model": BACKEND,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "inference_ms": assignee["inference_ms"]
    }

    return {
        "assigned_to": result["assigned_to"],
        "similarity": result["similarity"],
        "cached": False,
        "model": result["model"],
        "updated_at": result["updated_at"],
        "version": MODEL_DIR,
        "inference_ms": result["inference_ms"]
    }

@app.post("/tasks")
def api_create_task(task: dict):
    try:
        new_task = create_task(task)
        desc = new_task.get("description")
        if USE_CACHE and desc:
            cache_key = make_cache_key(CONFIG_TYPE, desc)
            now = datetime.now(timezone.utc).isoformat()

            update_classify(
                cache_key,
                desc[:120],
                {
                    "label": new_task.get("label"),
                    "updated_at": now,
                },
            )
            update_assign(
                cache_key,
                desc[:120],
                {
                    "assigned_to": new_task.get("assigned_to"),
                    "updated_at": now,
                },
            )
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
    
@app.delete("/task/{task_id}")
def delete_task(task_id: str):
    try:
        delete_the_task(task_id)
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
handler = Mangum(app)