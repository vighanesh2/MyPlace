import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, RefreshControl } from 'react-native';
import { firebase } from './config';
import { useNavigation } from '@react-navigation/native';

const Notifications = ({ navigation }) => {
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const currentUserEmail = firebase.auth().currentUser.email;

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
            tabBarBadge: unreadCount > 0 ? unreadCount : null,
        });
    }, [navigation, unreadCount]);

    useEffect(() => {
        const unsubscribe = firebase.firestore()
            .collection('notifications')
            .doc(currentUserEmail)
            .collection('noti')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const newNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setNotifications(newNotifications);

                // Update unread notification count
                const unread = newNotifications.filter(n => !n.read).length;
                setUnreadCount(unread);
            });

        return () => unsubscribe();
    }, [currentUserEmail]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            const snapshot = await firebase.firestore()
                .collection('notifications')
                .doc(currentUserEmail)
                .collection('noti')
                .orderBy('timestamp', 'desc')
                .get();
            const newNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setNotifications(newNotifications);

            // Update unread notification count
            const unread = newNotifications.filter(n => !n.read).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error("Failed to refresh notifications:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const markAsRead = async () => {
        const batch = firebase.firestore().batch();
        notifications.forEach(notification => {
            if (!notification.read) {
                const notiRef = firebase.firestore()
                    .collection('notifications')
                    .doc(currentUserEmail)
                    .collection('noti')
                    .doc(notification.id);
                batch.update(notiRef, { read: true });
            }
        });

        try {
            await batch.commit();
            // Update unread notification count
            setUnreadCount(0);
        } catch (error) {
            console.error("Error updating notifications as read:", error);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.notificationContainer}>
            <Text style={styles.notificationText}>
                <Text style={styles.boldText}>{item.email}</Text> {item.message}
            </Text>
            <Text style={styles.timestamp}>
                {new Date(item.timestamp.toDate()).toLocaleString()}
            </Text>
        </View>
    );

    useEffect(() => {
        // Mark notifications as read when the screen is loaded
        markAsRead();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Notifications</Text>
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        marginLeft: 15,
    },
    notificationContainer: {
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 15,
        marginVertical: 5,
        marginHorizontal: 10,
        shadowColor: '#BDC3C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    notificationText: {
        fontSize: 16,
        color: '#fff',
    },
    boldText: {
        fontWeight: 'bold',
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
    },
});

export default Notifications;
