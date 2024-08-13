import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { firebase } from './config';
import * as ImagePicker from 'expo-image-picker';

const Me = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const [email, setEmail] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [uploading, setUploading] = useState(false); // State for upload progress

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = firebase.auth().currentUser;
        if (user) {
          setEmail(user.email);
          const userDoc = await firebase.firestore().collection('users').doc(user.email).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            setFollowersCount(userData.followers ? userData.followers.length : 0);
            setFollowingCount(userData.following ? userData.following.length : 0);
            if (userData.profilePic) {
              setImageUri(userData.profilePic);
            }
          }

          const postsSnapshot = await firebase.firestore().collection('users').doc(user.email).collection('posts').get();
          const postsData = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPosts(postsData);
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await firebase.auth().signOut();
      navigation.navigate('Welcome');
    } catch (error) {
      console.error(error);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri); // Update the URI of the selected image
      await uploadImage(result.assets[0].uri); // Upload the image
    }
  };

  const uploadImage = async (uri) => {
    if (uri) {
      setUploading(true);

      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `${Date.now()}`; // Use timestamp for unique filename
        const storageRef = firebase.storage().ref().child(`profile/${filename}`);

        await storageRef.put(blob);
        const imageUrl = await storageRef.getDownloadURL();

        // Update user profile picture URL in Firestore
        const userDocRef = firebase.firestore().collection('users').doc(String(email));
        await userDocRef.set({ profilePic: imageUrl }, { merge: true });

        setImageUri(imageUrl); // Update the profile picture URI
        Alert.alert('Profile picture updated!');
      } catch (e) {
        console.error("Error uploading image: ", e);
        Alert.alert('Upload failed', e.message);
      } finally {
        setUploading(false); // Set uploading to false after completion
      }
    } else {
      Alert.alert('No image selected', 'Please pick an image before uploading.');
    }
  };

  const renderPost = ({ item }) => (
    <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage}>
          {uploading ? (
            <ActivityIndicator size="large" color="#3498db" /> // Show loading indicator while uploading
          ) : (
            <Image
              source={imageUri ? { uri: imageUri } : require('./assets/placeholder.png')}
              style={styles.profilePic}
            />
          )}
        </TouchableOpacity>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>
      <Text style={styles.email}>{email}</Text>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={3}
        style={styles.postsContainer}
      />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
  },
  email: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  postsContainer: {
    width: '100%',
  },
  postImage: {
    width: '33%',
    height: 120,
    margin: 1,
  },
  logoutButton: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    width: '100%',
  },
  logoutButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default Me;
