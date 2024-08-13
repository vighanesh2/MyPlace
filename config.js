import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';  // Add this line

const firebaseConfig = {
    apiKey: "AIzaSyAHv6LWbiMgMIq8pcYKbMxuzDg1evsFTSk",
    authDomain: "myplace-4b57e.firebaseapp.com",
    projectId: "myplace-4b57e",
    storageBucket: "myplace-4b57e.appspot.com",
    messagingSenderId: "704934610608",
    appId: "1:704934610608:web:1075f6aba9b95bcbee5d75",
    measurementId: "G-YF4W69S8RN"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const storage = firebase.storage();  // Add this line

export { firebase, storage };
