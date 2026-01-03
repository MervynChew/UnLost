import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { ScrollView, Alert, Image, View, StyleSheet, Text, Modal, TouchableOpacity, ActivityIndicator, Animated, Easing } from 'react-native';
import { supabase } from '../../lib/supabase';
import Header from '../General/header';

import { Colors } from "../../constants/theme";
import { ButtonOrange } from "../General/buttonOrange";
import BackButton from "../General/backButton";
import Footer from "../General/footer";
import Seperator from "../General/sectionSeperator";
import PostPerson from "./PostPerson";
import Confirmation from "./Confirmation";
import ClaimedBy from "./ClaimedBy";


import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Schedule from "./Schedule";
import Attendance from "./Attendance";

import JumpMenu from '../General/verticalNavi';


type Props = {
  propId?: number;
  onClose?: () => void;
};


export default function PostDetails({ propId, onClose }: Props) {
  const router = useRouter();

   // navi bar: 1. Add these at the top of PostDetails
  const scrollRef = React.useRef<ScrollView>(null);

  // Use a Record to store multiple Views by their string titles
  const sectionRefs = React.useRef<Record<string, View | null>>({});

  const [activeSection, setActiveSection] = useState("Posted by");

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const [postPersonName, setPostPersonName] = useState<any>("");
  const [postPersonProfile, setPostPersonProfile] = useState();


  const [viewId, setViewerId] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [time, setTime] = useState("");
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

  // Inside PostDetails component:
  const [sectionOffsets, setSectionOffsets] = useState<{ [key: string]: number }>({});

  const [meetingFailed, setMeetingFailed] = useState(false);

  const [postStatus, setPostStatus] = useState<string>("active");
  const [isItemCompleted, setIsItemCompleted] = useState(false);

  const [originalRequesterId, setOriginalRequesterId] = useState<string>("");

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
      setIsItemCompleted(data.status === "claimed");
      setPostStatus(data.status); 
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

    // Get the LATEST non-deleted request for this post
    const { data, error } = await supabase
      .from("schedule_requests")
      .select("*")
      .eq("post_id", Number(id))
      .not("status", "in", "(deleted,inactive)") // ⭐ Exclude both deleted and inactive
      .order("created_at", { ascending: false }) // Get newest first
      .limit(1) // Only get the latest one
      .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

    if (error) {
      console.error("Error fetching schedule request:", error);
      setHasScheduleRequest(false);
      setScheduleRequest(null);
      setLastModifiedBy("");
    } else if (data) {
      console.log("✅ Found active schedule request:", data);
      setScheduleRequest(data);
      setHasScheduleRequest(true);
      setLastModifiedBy(data.last_modified_by || data.owner_id);
      setOriginalRequesterId(data.owner_id); // ⭐ ADD THIS LINE

      // Check if item is completed
      if (data.status === "completed") {
        setIsItemCompleted(true);
      }

      if (data.meet_date && data.meet_time) {
        const dateTimeString = `${data.meet_date}T${data.meet_time}`;
        const dateObj = new Date(dateTimeString);
        setMeetupDate(dateObj);
        setOriginalMeetupDate(dateObj);
      }
      if (data.location) {
        setMeetupPlace(data.location);
        setOriginalMeetupPlace(data.location);
      }
    } else {
      console.log("ℹ️ No active schedule request found");
      // No active request exists (all are deleted or none exist)
      setHasScheduleRequest(false);
      setScheduleRequest(null);
      setLastModifiedBy("");
    }
  };

  // function to check if meeting has failed (means the time pass already but either one or both user didnt attend the meeting)
  const checkMeetingFailure = (): boolean => {
    if (!scheduleRequest?.meet_date || !scheduleRequest?.meet_time) return false;
    
    // ⚠️ COMMENT OUT FOR TESTING ⚠️
    
    const now = new Date();
    const meetingDateTime = new Date(`${scheduleRequest.meet_date}T${scheduleRequest.meet_time}`);
    const tenMinutesAfter = new Date(meetingDateTime.getTime() + 10 * 60 * 1000);
    
    const timePassed = now >= tenMinutesAfter;
    const bothAttended = scheduleRequest.finder_attendance && scheduleRequest.owner_attendance;
    
    return timePassed && !bothAttended;
    
    
    //return false; // FOR TESTING
  };

  const bothPartiesAttended = () => {
    return scheduleRequest?.finder_attendance && scheduleRequest?.owner_attendance;
  };

  // Check if the scheduled meeting time has already passed or not
  const isMeetingTimeExpired = () => {
    if (!scheduleRequest?.meet_date || !scheduleRequest?.meet_time) return false;
    
    const now = new Date();
    const meetingDateTime = new Date(`${scheduleRequest.meet_date}T${scheduleRequest.meet_time}`);
    
    return now >= meetingDateTime; 
  };

  const handleAutoFailMeeting = async () => {
    if (!scheduleRequest) return;

    console.log('Auto-failing meeting...');

    const { error } = await supabase
      .from("schedule_requests")
      .update({ 
        status: "failed",
      })
      .eq("request_id", scheduleRequest.request_id);

    if (error) {
      console.error("Error auto-failing meeting:", error);
      return;
    }

    console.log('Meeting auto-failed successfully');
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

  // Clean up sections from sectionOffsets when they shouldn't be shown
  useEffect(() => {
    const shouldShowAttendance = 
      hasScheduleRequest && 
      (scheduleRequest?.status === "accepted" || scheduleRequest?.status === "failed") &&
      (isPostOwner || isRequester);

    const shouldShowItemRetrieval = 
      !isItemCompleted &&
      hasScheduleRequest && 
      scheduleRequest?.status === "accepted" &&
      scheduleRequest?.finder_attendance && 
      scheduleRequest?.owner_attendance &&
      isRequester;

    const shouldShowClaimedBy = 
      isItemCompleted && 
      hasScheduleRequest && 
      scheduleRequest?.status === "completed";

    // Clean up sections that shouldn't be shown
    setSectionOffsets(prev => {
      const newOffsets = { ...prev };
      let updated = false;

      if (!shouldShowAttendance && newOffsets["Attendance Tracking"]) {
        delete newOffsets["Attendance Tracking"];
        updated = true;
      }

      if (!shouldShowItemRetrieval && newOffsets["Item Retrieval"]) {
        delete newOffsets["Item Retrieval"];
        updated = true;
      }

      if (!shouldShowClaimedBy && newOffsets["Claimed By"]) {
        delete newOffsets["Claimed By"];
        updated = true;
      }

      return updated ? newOffsets : prev;
    });

    // Reset active section if it's been removed
    if (
      (activeSection === "Attendance Tracking" && !shouldShowAttendance) ||
      (activeSection === "Item Retrieval" && !shouldShowItemRetrieval) ||
      (activeSection === "Claimed By" && !shouldShowClaimedBy)
    ) {
      setActiveSection("Schedule");
    }
  }, [hasScheduleRequest, scheduleRequest?.status, scheduleRequest?.finder_attendance, scheduleRequest?.owner_attendance, isPostOwner, isRequester, isItemCompleted]);

  // fallback if the cron is close/not work
  useEffect(() => {
    if (hasScheduleRequest && scheduleRequest?.status === "accepted") {
      const isFailed = checkMeetingFailure();
      setMeetingFailed(isFailed);
      
      if (isFailed && scheduleRequest.status !== 'failed') {
        handleAutoFailMeeting();
      }
      
      const interval = setInterval(() => {
        const isFailed = checkMeetingFailure();
        setMeetingFailed(isFailed);
        
        if (isFailed && scheduleRequest.status !== 'failed') {
          handleAutoFailMeeting();
        }
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [hasScheduleRequest, scheduleRequest]);

  useEffect(() => {
    fetchPostDetails();
    getViewer();
    fetchScheduleRequest();
  }, [id]);

  // COMPLETE REAL-TIME SUBSCRIPTION 
  useEffect(() => {
    if (!id) return;

    console.log("🔧 Setting up UNIFIED real-time subscription for post_id:", id);

    const channelName = `schedule-requests-post-${id}`;
    
    const scheduleChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events
          schema: 'public',
          table: 'schedule_requests',
          filter: `post_id=eq.${id}`
        },
        (payload) => {
          console.log('🔥 Real-time event received:', payload.eventType);
          console.log('📦 Payload:', JSON.stringify(payload, null, 2));
          
          // HANDLE INSERT - New meeting created
          if (payload.eventType === 'INSERT' && payload.new) {
            console.log('✨ INSERT event - New meeting request created');
            const newData = payload.new;
            
            // Ignore deleted/inactive requests
            if (newData.status === "deleted" || newData.status === "inactive") {
              console.log('⏭️ Ignoring INSERT of deleted/inactive request');
              return;
            }
            
            setScheduleRequest({ ...newData });
            setHasScheduleRequest(true);
            setLastModifiedBy(newData.last_modified_by || newData.owner_id);

            if (newData.meet_date && newData.meet_time) {
              const dateTimeString = `${newData.meet_date}T${newData.meet_time}`;
              const dateObj = new Date(dateTimeString);
              setMeetupDate(new Date(dateObj));
              setOriginalMeetupDate(new Date(dateObj));
            }
            if (newData.location) {
              setMeetupPlace(newData.location);
              setOriginalMeetupPlace(newData.location);
            }

            setMeetingFailed(false);
            console.log('✅ INSERT: New meeting state updated');
            return;
          }
          
          // HANDLE UPDATE - Meeting details changed
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newData = payload.new;
            
            // If status changed to "deleted" / inactive", treat like cancellation
            if (newData.status === "deleted" || newData.status === "inactive") {
              
              // Only reset if this is current schedule request
              if (scheduleRequest && newData.request_id === scheduleRequest.request_id) {
                setScheduleRequest(null);
                setHasScheduleRequest(false);
              }
              return;
            }
            
            // Normal update - force update by creating new object reference
            setScheduleRequest({ ...newData });
            setHasScheduleRequest(true);
            setLastModifiedBy(newData.last_modified_by || newData.owner_id);

            if (newData.meet_date && newData.meet_time) {
              const dateTimeString = `${newData.meet_date}T${newData.meet_time}`;
              const dateObj = new Date(dateTimeString);
              setMeetupDate(new Date(dateObj));
              setOriginalMeetupDate(new Date(dateObj));
            }
            if (newData.location) {
              setMeetupPlace(newData.location);
              setOriginalMeetupPlace(newData.location);
            }

            // Handle status changes
            if (newData.status === 'failed') {
              console.log('⚠️ Meeting marked as failed');
              setMeetingFailed(true);
            } else if (newData.status === 'accepted') {
              console.log('✅ Meeting accepted');
              setMeetingFailed(false);
            } else if (newData.status === 'pending') {
              console.log('⏳ Meeting pending');
              setMeetingFailed(false);
            } else if (newData.status === 'completed') {
              console.log('🎉 Item completed');
              setIsItemCompleted(true);
              setPostStatus("completed");
            }
            
            console.log('✅ UPDATE: Meeting update processed');
          }
        }
      )
      .subscribe();

      // NEW: Channel for posts table to detect status changes
      const postsChannel = supabase
        .channel(`posts-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `post_id=eq.${id}`
          },
          (payload) => {
            console.log('📮 Post updated:', payload.new);
            
            if (payload.new && payload.new.status === 'claimed') {
              console.log('✅ Post status changed to claimed');
              setIsItemCompleted(true);
              setPostStatus("claimed");
              fetchPostDetails(); // Refresh to get the claim_date
            }
          }
        )
        .subscribe();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up subscription:', channelName);
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [id, scheduleRequest]);

  // Periodic refresh when no active request exists
  useEffect(() => {
    if (!hasScheduleRequest && !loading) {
      console.log('📡 No active request - setting up polling');
      
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling for new requests...');
        fetchScheduleRequest();
      }, 3000); // Check every 3 seconds
      
      return () => {
        console.log('🛑 Stopping polling');
        clearInterval(pollInterval);
      };
    }
  }, [hasScheduleRequest, loading, id]);

  // ALSO ADD: Force refresh when coming back to screen (for React Native)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - refreshing data');
      
      // Immediate refresh
      fetchScheduleRequest();
      
      // ⭐ Add a second delayed refresh to catch any race conditions
      const timeoutId = setTimeout(() => {
        console.log('🔄 Delayed refresh to catch new requests');
        fetchScheduleRequest();
      }, 500); // 500ms delay
      
      return () => {
        clearTimeout(timeoutId);
      };
    }, [id]) // ⭐ Add 'id' as dependency
  );

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Inside your PostDetails component:
  const fadeAnim = useRef(new Animated.Value(0)).current; // Start invisible
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleClaimSuccess = () => {
    console.log('✅ Item completed successfully');

    // update local UI state
    setIsItemCompleted(true);
    setPostStatus("completed");

    // refresh data from backend to sync UI
    fetchPostDetails();
    fetchScheduleRequest();
  };


  const handleClaimFailure = () => {
    console.log('❌ Claim failed - meeting marked as failed');
    fetchScheduleRequest();
  };

  const handleScheduleUpdate = (newDate: Date) => {
    console.log("Full Date & Time received:", newDate.toLocaleString());
    // Create a new Date object to ensure React detects the change
    setMeetupDate(new Date(newDate));
  };


  // Check if anything changed when user in the reschedule page
  const hasChanges = () => {
    if (!hasScheduleRequest) return true; // For new requests always allow

    // Create clean comparison values
    const currentDateTime = new Date(meetupDate).getTime();
    const originalDateTime = new Date(originalMeetupDate).getTime();
    
    const currentPlace = meetupPlace.trim();
    const originalPlace = originalMeetupPlace.trim();
    
    console.log('Checking for changes:');
    console.log('Current DateTime:', new Date(currentDateTime).toLocaleString());
    console.log('Original DateTime:', new Date(originalDateTime).toLocaleString());
    console.log('Current Place:', currentPlace);
    console.log('Original Place:', originalPlace);
    
    const dateChanged = currentDateTime !== originalDateTime;
    const placeChanged = currentPlace !== originalPlace;
    
    console.log('Date changed:', dateChanged, 'Place changed:', placeChanged);

    return dateChanged || placeChanged;
  };

  // Check if selected time is valid (at least 10 minutes from now)
  const isValidMeetingTime = () => {
    const now = new Date();
    const minValidTime = new Date(now.getTime() + 9 * 60 * 1000); 
    return meetupDate >= minValidTime;
  };

  // submitToDatabase function
  const submitToDatabase = async () => {
    if (!meetupDate || !meetupPlace) {
      Alert.alert(
        "Failed To Submit Request",
        "Please ensure that the date, time and meeting point are selected before submitting."
      );
      return;
    }

    // Check if meeting time is valid (at least 10 minutes from now)
    if (!isValidMeetingTime()) {
      Alert.alert(
        "Invalid Meeting Time",
        "Meeting time must be at least 10 minutes from now. Please select a later time."
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

    try {
      // ============================================
      // CASE 1: EXISTING REQUEST EXISTS
      // ============================================
      if (hasScheduleRequest && scheduleRequest) {
        const currentStatus = scheduleRequest.status;
        
        // ============================================
        // CASE 1A: Meeting FAILED - Create NEW request
        // ============================================
        if (currentStatus === "failed") {
          console.log(`🆕 Creating NEW request after failed meeting`);

          // Step 1: Mark the old failed meeting as "inactive"
          console.log(`🔄 Marking failed meeting as inactive: ${scheduleRequest.request_id}`);
          const { error: inactiveError } = await supabase
            .from("schedule_requests")
            .update({ status: "inactive" })
            .eq("request_id", scheduleRequest.request_id);

          if (inactiveError) {
            console.error('Error marking as inactive:', inactiveError);
            Alert.alert("Error", `Failed to update old request: ${inactiveError.message}`);
            return;
          }

          // Step 2: Create NEW request with original requester ID
          const requestOwnerId = scheduleRequest.owner_id;
          
          const insertData = {
            post_id: Number(id),
            owner_id: requestOwnerId, // Keep original requester
            location: meetupPlace,
            meet_date: localDateString,
            meet_time: localTimeString,
            status: "pending",
            last_modified_by: viewId, // Current user is the one making changes
            finder_attendance: false,
            owner_attendance: false,
            finder_description: null,
            owner_description: null,
          };

          console.log('📝 Creating new request with owner_id:', requestOwnerId, 'modified by:', viewId);

          const { data, error } = await supabase
            .from("schedule_requests")
            .insert(insertData)
            .select();

          if (error) {
            Alert.alert("Error", `Failed to create new request: ${error.message}`);
            return;
          }

          if (!data || data.length === 0) {
            Alert.alert("Error", "Failed to create the new request. Please try again.");
            return;
          }

          Alert.alert("Success", "New meeting request created! The other party will be notified.");
          setRescheduleMeeting(false);
          await fetchScheduleRequest();
          return;
        }
        
        // ============================================
        // CASE 1B: Meeting DELETED - Create NEW request
        // ============================================
        if (currentStatus === "deleted") {
          console.log(`🆕 Creating NEW request (previous was deleted)`);

          const requestOwnerId = scheduleRequest.owner_id;
          
          const insertData = {
            post_id: Number(id),
            owner_id: requestOwnerId,
            location: meetupPlace,
            meet_date: localDateString,
            meet_time: localTimeString,
            status: "pending",
            last_modified_by: viewId,
            finder_attendance: false,
            owner_attendance: false,
            finder_description: null,
            owner_description: null,
          };

          const { data, error } = await supabase
            .from("schedule_requests")
            .insert(insertData)
            .select();

          if (error) {
            Alert.alert("Error", `Failed to create new request: ${error.message}`);
            return;
          }

          if (!data || data.length === 0) {
            Alert.alert("Error", "Failed to create the new request. Please try again.");
            return;
          }

          Alert.alert("Success", "New meeting request created!");
          setRescheduleMeeting(false);
          await fetchScheduleRequest();
          return;
        }
        
        // ============================================
        // CASE 1C: Meeting PENDING or ACCEPTED - UPDATE existing
        // ============================================
        if (currentStatus === "pending" || currentStatus === "accepted") {
          console.log(`🔄 Updating existing request (status: ${currentStatus})`);
          
          const updateData = {
            location: meetupPlace,
            meet_date: localDateString,
            meet_time: localTimeString,
            status: "pending", // ⭐ Reset to pending when rescheduling
            last_modified_by: viewId, // ⭐ CRITICAL: This determines who gets notification
            // Reset attendance when rescheduling
            finder_attendance: false,
            owner_attendance: false,
            finder_description: null,
            owner_description: null,
          };

          console.log('📝 Updating request with last_modified_by:', viewId);

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

          // ⭐ Better success message based on who's updating
          const isReschedule = currentStatus === "accepted";
          const message = isReschedule 
            ? "Meeting rescheduled! The other party will be notified and needs to confirm."
            : "Meeting time updated! Waiting for confirmation.";

          Alert.alert("Success", message);
          setRescheduleMeeting(false);
          await fetchScheduleRequest();
          return;
        }
        
        // Fallback for any other unexpected status
        Alert.alert("Error", `Cannot reschedule from status: ${currentStatus}`);
        return;
      }
      
      // ============================================
      // CASE 2: NO EXISTING REQUEST - First time scheduling
      // ============================================
      else {
        console.log("🆕 Creating FIRST request (no previous request)");
        
        const insertData = {
          post_id: Number(id),
          owner_id: viewId, // First request: current user is the requester
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

        Alert.alert("Success", "Request Sent! The post owner will be notified.");
        setRescheduleMeeting(false);
        await fetchScheduleRequest();
      }
    } catch (error) {
      console.error('❌ Unexpected error in submitToDatabase:', error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const handleJump = (title: string) => {
    const sectionView = sectionRefs.current[title];
    const scrollViewNode = scrollRef.current;

    // Check if both the section and the scrollview are ready
    if (sectionView && scrollViewNode) {
      sectionView.measureLayout(
        scrollViewNode as any,
        (x, y) => {
          scrollRef.current?.scrollTo({ y: y - 10, animated: true });
        },
        () => { console.warn(`Measurement failed for: ${title}`); }
      );
    } else {
      // This happens if the user clicks before the page has finished loading
      console.log(`Ref for ${title} is not attached yet. Page might still be loading.`);
    }
  };

  const showBar = () => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 10,
      useNativeDriver: true,
    }).start();

    // Clear existing timer
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    // Set timer to hide after 1.5 seconds of no scrolling
    scrollTimeout.current = setTimeout(() => {
      hideBar();
    }, 1500);
  };

  const hideBar = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  // Accept Schedule Request
  const handleAcceptRequest = async () => {
    if (!scheduleRequest) return;

    // If meeting time passed, unable to accept meeting
    if (isMeetingTimeExpired()) {
      Alert.alert(
        "Meeting Time Passed",
        "The proposed meeting time has already passed. Please reschedule a new time.",
        [{ text: "OK" }]
      );
      return;
    }

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


  // Cancel meeting request and change the status to 'deleted'
  const handleCancelRequest = async () => {
    if (!scheduleRequest) {
      console.log('❌ No schedule request to cancel');
      return;
    }

    console.log('🚫 Cancel request initiated for:', scheduleRequest.request_id);
    console.log('👤 Current user:', viewId);
    console.log('📝 Request owner:', scheduleRequest.owner_id);
    console.log('📮 Post owner:', ownerId);

    // Check permissions - only owner or requester can cancel
    const canCancel = viewId === scheduleRequest.owner_id || viewId === ownerId;
    
    if (!canCancel) {
      console.log('❌ User does not have permission to cancel this request');
      Alert.alert("Error", "You don't have permission to cancel this meeting.");
      return;
    }

    console.log('✅ User has permission to cancel');

    Alert.alert(
      "Cancel Meeting",
      "Are you sure you want to cancel this meeting request? You can create a new request later if needed.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🔄 Updating meeting status to deleted:', scheduleRequest.request_id);
              
              // UPDATE status to 'deleted' instead of deleting the row
              const { data, error } = await supabase
                .from("schedule_requests")
                .update({ 
                  status: "deleted",
                  last_modified_by: viewId 
                })
                .eq("request_id", scheduleRequest.request_id)
                .select();

              if (error) {
                console.error('❌ Update error:', error);
                Alert.alert("Error", `Failed to cancel: ${error.message}`);
                return;
              }

              console.log('✅ Status updated to deleted:', data);
              
              Alert.alert("Cancelled", "The meeting request has been cancelled.");
              
              // Refresh to get the updated state
              await fetchScheduleRequest();
              
            } catch (err) {
              console.error('❌ Unexpected error during cancellation:', err);
              Alert.alert("Error", "An unexpected error occurred. Please try again.");
            }
          },
        }
      ]
    );
  };

  // function to handle reschedule if a meeting is failed
  const handleRescheduleClick = () => {
    console.log('Opening reschedule mode');
    
    // If meeting failed, reset to NEXT VALID time (current + 10 minutes)
    if (scheduleRequest?.status === 'failed') {
      const now = new Date();
      const nextValidTime = new Date(now.getTime() + 10 * 60 * 1000); // Add 10 minutes
      
      // Round to nearest minute to avoid millisecond issues
      nextValidTime.setSeconds(0);
      nextValidTime.setMilliseconds(0);
      
      console.log('Resetting to next valid time:', nextValidTime.toLocaleString());
      setMeetupDate(nextValidTime);
      setMeetupPlace('');
    }
    
    setRescheduleMeeting(true);
  };

  // Calculate which sections should be shown dynamically
  const getNavigationSections = () => {
    const sections = ['Posted by', 'Tags', 'Description'];
    
    // Always show Schedule unless item is completed
    if (!isItemCompleted) {
      sections.push('Schedule');
    }
    
    // Show Attendance Tracking if meeting is accepted or failed
    if (
      !isItemCompleted &&  // ⭐ ADD: Don't show when completed
      hasScheduleRequest && 
      (scheduleRequest?.status === "accepted" || scheduleRequest?.status === "failed") &&
      (isPostOwner || isRequester)
    ) {
      sections.push('Attendance Tracking');
    }
    
    // Show Item Retrieval when both attended and not yet completed
    if (
      !isItemCompleted &&
      hasScheduleRequest && 
      scheduleRequest?.status === "accepted" &&
      scheduleRequest?.finder_attendance && 
      scheduleRequest?.owner_attendance &&
      isRequester
    ) {
      sections.push('Item Retrieval');
    }
    
    // Show Claimed By when item is completed
    if (isItemCompleted && hasScheduleRequest && scheduleRequest?.status === "completed") {
      sections.push('Claimed By');
    }
    
    return sections;
  };

  interface CancelButtonProps {
    onPress: () => void;
  }

  const CancelButton: React.FC<CancelButtonProps> = ({ onPress }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.cancelIconButton}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="close-circle-outline" 
          size={24} 
          color="#f44336" 
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>

      {/* 2. Place the Jump Menu right under the Header */}
      <JumpMenu 
        sections={getNavigationSections()}
        onTabPress={handleJump} 
        activeSection={activeSection}
        opacity={fadeAnim}
      />

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
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={(event) => {
          showBar();
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const scrollY = contentOffset.y;
          
          const isCloseToBottom = layoutMeasurement.height + scrollY >= contentSize.height - 20;

          if (isCloseToBottom) {
            // When at bottom, set to last visible section
            const sections = getNavigationSections();
            setActiveSection(sections[sections.length - 1]);
            return;
          }

          const threshold = scrollY + 160;

          // Check sections in reverse order (bottom to top)
          if (sectionOffsets["Claimed By"] && threshold >= sectionOffsets["Claimed By"]) {
            setActiveSection("Claimed By");
          } else if (sectionOffsets["Item Retrieval"] && threshold >= sectionOffsets["Item Retrieval"]) {
            setActiveSection("Item Retrieval");
          } else if (sectionOffsets["Attendance Tracking"] && threshold >= sectionOffsets["Attendance Tracking"]) {
            setActiveSection("Attendance Tracking");
          } else if (sectionOffsets["Schedule"] && threshold >= sectionOffsets["Schedule"]) {
            setActiveSection("Schedule");
          } else if (threshold >= sectionOffsets["Description"]) {
            setActiveSection("Description");
          } else if (threshold >= sectionOffsets["Tags"]) {
            setActiveSection("Tags");
          } else {
            setActiveSection("Posted by");
          }
        }}
      >
        <Header
          title="Post Details"
          subtitle="Help the item find back their own parent"
        />

        {/* The Annotated Image from Server */}
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

        {/* Posted by Section */}
        <View 
          style={styles.sectionView}
          ref={(el) => { sectionRefs.current["Posted by"] = el; }}
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setSectionOffsets(prev => ({ ...prev, "Posted by": y }));
          }}
        >
          <View style={styles.sectionView}>
            <Seperator title="Posted by" />
            <PostPerson id={id} />
          </View>
        </View>

        {/* Tags Section */}
        <View 
          style={styles.sectionView}
          ref={(el) => { sectionRefs.current["Tags"] = el; }}
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setSectionOffsets(prev => ({ ...prev, "Tags": y }));
          }}
        >
          <Seperator title="Tag"/>

          <View style={styles.tagsWrapper}>
            {post.tags &&
              post.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                </View>
              ))}
          </View>

          <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Manage Tags</Text>

                <View style={styles.modalTagWrapper}>
                  {post.tags && post.tags.map((tag: string, index: number) => (
                    <View key={index} style={styles.modalTag}>
                      <Text style={styles.modalTagText}>{tag}</Text>
                    </View>
                  ))}
                  {(!post.tags || post.tags.length === 0) && (
                    <Text style={{ color: "#999" }}>No tags yet.</Text>
                  )}
                </View>

                <ButtonOrange 
                  title="Close" 
                  variant="primary" 
                  onPress={() => setModalVisible(false)} 
                />
              </View>
            </View>
          </Modal>
        </View>

        {/* Description Section */}
        <View 
          style={styles.sectionView}
          ref={(el) => { sectionRefs.current["Description"] = el; }}
          onLayout={(e) => {
            const y = e.nativeEvent.layout.y;
            setSectionOffsets(prev => ({ ...prev, "Description": y }));
          }}
        >
          <Seperator title="Description:"/>

          <View style={styles.descriptionBox}>
            <Text style={styles.inputDescriptionBox}>
              {post.description || "No description provided."}
            </Text>
          </View>
        </View>

        {/* Schedule Section */}
        {!isItemCompleted && (
          <View 
            style={styles.sectionView}
            ref={(el) => { sectionRefs.current["Schedule"] = el; }}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              setSectionOffsets(prev => ({ ...prev, "Schedule": y }));
            }}
          >
            <Seperator title="Schedule"/>

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
                    textStyle={{fontSize: 13}}
                    style={{
                      ...styles.confirmButton,
                      opacity: !meetupDate || !meetupPlace ? 0.5 : 1,
                    }}
                    disabled={!meetupDate || !meetupPlace}
                  />
                </View>
              </>
            )}

            {/* case 3: For owner view (item claimer/requester) */}
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
                        title="Update"
                        variant={"secondary"}
                        textStyle={{fontSize: 13}}
                        style={{
                          ...styles.rescheduleButton,
                          opacity: (!meetupDate || !meetupPlace || !hasChanges() || !isValidMeetingTime()) ? 0.5 : 1,
                        }}
                        disabled={!meetupDate || !meetupPlace || !hasChanges() || !isValidMeetingTime()}
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
                        {lastModifiedBy === viewId ? (
                          // Item owner waiting for confirmation, 
                            <View style={styles.statusContainerWithCancel}>
                              {/* Cancel Button in top-right */}
                              <CancelButton onPress={handleCancelRequest} />
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
                            <ButtonOrange
                              onPress={handleRescheduleClick}
                              title="Reschedule"
                              variant="primary"
                              style={styles.singleBtn}
                            />
                          </View>
                        ) : (
                          //owner proposed new time
                          <View style={[styles.statusContainerWithCancel, { backgroundColor: "#FFF3E0" }]}>
                            {/* Cancel Button in top-right */}
                            <CancelButton onPress={handleCancelRequest} />

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
                                textStyle={{fontSize: 13}}
                                style={styles.actionBtn}
                              />
                              <ButtonOrange
                                onPress={handleRescheduleClick}
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
                      <View style={[styles.statusContainerWithCancel, { backgroundColor: "#E8F5E9" }]}>
                        {/* Cancel Button in top-right */}
                        {!bothPartiesAttended() && <CancelButton onPress={handleCancelRequest} />}

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
                        {!bothPartiesAttended() && (
                          <ButtonOrange
                            onPress={handleRescheduleClick}
                            title="Reschedule"
                            variant="primary"
                            style={styles.singleBtn}
                          />
                        )}
                      </View>
                    )}

                    {/* Failed status - meeting was marked as failed */}
                    {scheduleRequest.status === "failed" && (
                      <View style={[styles.statusContainerWithCancel, { backgroundColor: "#FFEBEE" }]}>
                        {/* Cancel Button in top-right */}
                        <CancelButton onPress={handleCancelRequest} />
                        <Ionicons name="close-circle" size={50} color="#f44336" />
                        <Text style={[styles.statusTitle, { color: "#f44336" }]}>Meeting Failed</Text>
                        <Text style={styles.statusSubtitle}>
                          This meeting was unsuccessful. You can reschedule a new meeting time.
                        </Text>
                        <View style={styles.detailsBox}>
                          <View style={styles.detailRow}>
                            <Ionicons name="calendar" size={20} color="#f44336" />
                            <Text style={styles.detailText}>
                              {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="time" size={20} color="#f44336" />
                            <Text style={styles.detailText}>
                              {scheduleRequest.meet_time}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="location" size={20} color="#f44336" />
                            <Text style={styles.detailText}>
                              {scheduleRequest.location}
                            </Text>
                          </View>
                        </View>

                        {/* Failure Reason Banner */}
                        <View style={styles.failureReasonBanner}>
                          <Ionicons name="information-circle" size={22} color="#d32f2f" />
                          <Text style={styles.failureReasonText}>
                            {!scheduleRequest.finder_attendance && !scheduleRequest.owner_attendance
                              ? "Reason: Neither party attended the meeting."
                              : !scheduleRequest.finder_attendance
                                ? "Reason: Finder did not attend the meeting."
                                : !scheduleRequest.owner_attendance
                                  ? "Reason: You did not attend the meeting."
                                  : "Reason: Item was not successfully received."}
                          </Text>
                        </View>
                        <ButtonOrange
                          onPress={handleRescheduleClick}
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

            {/* case 4: For finder view (post owner) */}
            {hasScheduleRequest && isPostOwner && (
              <>
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
                        title="Propose"
                        variant={"secondary"}
                        textStyle={{fontSize: 13}}
                        style={{
                          ...styles.rescheduleButton,
                          opacity: (!meetupDate || !meetupPlace || !hasChanges() || !isValidMeetingTime()) ? 0.5 : 1,
                        }}
                        disabled={!meetupDate || !meetupPlace || !hasChanges() || !isValidMeetingTime()}
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
                    {scheduleRequest.status === "pending" && (
                      <>
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
                              onPress={handleRescheduleClick}
                              title="Reschedule"
                              variant="primary"
                              style={styles.singleBtn}
                            />
                          </View>
                        ) : (
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
                                textStyle={{fontSize: 13}}
                                style={styles.actionBtn}
                              />
                              <ButtonOrange
                                onPress={handleRescheduleClick}
                                title="Reschedule"
                                variant="primary"
                                style={styles.actionBtn}
                              />
                            </View>
                          </View>
                        )}
                      </>
                    )}

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
                        {!bothPartiesAttended() && (
                          <ButtonOrange
                            onPress={handleRescheduleClick}
                            title="Reschedule"
                            variant="primary"
                            style={styles.singleBtn}
                          />
                        )}
                      </View>
                    )}

                    {/* Failed status - meeting was marked as failed - POST OWNER NOW HAS CANCEL RIGHTS */}
                    {scheduleRequest.status === "failed" && (
                      <View style={[styles.statusContainerWithCancel, { backgroundColor: "#FFEBEE" }]}>
                      {/* Cancel Button in top-right for POST OWNER too */}
                      <CancelButton onPress={handleCancelRequest} />

                        <Ionicons name="close-circle" size={50} color="#f44336" />
                        <Text style={[styles.statusTitle, { color: "#f44336" }]}>Meeting Failed</Text>
                        <Text style={styles.statusSubtitle}>
                          This meeting was unsuccessful. You can propose a new meeting time.
                        </Text>
                        <View style={styles.detailsBox}>
                          <View style={styles.detailRow}>
                            <Ionicons name="calendar" size={20} color="#f44336" />
                            <Text style={styles.detailText}>
                              {new Date(scheduleRequest.meet_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="time" size={20} color="#f44336" />
                            <Text style={styles.detailText}>
                              {scheduleRequest.meet_time}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="location" size={20} color="#f44336" />
                            <Text style={styles.detailText}>
                              {scheduleRequest.location}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.failureReasonBanner}>
                          <Ionicons name="information-circle" size={22} color="#d32f2f" />
                          <Text style={styles.failureReasonText}>
                            {!scheduleRequest.finder_attendance && !scheduleRequest.owner_attendance
                              ? "Reason: Neither party attended the meeting."
                              : !scheduleRequest.finder_attendance
                                ? "Reason: You did not attend the meeting."
                                : !scheduleRequest.owner_attendance
                                  ? "Reason: Item owner did not attend the meeting."
                                  : "Reason: Item was not successfully received."}
                          </Text>
                        </View>
                        <ButtonOrange
                          onPress={handleRescheduleClick}
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

            {/* case 5: users who are not the owner or the finder */}
            {hasScheduleRequest && !isPostOwner && !isRequester && (
              <View style={styles.statusContainer}>
                <Ionicons name="lock-closed" size={40} color="#999" />
                <Text style={styles.statusTitle}>Request Already Exists</Text>
                <Text style={styles.statusSubtitle}>
                  A meeting request already exists for this item.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Attendance section - Only show if meeting is accepted AND not failed */}
        {hasScheduleRequest && 
        (scheduleRequest?.status === "accepted" || scheduleRequest?.status === "failed") && 
        (isPostOwner || isRequester) && (
          <View 
            style={styles.sectionView}
            ref={(el) => { sectionRefs.current["Attendance Tracking"] = el; }}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              setSectionOffsets(prev => ({ ...prev, "Attendance Tracking": y }));
            }}
          >
            <Seperator title="Attendance Tracking"/>
            <Attendance 
              scheduleRequestId={scheduleRequest.request_id}
              isPostOwner={isPostOwner}
              finderAttendance={scheduleRequest.finder_attendance || false}
              ownerAttendance={scheduleRequest.owner_attendance || false}
              finderDescription={scheduleRequest.finder_description || ""}
              ownerDescription={scheduleRequest.owner_description || ""}
              meetDate={scheduleRequest.meet_date}
              meetTime={scheduleRequest.meet_time}
            />
          </View>
        )}

        {/* Confirmation Section - Show when both attended, status accepted, not completed */}
        {!isItemCompleted &&
          hasScheduleRequest && 
          scheduleRequest?.status === "accepted" &&
          scheduleRequest?.finder_attendance && 
          scheduleRequest?.owner_attendance &&
          isRequester  && (
          <View 
            style={styles.sectionView}
            ref={(el) => { sectionRefs.current["Item Retrieval"] = el; }}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              setSectionOffsets(prev => ({ ...prev, "Item Retrieval": y }));
            }}
          >
            <Seperator title="Item Retrieval"/>
            <Confirmation
              scheduleRequestId={scheduleRequest.request_id}
              postId={Number(id)}
              isPostOwner={isPostOwner}
              onSuccess={handleClaimSuccess}
              onFailure={handleClaimFailure}
            />
          </View>
        )}

        {/* Claimed By Section - Show when status is completed */}
        {isItemCompleted && hasScheduleRequest && scheduleRequest?.status === "completed" && (
          <View 
            style={styles.sectionView}
            ref={(el) => { sectionRefs.current["Claimed By"] = el; }}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              setSectionOffsets(prev => ({ ...prev, "Claimed By": y }));
            }}
          >
            <Seperator title="Claimed By"/>
            <ClaimedBy scheduleRequestId={scheduleRequest.request_id} />
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
    width: '100%',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    width: "100%",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
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
  resultLabel: {
    color: "#00FF9D",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  resultColor: {
    color: "#FFF",
    fontSize: 18,
    opacity: 0.9,
  },
  tag: {
    color: "black",
  },
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
    alignSelf: 'center',
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
    alignSelf: 'center',
  },
  inputDescriptionBox: {
    minHeight: 100,
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
  },
  editButton: {
    alignSelf: "flex-end",
    marginRight: "5%",
    marginTop: 10,
  },
  confirmButton: { width: "40%", minHeight: 40, marginRight: "2%" },
  rescheduleButton: { width: "30%", minHeight: 40, marginRight: "2%" },
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
  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalTagWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',  // Centers the tags horizontally
    width: '100%',             // Fill the width of the container
    // REMOVED: right: '10%'
  },
  modalTag: {
    backgroundColor: Colors.light.yellow,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalTagText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },
  scheduleSection: { width: "95%" },
  sectionView: {
    width: "100%",             // This is the calculation for the 5% margin
    alignItems: "center", // Pushes the Title and Content to the start of the box
    marginVertical: 12,
    // NO left or absolute positioning here
  },
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
  failureReasonBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFCDD2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#d32f2f",
  },
  failureReasonText: {
    flex: 1,
    fontSize: 14,
    color: "#b71c1c",
    fontWeight: "600",
    lineHeight: 20,
  },
  statusContainerWithCancel: {
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
    position: "relative", // Important for absolute positioning of cancel button
  },
  cancelIconButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(244, 67, 54, 0.1)", // Light red background
  },
});

