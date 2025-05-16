import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, Image as RNImage, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const engineImage = require('@/assets/images/engine.jpg');

// Placeholder data for a single post
const placeholderPost = {
  user: {
    name: 'Arone Papas',
    profilePictureUrl: 'https://placehold.co/50x50/000000/FFFFFF/png?text=AP',
  },
  timeAgo: '7 days ago',
  title: 'Drive Smoothly',
  tags: ['Safety', 'Tips'],
  imageUrl: engineImage,
  description: 'Do you know? Sudden acceleration and braking wear out parts faster When you floor the gas pedal , the engine , transmission , and drivetrain work harder than necessary , increasing fuel consumption and causing premature damage to internal parts .',
  isLiked: false,
  isSaved: false,
};

const createPost = () => {
  router.replace('../createPostScreen')
}
const DiscoverScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <RNImage source={{ uri: placeholderPost.user.profilePictureUrl }} style={styles.profilePicture} />
          <Text style={styles.userName}>{placeholderPost.user.name}</Text>
        </View>
        <TouchableOpacity style={styles.notificationIcon}>
           <Ionicons name="notifications-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.postContainer}>
          <RNImage source={placeholderPost.imageUrl} style={styles.postImage} resizeMode="cover" />

          <View style={styles.postContent}>
            <View style={styles.postMeta}>
               <Text style={styles.postTime}>{`Posted ${placeholderPost.timeAgo}`}</Text>
               <View style={styles.actionIcons}>
                 <TouchableOpacity style={styles.actionIcon}>
                   <Ionicons name={placeholderPost.isLiked ? "heart" : "heart-outline"} size={24} color={placeholderPost.isLiked ? "red" : "black"} />
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.actionIcon}>
                   <Ionicons name={placeholderPost.isSaved ? "bookmark" : "bookmark-outline"} size={24} color="black" />
                 </TouchableOpacity>
               </View>
            </View>

            <Text style={styles.postTitle}>{placeholderPost.title}</Text>

            <View style={styles.tagsContainer}>
              {placeholderPost.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.postDescription}>{placeholderPost.description}</Text>

          </View>
        </View>

        <TouchableOpacity style={styles.editIcon} onPress={(createPost)}>
            <Ionicons name="pencil" size={24} color="black" />
        </TouchableOpacity>


      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationIcon: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 5, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postImage: {
    width: '100%',
    height: 250,
  },
  postContent: {
    padding: 15,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postTime: {
    fontSize: 12,
    color: 'gray',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginLeft: 15,
    padding: 5,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#eee',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
  },
  postDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  editIcon: {
    position: 'absolute',
    bottom: -220,
    right: 15,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
});

export default DiscoverScreen;
