import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const STATUS_COLORS = {
  active: "#10b981",
  completed: "#6b7280",
  on_hold: "#f59e0b",
  cancelled: "#ef4444",
  planning: "#3b82f6",
};

const STATUS_LABELS = {
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  planning: "Planning",
};

export default function ProjectCard({ project, onPress }) {
  const statusColor = STATUS_COLORS[project.status] || "#6b7280";
  const statusLabel = STATUS_LABELS[project.status] || project.status;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(project)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
      {project.location && (
        <Text style={styles.location}>{project.location}</Text>
      )}
      <View style={styles.footer}>
        {project.budget && (
          <Text style={styles.budget}>
            Budget: ${Number(project.budget).toLocaleString()}
          </Text>
        )}
        {project.progress !== undefined && (
          <Text style={styles.progress}>{project.progress}%</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  location: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budget: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  progress: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a73e8",
  },
});
