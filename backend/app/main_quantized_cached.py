from fastapi import FastAPI
from app.model_inference.model_loader import load_onnx_model

app = FastAPI()

# model = load_onnx_model("models/distilbert_onnx/quantized_model.onnx")

@app.get("/")
def read_root():
    return {"msg": "Hello from the Cached and Quantized API!"}

@app.post("/classify")
def classify_task(task: dict):
    return {"category": "Bug", "assignedTo": "Dev Q"}
