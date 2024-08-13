import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';

const StoryViewer = ({ route, navigation }) => {
    const { story } = route.params;
    const [imageLoaded, setImageLoaded] = useState(false);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (imageLoaded) {
            Animated.timing(progress, {
                toValue: 1,
                duration: 5000, // 5 seconds
                useNativeDriver: false,
            }).start(() => {
                navigation.navigate('Home');
            });
        }
    }, [imageLoaded, progress, navigation]);

    return (
        <View style={styles.container}>
            {!imageLoaded && (
                <ActivityIndicator 
                    size="large" 
                    color="#ffffff" 
                    style={styles.loadingIndicator} 
                />
            )}
            <Image
                source={{ uri: story.storyImage }}
                style={styles.image}
                onLoadEnd={() => setImageLoaded(true)}
            />
            {imageLoaded && (
                <>
                    <Text style={styles.title}>{story.storyTitle}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                    <Animated.View 
                        style={[
                            styles.progressBar, 
                            { width: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }) 
                        }]} 
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '80%',
        resizeMode: 'contain',
    },
    title: {
        fontSize: 20,
        color: '#fff',
        margin: 20,
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 20,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#000',
        lineHeight: 24,
    },
    progressBar: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        height: 5,
        backgroundColor: '#fff',
    },
    loadingIndicator: {
        position: 'absolute',
        zIndex: 1,


    },
});

export default StoryViewer;
