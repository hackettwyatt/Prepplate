import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState("User");
  const [greeting, setGreeting] = useState("Hello");

  const greetings = [ "Hello","Hola", "Bonjour", "Ciao", "Hallo", "Olá","Hej","Salam","Namaste","Konnichiwa","Annyeong","Ni hao","Privet","Halo",  "Sawasdee",   "Selamat",    "Zdravo",     "Yassas",    "Merhaba","Shalom", "Habari","Hoi","Aloha","Sannu","Mabuhay",];

  useEffect(() => {
    const fetchUserName = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const { firstName, lastName } = userDoc.data();
            setUserName(`${firstName}`);
          }
        } catch (error) {
          console.log("Error fetching user name:", error);
        }
      }
    };

    fetchUserName();

    // Random greeting
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setGreeting(randomGreeting);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{greeting}, {userName}!</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Ingredients')}>
          <Ionicons name="fast-food-outline" size={24} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Ingredients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Meals')}>
          <Ionicons name="pizza-outline" size={24} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Meals</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Calendar')}>
          <Ionicons name="calendar-outline" size={24} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: "#F4F1E3", },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, color: '#1D2A32', textAlign: 'center',},
  buttonsContainer: { width: '100%',  alignItems: 'center', },
  button: {
    backgroundColor: '#205a35',
    marginTop: 20,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    width: 300,
    borderRadius: 25,  
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5, 
  },
  buttonText: { color: "white", fontSize: 20, fontWeight: "bold", textAlign: "center", marginTop: 8, },
  icon: { position: 'absolute',  left: 20, },
});

export default HomeScreen;
