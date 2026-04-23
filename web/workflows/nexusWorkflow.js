// Placeholder for Vercel WDK durable workflow.
// When deployed to Vercel with the Workflow Development Kit (WDK),
// uncomment and adapt the following directives.

// "use workflow";
// "use step";

// import { DurableAgent } from "@workflow/ai/agent";

// export async function nexusWorkflow(intent, context) {
//   // "use workflow";
//
//   const agent = new DurableAgent({
//     model: "gpt-4o",
//     apiKey: process.env.GATEWAY_API_KEY,
//   });
//
//   // Step 1: Parse intent
//   const parsed = await agent.step("parse_intent", async () => {
//     const res = await fetch(`${process.env.MCP_SERVER_URL}/intent`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ message: context.message }),
//     });
//     return res.json();
//   });
//
//   // Step 2: Orchestrate
//   const plan = await agent.step("orchestrate", async () => {
//     const res = await fetch(`${process.env.MCP_SERVER_URL}/orchestrate`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ intent: parsed.intent, context }),
//     });
//     return res.json();
//   });
//
//   // Step 3: Execute each step
//   for (const step of plan.steps) {
//     await agent.step(`execute_${step.name}`, async () => {
//       const res = await fetch(`${process.env.MCP_SERVER_URL}/execute`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ step: step.name, context }),
//       });
//       const data = await res.json();
//       if (data.status === "waiting_approval") {
//         // Workflow pauses here; resumes via /resume endpoint
//         await agent.sleep("wait_approval", "1d");
//       }
//       return data;
//     });
//   }
//
//   return { workflow_id: plan.workflow_id, status: "completed" };
// }
