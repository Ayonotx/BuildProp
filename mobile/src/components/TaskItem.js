import React from "react";
import { StyleSheet, Text, View } from "react-native";

const PRIORITY_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

const PRIORITY_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function TaskItem({ task }) {
  const priorityColor = PRIORITY_COLORS[task.priority] || "#6b7280";
  const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <View style={styles.content}>
          <Text style={styles.title}>{task.title}</Text>
          {task.project && (
            <Text style={styles.project}>{task.project}</Text>
          )}
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "18" }]}>
          <Text style={[styles.priorityText, { color: priorityColor }]}>
            {priorityLabel}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        {task.due_date && (
          <Text style={styles.dueDate}>
            Due: {new Date(task.due_date).toLocaleDateString()}
          </Text>
        )}
        {task.assignee && (
          <Text style={styles.assignee}>{task.assignee}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 2,
  },
  project: {
    fontSize: 12,
    color: "#9ca3af",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 18,
  },
  dueDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  assignee: {
    fontSize: 12,
    color: "#6b7280",
  },
});
