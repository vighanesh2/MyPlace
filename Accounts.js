import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, TouchableOpacity, Image, Keyboard } from 'react-native';
import { firebase } from './config'; // Adjust the import path to your firebase config
import { useNavigation } from '@react-navigation/native'; // Import for navigation

const Accounts = () => {
    const [documentNames, setDocumentNames] = useState([]);
    const [filteredNames, setFilteredNames] = useState([]);
    const [profilePics, setProfilePics] = useState({}); // To store profile picture URLs
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showList, setShowList] = useState(false);
    const navigation = useNavigation(); // Initialize navigation
    const [currentUserEmail, setCurrentUserEmail] = useState(null);

    useEffect(() => {
        const fetchCurrentUserEmail = async () => {
            const user = firebase.auth().currentUser;
            if (user) {
                setCurrentUserEmail(user.email);
            }
        };

        fetchCurrentUserEmail();
    }, []);

    useEffect(() => {
        const fetchDocumentNames = async () => {
            try {
                const snapshot = await firebase.firestore().collection('users').get();
                const docNames = snapshot.docs.map(doc => doc.id); // Get document IDs
                if (currentUserEmail) {
                    // Filter out the current user's email
                    const filteredNames = docNames.filter(name => name !== currentUserEmail);
                    setDocumentNames(filteredNames);
                    setFilteredNames(filteredNames);

                    // Fetch profile pictures
                    const picPromises = filteredNames.map(async (docName) => {
                        const userDoc = await firebase.firestore().collection('users').doc(docName).get();
                        const userData = userDoc.data();
                        return { [docName]: userData.profilePic };
                    });

                    const picsArray = await Promise.all(picPromises);
                    const picsObject = Object.assign({}, ...picsArray);
                    setProfilePics(picsObject);
                }
            } catch (err) {
                setError('Failed to fetch document names');
                console.error('Error fetching document names:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDocumentNames();
    }, [currentUserEmail]);

    const handleSearch = (query) => {
        setSearchQuery(query);
        const lowercasedQuery = query.toLowerCase();
        const filtered = documentNames.filter(name => name.toLowerCase().includes(lowercasedQuery));
        setFilteredNames(filtered);
    };

    const toggleListVisibility = () => {
        setShowList(!showList);
        // Close the keyboard when toggling
        Keyboard.dismiss();
    };

    const handleDocNamePress = (docName) => {
        navigation.navigate('UserDetail', { email: docName }); // Assuming you'd still navigate using the docName
    };

    const renderDocNameItem = ({ item }) => (
        <TouchableOpacity onPress={() => handleDocNamePress(item)} style={styles.itemContainer}>
            <View style={styles.itemContent}>
                <Text style={styles.docNameText}>{item}</Text>
                {profilePics[item] ? (
                    <Image source={{ uri: profilePics[item] }} style={styles.profilePic} />
                ) : (
                    <Image source={require('./assets/placeholder.png')} style={styles.profilePic} />
                )}
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search your friends..."
                    placeholderTextColor="#BDC3C7"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    onFocus={() => setShowList(true)} // Show list when input is focused
                />
                <TouchableOpacity onPress={toggleListVisibility}>
                    <Image
                        source={showList ? require('./assets/close.png') : require('./assets/all.png')} // Replace with your actual paths
                        style={styles.icon}
                    />
                </TouchableOpacity>
            </View>
            {showList && (
                <FlatList
                    data={filteredNames}
                    renderItem={renderDocNameItem}
                    keyExtractor={item => item}
                    style={styles.docNameList}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0)', // Adjust opacity as needed
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    searchBar: {
        flex: 1,
        height: 50,
        borderColor: '#BDC3C7',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        backgroundColor: '#FFFFFF',
        shadowColor: '#BDC3C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    icon: {
        width: 24,
        height: 24,
        marginLeft: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
    },
    errorText: {
        color: '#FF0000',
    },
    itemContainer: {
        padding: 20,
        borderBottomColor: '#BDC3C7',
        borderBottomWidth: 1,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 1)', // Adjust opacity as needed
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    docNameText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginLeft: 10,
    },
    docNameList: {
        flex: 1,
    },
});

export default Accounts;
