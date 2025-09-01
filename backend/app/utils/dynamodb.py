import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource(
    'dynamodb',
    region_name='eu-west-2',
)

# cached_table = dynamodb.Table('')
team_table = dynamodb.Table('TeamMembers')
tasks_table = dynamodb.Table('Tasks')

def get_all_team_members():
    response = team_table.scan()
    return response.get('Items', [])

def add_team_member(name: str, email: str, role: str, skills: list):
    team_table.put_item(Item={
        "email": email,
        "name": name,
        "role": role,
        "skills": skills
    })

# TO ADD NEW TEAM MEMBERS FAST / WILL BE DELETED LATER!!!!
# i added the csv file in root directory then deleted to avoid committing it.

# import pandas as pd
# df = pd.read_csv("../team_members.csv")
# for _, row in df.iterrows():
#     name = row["name"]
#     email = row["email"]
#     role = row["role"]
#     skills = [skill.strip() for skill in row["skills"].split(",") if skill.strip()]
#     print(f"Uploading: {name}, {email}, {role}, {skills}")
#     add_team_member(name, email, role, skills)


def delete_team_member(email: str):
    team_table.delete_item(Key={"email": email
    })

def update_team_member(name: str, email: str, role: str, skills: list):
    team_table.update_item(Key={"email": email},
                           UpdateExpression="SET #n = :name, #r = :role, #s = :skills",
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


# def get_cached_result(task_description: str):
#     response = cached_table.get_item(Key={"task": task_description})
#     return response.get("Item")

# def store_result(task_description: str, category: str, assigned_to: str):
#     cached_table.put_item(Item={
#         "task": task_description,
#         "category": category,
#         "assignedTo": assigned_to
#     })

def create_task(task_data: dict) -> dict:
    task_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()

    item = {
        "task_id": task_id,
        "title": task_data.get("title"),
        "label": task_data.get("label"),
        "assigned_to": task_data.get("assigned_to"),
        "description": task_data.get("description"),
        "due_date": task_data.get("due_date"),
        "created_at": created_at,
        "status": task_data.get("status", "todo")
    }

    tasks_table.put_item(Item=item)
    return item

def get_all_tasks() -> list:
    response = tasks_table.scan()
    return response.get("Items", [])

def update_task_status(task_id: str, new_status: str):
    print(f"Updating task {task_id} to status: {new_status}")
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
        },
    )