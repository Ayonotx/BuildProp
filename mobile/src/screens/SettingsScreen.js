import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getServerUrl, removeToken, saveServerUrl } from "../utils/storage";
import { setBaseUrl } from "../api/client";

export default function SettingsScreen({ navigation }) {
  const [serverUrl, setServerUrlState] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const url = await getServerUrl();
        setServerUrlState(url || "");
      })();
    }, [])
  );

  const handleSaveUrl = async () => {
    if (!serverUrl.trim()) {
      Alert.alert("Error", "Please enter a server URL");
      return;
    }
    await saveServerUrl(serverUrl.trim());
    setBaseUrl(serverUrl.trim());
    Alert.alert("Saved", "Server URL updated successfully");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await removeToken();
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        <TextInput
          style={styles.input}
          placeholder="http://192.168.1.100:3456"
          placeholderTextColor="#9ca3af"
          value={serverUrl}
          onChangeText={setServerUrlState}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUrl}>
          <Text style={styles.saveBtnText}>Save Server URL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App</Text>
          <Text style={styles.aboutValue}>BuildProp</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
      </View>
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
    paddingBottom: 40,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#1a73e8",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "600",
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  aboutLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  aboutValue: {
    fontSize: 14,
    color: "#1a1a2e",
    fontWeight: "500",
  },
});
