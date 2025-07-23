from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification, Trainer, TrainingArguments
from datasets import Dataset
import pandas as pd
from pathlib import Path

# Load and prepare the dataset
df = pd.read_csv("fine_tuning_dataset.csv")
label_map = {'Bug Fix': 0, 'Feature Request': 1, 'Documentation': 2}
df['label'] = df['label'].map(label_map)

dataset = Dataset.from_pandas(df)

# Load tokenizer
tokenizer = DistilBertTokenizerFast.from_pretrained("distilbert-base-uncased")

# Tokenize
def tokenize(batch):
    return tokenizer(batch['text'], padding=True, truncation=True)

dataset = dataset.map(tokenize, batched=True)
dataset = dataset.train_test_split(test_size=0.2)

# Load model
model = DistilBertForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=3)

# Training setup
training_args = TrainingArguments(
    output_dir="./results",
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=4,
    weight_decay=0.01,
    save_strategy="no",
    logging_steps=10,
    logging_dir="./logs"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    tokenizer=tokenizer
)

# Train
trainer.train()

# Save model to a folder
save_path = "models/distilbert_pytorch"
Path(save_path).mkdir(parents=True, exist_ok=True)
model.save_pretrained(save_path)
tokenizer.save_pretrained(save_path)

print(f"Fine-tuning done, model saved to: {save_path}")
