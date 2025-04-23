import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity, Image, TextInput, StyleSheet, ScrollView, ActivityIndicator,} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useNavigation } from "@react-navigation/native";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            alt="App Logo"
            resizeMode="contain"
            style={styles.headerImg}
            source={require("../assets/logo.png")}
          />
          <Text style={styles.title}>
            Welcome to <Text style={styles.highlight}>PlatePrep</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.input}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={(email) => setForm({ ...form, email })}
              placeholder="john@example.com"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={form.email}
            />
          </View>

          <View style={styles.input}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              autoCorrect={false}
              secureTextEntry
              onChangeText={(password) => setForm({ ...form, password })}
              placeholder="********"
              placeholderTextColor="#6b7280"
              style={styles.inputControl}
              value={form.password}
            />
          </View>

          <View style={styles.formAction}>
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.btn, loading && styles.disabledBtn]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formAction}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Signup")}
              style={styles.signupBtn}
            >
              <Text style={styles.signupText}>
                Don't have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F1E3" },
  scrollContainer: { flexGrow: 1 },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 36,
  },
  headerImg: { width: 200, height: 200, marginBottom: 50 },
  title: {
    fontSize: 31,
    fontWeight: "700",
    color: "#1D2A32",
    marginBottom: 6,
  },
  highlight: { color: "#205a35" },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 24 },
  form: { paddingHorizontal: 24 },
  input: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  inputControl: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  formAction: { marginTop: 10, alignItems: "center" },
  btn: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 30,
    alignItems: "center",
    width: "100%",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabledBtn: { opacity: 0.5 },
  signupBtn: { marginTop: 12, alignItems: "center" },
  signupText: {fontSize: 16, fontWeight: "600", color: "#075eec", textAlign: "center", },
});

export default LoginScreen;
