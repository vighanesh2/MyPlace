
  import React, { useState, useEffect } from 'react';
  import {
    View,
    StyleSheet,
    Text,
    FlatList,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
  } from 'react-native';
  import { firebase } from './config';
  import { useNavigation } from '@react-navigation/native';
  
  const Journal = () => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [entryText, setEntryText] = useState('');
    const [prompt, setPrompt] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [selectedColor, setSelectedColor] = useState('#ffffff'); // Default color
    const colorOptions = ['#ffffff', '#ff9999', '#99ff99', '#9999ff']; // Example colors
    const navigation = useNavigation();
  
    useEffect(() => {
      fetchEntries();
      fetchPrompt();
      fetchUserEmail();
    }, []);
  
    const fetchEntries = async () => {
      try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
          Alert.alert('Error', 'You need to be logged in to view journal entries.');
          return;
        }
  
        const currentUserEmail = currentUser.email;
        const currentUserDocRef = firebase.firestore().collection('users').doc(currentUserEmail);
  
        const currentUserDoc = await currentUserDocRef.get();
        const currentUserData = currentUserDoc.data();
        const followingList = currentUserData.following || [];
  
        if (followingList.length === 0) {
          setEntries([]); 
          return;
        }
  
        const entriesPromises = followingList.map(async (followingEmail) => {
          const fUserDocRef = firebase.firestore().collection('users').doc(followingEmail);
          const fUserDoc = await fUserDocRef.get();
          const fUserData = fUserDoc.data();
  
          const entriesSnapshot = await firebase.firestore()
            .collection('users')
            .doc(followingEmail)
            .collection('journalEntries')
            .get();
  
          return entriesSnapshot.docs.map(doc => {
            const data = doc.data();
            const username = followingEmail.replace('@gmail.com', '');
            const profilePicture = fUserData.profilePic || ''; 
  
            return {
              id: doc.id,
              ...data,
              username,
              profilePicture,
            };
          });
        });
  
        const entriesArray = await Promise.all(entriesPromises);
        const fetchedEntries = entriesArray.flat();
  
        setEntries(fetchedEntries);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
  
    const fetchPrompt = async () => {
      try {
        const promptSnapshot = await firebase.firestore().collection('settings').doc('journalPrompt').get();
        if (promptSnapshot.exists) {
          setPrompt(promptSnapshot.data().prompt);
        } else {
          setPrompt('No prompt available.');
        }
      } catch (error) {
        console.error('Error fetching prompt:', error);
        setPrompt('Error fetching prompt.');
      }
    };
  
    const fetchUserEmail = () => {
      const currentUser = firebase.auth().currentUser;
      if (currentUser && currentUser.email) {
        const emailWithoutDomain = currentUser.email;
        setUserEmail(emailWithoutDomain);
      } else {
        setUserEmail('Anonymous');
      }
    };
  
    const handleAddEntry = async () => {
      try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
          Alert.alert('Error', 'You need to be logged in to add a journal entry.');
          return;
        }
  
        const currentUserEmail = currentUser.email;
        await firebase.firestore()
          .collection('users')
          .doc(currentUserEmail)
          .collection('journalEntries')
          .add({
            text: entryText,
            email: currentUserEmail || 'Anonymous',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            color: selectedColor, 
          });
  
        setEntryText('');
        Alert.alert('Entry added');
        fetchEntries();
      } catch (error) {
        console.error('Error adding journal entry:', error);
        Alert.alert('Error adding journal entry', error.message);
      }
    };
  
    const handleRefresh = () => {
      setRefreshing(true);
      fetchEntries();
    };
  
    const determineTextColor = (backgroundColor) => {
      return backgroundColor === '#ffffff' ? '#333333' : '#ffffff';
    };
  
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      );
    }
  
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{userEmail}'s Journal</Text>
        </View>
        <View style={styles.promptContainer}>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>
        <View style={styles.colorPickerContainer}>
          {colorOptions.map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.colorOption,
                { backgroundColor: option },
                selectedColor === option && styles.selectedColorOption
              ]}
              onPress={() => setSelectedColor(option)}
            />
          ))}
        </View>
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.entryContainer, { backgroundColor: item.color || '#ffffff' }]}>
              {item.profilePicture ? (
                <Image source={{ uri: item.profilePicture }} style={styles.profilePicture} />
              ) : (
                <View style={styles.profilePicturePlaceholder} />
              )}
              <Text style={[styles.entryText, { color: determineTextColor(item.color || '#ffffff') }]}>
                {item.text}
              </Text>
              <Text style={[styles.timestamp, { color: determineTextColor(item.color || '#ffffff') }]}>
                {new Date(item.timestamp?.toDate()).toLocaleString()}
              </Text>
              <Text style={[styles.emailText, { color: determineTextColor(item.color || '#ffffff') }]}>
                Written by: {item.email}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text>No Entries Available</Text>}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
        <View style={styles.addEntryContainer}>
          <TextInput
            style={styles.entryInput}
            value={entryText}
            onChangeText={setEntryText}
            placeholder="What's on your mind?"
            multiline
          />
          <TouchableOpacity style={styles.addEntryButton} onPress={handleAddEntry}>
            <Text style={styles.addEntryText}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  promptContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  promptText: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
  },
  colorPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#000', // Change this color if needed
  },
  entryContainer: {
    margin: 10,
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 10,
  },
  profilePicturePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
    marginBottom: 10,
  },
  entryText: {
    fontSize: 16,
    color: '#333333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888888',
    marginTop: 5,
  },
  emailText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 5,
  },
  addEntryContainer: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  entryInput: {
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  addEntryButton: {
    backgroundColor: '#000000',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addEntryText: {
    color: '#ffffff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
});

export default Journal;
