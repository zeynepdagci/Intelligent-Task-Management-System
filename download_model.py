from transformers import DistilBertTokenizer, DistilBertForSequenceClassification

model_dir = "backend/models/distilbert_pytorch"

tokenizer = DistilBertTokenizer.from_pretrained("distilbert-base-uncased")
model = DistilBertForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=3)

tokenizer.save_pretrained(model_dir)
model.save_pretrained(model_dir)
