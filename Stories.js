import React, { useState } from 'react';
import { View, Text, Button, Image, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { firebase } from './config';
import * as ImagePicker from 'expo-image-picker';

const AddStory = () => {
    const [image, setImage] = useState(null);
    const [description, setDescription] = useState('');
    const user = firebase.auth().currentUser;

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.uri);
        }
    };

    const uploadStory = async () => {
        if (image && description) {
            const response = await fetch(image);
            const blob = await response.blob();
            const ref = firebase.storage().ref().child(`stories/${user.email}/${Date.now()}`);
            await ref.put(blob);
            const url = await ref.getDownloadURL();

            await firebase.firestore().collection('users').doc(user.email).collection('stories').add({
                imageUrl: url,
                description,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            setImage(null);
            setDescription('');
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Pick an image from camera roll" onPress={pickImage} />
            {image && <Image source={{ uri: image }} style={styles.image} />}
            <TextInput
                style={styles.input}
                placeholder="Add a description..."
                value={description}
                onChangeText={setDescription}
            />
            <TouchableOpacity onPress={uploadStory} style={styles.button}>
                <Text style={styles.buttonText}>Upload Story</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 10,
    },
    image: {
        width: 200,
        height: 200,
        marginVertical: 10,
    },
    input: {
        borderColor: '#ccc',
        borderWidth: 1,
        padding: 10,
        marginVertical: 10,
    },
    button: {
        backgroundColor: '#3498db',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default AddStory;
