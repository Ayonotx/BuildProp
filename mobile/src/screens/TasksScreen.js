import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import TaskItem from "../components/TaskItem";
import LoadingSpinner from "../components/LoadingSpinner";

const FILTERS = ["All", "High", "Medium", "Low"];

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchTasks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await api.getTasks();
      setTasks(Array.isArray(result) ? result : result.tasks || []);
    } catch (e) {
      setError(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  const filteredTasks =
    activeFilter === "All"
      ? tasks
      : tasks.filter(
          (t) => t.priority?.toLowerCase() === activeFilter.toLowerCase()
        );

  if (loading && !tasks.length) {
    return <LoadingSpinner />;
  }

  if (error && !tasks.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retry} onPress={() => fetchTasks()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TaskItem task={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.header}>Tasks ({filteredTasks.length})</Text>
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterBtn,
                    activeFilter === f && styles.filterBtnActive,
                  ]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === f && styles.filterTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tasks.length === 0
                ? "No tasks found"
                : "No tasks match this filter"}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTasks(true)}
            colors={["#1a73e8"]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  list: {
    padding: 18,
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 14,
  },
  filters: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterBtnActive: {
    backgroundColor: "#1a73e8",
    borderColor: "#1a73e8",
  },
  filterText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
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
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 15,
  },
});
