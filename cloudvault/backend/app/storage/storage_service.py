from .s3_client import s3


BUCKET_NAME = "cloudvault"


def list_files():
    response = s3.list_objects_v2(
        Bucket=BUCKET_NAME
    )

    files = []

    for file in response.get("Contents", []):
        files.append({
            "name": file["Key"],
            "size": file["Size"],
            "last_modified": file["LastModified"].isoformat()
        })

    return files


def upload_file(file, filename):
    s3.upload_fileobj(
        file,
        BUCKET_NAME,
        filename
    )

    return {
        "name": filename,
        "message": "File uploaded successfully"
    }

def get_file(filename):
    return s3.get_object(
        Bucket=BUCKET_NAME,
        Key=filename
    )

def delete_file(filename):
    s3.delete_object(
        Bucket=BUCKET_NAME,
        Key=filename
    )

    return {
        "name": filename,
        "message": "File deleted successfully"
    }