# Designing a Serverless AI-Enhanced Task Management System with Green Computing Strategies: A Performance and Sustainability Evaluation

MSc dissertation project at City St George's, University of London (Jul 2025 – **Sep 2025**).

A cloud‑native task management system that classifies software tasks and suggests assignees using **DistilBERT**. The system evaluates **green computing strategies** (model quantization + output‑level caching) on **AWS Lambda** for both performance and sustainability.

---

## ✨ Key Features

* **Task classification** into *Bug Fix*, *Feature Request*, *Documentation* using DistilBERT
* **Automatic assignee suggestion** via cosine similarity on developer skill embeddings
* **Output‑level caching** (results + embeddings) to skip redundant inference
* **ONNX Runtime quantization** for faster, lighter inference
* **Four configurations**: baseline · quantized · cached · combined
* **Metrics tracked**: inference latency, execution duration, memory usage, classification accuracy, CO₂ estimates

## 🧰 Tech Stack

**Frontend**

* React (Vite) • TypeScript • Vercel

**Serverless Backend**

* FastAPI (Python) • AWS Lambda • Amazon API Gateway

**AI / NLP**

* Hugging Face Transformers • DistilBERT • ONNX Runtime
* Cosine similarity

**Data & Caching**

* Amazon DynamoDB (serverless NoSQL)
* Cache entries:

  * Classification outputs: `{ taskText, category, assignedTo }`
  * Developer skill embeddings (precomputed)

**Observability & Sustainability**

* AWS CloudWatch + Lambda Insights
* Carbon estimation: Cloud Carbon Footprint

## 🙏 Acknowledgements

* Open‑source: Hugging Face Transformers, ONNX Runtime, FastAPI


Note: This project is developed for educational and demonstration purposes. Do not reuse or submit this work for academic credit.

