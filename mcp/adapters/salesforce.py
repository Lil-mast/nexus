import random

class SalesforceAdapter:
    def execute(self, action: str, context: dict):
        if "permission" in str(context).lower():
            raise Exception("Permission denied: insufficient Salesforce privileges")

        if action == "create_salesforce_opportunity":
            opp_id = f"OPP-{random.randint(1000, 9999)}"
            return {
                "status": "success",
                "action": action,
                "salesforce_opportunity_id": opp_id,
                "message": f"Created opportunity {opp_id} in Salesforce"
            }
        elif action == "log_case_in_salesforce":
            case_id = f"CASE-{random.randint(1000, 9999)}"
            return {
                "status": "success",
                "action": action,
                "salesforce_case_id": case_id,
                "message": f"Logged case {case_id} in Salesforce"
            }
        elif action == "validate_account":
            return {
                "status": "success",
                "action": action,
                "account_valid": True,
                "message": "Account validated successfully"
            }
        return {"status": "skipped", "message": f"Unknown Salesforce action: {action}"}
