import os, random, numpy as np, pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from datasets import Dataset
from transformers import (
    DistilBertTokenizerFast, DistilBertForSequenceClassification,
    Trainer, TrainingArguments
)

SEED = 42
# random.seed(SEED); np.random.seed(SEED); os.environ["PYTHONHASHSEED"] = str(SEED)

# Dataset is loaded
df = pd.read_csv("fine_tuning_dataset.csv")

label_map = {'Bug Fix': 0, 'Feature Request': 1, 'Documentation': 2}
df = df[df["label"].isin(label_map.keys())].copy()
df["label"] = df["label"].map(label_map)

# 80/20 split
train_df, val_df = train_test_split(
    df, test_size=0.2, random_state=SEED, stratify=df["label"]
)

train_ds = Dataset.from_pandas(train_df.reset_index(drop=True))
val_ds   = Dataset.from_pandas(val_df.reset_index(drop=True))

# Tokenizer
tokenizer = DistilBertTokenizerFast.from_pretrained("distilbert-base-uncased")
def tokenize(batch): 
    return tokenizer(batch["description"], padding=True, truncation=True, max_length=250)

train_tok = train_ds.map(tokenize, batched=True)
val_tok   = val_ds.map(tokenize, batched=True)

# DistilBERT model
model = DistilBertForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=3)

training_args = TrainingArguments(
    output_dir="./results_v2",
    # learning_rate=5e-5,
    # per_device_train_batch_size=16,
    # per_device_eval_batch_size=16,
    # num_train_epochs=5,
    # warmup_ratio=0.1,
    # weight_decay=0.01,
    # save_strategy="no",
    # logging_steps=50,
    # load_best_model_at_end=True,f
    # metric_for_best_model="accuracy",
    # greater_is_better=True,
    # report_to=[],
    # label_smoothing_factor=0.05,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=4,
    weight_decay=0.01,
    save_strategy="no",
    seed=SEED
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_tok,
    eval_dataset=val_tok,
    tokenizer=tokenizer,
)

trainer.train()

save_path = Path("backend/models/distilbert_pytorch_v2")
save_path.mkdir(parents=True, exist_ok=True)
model.save_pretrained(save_path)
tokenizer.save_pretrained(save_path)
print(f"Fine-tuning done, model saved to: {save_path}")