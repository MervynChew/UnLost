import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from "../../constants/theme";
import { supabase } from '../../lib/supabase';

type AttendanceProps = {
  scheduleRequestId: number;
  isPostOwner: boolean;
  finderAttendance: boolean;
  ownerAttendance: boolean;
  finderDescription: string;
  ownerDescription: string;
  meetDate: string;
  meetTime: string;
}

export default function Attendance({ 
  scheduleRequestId, 
  isPostOwner,
  finderAttendance,
  ownerAttendance,
  finderDescription,
  ownerDescription,
  meetDate,
  meetTime
}: AttendanceProps) {
  const [finderPresent, setFinderPresent] = useState(finderAttendance);
  const [ownerPresent, setOwnerPresent] = useState(ownerAttendance);
  const [isUpdating, setIsUpdating] = useState(false);
  const [meetingTimePassed, setMeetingTimePassed] = useState(false);

  // Description states
  const [finderDesc, setFinderDesc] = useState(finderDescription);
  const [ownerDesc, setOwnerDesc] = useState(ownerDescription);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');

  // Check if meeting time has passed (10 minutes after scheduled time)
  const checkMeetingTimePassed = (): boolean => {
    // ⚠️ COMMENT OUT THIS ENTIRE BLOCK FOR TESTING ⚠️
    // START OF TIME CHECK - COMMENT THIS OUT IF YOU WANT TO TEST THE ATTENDANCE
    
    const now = new Date();
    const meetingDateTime = new Date(`${meetDate}T${meetTime}`);
    const tenMinutesAfter = new Date(meetingDateTime.getTime() + 10 * 60 * 1000);
    
    return now >= tenMinutesAfter;
    
    // END OF TIME CHECK - COMMENT THIS OUT IF YOU WANT TO TEST THE ATTENDANCE
    
    // FOR TESTING: Always return false
    // return false;
  };

  // Check if attendance can be toggled (within the range 5 minutes before meeting and before 10 minutes after)
  const canToggleAttendance = (): boolean => {
    // ⚠️ COMMENT OUT THIS ENTIRE BLOCK FOR TESTING ⚠️
    // START OF TIME RESTRICTION - COMMENT THIS OUT IF YOU WANT TO TEST THE ATTENDANCE
    
    const now = new Date();
    const meetingDateTime = new Date(`${meetDate}T${meetTime}`);
    const fiveMinutesBefore = new Date(meetingDateTime.getTime() - 5 * 60 * 1000);
    const tenMinutesAfter = new Date(meetingDateTime.getTime() + 10 * 60 * 1000);
    
    // Can only toggle within the range 5 minutes before and 10 minutes after the meeting time
    return now >= fiveMinutesBefore && now < tenMinutesAfter;
    
    // END OF TIME RESTRICTION - COMMENT THIS OUT IF YOU WANT TO TEST THE ATTENDANCE
    
    // FOR TESTING: Always return true
    // return true;
  };

  // Check meeting time status periodically
  useEffect(() => {
    const checkTime = () => {
      const timePassed = checkMeetingTimePassed();
      setMeetingTimePassed(timePassed);
    };

    checkTime(); // Check immediately
    const interval = setInterval(checkTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [meetDate, meetTime]);

  // ✅ FIXED: Update local state when props change (from parent's real-time updates)
  useEffect(() => {
    console.log('📥 Attendance props updated:', {
      finderAttendance,
      ownerAttendance,
      finderDescription,
      ownerDescription
    });
    
    setFinderPresent(finderAttendance);
    setOwnerPresent(ownerAttendance);
    setFinderDesc(finderDescription);
    setOwnerDesc(ownerDescription);
  }, [finderAttendance, ownerAttendance, finderDescription, ownerDescription]);

  const handleToggleAttendance = async (value: boolean) => {
    if (isUpdating) return;

    if (!canToggleAttendance()) {
      if (meetingTimePassed) {
        Alert.alert(
          'Time Has Passed', 
          'The meeting time has passed. You can no longer mark attendance.'
        );
      } else {
        Alert.alert(
          'Not Available Yet', 
          'Attendance can only be marked within 5 minutes before the scheduled meeting time.'
        );
      }
      return;
    }

    setIsUpdating(true);

    try {
      const updateField = isPostOwner ? 'finder_attendance' : 'owner_attendance';
      
      console.log(`🔄 Updating ${updateField} to ${value}`);
      
      const { data, error } = await supabase
        .from('schedule_requests')
        .update({ [updateField]: value })
        .eq('request_id', scheduleRequestId)
        .select();

      if (error) {
        console.error('❌ Error updating attendance:', error);
        Alert.alert('Error', `Failed to update attendance: ${error.message}`);
        // Revert optimistic update
        if (isPostOwner) {
          setFinderPresent(!value);
        } else {
          setOwnerPresent(!value);
        }
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert('Error', 'Failed to update attendance. Please try again.');
        // Revert optimistic update
        if (isPostOwner) {
          setFinderPresent(!value);
        } else {
          setOwnerPresent(!value);
        }
        return;
      }

      console.log('✅ Attendance updated successfully');
      
      // Optimistic update - real-time will sync this across devices
      if (isPostOwner) {
        setFinderPresent(value);
      } else {
        setOwnerPresent(value);
      }

    } catch (err) {
      console.error('❌ Unexpected error updating attendance:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditDescription = () => {
    // Disable editing after meeting time has passed
    if (meetingTimePassed) { // fall back in case the UI didnt update real time
      Alert.alert(
        'Time Has Passed', 
        'The meeting time has passed. You can no longer edit descriptions.'
      );
      return;
    }

    const currentDesc = isPostOwner ? finderDesc : ownerDesc;
    setTempDescription(currentDesc);
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      const updateField = isPostOwner ? 'finder_description' : 'owner_description';
      
      console.log(`🔄 Updating ${updateField}`);
      
      const { data, error } = await supabase
        .from('schedule_requests')
        .update({ [updateField]: tempDescription.trim() })
        .eq('request_id', scheduleRequestId)
        .select();

      if (error) {
        console.error('❌ Error updating description:', error);
        Alert.alert('Error', `Failed to update description: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert('Error', 'Failed to update description. Please try again.');
        return;
      }

      console.log('✅ Description updated successfully');

      // Optimistic update
      if (isPostOwner) {
        setFinderDesc(tempDescription.trim());
      } else {
        setOwnerDesc(tempDescription.trim());
      }

      setIsEditingDescription(false);

    } catch (err) {
      console.error('❌ Unexpected error updating description:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if meeting failed (time passed and not both attended)
  const meetingFailed = meetingTimePassed && !(finderPresent && ownerPresent);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <Ionicons 
          name={meetingFailed ? "sad-outline" : "checkmark-done-circle"} 
          size={28} 
          color={meetingFailed ? "#f44336" : Colors.light.purple} 
        />
        <Text style={styles.headerTitle}>Meeting Attendance</Text>
      </View>

      <Text style={[
        styles.subtitle,
        meetingTimePassed && { color: "#f44336" }
      ]}>
        {meetingTimePassed 
          ? "The meeting time has passed. You can no longer toggle attendance." 
          : "Tap here once you have reached the meeting point. (Available only from 5 minutes before to 10 minutes after the meeting time.)"
        }
      </Text>

      {/* Post Owner (Finder) Attendance */}
      <View style={[
        styles.attendanceRow,
        meetingTimePassed && !finderPresent && styles.attendanceRowDisabled
      ]}>
        <View style={styles.personInfo}>
          <Ionicons 
            name={finderPresent ? "person-circle" : "person-circle-outline"} 
            size={24} 
            color={
              meetingTimePassed && !finderPresent 
                ? "#ccc" 
                : finderPresent 
                  ? Colors.light.purple 
                  : "#ccc"
            } 
          />
          <View style={styles.personText}>
            <Text style={styles.personLabel}>Finder</Text>
            <Text style={[
              styles.statusText, 
              finderPresent && styles.statusPresent,
              meetingTimePassed && !finderPresent && styles.statusAbsent
            ]}>
              {finderPresent 
                ? "✓ Arrived" 
                : meetingTimePassed 
                  ? "✗ Did not arrive" 
                  : "Not yet arrived"
              }
            </Text>
          </View>
        </View>
        
        {isPostOwner ? (
          <Switch
            value={finderPresent}
            onValueChange={handleToggleAttendance}
            disabled={isUpdating}
            trackColor={{ 
              false: !canToggleAttendance() ? "#e0e0e0" : "#d3d3d3", 
              true: !canToggleAttendance() ? "#bbb" : Colors.light.purple 
            }}
            thumbColor={finderPresent ? "#fff" : "#f4f3f4"}
            style={{ opacity: !canToggleAttendance() ? 0.5 : 1 }}
          />
        ) : (
          <View style={[
            styles.statusBadge, 
            finderPresent && styles.statusBadgeActive,
            meetingTimePassed && !finderPresent && styles.statusBadgeInactive
          ]}>
            <Ionicons 
              name={
                meetingTimePassed && !finderPresent
                  ? "close-circle"
                  : finderPresent 
                    ? "checkmark-circle" 
                    : "time-outline"
              } 
              size={20} 
              color={
                meetingTimePassed && !finderPresent
                  ? "#f44336"
                  : finderPresent 
                    ? Colors.light.purple 
                    : "#999"
              } 
            />
          </View>
        )}
      </View>

      {finderPresent && (
        <View style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionLabel}>Find Me Details:</Text>
            {isPostOwner && !meetingTimePassed && (
              <TouchableOpacity 
                onPress={handleEditDescription} 
                style={styles.editButton}
                disabled={meetingTimePassed}
              >
                <Ionicons name="create-outline" size={18} color={Colors.light.purple} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.descriptionText}>
            {finderDesc || "No details added yet."}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* Requester (Owner) Attendance */}
      <View style={[
        styles.attendanceRow,
        meetingTimePassed && !ownerPresent && styles.attendanceRowDisabled
      ]}>
        <View style={styles.personInfo}>
          <Ionicons 
            name={ownerPresent ? "person-circle" : "person-circle-outline"} 
            size={24} 
            color={
              meetingTimePassed && !ownerPresent 
                ? "#ccc" 
                : ownerPresent 
                  ? Colors.light.purple 
                  : "#ccc"
            } 
          />
          <View style={styles.personText}>
            <Text style={styles.personLabel}>Item Owner</Text>
            <Text style={[
              styles.statusText, 
              ownerPresent && styles.statusPresent,
              meetingTimePassed && !ownerPresent && styles.statusAbsent
            ]}>
              {ownerPresent 
                ? "✓ Arrived" 
                : meetingTimePassed 
                  ? "✗ Did not arrive" 
                  : "Not yet arrived"
              }
            </Text>
          </View>
        </View>
        
        {!isPostOwner ? (
          <Switch
            value={ownerPresent}
            onValueChange={handleToggleAttendance}
            disabled={isUpdating}
            trackColor={{ 
              false: !canToggleAttendance() ? "#e0e0e0" : "#d3d3d3", 
              true: !canToggleAttendance() ? "#bbb" : Colors.light.purple 
            }}
            thumbColor={ownerPresent ? "#fff" : "#f4f3f4"}
            style={{ opacity: !canToggleAttendance() ? 0.5 : 1 }}
          />
        ) : (
          <View style={[
            styles.statusBadge, 
            ownerPresent && styles.statusBadgeActive,
            meetingTimePassed && !ownerPresent && styles.statusBadgeInactive
          ]}>
            <Ionicons 
              name={
                meetingTimePassed && !ownerPresent
                  ? "close-circle"
                  : ownerPresent 
                    ? "checkmark-circle" 
                    : "time-outline"
              } 
              size={20} 
              color={
                meetingTimePassed && !ownerPresent
                  ? "#f44336"
                  : ownerPresent 
                    ? Colors.light.purple 
                    : "#999"
              } 
            />
          </View>
        )}
      </View>

      {ownerPresent && (
        <View style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionLabel}>Find Me Details:</Text>
            {!isPostOwner && !meetingTimePassed && (
              <TouchableOpacity 
                onPress={handleEditDescription} 
                style={styles.editButton}
                disabled={meetingTimePassed}
              >
                <Ionicons name="create-outline" size={18} color={Colors.light.purple} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.descriptionText}>
            {ownerDesc || "No details added yet."}
          </Text>
        </View>
      )}

      {/* Success or Failure Banner */}
      {finderPresent && ownerPresent ? (
        <View style={styles.successBanner}>
          <Ionicons name="happy-outline" size={24} color="#4CAF50" />
          <Text style={styles.successText}>⭐Hoorayyy! Everyone is here 🤞🥳</Text>
        </View>
      ) : meetingFailed ? (
        <View style={styles.failureBanner}>
          <Ionicons name="sad-outline" size={24} color="#f44336" />
          <Text style={styles.failureText}>
            Meeting failed - {!finderPresent && !ownerPresent ? "Neither party" : "One party"} did not arrive
          </Text>
        </View>
      ) : null}

      {/* Edit Description Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditingDescription}
        onRequestClose={() => setIsEditingDescription(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Find Me Details</Text>
              <TouchableOpacity onPress={() => setIsEditingDescription(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              Briefly describe what you are wearing today and your exact location so the other person can find you.
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="e.g., Wearing a red jacket, standing near the entrance..."
              value={tempDescription}
              onChangeText={setTempDescription}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />

            <Text style={styles.charCount}>
              {tempDescription.length}/200 characters
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { opacity: tempDescription.trim().length === 0 ? 0.5 : 1 }
              ]}
              onPress={handleSaveDescription}
              disabled={tempDescription.trim().length === 0 || isUpdating}
            >
              <Text style={styles.saveButtonText}>
                {isUpdating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  attendanceRowDisabled: {
    opacity: 0.6,
  },
  personInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  personText: {
    flex: 1,
  },
  personLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: "#999",
  },
  statusPresent: {
    color: Colors.light.purple,
    fontWeight: "600",
  },
  statusAbsent: {
    color: "#f44336",
    fontWeight: "600",
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadgeActive: {
    backgroundColor: "#E8F5E9",
  },
  statusBadgeInactive: {
    backgroundColor: "#FFEBEE",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    gap: 10,
  },
  successText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF50",
    flex: 1,
  },
  failureBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    gap: 10,
  },
  failureText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f44336",
    flex: 1,
  },
  descriptionContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  descriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  editButton: {
    padding: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalHint: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#333",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.light.purple,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});