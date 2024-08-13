import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
    View,
    StyleSheet,
    Image,
    FlatList,
    SafeAreaView,
    Text,
    RefreshControl,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Alert,
    ImageBackground,
    Animated,
} from 'react-native';
import { Linking } from 'react-native';
import { firebase } from './config'; // Import the initialized firebase
import moment from 'moment'; // For formatting timestamps
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Rating } from 'react-native-ratings';
import Plus from './assets/add.png';

// Import your PNG icons
import LikeIcon from './assets/heart.png';
import ShareIcon from './assets/location.png';
import CommentIcon from './assets/comment.png';
import ScrollUpIcon from './assets/scroll-up.png';
import Logo from './assets/LOGO.png';
import MessageIcon from './assets/news.png';
import PlaceholderImage from './assets/placeholder.png';
import LikedIcon from './assets/heart-2.png'; // Add your filled heart icon here

const Home = ({ navigation }) => {
    const [posts, setPosts] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [showScrollUpButton, setShowScrollUpButton] = useState(false);
    const [storyImageUri, setStoryImageUri] = useState(null);
    const scrollViewRef = useRef(null);
    const [selectedStory, setSelectedStory] = useState(null);
    const [storyDuration] = useState(10000); // 10 seconds
    const [likedPosts, setLikedPosts] = useState({});

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        fetchPosts();
        fetchStories();
        requestPermissions();
    }, []);

    const toggleCommentSection = (postId) => {
        if (selectedPostId === postId) {
            setSelectedPostId(null); // Deselect the post if already selected
        } else {
            setSelectedPostId(postId); // Select the post to show the comment section
        }
    };

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'You need to grant permission to access the media library.');
        }
    };

    const fetchPosts = async () => {
        try {
            const currentUser = firebase.auth().currentUser;
    
            if (!currentUser) {
                Alert.alert('Error', 'You need to be logged in to view posts.');
                return;
            }
    
            const currentUserEmail = currentUser.email;
            const currentUserDocRef = firebase.firestore().collection('users').doc(currentUserEmail);
    
            // Get the current user's following list
            const currentUserDoc = await currentUserDocRef.get();
            const currentUserData = currentUserDoc.data();
            const followingList = currentUserData.following || [];
    
            // Fetch posts from followed users
            const fetchedPosts = [];
            await Promise.all(followingList.map(async (followingEmail) => {
                const postsSnapshot = await firebase.firestore().collection('users').doc(followingEmail).collection('posts').get();
                const postsData = postsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                fetchedPosts.push(...postsData);
            }));
    
            // Optionally fetch comments for each post
            const postsWithComments = await Promise.all(fetchedPosts.map(async (post) => {
                const comments = await fetchComments(post.id,post.email);
                return {
                    id: post.id,
                    ...post,
                    comments,
                };
            }));
    
            setPosts(postsWithComments);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    const handleSharePost = (latitude, longitude) => {
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
    };
    const handleLikePost = async (email, postId) => {
        const userDocRef = firebase.firestore().collection('users').doc(String(email));
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            await userDocRef.set({
                email: email,
                followers: [],
                following: [],
            });
        }

        const postDocRef = userDocRef.collection('posts').doc(String(postId));
        const postDoc = await postDocRef.get();
        let currentLikes = postDoc.exists ? postDoc.data().likes || 0 : 0;
        let hasLiked = likedPosts[postId];

        if (hasLiked) {
            // If the post is already liked, unlike it
            currentLikes = Math.max(0, currentLikes - 1); // Ensure likes don't go below 0
            await postDocRef.update({
                likes: currentLikes,
            });
            setLikedPosts((prevState) => ({
                ...prevState,
                [postId]: false, // Mark as unliked
                [`${postId}_likes`]: currentLikes,
            }));
        } else {
            // If the post is not liked, like it
            currentLikes += 1;
            await postDocRef.update({
                likes: currentLikes,
            });
            setLikedPosts((prevState) => ({
                ...prevState,
                [postId]: true, // Mark as liked
                [`${postId}_likes`]: currentLikes,
            }));
        }
    };

   
    const handleCommentPost = async (email) => {
    
    
        try {
          
                // Correct the document path if necessary
                const postRef = firebase.firestore()
                    .collection('users')
                    .doc(email)
                    .collection('posts')
                    .doc(selectedPostId);
    
                await postRef.collection('comments').add({
                    text: commentText,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    user: email, // Optional: Save the email of the user commenting
                });
    
                setCommentText('');
                setSelectedPostId(null);
                Alert.alert('Comment posted');
            }
         catch (error) {
            console.error('Error posting comment:', error);
            Alert.alert('Error posting comment:', error.message);
        }
    };
    

    const fetchStories = async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            const email = user.email;
            try {
                const userDocRef = firebase.firestore().collection('users').doc(email);
                const userDoc = await userDocRef.get();
    
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const followingEmails = userData.following || [];
    
                    const currentUserStory = {
                        id: userDoc.id,
                        ...userData,
                    };
    
                    const storiesPromises = followingEmails.map(async (followedEmail) => {
                        const followedUserDocRef = firebase.firestore().collection('users').doc(followedEmail);
                        const followedUserDoc = await followedUserDocRef.get();
    
                        if (followedUserDoc.exists) {
                            const followedUserData = followedUserDoc.data();
                            return {
                                id: followedUserDoc.id,
                                ...followedUserData,
                            };
                        }
                        return null;
                    });
    
                    const storiesArray = await Promise.all(storiesPromises);
                    const followedUserStories = storiesArray.filter(story => story !== null);
    
                    // Use a Set to track unique user IDs
                    const seenUserIds = new Set();
                    const uniqueStories = [];
    
                    // Add the current user story if it's unique
                    if (currentUserStory.id && !seenUserIds.has(currentUserStory.id)) {
                        seenUserIds.add(currentUserStory.id);
                        uniqueStories.push(currentUserStory);
                    }
    
                    // Add followed users' stories if they are unique
                    followedUserStories.forEach(story => {
                        if (story.id && !seenUserIds.has(story.id)) {
                            seenUserIds.add(story.id);
                            uniqueStories.push(story);
                        }
                    });
    
                    // Filter out stories with missing or empty image and title
                    const filteredStories = uniqueStories.filter(story => story.storyImage && story.storyTitle);
    
                    setStories(filteredStories);
                } else {
                    setStories([]);
                }
            } catch (error) {
                console.error('Error fetching stories:', error);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };
    
    
    
    
    const handleRefresh = () => {
        setRefreshing(true);
        fetchPosts();
        fetchStories();
    };

    const handleScroll = (event) => {
        const { contentOffset } = event.nativeEvent;
        setShowScrollUpButton(contentOffset.y > 300);
    };

    const handleScrollUp = () => {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
    
        if (!result.canceled) {
            setStoryImageUri(result.assets[0].uri);
            await uploadImage(result.assets[0].uri);
        }
    };
    
    const fetchComments = async (postId,email) => {
        try {
           
           
               
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(email)
                    .collection('posts')
                    .doc(postId)
                    .collection('comments')
                    .orderBy('timestamp', 'asc')
                    .get();
                const fetchedComments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                return fetchedComments;
            
            return []; // Ensure an empty array is returned if the user is not authenticated
        } catch (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
    };
    
    const uploadImage = async (uri) => {
        if (uri) {
            try {
                const response = await fetch(uri);
                const blob = await response.blob();
                const filename = `${Date.now()}`;
                const storageRef = firebase.storage().ref().child(`stories/${filename}`);
    
                await storageRef.put(blob);
                const imageUrl = await storageRef.getDownloadURL();
    
                const user = firebase.auth().currentUser;
                if (user) {
                    const email = user.email;
                    const userDocRef = firebase.firestore().collection('users').doc(email);
                    
                    // Fetch current user data
                    const userDoc = await userDocRef.get();
                    const userData = userDoc.data();
                    
                    // Check if there's already a story with the same title

                        // Update the existing story information
                        const storyTitle = email.split('@')[0];

                        await userDocRef.update({
                            storyImage: imageUrl,
                            storyTitle: storyTitle,
                        });
                        Alert.alert('Story updated!');
                   
                    fetchStories(); // Refresh stories
                }
            } catch (e) {
                console.error("Error uploading image: ", e);
                Alert.alert('Upload failed', e.message);
            }
        } else {
            Alert.alert('No image selected', 'Please pick an image before uploading.');
        }
    };
  
    const handleMessagePress = () => {
        navigation.navigate('Journal');
    };
      
    const handleStoryPress = (story) => {
        navigation.navigate('StoryViewer', { story });
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
     
           
            <View style={styles.header}>
                <Image source={Logo} style={styles.logo} />
                <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
    </TouchableOpacity>
                <TouchableOpacity style={styles.messagingButton} onPress={handleMessagePress} >
                    <Image source={MessageIcon} style={styles.messagingIcon} />
                </TouchableOpacity>
            </View>
            <FlatList
  ListHeaderComponent={
    <View style={styles.storiesContainer}>
      <TouchableOpacity style={styles.addStoryButton} onPress={pickImage}>
        <Image source={storyImageUri ? { uri: storyImageUri } : Plus} style={styles.addStoryImage} />
        <Text style={styles.addStoryText}>Add Story</Text>
      </TouchableOpacity>
      <FlatList
        data={stories}
        horizontal
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.storyContainer} onPress={() => handleStoryPress(item)}>
            <View style={styles.storyImageWrapper}>
              <Image source={{ uri: item.storyImage }} style={styles.storyImage} />
            </View>
            <Text style={styles.storyTitle}>{item.storyTitle}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No Stories Available</Text>}
      />
    </View>
  }
  data={posts}
  keyExtractor={item => item.id}
  renderItem={({ item }) => (
    <View style={styles.postContainer}>
      <ImageBackground source={{ uri: item.imageUrl }} style={styles.imageBackground}>
        <View style={styles.overlay} />
        <View style={styles.contentContainer}>
          <View>
            <View style={styles.headerContainer}>
              <Image source={Logo} style={styles.profileImage} />
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <Text style={styles.timestamp}>{moment(item.timestamp?.toDate()).fromNow()}</Text>
            <Text style={styles.title}>{item.title}</Text>
          </View>
          <View>
            <Text style={styles.caption}>{item.caption}</Text>
            <Rating
              imageSize={20}
              readonly
              startingValue={item.rating}
              style={styles.rating}
              tintColor="#000"
            />
            {item.latitude && item.longitude && (
              <TouchableOpacity onPress={() => handleSharePost(item.location.coords.latitude, item.location.coords.longitude)}>
                <Text style={styles.location}>View Location</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={() => handleLikePost(item.email, item.id)}>
              <Image source={likedPosts[item.id] ? LikedIcon : LikeIcon} style={styles.icon} />
              <Text style={styles.likeCount}>{item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSharePost(item.location.coords.latitude, item.location.coords.longitude)}>
              <Image source={ShareIcon} style={styles.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleCommentSection(item.id)}>
              <Image source={CommentIcon} style={styles.icon} />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
      {selectedPostId === item.id && (
        <View style={styles.commentSection}>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
            />
            <TouchableOpacity onPress={() => handleCommentPost(item.email, item.id)}>
              <Text style={styles.postCommentButton}>Post</Text>
            </TouchableOpacity>
          </View>
          {item.comments && item.comments.length > 0 && (
            <>
              {item.comments.map(comment => (
                <View key={comment.id} style={styles.comment}>
                  <Text style={styles.commentUser}>{comment.user}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTimestamp}>{moment(comment.timestamp?.toDate()).fromNow()}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  )}
  ListEmptyComponent={
    <View style={styles.loadingContainer}>
      <Text>No Posts Available</Text>
    </View>
  }
/>
            {showScrollUpButton && (
                <TouchableOpacity style={styles.scrollUpButton} onPress={handleScrollUp}>
                    <Image source={ScrollUpIcon} style={styles.scrollUpIcon} />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#ffffff',
        justifyContent: 'space-between',
    },
    imageBackground: {
        flex: 1,
        borderRadius: 20, // Ensure the image background also has rounded corners
        overflow: 'hidden', // Ensure the overlay and content are clipped to the border radius
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
    },
    logo: {
        width: 150,
        height: 50,
    },
    storiesContainer: {
        padding: 10,
        backgroundColor: '#ffffff',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
    },
    refreshButton: {
    padding: 10,
    backgroundColor: '#000', // Blue background
    borderRadius: 5,
  

},

refreshButtonText: {
    color: '#ffffff', // White text color
    fontWeight: 'bold',
},
    rating: {
        backgroundColor: 'transparent', // Ensure no background color
        position: 'absolute',
       bottom:5,
        left: 10,
    },
    storyContainer: {
        marginRight: 10,
        alignItems: 'center',
    },
    storyImageWrapper: {
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 2,
        borderColor: '#000', // Black border
        overflow: 'hidden',
    },
    storyImage: {
        width: '100%',
        height: '100%',
    },
    storyTitle: {
        fontSize: 12,
        color: '#333333',
    },
    addStoryButton: {
        flexDirection: 'column',
        alignItems: 'center',
        marginRight: 10,
    },
    
    addStoryImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginBottom: 5,
        borderWidth: 2,
        borderColor: '#000', // Black border
    },
  
    addStoryText: {
        fontSize: 12,
        color: '#333333',
    },
    likeCount: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 10,
    marginBottom:10,
},
commentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
},
    
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 2,
        borderColor: '#000', // Black border
    },
    contentContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: 15,
        justifyContent: 'space-between',
    },
    email: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 15,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#000', // Black border
    },
    timestamp: {
        fontSize: 12,
        color: '#888888',
        marginBottom: 5,
    },
    storyImageBorderWrapper: {
        width: 70,
        height: 70,
        borderRadius: 37,
        borderWidth: 2,
        borderColor: '#FFFF', // Black border
        overflow: 'hidden',
    },
    postContainer: {
        marginBottom: 10,
        marginHorizontal: 20,
        marginTop: 10,
        backgroundColor: '#ffffff',
        padding: 0,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
        overflow: 'hidden',
    },
    imageBackground: {
        width: '100%',
        height: 300, // Or use flex: 1 to let it expand based on content
        borderRadius: 20,
        overflow: 'hidden',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
   
    email: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffff',
    },
    timestamp: {
        fontSize: 12,
        color: '#ffff',
        marginBottom: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 5,
    },
    caption: {
        fontSize: 18,
        color: '#ffff',
        position: 'absolute',
        bottom: 10,
        left: 10,
        marginBottom: 15, // Space between caption and rating
        marginRight: 15, // Space between caption and rating

    },
    location: {
        fontSize: 14,
        color: '#3498db',
        marginBottom: 10,
    },
    iconsContainer: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        flexDirection: 'column',
    },
    icon: {
        width: 25,
        height: 25,
        marginBottom: 15, // Add vertical spacing between icons
        tintColor: '#ffffff', // Make the icon white

    },
   
    
    scrollUpButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#ffffff',
        borderRadius: 50,
        padding: 10,
        elevation: 5,
    },
    scrollUpIcon: {
        width: 30,
        height: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
    },
    messagingButton: {
        backgroundColor: '#ffffff',
        borderRadius: 50,
        padding: 10,
    },
    messagingIcon: {
        width: 30,
        height: 30,
    },
       // Comment section styles
       commentSection: {
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom:10,
    },
    commentInput: {
        flex: 1,
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        marginRight: 10,
        fontSize: 16,
    },
    postCommentButton: {
        backgroundColor: '#000',
        color: '#fff',
        
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
        fontSize: 16,
        fontWeight: 'bold',
    },
    comment: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderColor: '#ddd',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    commentText: {
        fontSize: 16,
        color: '#333',
    },
    commentTimestamp: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
    },

});

export default Home;
