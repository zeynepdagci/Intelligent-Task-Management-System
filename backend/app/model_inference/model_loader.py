import os

# USE FOR NON QUANTIZED VERSION OF DISTILBERT
def load_pytorch_model(model_dir):
    from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
    tokenizer = DistilBertTokenizer.from_pretrained(model_dir)
    model = DistilBertForSequenceClassification.from_pretrained(model_dir, num_labels=3)
    model.eval()
    return tokenizer, model

# !!!! do this when you will use s3 !!!!
def download_model_from_s3(bucket, key, local_dir):
    import boto3, tarfile
    s3 = boto3.client('s3')
    tar_path = '/tmp/model.tar.gz'
    s3.download_file(bucket, key, tar_path)
    with tarfile.open(tar_path) as tar:
        tar.extractall(path=local_dir)
    print(f"Downloaded and extracted {key} from S3 bucket {bucket} to {local_dir}")

def get_or_download_model(local_dir, bucket=None, key=None):
    if not os.path.exists(local_dir) or not os.listdir(local_dir):
        if bucket and key:
            download_model_from_s3(bucket, key, local_dir)
        else:
            raise FileNotFoundError("Model directory not found and no S3 info given.")
    return load_pytorch_model(local_dir)

# USE FOR QUANTIZED VERSION OF DISTILBERT
def load_onnx_model(path):
    import onnxruntime as ort
    print(f"Loading ONNX model from {path}")
    # session = ort.InferenceSession(path)  # Uncomment when you have the model
    # return session
    return "onnx_model (placeholder)"
