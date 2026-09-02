import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="http://localhost:9000",
    aws_access_key_id="cloudvault",
    aws_secret_access_key="cloudvault-dev-password",
)

response = s3.list_buckets()

for bucket in response["Buckets"]:
    print(bucket["Name"])
