import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import {
  ScrollView,
  Alert,
  Image,
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import Header from "../General/header";

import { Colors } from "../../constants/theme";
import { ButtonOrange } from "../General/buttonOrange";
import BackButton from "../General/backButton";
import Footer from "../General/footer";
import Seperator from "../General/sectionSeperator";
import PostPerson from "./PostPerson";

import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Schedule from "./Schedule";
import ScheduleDisplay from "./ScheduleDisplay";

type Props = {
  propId?: number;
  onClose?: () => void;
};

export default function PostDetails({ propId, onClose }: Props) {
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [viewId, setViewerId] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [meetupDate, setMeetupDate] = useState(new Date());
  const [meetupPlace, setMeetupPlace] = useState("");

  const id = propId;

  const [rescheduleMeeting, setRescheduleMeeting] = useState(false);

  // Schedule Request States
  const [scheduleRequest, setScheduleRequest] = useState<any>(null);
  const [hasScheduleRequest, setHasScheduleRequest] = useState(false);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [isRequester, setIsRequester] = useState(false);
  
  // Track who last modified the request
  const [lastModifiedBy, setLastModifiedBy] = useState<string>("");

  // Store original values to see whether user has change any details or not, to allow user to send out the reschedule if there is changes made
  const [originalMeetupDate, setOriginalMeetupDate] = useState(new Date());
  const [originalMeetupPlace, setOriginalMeetupPlace] = useState("");

  const fetchPostDetails = async () => {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(full_name, profile_picture)")
      .eq("post_id", id)
      .single();

    if (error) {
      console.log(error);
      Alert.alert("Error", "Could not fetch item details.");
    } else {
      setPost(data);
      setOwnerId(data.user_id);
    }

    setLoading(false);
  };

  const getViewer = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    setViewerId(session.user.id);
  };

  // Fetch Existing Schedule Request
  const fetchScheduleRequest = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("schedule_requests")
      .select("*")
      .eq("post_id", Number(id))
      .single();

    if (error) {
      setHasScheduleRequest(false);
      setScheduleRequest(null);
      setLastModifiedBy("");
    } else if (data) {
      setScheduleRequest(data);
      setHasScheduleRequest(true);
      setLastModifiedBy(data.last_modified_by || data.owner_id);

      if (data.meet_date && data.meet_time) {
        const dateTimeString = `${data.meet_date}T${data.meet_time}`;
        const dateObj = new Date(dateTimeString);
        setMeetupDate(dateObj);
        setOriginalMeetupDate(dateObj); // store original details
      }
      if (data.location) {
        setMeetupPlace(data.location);
        setOriginalMeetupPlace(data.location); // store original details
      }
    }
  };

  // Determine User Role
  useEffect(() => {
    if (viewId && ownerId) {
      setIsPostOwner(viewId === ownerId);
    }

    if (viewId && scheduleRequest) {
      setIsRequester(viewId === scheduleRequest.owner_id);
    }
  }, [viewId, ownerId, scheduleRequest]);

  useEffect(() => {
    fetchPostDetails();
    getViewer();
    fetchScheduleRequest();
  }, [id]);

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  if (loading || !post) {
    return (
      <View
        style={[
          styles.mainContainer,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.light.purple} />
      </View>
    );
  }

  const handleScheduleUpdate = (newDate: Date) => {
    console.log("Full Date & Time received:", newDate.toLocaleString());
    setMeetupDate(newDate);
  };

  // Check if anything changed when user in the reschedule page
  const hasChanges = () => {
    if (!hasScheduleRequest) return true; // For new requests always allow

    // convert to same format for data comparison
    const currentDateTime = meetupDate.getTime();
    const originalDateTime = originalMeetupDate.getTime();
    
    const dateChanged = currentDateTime !== originalDateTime;
    const placeChanged = meetupPlace.trim() !== originalMeetupPlace.trim();

    return dateChanged || placeChanged;
  };

  // Submit or Update Request
  const submitToDatabase = async () => {
    if (!meetupDate || !meetupPlace) {
      Alert.alert(
        "Failed To Submit Request",
        "Please ensure that the date, time and meeting point are selected before submitting."
      );
      return;
    }

    // Check if anything changed during reschedule 
    if (hasScheduleRequest && !hasChanges()) {
      Alert.alert(
        "No Changes Made",
        "Please modify the date, time, or location before updating the request."
      );
      return;
    }

    const year = meetupDate.getFullYear();
    const month = String(meetupDate.getMonth() + 1).padStart(2, "0");
    const day = String(meetupDate.getDate()).padStart(2, "0");
    const localDateString = `${year}-${month}-${day}`;

    const hours = String(meetupDate.getHours()).padStart(2, "0");
    const minutes = String(meetupDate.getMinutes()).padStart(2, "0");
    const localTimeString = `${hours}:${minutes}:00`;

    // if updating an existing request (means it is reschedule)
    if (hasScheduleRequest && scheduleRequest) {
      const updateData = {
        location: meetupPlace,
        meet_date: localDateString,
        meet_time: localTimeString,
        status: "pending",
        last_modified_by: viewId,
      };

      const { data, error } = await supabase
        .from("schedule_requests")
        .update(updateData)
        .eq("request_id", scheduleRequest.request_id)
        .select();

      if (error) {
        Alert.alert("Error", `Failed to update: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert("Error", "Failed to update the request. Please try again.");
        return;
      }

      Alert.alert("Success", "Meeting request updated and waiting for confirmation!");
      setRescheduleMeeting(false);
      await fetchScheduleRequest();
    }
    // create a new request
    else {
      const insertData = {
        post_id: Number(id),
        owner_id: viewId,
        location: meetupPlace,
        meet_date: localDateString,
        meet_time: localTimeString,
        status: "pending",
        last_modified_by: viewId,
      };

      const { data, error } = await supabase
        .from("schedule_requests")
        .insert(insertData)
        .select();

      if (error) {
        Alert.alert("Error", `Failed to create request: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert("Error", "Failed to create the request. Please try again.");
        return;
      }

      Alert.alert("Success", "Request Sent!");
      setRescheduleMeeting(false); // reset reschedule state after creating new request
      await fetchScheduleRequest();
    }
  };

  // Accept Schedule Request
  const handleAcceptRequest = async () => {
    if (!scheduleRequest) return;

    const { data, error } = await supabase
      .from("schedule_requests")
      .update({ status: "accepted" })
      .eq("request_id", scheduleRequest.request_id)
      .select();

    if (error) {
      Alert.alert("Error", `Failed to accept: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      Alert.alert("Error", "Failed to accept the request. Please try again.");
      return;
    }

    Alert.alert("Success", "Meeting confirmed!");
    await fetchScheduleRequest();
  };

  // Cancel Schedule Request (for owner only, and delete the meeting request from database)
  const handleCancelRequest = async () => {
    if (!scheduleRequest) return;

    Alert.alert(
      "Cancel Meeting",
      "Are you sure you want to cancel this meeting request? This will permanently delete the request.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            const { data, error } = await supabase
              .from("schedule_requests")
              .delete()
              .eq("request_id", scheduleRequest.request_id)
              .select();

            if (error) {
              Alert.alert("Error", `Failed to delete: ${error.message}`);
              return;
            }

            Alert.alert("Cancelled", "The meeting request has been deleted.");
            setScheduleRequest(null);
            setHasScheduleRequest(false);
            setMeetupPlace("");
            setMeetupDate(new Date());
            setRescheduleMeeting(false);
            setLastModifiedBy("");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "card",
          gestureEnabled: true,
        }}
      />
      <StatusBar
        style="dark"
        translucent={true}
        backgroundColor="transparent"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Header
          title="Post Details"
          subtitle="Help the item find back their own parent"
        />

        <View style={styles.imageCard}>
          <Image
            source={{ uri: post.post_image }}
            style={[StyleSheet.absoluteFill, styles.imageBackground]}
            blurRadius={30}
            resizeMode="cover"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.2)" },
            ]}
          />
          <Image
            source={{ uri: post.post_image }}
            style={styles.resultImage}
            resizeMode="contain"
          />
        </View>

        <Seperator title="Posted by" />
        <PostPerson id={id} />
        <Seperator title="Tag" />

        <View style={styles.tagsWrapper}>
          {post.tags &&
            post.tags.map((tag: string, index: number) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
        </View>

        <Seperator title="Description:" />
        <View style={styles.descriptionBox}>
          <Text style={styles.inputDescriptionBox}>
            {post.description || "No description provided."}
          </Text>
        </View> 

        <Seperator title="Schedule" />

        {/* ======================================== Different view based on the situation ======================================== */}

        {/* case 1: Post owner viewing their own post with no requests yet */}
        {!hasScheduleRequest && isPostOwner && (
          <View style={styles.statusContainer}>
            <Ionicons
              name="hourglass-outline"
              size={40}
              color={Colors.light.purple}
            />
            <Text style={styles.statusTitle}>Waiting for Requests</Text>
            <Text style={styles.statusSubtitle}>
              No meeting requests have been received yet. If someone believes the item belongs to them, they will send you a meeting request.
            </Text>
          </View>
        )}

        {/* case 2: No schedule request exists, show the meeting request form to create one (for non-owners) */}
        {!hasScheduleRequest && !isPostOwner && (
          <>
            <View style={styles.scheduleSection}>
              <Schedule
                setDateAndTime={handleScheduleUpdate}
                setPlace={(place) => setMeetupPlace(place)}
                setReschedule={(reschedule) => setRescheduleMeeting(reschedule)}
              />
            </View>
            <View style={styles.bottomButton}>
              <ButtonOrange
                onPress={submitToDatabase}
                title="Send Request"
                variant={"secondary"}
                textStyle = {{fontSize: 13}} // override the font size
                style={{
                  ...styles.confirmButton,
                  opacity: !meetupDate || !meetupPlace ? 0.5 : 1,
                }}
                disabled={!meetupDate || !meetupPlace}
              />
            </View>
          </>
        )}

        {/* case 3: For owner view */}
        {hasScheduleRequest && isRequester && (
          <>
            {/* Show reschedule form when reschedule button is pressed */}
            {rescheduleMeeting ? (
              <>
                <View style={styles.scheduleSection}>
                  <Schedule
                    setDateAndTime={handleScheduleUpdate}
                    setPlace={(place) => setMeetupPlace(place)}
                    setReschedule={(reschedule) =>
                      setRescheduleMeeting(reschedule)
                    }
                    initialDate={meetupDate}
                    initialPlace={meetupPlace}
                  />
                </View>
                <View style={styles.bottomButton}>
                  <ButtonOrange
                    onPress={submitToDatabase}
                    title="Update Request"
                    variant={"secondary"}
                    textStyle = {{fontSize: 13}} // override the font size
                    style={{
                      ...styles.rescheduleButton,
                      opacity: (!meetupDate || !meetupPlace || !hasChanges()) ? 0.5 : 1,
                    }}
                    disabled={!meetupDate || !meetupPlace || !hasChanges()}
                  />
                  <ButtonOrange
                    onPress={() => {
                      setRescheduleMeeting(false);
                      fetchScheduleRequest();
                    }}
                    title="Cancel"
                    variant="primary"
                    style={styles.cancelButton}
                  />
                </View>
              </>
            ) : (
              <>
                {/* Pending status - check who last updated */}
                {scheduleRequest.status === "pending" && (
                  <>
                    {/* If the last modification was the owner (means they created or rescheduled the meeting) */}
                    {lastModifiedBy === viewId ? (
                      <View style={styles.statusContainer}>
                        <Ionicons
                          name="time-outline"
                          size={40}
                          color={Colors.light.purple}
                        />
                        <Text style={styles.statusTitle}>Waiting for Confirmation</Text>
                        <Text style={styles.statusSubtitle}>
                          The post owner will review your request.
                        </Text>
                        <View style={styles.detailsBox}>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="calendar"
                              size={20}
                              color={Colors.light.purple}
                            />
                            <Text style={styles.detailText}>
                              {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="time"
                              size={20}
                              color={Colors.light.purple}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.meet_time}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="location"
                              size={20}
                              color={Colors.light.purple}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.location}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.actionRow}>
                          <ButtonOrange
                            onPress={() => setRescheduleMeeting(true)}
                            title="Reschedule"
                            variant="primary"
                            style={styles.actionBtn}
                          />
                          <ButtonOrange
                            onPress={handleCancelRequest}
                            title="Cancel Meeting"
                            variant="secondary"
                            textStyle = {{fontSize: 13}}
                            style={styles.actionBtn}
                          />
                        </View>
                      </View>
                    ) : (
                      /* Post owner have rescheduled, and requester needs to accept or reschedule it if unavailable*/
                      <View
                        style={[styles.statusContainer, { backgroundColor: "#FFF3E0" }]}
                      >
                        <Ionicons
                          name="notifications"
                          size={40}
                          color={Colors.light.orange}
                        />
                        <Text style={styles.statusTitle}>New Time Proposed</Text>
                        <Text style={styles.statusSubtitle}>
                          The post owner suggested a new meeting time.
                        </Text>
                        <View style={styles.detailsBox}>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="calendar"
                              size={20}
                              color={Colors.light.orange}
                            />
                            <Text style={styles.detailText}>
                              {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="time"
                              size={20}
                              color={Colors.light.orange}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.meet_time}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="location"
                              size={20}
                              color={Colors.light.orange}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.location}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.actionRow}>
                          <ButtonOrange
                            onPress={handleAcceptRequest}
                            title="Accept"
                            variant="secondary"
                            textStyle = {{fontSize: 13}} // override the font size
                            style={styles.actionBtn}
                          />
                          <ButtonOrange
                            onPress={() => setRescheduleMeeting(true)}
                            title="Reschedule"
                            variant="primary"
                            style={styles.actionBtn}
                          />
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Accepted status - meeting confirmed */}
                {scheduleRequest.status === "accepted" && (
                  <View
                    style={[styles.statusContainer, { backgroundColor: "#E8F5E9" }]}
                  >
                    <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
                    <Text style={styles.statusTitle}>Meeting Confirmed! </Text>
                    <Text style={styles.statusSubtitle}>
                      Here are the meeting details:
                    </Text>
                    <View style={styles.detailsBox}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={20} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={20} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {scheduleRequest.meet_time}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="location" size={20} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {scheduleRequest.location}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <ButtonOrange
                        onPress={() => setRescheduleMeeting(true)}
                        title="Reschedule"
                        variant="primary"
                        style={styles.actionBtn}
                      />
                      <ButtonOrange
                        onPress={handleCancelRequest}
                        title="Cancel Meeting"
                        variant="secondary"
                        textStyle = {{fontSize: 13}} // override the font size
                        style={styles.actionBtn}
                      />
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* case 4: For finder view */}
        {hasScheduleRequest && isPostOwner && (
          <>
            {/* Show reschedule form when user pressed on reschedule button */}
            {rescheduleMeeting ? (
              <>
                <View style={styles.scheduleSection}>
                  <Schedule
                    setDateAndTime={handleScheduleUpdate}
                    setPlace={(place) => setMeetupPlace(place)}
                    setReschedule={(reschedule) =>
                      setRescheduleMeeting(reschedule)
                    }
                    initialDate={meetupDate}
                    initialPlace={meetupPlace}
                  />
                </View>
                <View style={styles.bottomButton}>
                  <ButtonOrange
                    onPress={submitToDatabase}
                    title="Propose New Time"
                    variant={"secondary"}
                    textStyle = {{fontSize: 13}} // override the font size
                    style={{
                      ...styles.rescheduleButton,
                      opacity: (!meetupDate || !meetupPlace || !hasChanges()) ? 0.5 : 1,
                    }}
                    disabled={!meetupDate || !meetupPlace || !hasChanges()}
                  />
                  <ButtonOrange
                    onPress={() => {
                      setRescheduleMeeting(false);
                      fetchScheduleRequest();
                    }}
                    title="Cancel"
                    variant="primary"
                    style={styles.cancelButton}
                  />
                </View>
              </>
            ) : (
              <>
                {/* Pending status - check who last updated */}
                {scheduleRequest.status === "pending" && (
                  <>
                    {/* If the last modification was the finder (means they rescheduled the meeting) */}
                    {lastModifiedBy === viewId ? (
                      <View style={styles.statusContainer}>
                        <Ionicons
                          name="time-outline"
                          size={40}
                          color={Colors.light.purple}
                        />
                        <Text style={styles.statusTitle}>Waiting for Confirmation</Text>
                        <Text style={styles.statusSubtitle}>
                          You proposed a new time. Waiting for the other person to accept.
                        </Text>
                        <View style={styles.detailsBox}>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="calendar"
                              size={20}
                              color={Colors.light.purple}
                            />
                            <Text style={styles.detailText}>
                              {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="time"
                              size={20}
                              color={Colors.light.purple}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.meet_time}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="location"
                              size={20}
                              color={Colors.light.purple}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.location}
                            </Text>
                          </View>
                        </View>
                        <ButtonOrange
                          onPress={() => setRescheduleMeeting(true)}
                          title="Reschedule"
                          variant="primary"
                          style={styles.singleBtn}
                        />
                      </View>
                    ) : (
                      /* the finder is viewing a request from owner */
                      <View
                        style={[styles.statusContainer, { backgroundColor: "#FFF3E0" }]}
                      >
                        <Ionicons
                          name="notifications"
                          size={40}
                          color={Colors.light.orange}
                        />
                        <Text style={styles.statusTitle}>New Meeting Request</Text>
                        <Text style={styles.statusSubtitle}>
                          Someone wants to meet regarding this item.
                        </Text>
                        <View style={styles.detailsBox}>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="calendar"
                              size={20}
                              color={Colors.light.orange}
                            />
                            <Text style={styles.detailText}>
                              {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="time"
                              size={20}
                              color={Colors.light.orange}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.meet_time}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons
                              name="location"
                              size={20}
                              color={Colors.light.orange}
                            />
                            <Text style={styles.detailText}>
                              {scheduleRequest.location}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.actionRow}>
                          <ButtonOrange
                            onPress={handleAcceptRequest}
                            title="Accept"
                            variant="secondary"
                            textStyle = {{fontSize: 13}} // override the font size
                            style={styles.actionBtn}
                          />
                          <ButtonOrange
                            onPress={() => setRescheduleMeeting(true)}
                            title="Reschedule"
                            variant="primary"
                            style={styles.actionBtn}
                          />
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Accepted - meeting confirmed */}
                {scheduleRequest.status === "accepted" && (
                  <View
                    style={[styles.statusContainer, { backgroundColor: "#E8F5E9" }]}
                  >
                    <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
                    <Text style={styles.statusTitle}>Meeting Confirmed!</Text>
                    <Text style={styles.statusSubtitle}>
                      Here are the meeting details:
                    </Text>
                    <View style={styles.detailsBox}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={20} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={20} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {scheduleRequest.meet_time}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="location" size={20} color="#4CAF50" />
                        <Text style={styles.detailText}>
                          {scheduleRequest.location}
                        </Text>
                      </View>
                    </View>
                    <ButtonOrange
                      onPress={() => setRescheduleMeeting(true)}
                      title="Reschedule"
                      variant="primary"
                      style={styles.singleBtn}
                    />
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* case 5: users who are not the owner or the finder, means someone else already make a request */}
        {hasScheduleRequest && !isPostOwner && !isRequester && (
          <View style={styles.statusContainer}>
            <Ionicons name="lock-closed" size={40} color="#999" />
            <Text style={styles.statusTitle}>Request Already Exists</Text>
            <Text style={styles.statusSubtitle}>
              A meeting request already exists for this item.
            </Text>
          </View>
        )}

        <Footer />
      </ScrollView>

      <View style={styles.fixedFooter}>
        <BackButton onPress={handleBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.light.white },
  container: { flex: 1, backgroundColor: Colors.light.white },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  imageCard: {
    width: "90%",
    height: 350,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#eee",
    position: "relative",
  },
  imageBackground: { opacity: 0.8 },
  resultImage: { width: "100%", height: "100%" },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
    alignItems: "center",
    width: "90%",
    backgroundColor: Colors.light.fakeWhite,
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: Colors.light.purple,
  },
  tagText: {
    color: Colors.light.purple,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  descriptionBox: {
    elevation: 5,
    shadowColor: "#110C2E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    backgroundColor: "white",
    width: "90%",
    minHeight: 100,
    borderRadius: 10,
    padding: 10,
  },
  inputDescriptionBox: {
    minHeight: 100,
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
  },
  confirmButton: { width: "40%", minHeight: 40, marginRight: "2%" },
  rescheduleButton: { width: "40%", minHeight: 40, marginRight: "2%" },
  cancelButton: { width: "30%", minHeight: 40 },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    alignSelf: "flex-end",
  },
  fixedFooter: {
    position: "absolute",
    bottom: -60,
    left: -240,
    right: 0,
    backgroundColor: Colors.light.white,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  scheduleSection: { width: "95%" },
  statusContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginVertical: 10,
    margin: 10,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 15,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },
  detailsBox: {
    width: "100%",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 10,
  },
  actionBtn: { flex: 1, minHeight: 40},
  singleBtn: { width: "80%", minHeight: 40, marginTop: 10, marginRight: 15, alignSelf: "center" },
});