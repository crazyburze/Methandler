import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const API_URL = 'http://192.168.254.184:3000';

type Profile = {
  id: string;
  name: string;
  email: string;
  contact_number: string;
  address: string;
  username: string;
  role: string;
  profile_image_url?: string | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Omit<Profile, 'id' | 'username' | 'role' | 'profile_image_url'>>({
    name: '',
    email: '',
    contact_number: '',
    address: '',
  });
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        if (!userData?.id) {
          Alert.alert('Error', 'User session not found. Please login again.');
          setLoading(false);
          return;
        }
        const response = await axios.get(`${API_URL}/profile/${userData.id}`);
        setProfile(response.data);
        setForm({
          name: response.data.name || '',
          email: response.data.email || '',
          contact_number: response.data.contact_number || '',
          address: response.data.address || '',
        });
        setImage(null); // reset image state on fetch
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    if (!isEditing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('contact_number', form.contact_number);
      formData.append('address', form.address);
      if (image) {
        formData.append('profile_image', {
          uri: image,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);
      }
      const response = await fetch(`${API_URL}/profile/${profile.id}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await response.json();
      setProfile(data);
      setForm({
        name: data.name || '',
        email: data.email || '',
        contact_number: data.contact_number || '',
        address: data.address || '',
      });
      setImage(null);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userData');
            setTimeout(() => {
              router.replace('/LoginScreen');
            }, 200);
          }
        }
      ]
    );
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }
  if (!profile) {
    return <View style={styles.loading}><Text>No profile data found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} disabled={!isEditing} style={styles.avatarContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} />
          ) : profile.profile_image_url ? (
            <Image source={{ uri: profile.profile_image_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color="#2196F3" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{profile.role}</Text>
      </View>
      <View style={styles.profileSection}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={isEditing ? form.email : profile.email}
          onChangeText={text => setForm({ ...form, email: text })}
          editable={isEditing}
        />
        <Text style={styles.label}>Contact Number</Text>
        <TextInput
          style={styles.input}
          value={isEditing ? form.contact_number : profile.contact_number}
          onChangeText={text => setForm({ ...form, contact_number: text })}
          editable={isEditing}
        />
        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={isEditing ? form.address : profile.address}
          onChangeText={text => setForm({ ...form, address: text })}
          editable={isEditing}
          multiline
        />
        {isEditing ? (
          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setIsEditing(true)}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#dc3545', marginTop: 10 }]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 20, backgroundColor: '#2196F3', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { alignItems: 'center', marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f9ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, overflow: 'hidden' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  role: { fontSize: 16, color: '#e0e0e0', marginBottom: 10 },
  profileSection: { margin: 20, backgroundColor: '#f7f8fa', borderRadius: 12, padding: 20 },
  label: { fontWeight: 'bold', color: '#23235b', marginTop: 10 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 5, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 