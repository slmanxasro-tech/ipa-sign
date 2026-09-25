FROM python:3.10-slim

# دامەزراندنی پێداویستییە سەرەتاییەکان بۆ کارکردن لەسەر لینوکس
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# دیاریکردنی پۆرت بۆ Railway
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
