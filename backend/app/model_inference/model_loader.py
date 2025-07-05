# USE FOR NON QUANTIZED VERSION OF DISTILBERT
def load_pytorch_model(path):
    import torch
    print(f"Loading PyTorch model from {path}")
    # model = torch.load(path, map_location="cpu")  # Uncomment when you have the model
    # model.eval()
    # return model
    return "pytorch_model (placeholder)"

# USE FOR QUANTIZED VERSION OF DISTILBERT
def load_onnx_model(path):
    import onnxruntime as ort
    print(f"Loading ONNX model from {path}")
    # session = ort.InferenceSession(path)  # Uncomment when you have the model
    # return session
    return "onnx_model (placeholder)"
