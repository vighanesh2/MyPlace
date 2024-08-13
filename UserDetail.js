import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { firebase } from './config';
import { Ionicons } from '@expo/vector-icons'; // For using icons (optional)
import * as ImagePicker from 'expo-image-picker';

const UserDetail = ({ route, navigation }) => {
    const { email } = route.params; // Get the email parameter from route
    const [imageUri, setImageUri] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);


    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const userDoc = await firebase.firestore().collection('users').doc(email).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    setUserDetails(userData);
                    setFollowersCount(userData.followers ? userData.followers.length : 0);
                    setFollowingCount(userData.following ? userData.following.length : 0);
                    if (userData.profilePic) {
                        setImageUri(userData.profilePic);
                    }
                } else {
                    Alert.alert('Error', 'User not found');
                }

                const postsSnapshot = await firebase.firestore().collection('users').doc(email).collection('posts').get();
                const postsData = postsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setPosts(postsData);

                const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                const currentUserEmail = currentUser.email;
                const userDoc = await firebase.firestore().collection('users').doc(email).get();
                const userData = userDoc.data();

                setIsFollowing(userData.followers && userData.followers.includes(currentUserEmail));
            }
            } catch (err) {
                Alert.alert('Error', 'Failed to fetch user details');
                console.error('Error fetching user details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, [email]);
    const handleFollow = async () => {
        try {
            const currentUser = firebase.auth().currentUser; // Get the current user
            if (!currentUser) {
                Alert.alert('Error', 'You need to be logged in to follow users.');
                return;
            }
    
            const currentUserEmail = currentUser.email;
            const userDocRef = firebase.firestore().collection('users').doc(email);
            const currentUserDocRef = firebase.firestore().collection('users').doc(currentUserEmail);
    
            // Check current follow status
            const userDoc = await userDocRef.get();
            const currentUserDoc = await currentUserDocRef.get();
            const currentUserData = currentUserDoc.data();
            const userData = userDoc.data();
    
            if (isFollowing) {
                // Unfollow user
                await userDocRef.update({
                    followers: firebase.firestore.FieldValue.arrayRemove(currentUserEmail),
                });
                await currentUserDocRef.update({
                    following: firebase.firestore.FieldValue.arrayRemove(email),
                });
                setIsFollowing(false);
            } else {
                // Follow user
                await userDocRef.update({
                    followers: firebase.firestore.FieldValue.arrayUnion(currentUserEmail),
                });
                await currentUserDocRef.update({
                    following: firebase.firestore.FieldValue.arrayUnion(email),
                });
                setIsFollowing(true);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to follow/unfollow user');
            console.error('Error following/unfollowing user:', error);
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
                const userDocRef = firebase.firestore().collection('users').doc(email);
                await userDocRef.update({ profilePic: imageUrl });

                setImageUri(imageUrl); // Update the profile picture URI
                Alert.alert('Profile picture updated!');
            } catch (e) {
                console.error("Error uploading image: ", e);
                Alert.alert('Upload failed', e.message);
            } finally {
                setUploading(false);
            }
        } else {
            Alert.alert('No image selected', 'Please pick an image before uploading.');
        }
    };

    const renderPost = ({ item }) => (
        <Image
            source={item.imageUrl ? { uri: item.imageUrl } : require('./assets/placeholder.png')}
            style={styles.postImage}
        />
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="black" />
            <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.header}>
            <TouchableOpacity onPress={pickImage}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.profilePic} />
                ) : (
                    <Image source={require('./assets/placeholder.png')} style={styles.profilePic} />
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
        <Text style={styles.email}>{userDetails?.email || 'N/A'}</Text>
        <TouchableOpacity
            style={[styles.followButton, isFollowing ? styles.following : styles.notFollowing]}
            onPress={handleFollow}
        >
            <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
        </TouchableOpacity>
        <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            numColumns={3}
            style={styles.postsContainer}
        />
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
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 50,
    },
    backButtonText: {
        fontSize: 18,
        marginLeft: 10,
        color: '#007BFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    followButton: {
        padding: 10,
        borderRadius: 5,
        marginVertical: 10,
        alignItems: 'center',
    },
    following: {
        backgroundColor: '#007BFF',
    },
    notFollowing: {
        backgroundColor: '#DDDDDD',
    },
    followButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default UserDetail;
