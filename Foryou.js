import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Text, Image } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { firebase } from './config';
import Accounts from './Accounts';

const Foryou = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState([]);
    const mapRef = useRef(null);

    // Function to fetch the current user's following list
    const fetchFollowing = async () => {
        try {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                const userDoc = await firebase.firestore().collection('users').doc(currentUser.email).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    setFollowing(userData.following || []);
                }
            }
        } catch (error) {
            console.error('Failed to fetch following list:', error);
        }
    };

    // Function to fetch locations based on the following list
    const fetchLocations = async () => {

        setLoading(true);
        try {
            await fetchFollowing(); // Ensure following list is updated
            const snapshot = await firebase.firestore().collectionGroup('posts').get();
            const locationPromises = snapshot.docs.map(async doc => {
                const data = doc.data();
                const email = data.email;
                const location = data.location;
                
                // Check if the user is followed
                if (!following.includes(email)) {
                    return null;
                }

                // Fetch the profile picture URL
                let profilePictureUrl = '';
                try {
                    const userDocRef = firebase.firestore().collection('users').doc(email);
                    const userDoc = await userDocRef.get();
                    if (userDoc.exists) {
                        profilePictureUrl = userDoc.data().profilePic || '';
                    }
                } catch (error) {
                    console.error(`Failed to fetch profile picture for ${email}:`, error);
                }

                return {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    email,
                    profilePictureUrl
                };
            });

            const fetchedLocations = await Promise.all(locationPromises);
            setLocations(fetchedLocations.filter(location => location !== null && location.latitude && location.longitude));
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load locations');
        } finally {
            setLoading(false);
        }
    };

    // Combined function to fetch both following list and locations
    const handleRefresh = async () => {
        fetchLocations();
        await fetchFollowing();
    };

    // Initial loading state
    useEffect(() => {
        handleRefresh(); // Fetch data on initial render
    }, []);

    const handleZoomOut = () => {
        if (mapRef.current && locations.length > 0) {
            const coordinates = locations.map(loc => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
            }));
            
            const minLat = Math.min(...coordinates.map(coord => coord.latitude));
            const maxLat = Math.max(...coordinates.map(coord => coord.latitude));
            const minLon = Math.min(...coordinates.map(coord => coord.longitude));
            const maxLon = Math.max(...coordinates.map(coord => coord.longitude));

            const deltaLat = maxLat - minLat;
            const deltaLon = maxLon - minLon;

            mapRef.current.animateToRegion({
                latitude: (maxLat + minLat) / 2,
                longitude: (maxLon + minLon) / 2,
                latitudeDelta: deltaLat * 1.2,
                longitudeDelta: deltaLon * 1.2,
            }, 1000);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer} >
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.accountsContainer}><Accounts /></View>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: 40.7831, // Latitude for Manhattan, New York
                    longitude: -73.9712, // Longitude for Manhattan, New York
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {locations.map((loc, index) => (
                    <Marker
                        key={index}
                        coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                    >
                          <View style={styles.markerContainer}>
                        <Image
                            source={
                                loc.profilePictureUrl
                                    ? { uri: loc.profilePictureUrl }
                                    : require('./assets/placeholder.png') // Default profile image if none exists
                            }
                            style={styles.markerImage}
                        />
                    </View>
                        <Callout>
                            <View style={styles.calloutContainer}>
                                {loc.profilePictureUrl ? (
                                    <Image
                                        source={{ uri: loc.profilePictureUrl }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <Image
                                        source={require('./assets/placeholder.png')} // Default profile image if none exists
                                        style={styles.profileImage}
                                    />
                                )}
                                <Text style={styles.calloutText}>Visited by {loc.email}</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
            <TouchableOpacity style={styles.zoomOutButton} onPress={handleZoomOut}>
                <Text style={styles.buttonText}>Zoom Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Image
                    source={require('./assets/refresh.png')} // Use your custom refresh icon image
                    style={styles.refreshIcon}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    accountsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1, // Ensure it is above the map
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        borderColor: '#007BFF', // Customize marker border color
        borderWidth: 2,
        backgroundColor: '#fff', // Customize marker background color
    },
    markerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25, // Ensure image is round
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
    },
    zoomOutButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#000',
        borderRadius: 10,
        padding: 10,
        elevation: 5,
    },
    refreshButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: '#fff',
        borderRadius: 50,
        padding: 10,
        elevation: 5,
    },
    refreshIcon: {
        width: 30,
        height: 30,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    calloutContainer: {
        alignItems: 'center',
        width: 100,
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 5,
    },
    calloutText: {
        textAlign: 'center',
    },
});

export default Foryou;
