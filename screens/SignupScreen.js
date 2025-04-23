import React, { useState } from "react";
import {SafeAreaView, View, TextInput, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

function SignupScreen({ navigation }) {
  const [form, setForm] = useState({ firstName: "",  lastName: "",  email: "",  password: "", });

  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(""); 

  const handleSignup = async () => {
    setError("");

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

    setLoading(true); 
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
      });

      navigation.replace("Home");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#e8ecf4" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>Sign Up</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.input}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                onChangeText={(firstName) =>
                  setForm({ ...form, firstName })
                }
                placeholder="John"
                style={styles.inputControl}
                value={form.firstName}
              />
            </View>

            <View style={styles.input}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                onChangeText={(lastName) => setForm({ ...form, lastName })}
                placeholder="Doe"
                style={styles.inputControl}
                value={form.lastName}
              />
            </View>

            <View style={styles.input}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(email) => setForm({ ...form, email })}
                placeholder="john@example.com"
                style={styles.inputControl}
                value={form.email}
              />
            </View>

            <View style={styles.input}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                onChangeText={(password) => setForm({ ...form, password })}
                placeholder="********"
                secureTextEntry
                style={styles.inputControl}
                value={form.password}
              />
            </View>

            <View style={styles.formAction}>
              <TouchableOpacity onPress={handleSignup} disabled={loading}>
                <View style={[styles.btn, loading && styles.disabledBtn]}>
                  <Text style={styles.btnText}>
                    {loading ? "Signing Up..." : "Sign Up"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.replace("Login")}>
              <Text style={styles.formLink}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default SignupScreen;

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F4F1E3', },
  title: { fontSize: 31, fontWeight: "700", color: "#1D2A32", marginBottom: 6,},
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#1D2A32",},
  inputControl: { padding: 12, borderRadius: 10, backgroundColor: "#fff", borderColor: "#e5e5e5", borderWidth: 1, marginBottom: 10,},
  formAction: { marginTop: 16 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#075eec", marginTop: 12,},
  disabledBtn: { backgroundColor: "#ccc",},
  btnText: { fontSize: 18, fontWeight: "600", color: "#fff",},
  formLink: { fontSize: 16, fontWeight: "600", color: "#075eec", textAlign: "center", marginTop: 12,},
  errorText: { fontSize: 14, color: "#ff0000", marginBottom: 10, textAlign: "center",},
});
