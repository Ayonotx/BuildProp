import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ContactsScreen() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchContacts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await api.getContacts();
      setContacts(Array.isArray(result) ? result : result.contacts || []);
    } catch (e) {
      setError(e.message || "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [])
  );

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  if (loading && !contacts.length) {
    return <LoadingSpinner />;
  }

  if (error && !contacts.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retry} onPress={() => fetchContacts()}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Contacts</Text>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.name || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {item.email && <Text style={styles.email}>{item.email}</Text>}
              {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
              {item.company && (
                <Text style={styles.company}>{item.company}</Text>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {contacts.length === 0
                ? "No contacts found"
                : "No contacts match your search"}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchContacts(true)}
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
  headerContainer: {
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 4,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchInput: {
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a2e",
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: "#6b7280",
  },
  phone: {
    fontSize: 13,
    color: "#6b7280",
  },
  company: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
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
