import os

# USE FOR NON QUANTIZED VERSION OF DISTILBERT
def load_pytorch_model(model_dir):
    from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
    tokenizer = DistilBertTokenizerFast.from_pretrained(model_dir)
    model = DistilBertForSequenceClassification.from_pretrained(model_dir, num_labels=3)
    model.eval()
    return tokenizer, model

def model_from_s3(bucket, key_prefix, local_dir):
    import boto3
    import os

    s3 = boto3.client('s3')
    model_files = [
        "config.json",
        "model.safetensors",
        "special_tokens_map.json",
        "tokenizer_config.json",
        "tokenizer.json",
        "vocab.txt"
    ]

    if not os.path.exists(local_dir):
        os.makedirs(local_dir)

    for filename in model_files:
        s3_key = f"{key_prefix}/{filename}"
        local_path = os.path.join(local_dir, filename)
        if not os.path.exists(local_path):
            print(f"Downloading {s3_key} to {local_path}")
            s3.download_file(bucket, s3_key, local_path)

    print(f"Downloaded model files from s3://{bucket}/{key_prefix} to {local_dir}")


def get_or_download_model(local_dir, bucket=None, key=None):
    if not os.path.exists(local_dir) or not os.listdir(local_dir):
        if bucket and key:
            model_from_s3(bucket, key, local_dir)
        else:
            raise FileNotFoundError("Model directory not found and no S3 info given.")
    return load_pytorch_model(local_dir)

