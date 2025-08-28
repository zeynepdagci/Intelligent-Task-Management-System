import os, boto3

os.environ.setdefault("HF_HOME", "/tmp/hf")

def _s3_download_dir(bucket: str, prefix: str, local_dir: str):
    import os, boto3
    s3 = boto3.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # Only process real files under the prefix
            if not key.startswith(prefix):
                continue
            rel = key[len(prefix):].lstrip("/")
            # Skip "folder markers" and any keys that end with '/'
            if not rel or rel.endswith("/"):
                continue
            dest = os.path.join(local_dir, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            s3.download_file(bucket, key, dest)


def get_or_download_torch_model(local_dir: str, bucket: str | None = None, key_prefix: str | None = None):
    cfg = os.path.join(local_dir, "config.json")
    bin_path = os.path.join(local_dir, "pytorch_model.bin")
    safetensors = os.path.join(local_dir, "model.safetensors")
    tok_files = [
        "tokenizer.json", "tokenizer_config.json",
        "special_tokens_map.json", "vocab.txt"
    ]
    have_model = os.path.exists(bin_path) or os.path.exists(safetensors)
    have_tok = all(os.path.exists(os.path.join(local_dir, f)) for f in tok_files)

    if not (os.path.exists(cfg) and have_model and have_tok):
        if not (bucket and key_prefix):
            raise RuntimeError(
                f"Model files missing in {local_dir} and no S3 location provided. "
                f"Set MODEL_BUCKET and MODEL_KEY_PREFIX."
            )
        os.makedirs(local_dir, exist_ok=True)
        _s3_download_dir(bucket, key_prefix, local_dir)

    from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
    tok = DistilBertTokenizerFast.from_pretrained(local_dir)
    model = DistilBertForSequenceClassification.from_pretrained(local_dir)
    return tok, model

def get_or_download_onnx_classifier(local_dir: str, bucket: str | None = None,
                                    key_prefix: str | None = None, onnx_name: str = "model-quantized.onnx"):
    needed = [onnx_name, "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "vocab.txt"]
    have_all = all(os.path.exists(os.path.join(local_dir, f)) for f in needed)
    if not have_all:
        if not (bucket and key_prefix):
            raise RuntimeError(
                f"Classifier files missing in {local_dir} and no S3 location provided. "
                f"Set MODEL_BUCKET and MODEL_KEY_PREFIX."
            )
        os.makedirs(local_dir, exist_ok=True)
        _s3_download_dir(bucket, key_prefix, local_dir)
    return local_dir, os.path.join(local_dir, onnx_name)

def get_or_download_onnx_encoder(local_dir: str, bucket: str | None = None,
                                 key_prefix: str | None = None, onnx_name: str = "distilbert-base-int8.onnx"):
    needed = [onnx_name, "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "vocab.txt"]
    have_all = all(os.path.exists(os.path.join(local_dir, f)) for f in needed)
    if not have_all:
        if not (bucket and key_prefix):
            raise RuntimeError(
                f"Encoder files missing in {local_dir} and no S3 location provided. "
                f"Set ONNX_EMB_BUCKET and ONNX_EMB_KEY_PREFIX."
            )
        os.makedirs(local_dir, exist_ok=True)
        _s3_download_dir(bucket, key_prefix, local_dir)
    return local_dir, os.path.join(local_dir, onnx_name)