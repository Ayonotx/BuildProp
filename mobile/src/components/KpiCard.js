import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function KpiCard({ title, value, color = "#1a73e8", icon }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.row}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 4,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    minWidth: "45%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  title: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
});
