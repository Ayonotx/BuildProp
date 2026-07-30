import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import KpiCard from "../components/KpiCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function DashboardScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (e) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  if (loading && !data) {
    return <LoadingSpinner />;
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retry} onPress={() => fetchData()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  const d = data || {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          colors={["#1a73e8"]}
        />
      }
    >
      <Text style={styles.greeting}>Dashboard</Text>

      <View style={styles.kpiRow}>
        <KpiCard
          title="Total Projects"
          value={d.total_projects ?? d.projects ?? 0}
          color="#1a73e8"
          icon=""
        />
        <KpiCard
          title="Revenue"
          value={
            d.total_revenue || d.revenue
              ? `$${Number(d.total_revenue || d.revenue).toLocaleString()}`
              : "$0"
          }
          color="#10b981"
          icon=""
        />
      </View>

      <View style={styles.kpiRow}>
        <KpiCard
          title="Tasks"
          value={d.total_tasks ?? d.tasks ?? 0}
          color="#f59e0b"
          icon=""
        />
        <KpiCard
          title="Notifications"
          value={d.notifications ?? d.total_notifications ?? 0}
          color="#ef4444"
          icon=""
        />
      </View>

      {d.recent_activities && d.recent_activities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {d.recent_activities.slice(0, 5).map((act, i) => (
            <View key={i} style={styles.activityItem}>
              <Text style={styles.activityText}>{act}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  content: {
    padding: 18,
    paddingTop: 50,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#f0f2f5",
  },
  errorIcon: {
    fontSize: 40,
    color: "#ef4444",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  retry: {
    fontSize: 14,
    color: "#1a73e8",
    fontWeight: "600",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 10,
  },
  activityItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  activityText: {
    fontSize: 13,
    color: "#4b5563",
  },
});
