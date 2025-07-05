from fastapi import FastAPI
from app.model_inference.model_loader import load_pytorch_model

app = FastAPI()

# Use the real path when you add your model file
# model = load_pytorch_model("models/distilbert_pytorch/pytorch_model.bin")

@app.get("/")
def read_root():
    return {"msg": "Hello from the Baseline API!"}

@app.post("/classify")
def classify_task(task: dict):
    # Use the loaded model to make a prediction later
    return {"category": "Bug", "assignedTo": "Dev A"}