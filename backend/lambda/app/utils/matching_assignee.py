import os
from scipy.spatial.distance import cosine
from app.utils.dynamodb import get_all_team_members

USE_ONNX_EMB = os.getenv("USE_ONNX_EMBEDDINGS", "false").lower() == "true"
if USE_ONNX_EMB:
    from app.utils.embedding_onnx import get_embedding
else:
    from app.utils.embedding import get_embedding

def find_best_assignee(task_description: str):
    task_vec = get_embedding(task_description)
    best = None
    best_score = -1.0

    for member in get_all_team_members():
        skills = member.get("skills")
        skills_text = ", ".join(skills) if isinstance(skills, list) else str(skills)
        skill_vec = get_embedding(skills_text)
        sim = 1 - cosine(task_vec, skill_vec)
        if sim > best_score:
            best_score = sim
            best = member

    return {"assigned_to": best["name"] if best else None, "similarity": float(best_score)}