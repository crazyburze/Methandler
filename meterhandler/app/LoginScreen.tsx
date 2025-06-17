import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://192.168.254.184:3000/login', {
        username,
        password
      });

      if (response.data.success) {
        // Handle successful login
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      if (error.response) {
        Alert.alert('Error', error.response.data.error || 'Login failed');
      } else {
        Alert.alert('Error', 'Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Welcome Meter Handler</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your username"
        value={username}
        onChangeText={setUsername}
        editable={!loading}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.inputPassword}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <MaterialIcons
            name={showPassword ? 'visibility' : 'visibility-off'}
            size={24}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Log in'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff',
    padding: 20
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 30, 
    color: '#23235b' 
  },
  label: { 
    alignSelf: 'flex-start', 
    marginLeft: 40, 
    fontWeight: 'bold', 
    color: '#23235b',
    marginBottom: 5
  },
  input: {
    width: '80%', 
    height: 45, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 8,
    paddingHorizontal: 10, 
    marginBottom: 15, 
    backgroundColor: '#fff'
  },
  passwordContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '80%', 
    borderColor: '#ccc',
    borderWidth: 1, 
    borderRadius: 8, 
    marginBottom: 25, 
    backgroundColor: '#fff'
  },
  inputPassword: { 
    flex: 1, 
    height: 45, 
    paddingHorizontal: 10 
  },
  button: {
    width: '80%', 
    height: 45, 
    backgroundColor: '#2196F3', 
    borderRadius: 8,
    justifyContent: 'center', 
    alignItems: 'center'
  },
  buttonDisabled: {
    backgroundColor: '#ccc'
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  }
}); 