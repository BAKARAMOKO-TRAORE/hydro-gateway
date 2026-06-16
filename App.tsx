import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

async function requestNotifPermissions() {
  if (Platform.OS === 'android') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission notifications',
        'Activez les notifications pour être alerté en cas d\'échec webhook.',
      );
    }
  }
}

export default function App() {
  useEffect(() => {
    requestNotifPermissions();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#0A2342" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: '#0A2342' },
          headerTintColor: '#C9A857',
          headerTitleStyle: { fontWeight: '800' },
          tabBarActiveTintColor: '#0A2342',
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0' },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: IoniconName = 'home';
            if (route.name === 'Accueil') {
              iconName = focused ? 'radio' : 'radio-outline';
            } else if (route.name === 'Paramètres') {
              iconName = focused ? 'settings' : 'settings-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Accueil"
          component={HomeScreen}
          options={{ title: 'HydroGateway' }}
        />
        <Tab.Screen
          name="Paramètres"
          component={SettingsScreen}
          options={{ title: 'Paramètres' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
