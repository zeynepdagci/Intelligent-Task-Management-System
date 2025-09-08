import os
import torch
from transformers import DistilBertTokenizer, DistilBertModel

MODEL_DIR = os.getenv("MODEL_DIR", "/tmp/distilbert_pytorch_v2")

_tokenizer = None
_model = None

def _ensure_loaded():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        _tokenizer = DistilBertTokenizer.from_pretrained(MODEL_DIR)
        _model = DistilBertModel.from_pretrained(MODEL_DIR)
        _model.eval()

def get_embedding(text: str) -> torch.Tensor:
    _ensure_loaded()
    inputs = _tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = _model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).squeeze()