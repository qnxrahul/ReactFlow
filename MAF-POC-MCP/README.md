# MAF-POC

This project demonstrates a Proof of Concept for orchestrating agents using the Microsoft Agent Framework (MAF) in Python with FastAPI.

## Features
- Supervisor agent orchestrates workflow steps based on configuration
- Supports checkpointing and resumption
- Modular agent and registry structure
- Models for request validation
- Service layer for checkpoint management

## Setup
1. Create and activate a Python virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the API server:
   ```
   uvicorn main:app --reload
   ```

## Usage
- Access Swagger UI at `http://localhost:8000/docs`
- POST to `/answer-checklist` with a payload like:
  ```json
  {
    "requestid": "unique-id-123",
    "checklist": ["item1", "item2"],
    "orchestration": {
      "steps": [
        {"agent": "extraction_agent", "params": {"filename": "example.pdf"}},
        {"agent": "rag_agent", "params": {}}
      ],
      "checkpointing": true,
      "resume": false
    }
  }
  ```

## Folder Structure
- `agents/` - Agent implementations
- `registry/` - Agent registry
- `models/` - Data transfer object models (request/response models)
- `service/` - Service layer (e.g., checkpoint management)

## License
MIT
