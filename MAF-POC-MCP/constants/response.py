

agent_response = {
  "title": "AgentResponseModel",
  "type": "object",
  "properties": {
    "request_id": {
      "title": "Request Id",
      "type": "string"
    },
    "message": {
      "title": "Message",
      "type": "string"
    }
  },
  "required": ["request_id", "message"]
}
