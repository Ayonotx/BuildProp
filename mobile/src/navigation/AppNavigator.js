import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { getToken, getServerUrl } from "../utils/storage";
import { setBaseUrl } from "../api/client";

import ServerUrlScreen from "../screens/ServerUrlScreen";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProjectsScreen from "../screens/ProjectsScreen";
import ProjectDetailScreen from "../screens/ProjectDetailScreen";
import TasksScreen from "../screens/TasksScreen";
import ContactsScreen from "../screens/ContactsScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  return (
    <View
      style={[
        styles.iconCircle,
        { backgroundColor: focused ? "#1a73e8" : "#d1d5db" },
      ]}
    >
      <Text style={[styles.iconLetter, { color: focused ? "#fff" : "#fff" }]}>
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1a73e8",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon label="D" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsScreen}
        options={{
          tabBarLabel: "Projects",
          tabBarIcon: ({ focused }) => <TabIcon label="P" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{
          tabBarLabel: "Tasks",
          tabBarIcon: ({ focused }) => <TabIcon label="T" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarLabel: "Contacts",
          tabBarIcon: ({ focused }) => <TabIcon label="C" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon label="S" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const serverUrl = await getServerUrl();

      if (serverUrl) {
        setBaseUrl(serverUrl);
      }

      if (token && serverUrl) {
        setInitialRoute("MainTabs");
      } else if (serverUrl) {
        setInitialRoute("Login");
      } else {
        setInitialRoute("ServerUrl");
      }
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="ServerUrl" component={ServerUrlScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="ProjectDetail"
          component={ProjectDetailScreen}
          options={{
            headerShown: true,
            headerTitle: "Project Details",
            headerBackTitle: "Back",
            headerTintColor: "#1a73e8",
            headerStyle: { backgroundColor: "#f0f2f5" },
            headerShadowVisible: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingBottom: 4,
    paddingTop: 4,
    height: 56,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconLetter: {
    fontSize: 12,
    fontWeight: "700",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
});
