import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TOKEN: "@buildprop_token",
  SERVER_URL: "@buildprop_server_url",
};

export const saveToken = async (token) => {
  try {
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  } catch (e) {
    console.error("Failed to save token", e);
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  } catch (e) {
    console.error("Failed to get token", e);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.TOKEN);
  } catch (e) {
    console.error("Failed to remove token", e);
  }
};

export const saveServerUrl = async (url) => {
  try {
    const normalized = url.replace(/\/+$/, "");
    await AsyncStorage.setItem(KEYS.SERVER_URL, normalized);
  } catch (e) {
    console.error("Failed to save server URL", e);
  }
};

export const getServerUrl = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.SERVER_URL);
  } catch (e) {
    console.error("Failed to get server URL", e);
    return null;
  }
};
