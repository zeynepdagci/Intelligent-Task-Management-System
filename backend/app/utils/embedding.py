from transformers import DistilBertTokenizer, DistilBertModel
import torch

MODEL_DIR = "/tmp/distilbert_pytorch"

tokenizer = DistilBertTokenizer.from_pretrained(MODEL_DIR)
model = DistilBertModel.from_pretrained(MODEL_DIR)

def get_embedding(text: str) -> torch.Tensor:
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).squeeze()

