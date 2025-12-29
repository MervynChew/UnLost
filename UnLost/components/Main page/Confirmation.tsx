import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from "../../constants/theme";
import { supabase } from '../../lib/supabase';


type ConfirmationProps = {
  scheduleRequestId: number;
  postId: number;
  isPostOwner: boolean;
  onSuccess: () => void; // Callback when item is successfully claimed
  onFailure: () => void; // Callback when claim fails
}


export default function Confirmation({
  scheduleRequestId,
  postId,
  isPostOwner,
  onSuccess,
  onFailure
}: ConfirmationProps) {
  const [isUpdating, setIsUpdating] = useState(false);


  // Only show this section to the requester (not post owner)
  if (isPostOwner) {
    return null;
  }


  const handleSuccess = () => {
    Alert.alert(
      "Confirm Item Received",
      "Are you sure you have successfully received your item? This action cannot be undone and will mark this post as completed.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Yes, I Received It",
          style: "default",
          onPress: async () => {
            setIsUpdating(true);
           
            try {
              // ✅ Step 1: Update schedule_request to 'completed' status
              const { error: scheduleError } = await supabase
                .from('schedule_requests')
                .update({
                  status: 'completed'
                })
                .eq('request_id', scheduleRequestId);


              if (scheduleError) {
                console.error('❌ Error updating schedule:', scheduleError);
                Alert.alert('Error', `Failed to confirm: ${scheduleError.message}`);
                setIsUpdating(false);
                return;
              }

              console.log('✅ Schedule request marked as completed');


              // ✅ Step 2: Update posts status to 'claimed' and set claim_date
              const { error: postError } = await supabase
                .from('posts')
                .update({ 
                  status: 'claimed',
                  claim_date: new Date().toISOString()
                })
                .eq('post_id', postId);


              if (postError) {
                console.error('❌ Error updating post:', postError);
                Alert.alert('Error', `Failed to update post: ${postError.message}`);
                setIsUpdating(false);
                return;
              }


              console.log('✅ Post status updated to claimed with claim_date');
              Alert.alert(
                'Success!',
                'Great! The item has been marked as successfully claimed.',
                [{ text: 'OK', onPress: onSuccess }]
              );
             
            } catch (err) {
              console.error('❌ Unexpected error:', err);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };


  const handleFailure = () => {
    Alert.alert(
      "Confirm Item Not Received",
      "Are you sure you did not receive your item? This will mark the meeting as failed and you can reschedule a new meeting.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Yes, I Didn't Receive It",
          style: "destructive",
          onPress: async () => {
            setIsUpdating(true);
           
            try {
              // Update schedule_request to 'failed' status
              const { error } = await supabase
                .from('schedule_requests')
                .update({
                  status: 'failed'
                })
                .eq('request_id', scheduleRequestId);


              if (error) {
                console.error('❌ Error updating status:', error);
                Alert.alert('Error', `Failed to update: ${error.message}`);
                setIsUpdating(false);
                return;
              }


              console.log('✅ Meeting marked as failed');
              Alert.alert(
                'Meeting Failed',
                'The meeting has been marked as unsuccessful. You can now reschedule a new meeting.',
                [{ text: 'OK', onPress: onFailure }]
              );
             
            } catch (err) {
              console.error('❌ Unexpected error:', err);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };


  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <Ionicons
          name="ribbon-outline"
          size={28}
          color={Colors.light.purple}
        />
        <Text style={styles.headerTitle}>Item Retrieval Confirmation</Text>
      </View>


      <Text style={styles.subtitle}>
        Please confirm whether you have successfully received your item from the finder.
      </Text>


      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.successButton,
            isUpdating && styles.buttonDisabled
          ]}
          onPress={handleSuccess}
          disabled={isUpdating}
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.buttonText}>
            {isUpdating ? 'Processing...' : 'Yes, I Received It'}
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[
            styles.button,
            styles.failureButton,
            isUpdating && styles.buttonDisabled
          ]}
          onPress={handleFailure}
          disabled={isUpdating}
        >
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={styles.buttonText}>
            {isUpdating ? 'Processing...' : 'No, I Didn\'t Receive It'}
          </Text>
        </TouchableOpacity>
      </View>


      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={20} color={Colors.light.orange} />
        <Text style={styles.warningText}>
          Important: This action cannot be undone. Please make sure before confirming.
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: "90%",
    alignSelf: "center",
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  successButton: {
    backgroundColor: "#4CAF50",
  },
  failureButton: {
    backgroundColor: "#f44336",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#E65100",
    lineHeight: 18,
  },
});