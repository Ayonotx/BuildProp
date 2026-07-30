import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import ProjectCard from "../components/ProjectCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchProjects = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await api.getProjects();
      setProjects(Array.isArray(result) ? result : result.projects || []);
    } catch (e) {
      setError(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  if (loading && !projects.length) {
    return <LoadingSpinner />;
  }

  if (error && !projects.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retry} onPress={() => fetchProjects()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={(project) =>
              navigation.navigate("ProjectDetail", { project })
            }
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.header}>Projects ({projects.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No projects found</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProjects(true)}
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
    marginBottom: 16,
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
