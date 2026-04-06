# Designing a Serverless AI-Enhanced Task Management System with Green Computing Strategies: A Performance and Sustainability Evaluation

MSc dissertation project at City St George's, University of London

---

**1. What is this project?**

> *"A serverless, cloud-native task management system that uses a fine-tuned DistilBERT model to automatically classify software tasks and suggest the most suitable developer to handle them."*

**2. Why build a task management system with AI?**

> *"Manual task triage is time-consuming and inconsistent. By automating classification and assignee suggestion, the system reduces cognitive overhead for teams and provides a realistic, research-grade workload for evaluating AI efficiency in a serverless environment."*

**3. What AI model was used and why?**

> *"DistilBERT was chosen because it retains ~97% of BERT's accuracy while being 40% smaller and 60% faster — making it well-suited for a serverless deployment where cold-start time and memory are constrained."*

**4. What green computing strategies were implemented and why?**

> *"Two strategies were implemented: ONNX Runtime quantization (INT8) to reduce model size and inference time, and output-level caching in DynamoDB to skip redundant inference for repeated inputs. These directly address the energy and latency costs of running ML on Lambda."*

**5. Why serverless (AWS Lambda)?**

> *"Serverless removes the need to manage infrastructure and scales to zero when idle, which aligns with sustainability goals. It also allows the system to be evaluated under realistic, pay-per-use conditions rather than a continuously running server."*

**6. How does the assignee suggestion work?**

> *"Each team member's skills are embedded using DistilBERT. When a task is submitted, the task description is also embedded and cosine similarity is computed between the task embedding and each developer's skill embedding. The developer with the highest similarity score is suggested."*

**7. What configurations were evaluated?**

> *"Four configurations were tested: baseline (PyTorch, no cache), quantized (ONNX INT8, no cache), cached (PyTorch, with cache), and combined (ONNX INT8, with cache). This allows direct comparison of each strategy's individual and combined impact on latency, memory, and estimated CO₂ emissions."*

**8. Why DynamoDB for caching and data storage?**

> *"DynamoDB is serverless, requires no provisioning, and integrates natively with AWS Lambda. It stores both task/team data and cache entries (keyed by a hash of the input) with low-latency lookups, making it the natural fit for the architecture."*

**9. What does the frontend provide?**

> *"A React + TypeScript UI (deployed on Vercel) where users can submit tasks, view AI-predicted labels and suggested assignees, manage team members and their skills, and track tasks on a timeline. It communicates with the backend via REST API."*

---

> Note: This project is developed for educational and demonstration purposes. Do not reuse or submit this work for academic credit.

