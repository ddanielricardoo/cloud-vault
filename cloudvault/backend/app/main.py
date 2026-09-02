from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .storage.storage_service import list_files, upload_file, get_file, delete_file
from .database import Base, engine
from . import models

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "CloudVault"
    }


@app.get("/files")
def get_files():
    return list_files()


@app.post("/files")
def create_file(file: UploadFile = File(...)):
    return upload_file(
        file.file,
        file.filename
    )


@app.get("/files/{filename}/download")
def download_file(filename: str):
    file = get_file(filename)

    return StreamingResponse(
        file["Body"],
        media_type=file["ContentType"],
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.delete("/files/{filename}")
def remove_file(filename: str):
    return delete_file(filename)