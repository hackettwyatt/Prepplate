import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, Text, View, Image, TouchableOpacity, FlatList, Modal, TextInput, Button,} from "react-native";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, setDoc, collection, getDocs, query, where, updateDoc,} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";

import avatar1 from "../png/001-dog.png";
import avatar2 from "../png/002-giraffe.png";
import avatar3 from "../png/003-owl.png";
import avatar4 from "../png/004-bear.png";
import avatar5 from "../png/005-puffer-fish.png";
import avatar6 from "../png/006-weasel.png";
import avatar7 from "../png/007-polar-bear.png";
import avatar8 from "../png/008-cow.png";

const Profile = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [avatar, setAvatar]       = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [favoriteMeals, setFavoriteMeals] = useState([]);
  const [upcomingMeals, setUpcomingMeals] = useState([]);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userRef  = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFirstName(data.firstName || "");
          setLastName( data.lastName  || "");
          setAvatar(   data.avatar    || "");
        } else {
          await setDoc(userRef, {
            firstName: "",
            lastName:  "",
            email:     user.email || "",
            avatar:    "",
          });
        }

        // Favorite meals
        const mealsRef  = collection(db, "userMeals", user.uid, "meals");
        const mealsSnap = await getDocs(mealsRef);
        const meals     = mealsSnap.docs.map(d => d.data().strMeal);
        if (meals.length) {
          const shuffled = [...meals].sort(() => 0.5 - Math.random());
          setFavoriteMeals(shuffled.slice(0, 3));
        }
      } catch (e) {
        console.error("Error fetching user data:", e);
      }
    };

    const fetchUpcomingMeals = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const mealsRef = collection(db, "userMeals", user.uid, "scheduledMeals");
        const today    = new Date().toISOString().split("T")[0];
        const q        = query(mealsRef, where("date", ">=", today));
        const snap     = await getDocs(q);
        const upcoming = snap.docs.map(d => {
          const data    = d.data();
          const dateObj = new Date(data.date);
          const opts    = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
          const dayOfWeek = dateObj.toLocaleDateString("en-US", opts).split(",")[0];
          return { id: d.id, meal: data.mealName, dayOfWeek };
        });
        setUpcomingMeals(upcoming);
      } catch (e) {
        console.error("Error fetching upcoming meals:", e);
      }
    };

    fetchUserData();
    fetchUpcomingMeals();
  }, []);

  const handleSaveChanges = async () => {
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { firstName, lastName, avatar });
      setModalVisible(false);
    } catch (e) {
      alert("Error updating profile: " + e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      alert("Error logging out: " + e.message);
    }
  };

  const avatarList = [
    { id: "1", uri: avatar1 },
    { id: "2", uri: avatar2 },
    { id: "3", uri: avatar3 },
    { id: "4", uri: avatar4 },
    { id: "5", uri: avatar5 },
    { id: "6", uri: avatar6 },
    { id: "7", uri: avatar7 },
    { id: "8", uri: avatar8 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image
          style={styles.avatar}
          source={avatar ? avatar : avatar1}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{firstName} {lastName}</Text>

        <TouchableOpacity style={styles.editButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Favorite Meals</Text>
        <View style={styles.mealBox}>
          {favoriteMeals.length ? (
            <FlatList
              data={favoriteMeals}
              keyExtractor={(item,i) => i.toString()}
              renderItem={({item}) => <Text style={styles.listItem}>{item}</Text>}
            />
          ) : (
            <Text style={styles.listItem}>No favorite meals</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Upcoming Meals</Text>
        <View style={styles.mealBox}>
          {upcomingMeals.length ? (
            <FlatList
              data={upcomingMeals}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <Text style={styles.listItem}>
                  {item.dayOfWeek}: {item.meal}
                </Text>
              )}
            />
          ) : (
            <Text style={styles.listItem}>No upcoming meals</Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.homeButton}>
          <Button title="Go Home" onPress={() => navigation.navigate("Home")} />
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />

            <Text style={styles.modalTitle}>Select Avatar</Text>
            <FlatList
              data={avatarList}
              keyExtractor={item => item.id}
              numColumns={4}
              renderItem={({item}) => (
                <TouchableOpacity onPress={() => setAvatar(item.uri)} style={styles.avatarItem}>
                  <Image source={item.uri} style={styles.avatarThumbnail} />
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1E3",},
  avatarContainer: { alignItems: "center", marginTop: 20, marginBottom: 10,},
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: "#fff", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,},
  body: { flex: 1, paddingHorizontal: 20, marginTop: 30, },
  name: { fontSize: 24, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 10,},
  editButton: { alignSelf: "center", marginBottom: 20,          paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#205a35",},
  editButtonText: { color: "#fff", fontWeight: "600",},
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginTop: 20, marginBottom: 10,},
  mealBox: { width: "100%", padding: 10, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#ddd", marginBottom: 20,         },
  listItem: { fontSize: 16, color: "#444", paddingVertical: 2,},
  logoutButton: { marginTop: 120,             alignSelf: "center", paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, backgroundColor: "#FF3B30",},
  logoutText: { color: "#fff", fontWeight: "600",},
  homeButton: { marginTop: 15, alignSelf: "center", width: "50%",},
  modalContainer: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)",},
  modalContent: { marginHorizontal: 20, backgroundColor: "#fff", borderRadius: 10, padding: 20,},
  modalTitle: { fontSize: 18, fontWeight: "bold", marginVertical: 10,},
  input: { width: "100%", height: 40, borderColor: "#ddd", borderWidth: 1, borderRadius: 8, marginBottom: 10, paddingHorizontal: 10, fontSize: 16,},
  avatarItem: {margin: 5,},
  avatarThumbnail: { width: 50, height: 50, borderRadius: 25,},
  saveButton: { marginTop: 15, alignSelf: "center", backgroundColor: "#33cc33", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,},
  saveButtonText: { color: "#fff", fontWeight: "bold",},
});

export default Profile;
