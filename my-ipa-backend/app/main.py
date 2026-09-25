from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
import os
from app.modifier import process_ipa

app = FastAPI(title="IPA Sign & Modify API", version="2.0")

TEMP_DIR = "temp_workspace"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/api/modify")
async def modify_endpoint(file: UploadFile = File(...), icon: UploadFile = File(None)):
    if not file.filename.endswith(".ipa"):
        raise HTTPException(status_code=400, detail="تکایە فایلی ڕەسەنی IPA بنێرە.")

    input_path = os.path.join(TEMP_DIR, file.filename)
    output_path = os.path.join(TEMP_DIR, "mod_" + file.filename)
    icon_path = None

    with open(input_path, "wb") as buffer:
        buffer.write(await file.read())

    if icon:
        icon_path = os.path.join(TEMP_DIR, icon.filename)
        with open(icon_path, "wb") as buffer:
            buffer.write(await icon.read())

    try:
        process_ipa(input_path, output_path, icon_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path): os.remove(input_path)
        if icon_path and os.path.exists(icon_path): os.remove(icon_path)

    return FileResponse(output_path, media_type="application/octet-stream", filename="modified_" + file.filename)
