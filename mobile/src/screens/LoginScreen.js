import React, { useState } from "react";
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
import { api, setBaseUrl, getBaseUrl } from "../api/client";
import { saveToken, saveServerUrl } from "../utils/storage";

export default function LoginScreen({ route, navigation }) {
  const serverUrl = route?.params?.serverUrl || getBaseUrl();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      setBaseUrl(serverUrl);
      const result = await api.login(email.trim(), password);
      await saveToken(result.token);
      await saveServerUrl(serverUrl);
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (e) {
      setError(e.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>BuildProp</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@company.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.serverLink}
          onPress={() => navigation.navigate("ServerUrl")}
        >
          <Text style={styles.serverLinkText}>
            Server: {serverUrl || "Not configured"}
          </Text>
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
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
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
  button: {
    backgroundColor: "#1a73e8",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  serverLink: {
    marginTop: 20,
    alignItems: "center",
  },
  serverLinkText: {
    color: "#6b7280",
    fontSize: 12,
  },
});
