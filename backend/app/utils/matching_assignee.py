from app.utils.dynamodb import get_all_team_members
from app.utils.embedding import get_embedding
from scipy.spatial.distance import cosine

def find_best_assignee(task_description: str):
    task_vector = get_embedding(task_description)

    best_assignee = None
    best_score = -1

    team_members = get_all_team_members()

    for assignee in team_members:
        skills = assignee.get("skills")
        if isinstance(skills, list):
            skills_text = ", ".join(skills)
        else:
            skills_text = str(skills)

        skill_vector = get_embedding(skills_text)
        similarity = 1 - cosine(task_vector.numpy(), skill_vector.numpy())
        print(f"- {assignee['name']} | skills: {skills_text} | score: {similarity:.3f}")

        if similarity > best_score:
            best_score = similarity
            best_assignee = assignee

    return {
        "assigned_to": best_assignee.get("name"),
        "email": best_assignee.get("email"),
        "role": best_assignee.get("role"),
        "score": round(float(best_score), 3)
    }
