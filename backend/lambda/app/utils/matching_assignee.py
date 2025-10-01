import os
from scipy.spatial.distance import cosine
from app.utils.dynamodb import get_all_team_members
import time

USE_ONNX_EMB = os.getenv("USE_ONNX_EMBEDDINGS", "false").lower() == "true"
if USE_ONNX_EMB:
    from app.utils.embedding_onnx import get_embedding
else:
    from app.utils.embedding import get_embedding

def score_each_member(task_vector, skillset):
    best = -1.0

    # "skillset" corresponds to 1 or more skills phrases, "skills" corresponds to 1 phrase in that set
    for skills in skillset:
        skills_vector = get_embedding(skills)
        similarity = 1 - cosine(task_vector, skills_vector)
        if similarity > best:
            best = similarity
    return best

def find_best_assignee(task_description: str):
    t0 = time.perf_counter()
    task_vector = get_embedding(task_description)
    inference_ms = (time.perf_counter() - t0) * 1000.0
    best = None
    best_score = -1.0

    # both role and skills are used to get the similarity score
    for member in get_all_team_members():
        skills = member.get("skills", [])
        role = member.get("role", "")
        if role:
            skills = skills + [f"Role: {role}"]
        similarity_score = score_each_member(task_vector, skills)
        if similarity_score > best_score:
            best_score = similarity_score
            best = member
    
    return{
        "assigned_to": best["name"] if best else None,
        "similarity": float(best_score),
        "inference_ms": float(inference_ms)
    }