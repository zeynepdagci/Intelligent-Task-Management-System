import os, torch
from transformers import AutoTokenizer, DistilBertModel
from onnxruntime.quantization import quantize_dynamic, QuantType

PT_DIR = os.environ.get("PT_DIR", "backend/models/distilbert_pytorch_v2")
OUT_DIR = os.environ.get("OUT_DIR", "backend/models/distilbert_onnx_encoder_v2")
os.makedirs(OUT_DIR, exist_ok=True)

print(f"Loading encoder from: {PT_DIR}")
tok = AutoTokenizer.from_pretrained(PT_DIR)
enc = DistilBertModel.from_pretrained(PT_DIR)
enc.eval()

dummy = tok("hello world", return_tensors="pt", padding="max_length", truncation=True, max_length=128)

onnx_fp = os.path.join(OUT_DIR, "distilbert-base.onnx")
q_fp    = os.path.join(OUT_DIR, "distilbert-base-int8.onnx")

with torch.no_grad():
    torch.onnx.export(
        enc,
        (dummy["input_ids"], dummy["attention_mask"]),
        onnx_fp,
        input_names=["input_ids", "attention_mask"],
        output_names=["last_hidden_state"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "attention_mask": {0: "batch", 1: "sequence"},
            "last_hidden_state": {0: "batch", 1: "sequence"},
        },
        opset_version=14
    )

quantize_dynamic(onnx_fp, q_fp, weight_type=QuantType.QInt8, reduce_range=True, per_channel=False)

tok.save_pretrained(OUT_DIR)
print("Encoder ONNX ready at:", OUT_DIR)
