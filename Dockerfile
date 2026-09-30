# ==============================================================================
# Multi-Stage Dockerfile for SIH26057 Sonar Debris & Anomaly Detection System
# Stage 1: Build React/Vite Frontend
# Stage 2: Python 3.11 Runtime for FastAPI + PyTorch + OpenCV + YOLOv8
# ==============================================================================

# ----------------- Stage 1: Frontend Build -----------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --frozen-lockfile || npm install

COPY frontend/ ./
RUN npm run build

# ----------------- Stage 2: Backend & ML Runtime -----------------
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install system runtime dependencies for OpenCV and PyTorch CPU
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (CPU-optimized PyTorch to minimize image size)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code and ML weights
COPY backend/ ./backend/
COPY ml/ ./ml/
COPY data/samples/ ./data/samples/
COPY data/uploads/ ./data/uploads/
COPY .env.example .env* ./

# Copy built frontend SPA assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create necessary runtime directories
RUN mkdir -p /app/data/uploads /app/data/samples

# Expose HTTP port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/health || exit 1

# Launch production server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
