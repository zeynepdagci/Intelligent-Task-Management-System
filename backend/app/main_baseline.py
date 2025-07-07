from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from app.model_inference.model_loader import get_or_download_model

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