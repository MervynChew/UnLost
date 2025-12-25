import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons'; 
import { Colors } from "../../constants/theme"; 

type ScheduleProps = {
  setDateAndTime: (date : Date) => void;
  setPlace: (place: string) => void;
  setReschedule: (reschedule: boolean) => void;
  initialDate?: Date;
  initialPlace?: string;
}

export default function Schedule({setDateAndTime, setPlace, setReschedule, initialDate, initialPlace}: ScheduleProps) {
  const [date, setDate] = useState(initialDate || new Date(Date.now() + 10 * 60 * 1000));
  
  // Controls for Date/Time Modal
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Controls for Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string>(initialPlace || "");
  const [customPlace, setCustomPlace] = useState(""); // For typing in

  const predefinedPlaces = [
    "Library Entrance",
    "Main Cafeteria",
    "Student Center",
    "Bus Stop A",
    "Admin Building"
  ];

  // Update parent component when initial values are provided
  useEffect(() => {
    if (initialDate) {
      setDateAndTime(initialDate);
    }
    if (initialPlace) {
      setPlace(initialPlace);
    }
  }, [initialDate, initialPlace]);

  // --- Date & Time Handlers ---
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);

    const now = new Date(); // get current date and time
    const minDateTime = new Date(now.getTime() + 10 * 60 * 1000); // set the fastest meeting time can only be 10 minutes later
    
    if (selectedDate) {
      if (selectedDate >= minDateTime){
        // if user choose today to have the meeting, prevent let user choose the past time
        if (selectedDate.getFullYear() === minDateTime.getFullYear() && selectedDate.getMonth() === minDateTime.getMonth() && selectedDate.getDate() === minDateTime.getDate()) {
          const selectedMinutes = selectedDate.getHours() * 60 + selectedDate.getMinutes();
          const minMinutes = minDateTime.getHours() * 60 + minDateTime.getMinutes();

          if (selectedMinutes < minMinutes) {
            return;
          }
        }

        // 1. Create clean strings that only care about Minute precision
        // slice(0, 16) keeps "YYYY-MM-DDTHH:mm" and cuts off ":ss.ms"
        const currentString = date.toISOString().slice(0, 16);
        const newString = selectedDate.toISOString().slice(0, 16);

        // 2. Compare the CLEAN strings
        if (currentString !== newString) {
          setDate(selectedDate);
          setDateAndTime(selectedDate); 
          setReschedule(true);
        }
      }
    }
  };

  const openDatePicker = (mode: 'date' | 'time') => {
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 10 * 60 * 1000);

    // If previously selected date is already lesser than 10 minues, when user click on the openDatePicker auto set to the next valid time
    if (date < minDateTime) {
      setDate(minDateTime);
    }

    setPickerMode(mode);
    setShowPicker(true);
  };

  // --- Location Handlers ---
  const handleSelectPlace = (place: string) => {
    // 1. Close the modal immediately (User expects it to close regardless)
    setShowLocationModal(false); 

    // 2. ONLY set reschedule if they picked a DIFFERENT place
    if (place !== selectedPlace) {
      setSelectedPlace(place);
      setCustomPlace(""); 
      setPlace(place);
      setReschedule(true);
    }
  };

  const handleCustomPlaceSubmit = () => {
    if (customPlace.trim().length > 0) {
      setSelectedPlace(customPlace);
      setPlace(customPlace);
      setShowLocationModal(false);
      setReschedule(true);
    }
  };

  // Helpers for text
  const formattedDate = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.cardContainer}>
      <Text style={styles.headerTitle}>Set Schedule</Text>

      {/* 1. DATE ROW */}
      <TouchableOpacity style={styles.inputRow} onPress={() => openDatePicker('date')}>
        <View style={styles.iconContainer}>
           <Ionicons name="calendar-outline" size={24} color={Colors.light.purple} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.valueText}>{formattedDate}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* 2. TIME ROW */}
      <TouchableOpacity style={styles.inputRow} onPress={() => openDatePicker('time')}>
        <View style={styles.iconContainer}>
           <Ionicons name="time-outline" size={24} color={Colors.light.purple} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.valueText}>{formattedTime}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* 3. LOCATION ROW (Opens the new Modal) */}
      <TouchableOpacity style={styles.inputRow} onPress={() => setShowLocationModal(true)}>
        <View style={styles.iconContainer}>
           <Ionicons name="location-outline" size={24} color={Colors.light.purple} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Meeting Point</Text>
          <Text style={[styles.valueText, !selectedPlace && { color: '#ccc' }]}>
            {selectedPlace || "Select Location"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>


      {/* ========================================= */}
      {/* MODAL 1: DATE & TIME PICKER        */}
      {/* ========================================= */}
      {showPicker && (
        Platform.OS === 'android' ? (
          <DateTimePicker 
             value={date} mode={pickerMode} is24Hour={false} display="default" minimumDate={new Date()}
             onChange={handleDateChange} 
          />
        ) : (
          <Modal transparent={true} animationType="slide" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
             <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowPicker(false)} />
                <View style={styles.bottomSheet}>
                   <View style={styles.toolbar}><TouchableOpacity onPress={() => setShowPicker(false)}><Text style={styles.doneText}>Done</Text></TouchableOpacity></View>
                   <DateTimePicker value={date} mode={pickerMode} display="spinner" onChange={handleDateChange} style={{height: 200}} />
                </View>
             </View>
          </Modal>
        )
      )}

      {/* ========================================= */}
      {/* MODAL 2: LOCATION PICKER         */}
      {/* ========================================= */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={showLocationModal} 
        onRequestClose={() => setShowLocationModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          
          {/* Backdrop closes modal */}
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowLocationModal(false)} />
          
          <View style={[styles.bottomSheet, { height: '60%' }]}>
            
            {/* Header */}
            <View style={styles.toolbar}>
              <Text style={styles.modalTitle}>Choose Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              
              {/* Option A: Type Custom */}
              <Text style={styles.sectionHeader}>Custom Location</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="e.g. Near the Red Fountain..."
                  style={styles.textInput}
                  value={customPlace}
                  onChangeText={setCustomPlace}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleCustomPlaceSubmit}>
                  <Text style={styles.addButtonText}>Set</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.orText}>- OR SELECT -</Text>

              {/* Option B: Predefined List */}
              {predefinedPlaces.map((place, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.placeOptionRow} 
                  onPress={() => handleSelectPlace(place)}
                >
                  <Ionicons name="location-sharp" size={20} color={Colors.light.purple} />
                  <Text style={styles.placeOptionText}>{place}</Text>
                  {selectedPlace === place && <Ionicons name="checkmark" size={20} color={Colors.light.purple} />}
                </TouchableOpacity>
              ))}

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    minWidth: "90%",
    alignSelf: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  inputRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: { flex: 1 },
  label: { fontSize: 14, color: "#888", marginBottom: 4 },
  valueText: { fontSize: 18, fontWeight: "600", color: "#333" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginLeft: 55 },

  // --- Modal Styles ---
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fafafa",
  },
  doneText: { color: Colors.light.purple, fontWeight: "bold", fontSize: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700" },

  // --- Location Specific ---
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    marginBottom: 10,
    marginTop: 5,
  },
  inputWrapper: { flexDirection: "row", gap: 10, marginBottom: 20 },
  textInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: Colors.light.purple,
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  addButtonText: { color: "white", fontWeight: "bold" },
  orText: {
    textAlign: "center",
    color: "#ccc",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 20,
  },
  placeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
    gap: 10,
  },
  placeOptionText: { fontSize: 16, color: "#333", flex: 1 },
});