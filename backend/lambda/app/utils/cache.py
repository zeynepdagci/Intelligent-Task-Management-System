from datetime import datetime, timezone
import os, time, json, boto3, hashlib

_TABLE_NAME = "CachedItems"
dynamodb = boto3.resource("dynamodb")
_table = dynamodb.Table(_TABLE_NAME)

def _normalize(text: str) -> str:
    return " ".join(text.strip().lower().split())

def make_cache_key(config_type: str, description: str) -> str:
    #config_type: 'cached' or 'quantizedCached'
    h = hashlib.sha256(_normalize(description).encode("utf-8")).hexdigest()[:32]
    return f"{config_type}|{h}"

def get_item(cache_key: str):
    resp = _table.get_item(Key={"cache_key": cache_key})
    return resp.get("Item")

def update_classify(cache_key: str, description_preview: str, payload: dict):
    _table.update_item(
        Key={"cache_key": cache_key},
        UpdateExpression=(
            "SET description_preview = if_not_exists(description_preview, :p), "
            "classify = :c, "
            "updated_at = :now"
        ),
        ExpressionAttributeValues={
            ":p": description_preview,
            ":c": payload,
            ":now": datetime.now(timezone.utc).isoformat()
        })

def update_assign(cache_key: str, description_preview: str, payload: dict):
    _table.update_item(
        Key={"cache_key": cache_key},
        UpdateExpression=(
            "SET description_preview = if_not_exists(description_preview, :p), "
            "assign = :a, "
            "updated_at = :now"
        ),
        ExpressionAttributeValues={
            ":p": description_preview,
            ":a": payload,
            ":now": datetime.now(timezone.utc).isoformat()
        })
