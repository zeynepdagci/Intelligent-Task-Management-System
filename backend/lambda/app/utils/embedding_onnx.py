import os
import numpy as np
import onnxruntime as ort
import boto3
from transformers import DistilBertTokenizerFast

# ONNX model and the tokenizer files are stored in Lambda's writable /tmp to be downloaded from S3
ONNX_DIR   = os.environ.get("ONNX_EMB_DIR", "/tmp/distilbert_onnx_encoder_v2")

ONNX_NAME  = os.environ.get("ONNX_EMB_NAME", "distilbert-base-int8.onnx")

S3_BUCKET      = os.environ.get("ONNX_EMB_BUCKET")
S3_KEY_PREFIX  = os.environ.get("ONNX_EMB_KEY_PREFIX")

# Hugging Face's cache is redirected to /tmp 
HF_HOME = os.environ.get("HF_HOME", "/tmp/hf")
TRANSFORMERS_CACHE = os.environ.get("TRANSFORMERS_CACHE", HF_HOME)

os.environ.setdefault("HF_HOME", HF_HOME)
os.environ.setdefault("TRANSFORMERS_CACHE", TRANSFORMERS_CACHE)
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def _s3_download_dir(bucket: str, prefix: str, local_dir: str):
    s3 = boto3.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            rel = key[len(prefix):].lstrip("/")  # Common prefix is stripped
            dest = os.path.join(local_dir, rel)
            _ensure_dir(os.path.dirname(dest))
            s3.download_file(bucket, key, dest)

def _ensure_encoder_present():
    #  If the ONNX encoder  and tokenizer files are not present in ONNX_DIR, they are pulled from S3
    need_files = [
        ONNX_NAME,
        "tokenizer.json",
        "tokenizer_config.json",
        "special_tokens_map.json",
        "vocab.txt",
    ]
    have_all = all(os.path.exists(os.path.join(ONNX_DIR, f)) for f in need_files)
    if have_all:
        return

    if not (S3_BUCKET and S3_KEY_PREFIX):
        raise RuntimeError(
            f"Encoder files missing in {ONNX_DIR} and no S3 location provided. "
            f"Set ONNX_EMB_BUCKET and ONNX_EMB_KEY_PREFIX environment variables."
        )

    _ensure_dir(ONNX_DIR)
    _s3_download_dir(S3_BUCKET, S3_KEY_PREFIX, ONNX_DIR)

_ensure_dir(ONNX_DIR)
_ensure_dir(HF_HOME)
_ensure_encoder_present()

# tokenizer and ONNX session is loaded
_tok  = DistilBertTokenizerFast.from_pretrained(ONNX_DIR)
_sess = ort.InferenceSession(os.path.join(ONNX_DIR, ONNX_NAME),
                             providers=["CPUExecutionProvider"])

def get_embedding(text: str) -> np.ndarray:
    enc = _tok(text, return_tensors="np", truncation=True, padding=True)
    (last_hidden,) = _sess.run(["last_hidden_state"], {
        "input_ids": enc["input_ids"],
        "attention_mask": enc["attention_mask"],
    })
    return last_hidden.mean(axis=1)[0]
