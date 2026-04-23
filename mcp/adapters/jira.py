import random

class JiraAdapter:
    def execute(self, action: str, context: dict):
        if "ambiguous" in str(context).lower():
            raise Exception("Ambiguous data: cannot determine Jira project")

        if action == "create_jira_epic":
            epic_id = f"EPIC-{random.randint(100, 999)}"
            return {
                "status": "success",
                "action": action,
                "jira_epic_id": epic_id,
                "message": f"Created epic {epic_id} in Jira"
            }
        elif action == "assign_support_team":
            ticket_id = f"SUP-{random.randint(100, 999)}"
            return {
                "status": "success",
                "action": action,
                "jira_ticket_id": ticket_id,
                "message": f"Assigned support ticket {ticket_id} in Jira"
            }
        return {"status": "skipped", "message": f"Unknown Jira action: {action}"}
