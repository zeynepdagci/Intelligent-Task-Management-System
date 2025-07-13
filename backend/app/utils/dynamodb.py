import boto3

dynamodb = boto3.resource(
    'dynamodb',
    region_name='eu-west-2',
)

# cached_table = dynamodb.Table('')
team_table = dynamodb.Table('TeamMembers')

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
