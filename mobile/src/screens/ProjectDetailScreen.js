import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

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

export default function ProjectDetailScreen({ route }) {
  const { project } = route.params;
  const statusColor = STATUS_COLORS[project.status] || "#6b7280";
  const statusLabel = STATUS_LABELS[project.status] || project.status;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{project.name}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {project.description && (
        <Text style={styles.description}>{project.description}</Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Location" value={project.location} />
        <DetailRow label="Budget" value={project.budget ? `$${Number(project.budget).toLocaleString()}` : undefined} />
        <DetailRow label="Progress" value={project.progress !== undefined ? `${project.progress}%` : undefined} />
        <DetailRow label="Start Date" value={project.start_date ? new Date(project.start_date).toLocaleDateString() : undefined} />
        <DetailRow label="End Date" value={project.end_date ? new Date(project.end_date).toLocaleDateString() : undefined} />
      </View>

      {project.client && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <DetailRow label="Name" value={project.client.name || project.client} />
          {project.client.email && <DetailRow label="Email" value={project.client.email} />}
          {project.client.phone && <DetailRow label="Phone" value={project.client.phone} />}
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    flex: 1,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 13,
    color: "#1a1a2e",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
});
