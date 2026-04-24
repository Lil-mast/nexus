"use client";

import styles from "./SystemSelector.module.css";

export type SaaSSystem = "salesforce" | "jira" | "slack" | "sap" | "snowflake";

const SYSTEMS: { id: SaaSSystem; name: string; description: string; icon: string; color: string }[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM & customer data",
    icon: "☁️",
    color: "#00A1E0",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Project & issue tracking",
    icon: "📋",
    color: "#0052CC",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication",
    icon: "💬",
    color: "#36C5F0",
  },
  {
    id: "sap",
    name: "SAP",
    description: "Enterprise resource planning",
    icon: "🏢",
    color: "#0A6EB7",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    description: "Data warehouse & analytics",
    icon: "❄️",
    color: "#29B5E8",
  },
];

interface SystemSelectorProps {
  selected: SaaSSystem[];
  onChange: (systems: SaaSSystem[]) => void;
  disabled?: boolean;
}

export default function SystemSelector({ selected, onChange, disabled = false }: SystemSelectorProps) {
  const toggleSystem = (systemId: SaaSSystem) => {
    if (selected.includes(systemId)) {
      onChange(selected.filter((s) => s !== systemId));
    } else {
      onChange([...selected, systemId]);
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>Target Systems (select one or more)</label>
      <div className={styles.grid}>
        {SYSTEMS.map((system) => (
          <button
            key={system.id}
            onClick={() => toggleSystem(system.id)}
            disabled={disabled}
            className={`${styles.systemCard} ${selected.includes(system.id) ? styles.selected : ""}`}
            style={
              selected.includes(system.id)
                ? {
                    borderColor: system.color,
                    backgroundColor: `${system.color}15`,
                  }
                : {}
            }
          >
            <div className={styles.icon}>{system.icon}</div>
            <div className={styles.name}>{system.name}</div>
            <div className={styles.description}>{system.description}</div>
            {selected.includes(system.id) && <div className={styles.checkmark}>✓</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
