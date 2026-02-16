# ---- Install node ----
FROM node:18 AS frontend
WORKDIR /app
COPY ./frontend .

RUN npm install
RUN npm run build

# ---- Install pip dependencies ----
FROM python:3.12-slim AS build

WORKDIR /app
COPY requirements.txt ./

RUN pip3 install --no-cache-dir -r requirements.txt

# Default environment variables
ENV WEAVIATE_HOST=host.docker.internal
ENV WEAVIATE_PORT=8080
ENV WEAVIATE_SECURE=
ENV WEAVIATE_GRPC_HOST=host.docker.internal
ENV WEAVIATE_GRPC_PORT=50051
ENV WEAVIATE_GRPC_SECURE=

COPY --from=frontend /app/dist /app/static
COPY . .

CMD ["uvicorn", "weaviate_spy.main:app", "--host", "0.0.0.0", "--port", "7777"]
