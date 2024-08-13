import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { firebase } from './config'; // Import the initialized firebase

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      const userEmailWithoutDomain = email.split('@')[0];
      Alert.alert('Success', `Logged in as ${userEmailWithoutDomain}!`);
      navigation.navigate('Home'); // Navigate to the home screen or wherever you want
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Login failed. Please check your credentials.');
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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.link}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.signUpLink}>Don't have an account? Sign up</Text>
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
    borderColor: '#2C2C2C',
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
    marginTop: 10,
    textAlign: 'center',
    color: '#2C2C2C',
  },
  signUpLink: {
    marginTop: 20,
    textAlign: 'center',
    color: '#2C2C2C',
    fontWeight: 'bold',
  },
});

export default Login;
