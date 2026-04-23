import uuid

class JiraAdapter:
    def execute(self, action: str, context: dict):
        if context.get("error_type") == "ambiguous_data":
            raise Exception("Ambiguous data: cannot determine Jira project")

        if action == "create_jira_epic":
            epic_id = f"EPIC-{uuid.uuid4().hex[:8].upper()}"
            return {
                "status": "success",
                "action": action,
                "jira_epic_id": epic_id,
                "message": f"Created epic {epic_id} in Jira"
            }
        elif action == "assign_support_team":
            ticket_id = f"SUP-{uuid.uuid4().hex[:8].upper()}"
            return {
                "status": "success",
                "action": action,
                "jira_ticket_id": ticket_id,
                "message": f"Assigned support ticket {ticket_id} in Jira"
            }
        return {"status": "skipped", "message": f"Unknown Jira action: {action}"}
