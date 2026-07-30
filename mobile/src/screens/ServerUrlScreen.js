import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getServerUrl, saveServerUrl } from "../utils/storage";

export default function ServerUrlScreen({ navigation }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await getServerUrl();
      if (saved) {
        setUrl(saved);
      }
      setLoading(false);
    })();
  }, []);

  const handleContinue = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    await saveServerUrl(trimmed);
    navigation.replace("Login", { serverUrl: trimmed });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>BuildProp</Text>
        <Text style={styles.subtitle}>
          Enter your server address to connect
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.100:3456"
            placeholderTextColor="#9ca3af"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            The IP address or hostname of your BuildProp server
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !url.trim() && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!url.trim()}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logo: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1a73e8",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
  },
  button: {
    backgroundColor: "#1a73e8",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
