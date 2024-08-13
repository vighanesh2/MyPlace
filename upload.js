import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity, SafeAreaView, Alert, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { firebase } from './config';
import { Rating } from 'react-native-ratings';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const UploadScreen = ({ navigation }) => {
    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false); // State for upload progress
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState(null);
    const [rating, setRating] = useState(0);
    const [tags, setTags] = useState('');
    const [email, setEmail] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        const fetchUserData = async () => {
            const user = firebase.auth().currentUser;
            if (user) {
                setEmail(String(user.email));
            }
        };

        fetchUserData();
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage({ uri: result.assets[0].uri });
        }
    };

    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
    };

    const handleMapPress = (event) => {
        const { coordinate } = event.nativeEvent;

        Alert.alert(
            'Confirm Location',
            `Do you want to select this location?\nLatitude: ${coordinate.latitude.toFixed(4)}, Longitude: ${coordinate.longitude.toFixed(4)}`,
            [
                {
                    text: 'Cancel',
                    onPress: () => console.log('Location selection canceled'),
                    style: 'cancel',
                },
                {
                    text: 'Confirm',
                    onPress: () => {
                        setSelectedLocation(coordinate);
                        // Keep the map modal open after confirming the location
                    },
                },
            ]
        );
    };

    const uploadImage = async () => {
        if (image) {
            setUploading(true);

            try {
                const response = await fetch(image.uri);
                const blob = await response.blob();
                const filename = `${Date.now()}`; // Unique filename using timestamp
                const storageRef = firebase.storage().ref().child(`images/${filename}`);

                await storageRef.put(blob);
                const imageUrl = await storageRef.getDownloadURL();

                const userDocRef = firebase.firestore().collection('users').doc(String(email));
                const userDoc = await userDocRef.get();
                
                if (!userDoc.exists) {
                    // Create the document with default fields if it does not exist
                    await userDocRef.set({
                        email: email,
                        followers: [], // Initialize followers as an empty array
                        following: [], // Initialize following as an empty array
                    });
                }

                const postsCollectionRef = userDocRef.collection('posts');

                await postsCollectionRef.add({
                    imageUrl,
                    caption,
                    location: selectedLocation ? {
                        coords: {
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                        },
                    } : null,
                    rating,
                    tags: tags.split(',').map(tag => tag.trim()),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    email,
                });

                const notificationMessage = `${email} just uploaded an image`;

                // Fetch all users who follow the current user and update their notifications
                const followers = userDoc.data().followers || [];
                const batch = firebase.firestore().batch();

                followers.forEach(followerEmail => {
                    const notiCollectionRef = firebase.firestore()
                        .collection('notifications')
                        .doc(followerEmail)
                        .collection('noti');
                    
                    const newNotiDocRef = notiCollectionRef.doc();
                    
                    batch.set(newNotiDocRef, {
                        message: notificationMessage,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                });

                await batch.commit(); // Commit the batched write

                Alert.alert('Photo uploaded!');
            } catch (e) {
                console.log(e);
                Alert.alert('Upload failed', e.message);
            } finally {
                setUploading(false);
                setImage(null);
                setCaption('');
                setLocation(null);
                setRating(0);
                setTags('');
                setSelectedLocation(null);
            }
        } else {
            Alert.alert('No image selected', 'Please pick an image before uploading.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Upload</Text>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                    {image ? (
                        <Image source={{ uri: image.uri }} style={styles.image} />
                    ) : (
                        <Image source={require('./assets/image-.png')} style={styles.image} />
                    )}
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Caption"
                    placeholderTextColor="#BDC3C7"
                    value={caption}
                    onChangeText={setCaption}
                />
                <TouchableOpacity style={styles.button} onPress={() => setShowMapModal(true)}>
                    <Text style={styles.btnText}>Choose Location</Text>
                </TouchableOpacity>
                {selectedLocation && (
                    <Text style={styles.locationText}>
                        Location: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </Text>
                )}
                <Rating
                    showRating
                    onFinishRating={setRating}
                    style={styles.rating}
                    ratingColor="#3498db" // Blue for filled stars
                    ratingBackgroundColor="#BDC3C7" // Light gray for background stars
                />
                <TextInput
                    style={styles.input}
                    placeholder="Tags (comma separated)"
                    placeholderTextColor="#BDC3C7"
                    value={tags}
                    onChangeText={setTags}
                />
                <TouchableOpacity style={styles.uploadButton} onPress={uploadImage} disabled={uploading}>
                    {uploading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.btnText}>Upload Post</Text>
                    )}
                </TouchableOpacity>

                {/* Map Modal */}
                <Modal
                    visible={showMapModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowMapModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <MapView
                            style={styles.map}
                            initialRegion={{
                                latitude: 40.7831, // Latitude for Manhattan, New York
                                longitude: -73.9712, // Longitude for Manhattan, New York
                                latitudeDelta: 0.0922,
                                longitudeDelta: 0.0421,
                            }}
                            onPress={handleMapPress}
                        >
                            {selectedLocation && (
                                <Marker coordinate={selectedLocation} />
                            )}
                        </MapView>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowMapModal(false)}>
                            <Text style={styles.btnText}>Close Map</Text>
                        </TouchableOpacity>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        marginLeft: 15,
    },
    scrollViewContent: {
        alignItems: 'center',
        padding: 20,
    },
    imageContainer: {
        width: 320,
        height: 320,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    input: {
        width: '100%',
        maxWidth: 320,
        height: 50,
        borderColor: '#BDC3C7',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        paddingHorizontal: 15,
        backgroundColor: '#FFFFFF',
        shadowColor: '#BDC3C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    button: {
        borderRadius: 10,
        width: 200,
        height: 50,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    uploadButton: {
        borderRadius: 10,
        width: 200,
        height: 50,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    btnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationText: {
        fontSize: 16,
        color: '#3498db',
        marginVertical: 10,
    },
    rating: {
        paddingVertical: 10,
    },
});

export default UploadScreen;
