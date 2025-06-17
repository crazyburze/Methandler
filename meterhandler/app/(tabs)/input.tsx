import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

const API_URL = 'http://192.168.254.184:3000'; // Update with your backend IP

interface MeterReading {
  id: number;
  meter_number: string;
  reading_value: number;
  remarks: string;
  staff_id: number;
  reading_date: string;
  amount: number;
  customer_type: string;
  rate_per_cu_m: number;
  minimum_charge: number;
}

export default function InputScreen() {
  const params = useLocalSearchParams();
  const [meterNumber, setMeterNumber] = useState(params.meterNumber ? String(params.meterNumber) : '');
  const [reading, setReading] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastReading, setLastReading] = useState<MeterReading | null>(null);
  const [readings, setReadings] = useState<MeterReading[]>([]);

  // Fetch readings when meterNumber changes and is not empty
  useEffect(() => {
    if (meterNumber) {
      fetchReadings(meterNumber);
    } else {
      setReadings([]);
    }
  }, [meterNumber]);

  useEffect(() => {
    if (params.meterNumber) {
      setMeterNumber(String(params.meterNumber));
    }
  }, [params.meterNumber]);

  const fetchReadings = async (meterNum: string) => {
    try {
      console.log('Fetching readings for:', meterNum);
      const res = await axios.get(`${API_URL}/readings/${meterNum}`);
      console.log('Fetched readings:', res.data);
      setReadings(res.data);
    } catch (err) {
      console.log('Error fetching readings:', err);
      setReadings([]);
    }
  };

  const handleSubmit = async () => {
    if (!meterNumber || !reading) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const userDataString = await AsyncStorage.getItem('userData');
      const userData = userDataString ? JSON.parse(userDataString) : null;
      
      if (!userData?.id) {
        Alert.alert('Error', 'User session not found. Please login again.');
        return;
      }

      const readingValue = parseFloat(reading);
      if (isNaN(readingValue)) {
        Alert.alert('Error', 'Please enter a valid number for the reading');
        return;
      }
      const response = await axios.post(`${API_URL}/readings`, {
        meter_number: meterNumber,
        reading_value: readingValue,
        remarks,
        staff_id: userData.id
      });

      if (response.data.success) {
        setLastReading(response.data.reading);
        Alert.alert('Success', 'Meter reading saved successfully');
        // Clear form
        setMeterNumber('');
        setReading('');
        setRemarks('');
        // Fetch updated readings
        fetchReadings(meterNumber);
      }
    } catch (error: any) {
      console.error('Error saving reading:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to save meter reading'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="edit" size={32} color="#fff" style={{ marginRight: 10 }} />
        <View>
          <Text style={styles.headerTitle}>Input Reading</Text>
          <Text style={styles.headerSubtitle}>Enter meter reading details</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Meter Number *</Text>
        <TextInput
          style={styles.input}
          value={meterNumber}
          onChangeText={setMeterNumber}
          placeholder="Enter meter number"
          keyboardType="numeric"
          editable={!loading}
        />

        <Text style={styles.label}>Reading *</Text>
        <TextInput
          style={styles.input}
          value={reading}
          onChangeText={setReading}
          placeholder="Enter meter reading"
          keyboardType="numeric"
          editable={!loading}
        />

        <Text style={styles.label}>Remarks</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Enter any remarks or notes"
          multiline
          numberOfLines={4}
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Reading</Text>
          )}
        </TouchableOpacity>

        {lastReading && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Last Reading Summary</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Customer Type:</Text>
              <Text style={styles.resultValue}>{lastReading.customer_type}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Reading Value:</Text>
              <Text style={styles.resultValue}>{lastReading.reading_value} cu.m</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Rate:</Text>
              <Text style={styles.resultValue}>₱{lastReading.rate_per_cu_m}/cu.m</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Minimum Charge:</Text>
              <Text style={styles.resultValue}>₱{lastReading.minimum_charge}</Text>
            </View>
            <View style={[styles.resultRow, styles.totalRow]}>
              <Text style={[styles.resultLabel, styles.totalLabel]}>Total Amount:</Text>
              <Text style={[styles.resultValue, styles.totalValue]}>₱{lastReading.amount}</Text>
            </View>
          </View>
        )}
        {/* Dynamic Reading History */}
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Reading History</Text>
          {readings.length > 0 ? (
            readings.map((r, idx) => (
              <View key={r.id} style={{ marginBottom: 10 }}>
                <Text>Date: {new Date(r.reading_date).toLocaleString()}</Text>
                <Text>Reading: {r.reading_value} cu.m</Text>
                <Text>Amount: ₱{r.amount}</Text>
                <Text>Remarks: {r.remarks}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
              No reading history found.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#23235b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#23235b',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 16,
    color: '#687076',
  },
  resultValue: {
    fontSize: 16,
    color: '#23235b',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#23235b',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  }
}); 