import React, { useState,useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { firebase } from './config';

const Register = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [Useremail, setUserEmail] = useState('');



  const handleRegister = async () => {
    if (!email || !password) {
        Alert.alert('Error', 'Please enter both email and password.');
        return;
    }

    try {
        // Create user in Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Store the user's email in the 'users' collection
        const userDocRef = firebase.firestore().collection('users').doc(user.email);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            // Create the document with default fields if it does not exist
            await userDocRef.set({
                email: user.email,
                followers: [], // Initialize followers as an empty array
                following: [user.email], // Initialize following as an empty array
            });
        }

        // Add the user's email to the 'Allusers' document
        const allUsersRef = firebase.firestore().collection('users').doc('Allusers');
        await allUsersRef.update({
            emails: firebase.firestore.FieldValue.arrayUnion(user.email)
        });

        Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Registration failed. Please try again.');
    }
};


  return (
    <View style={styles.container}>
      <Image source={require('./assets/LOGO.png')} style={styles.logo} />
      <TextInput
        style={styles.input}
        placeholder="Phone number, username, Email"
        keyboardType="email-address"
        onChangeText={(text) => setEmail(text)}
        value={email}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={(text) => setPassword(text)}
        value={password}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  logo: {
    width: 300,
    height: 100,
    alignSelf: 'center',
    marginBottom: 40,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2C2C2C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#2C2C2C',
    marginTop: 20,
    fontWeight: 'bold',
  },
});

export default Register;
