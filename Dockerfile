FROM python:3.12-slim

WORKDIR /app

COPY copy_tiles.py .

ENTRYPOINT ["python", "copy_tiles.py"]
