import boto3
import uuid
from datetime import datetime, timezone

dynamodb = boto3.resource(
    'dynamodb',
    region_name='eu-west-2',
)

team_table = dynamodb.Table('TeamMembers')
tasks_table = dynamodb.Table('Tasks')

def get_all_team_members():
    response = team_table.scan()
    return response.get('Items', [])

def add_team_member(name: str, email: str, role: str, skills: list):
    item = {
        "email": email,
        "name": name,
        "role": role,
        "skills": skills
    }
    team_table.put_item(Item=item)
    return item

def delete_team_member(email: str):
    team_table.delete_item(Key={"email": email
    })

def update_team_member(name: str, email: str, role: str, skills: list):
    team_table.update_item(
        Key={"email": email},
        UpdateExpression=(
            "SET #n = :name, #r = :role, #s = :skills"),
        ExpressionAttributeNames={
            "#n": "name",
            "#r": "role",
            "#s": "skills",
        },
        ExpressionAttributeValues={
            ":name": name,
            ":role": role,
            ":skills": skills,
        })

def create_task(task_data: dict) -> dict:
    task_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    item = {
        "task_id": task_id,
        "title": task_data.get("title"),
        "label": task_data.get("label"),
        "assigned_to": task_data.get("assigned_to"),
        "description": task_data.get("description"),
        "due_date": task_data.get("due_date"),
        "created_at": created_at,
        "status": task_data.get("status", "To-Do")
    }

    tasks_table.put_item(Item=item)
    return item

def get_all_tasks() -> list:
    response = tasks_table.scan()
    return response.get("Items", [])

def update_task_status(task_id: str, new_status: str):
    tasks_table.update_item(
        Key={"task_id": task_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": new_status}
    )

def update_task_db(task_id: str, title: str, label: str, assigned_to: str, description: str, due_date: str, status: str):
    tasks_table.update_item(
        Key={"task_id": task_id},
        UpdateExpression=(
            "SET #t = :title, #l = :label, #a = :assignee, "
            "#d = :desc, #due = :due_date, #s = :status"
        ),
        ExpressionAttributeNames={
            "#t": "title",
            "#l": "label",
            "#a": "assigned_to",
            "#d": "description",
            "#due": "due_date",
            "#s": "status",
        },
        ExpressionAttributeValues={
            ":title": title,
            ":label": label,
            ":assignee": assigned_to,
            ":desc": description,
            ":due_date": due_date,
            ":status": status,
        })

def delete_the_task(task_id: str):
    tasks_table.delete_item(Key={"task_id": task_id
    })
