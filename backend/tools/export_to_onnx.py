import os, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from onnxruntime.quantization import quantize_dynamic, QuantType

PT_DIR = os.environ.get("PT_DIR", "backend/models/distilbert_pytorch_v2")
OUT_DIR = os.environ.get("OUT_DIR", "backend/models/distilbert_onnx_classifier_v2")
os.makedirs(OUT_DIR, exist_ok=True)

print(f"Loading classifier from: {PT_DIR}")
tok = AutoTokenizer.from_pretrained(PT_DIR)
model = AutoModelForSequenceClassification.from_pretrained(PT_DIR)
model.eval()

dummy = tok("hello world", return_tensors="pt", padding="max_length", truncation=True, max_length=128)

onnx_path = os.path.join(OUT_DIR, "model.onnx")
quantized_path    = os.path.join(OUT_DIR, "model-quantized.onnx")

with torch.no_grad():
    torch.onnx.export(
        model,
        (dummy["input_ids"], dummy["attention_mask"]),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "logits": {0: "batch"},
        },
        opset_version=14,
    )

quantize_dynamic(onnx_path, quantized_path, weight_type=QuantType.QInt8)

tok.save_pretrained(OUT_DIR)
print("Classifier ONNX ready at:", OUT_DIR)
