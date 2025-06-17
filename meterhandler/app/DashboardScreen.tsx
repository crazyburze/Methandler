import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = 'http://192.168.254.184:3000/customers'; // Update with your backend IP if needed

interface Customer {
  name: string;
  address: string;
  meter_number: string;
  customer_type: string;
}

interface CustomersByType {
  residential: Customer[];
  commercial: Customer[];
  government: Customer[];
}

export default function DashboardScreen() {
  const [customers, setCustomers] = useState<CustomersByType>({ residential: [], commercial: [], government: [] });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_URL)
      .then(res => setCustomers(res.data))
      .catch(() => setCustomers({ residential: [], commercial: [], government: [] }))
      .finally(() => setLoading(false));
  }, []);

  const filterCustomers = (list: Customer[]) =>
    list.filter((c: Customer) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()) ||
      c.meter_number.toLowerCase().includes(search.toLowerCase())
    );

  const summary = [
    { label: 'Residential', color: '#2196F3', count: customers.residential.length },
    { label: 'Commercial', color: '#4CAF50', count: customers.commercial.length },
    { label: 'Government', color: '#9C27B0', count: customers.government.length },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={32} color="#fff" style={{ marginRight: 10 }} />
        <View>
          <Text style={styles.headerTitle}>Hermosa Water District</Text>
          <Text style={styles.headerSubtitle}>Good morning, Meter Handler!</Text>
        </View>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search customers..."
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.summaryRow}>
        {summary.map((s, i) => (
          <View key={s.label} style={[styles.summaryCard, { backgroundColor: s.color }]}> 
            <Text style={styles.summaryCount}>{s.count}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={{ flex: 1 }}>
          {(['residential', 'commercial', 'government'] as (keyof CustomersByType)[]).map((type) => (
            <View key={type} style={{ marginBottom: 20 }}>
              <Text style={[styles.groupTitle, { color: groupColor(type) }]}>• {capitalize(type)}</Text>
              {filterCustomers(customers[type]).length === 0 ? (
                <Text style={styles.noCustomers}>No customers found.</Text>
              ) : (
                filterCustomers(customers[type]).map((c: Customer, idx: number) => (
                  <View key={c.meter_number + idx} style={styles.customerCard}>
                    <Text style={styles.customerName}>{c.name}</Text>
                    <Text style={styles.customerAddress}>{c.address}</Text>
                    <Text style={styles.customerMeter}>{c.meter_number}</Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function groupColor(type: string) {
  if (type === 'residential') return '#2196F3';
  if (type === 'commercial') return '#4CAF50';
  if (type === 'government') return '#9C27B0';
  return '#23235b';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    paddingTop: 40,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
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
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    elevation: 2,
  },
  summaryCount: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 10,
  },
  noCustomers: {
    marginLeft: 20,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  customerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#23235b',
  },
  customerAddress: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  customerMeter: {
    color: '#2196F3',
    fontSize: 14,
    marginTop: 2,
    fontWeight: 'bold',
  },
}); 