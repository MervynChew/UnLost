import React, {useState} from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Modal, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For the magnifying glass icon
import { Colors } from '../../constants/theme'; // Adjust your path

type SearchBarProps = {
  onSearchChange?: (tags: string[], status: string) => void;
};

export default function SearchBar({ onSearchChange}: SearchBarProps) {
  
  // Manage changes on search bar
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Items'); // Default status filter: List all items
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // --- ACTIONS ---

  // Add tag upon tapping "Enter"
  const handleAddTag = () => {
    if (inputValue.trim() === '') return; // Optional: Run search even if nothing is entered
    
    // Create new tag array
    const newTags = [...tags, inputValue.trim()];
    setTags(newTags);
    setInputValue(''); // Clear input
    
    // Notify parent
    if (onSearchChange) onSearchChange(newTags, statusFilter);
  };

  // 2. Remove tag upon tapping "x"
  const handleRemoveTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);

    // Notify parent
    if (onSearchChange) onSearchChange(newTags, statusFilter);
  };

  // Select/filter post status from dropdown menu
  const handleSelectStatus = (status: string) => {
    setStatusFilter(status);
    setDropdownVisible(false);

    // Notify Parent
    if (onSearchChange) onSearchChange(tags, status);
  };

  return (
    // Search input with tags below bar and filter status dropdown
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#666" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search"
        placeholderTextColor="#999"
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={handleAddTag} // "Enter" key
        returnKeyType="search"
      />

      {/* Filter Button */}
      <TouchableOpacity 
        style={styles.filterIconButton} 
        onPress={() => setDropdownVisible(true)}
      >
        <Ionicons name="options-outline" size={22} color="#666" />
      </TouchableOpacity>

      <Modal visible={dropdownVisible} transparent animationType="fade">
        {/* Pressing background closes dropdown */}
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          
          {/* The Menu Box */}
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownHeader}>Filter Status:</Text>
            
            <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelectStatus('All Items')}>
              <Text style={[styles.dropdownText, statusFilter === 'All Items' && styles.activeText]}>All Items</Text>
              {statusFilter === 'All Items' && <Ionicons name="checkmark" size={16} color={Colors.light.purple} />}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelectStatus('Unclaimed')}>
              <View style={styles.row}>
                <View style={[styles.dot, styles.unclaimedDot]} />
                <Text style={[styles.dropdownText, statusFilter === 'Unclaimed' && styles.activeText]}>Unclaimed</Text>
              </View>
              {statusFilter === 'Unclaimed' && <Ionicons name="checkmark" size={16} color={Colors.light.purple} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={() => handleSelectStatus('Claimed')}>
              <View style={styles.row}>
                <View style={[styles.dot, styles.claimedDot]} />
                <Text style={[styles.dropdownText, statusFilter === 'Claimed' && styles.activeText]}>Claimed</Text>
              </View>
              {statusFilter === 'Claimed' && <Ionicons name="checkmark" size={16} color={Colors.light.purple} />}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {tags.length > 0 && (
        <View style={styles.tagsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContent}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                
                {/* The X Button */}
                <TouchableOpacity onPress={() => handleRemoveTag(index)} style={styles.removeBtn}>
                  <Ionicons name="close" size={12} color={Colors.light.purple} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '40%',
    marginBottom: 10,
    zIndex: 10, // Ensures dropdown sits above other content if needed
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0', // Light grey background
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    marginHorizontal: 20, // Spacing from screen edges
    marginVertical: 30,

    // Shadow (Optional)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
    marginTop: 0,
  },
  input: {
    flex: 1, // Takes remaining space
    textAlignVertical: 'center',
    height: '100%',
    fontSize: 16,
    color: '#000',
  },
  filterIconButton: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#DDD', // Small divider line
    height: '60%',
    justifyContent: 'center',
  },
  // --- DROPDOWN STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Very subtle dim
  },
  dropdownMenu: {
    position: 'absolute',
    top: 90, // Adjust this to sit right below your search bar
    right: 25, // Aligned with the right edge of search bar
    width: 180,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    // Dropdown Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  dropdownHeader: {
    fontSize: 11,
    color: '#888',
    marginBottom: 5,
    textTransform: 'uppercase',
    paddingLeft: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  activeText: {
    fontWeight: 'bold',
    color: Colors.light.purple,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  unclaimedDot: { backgroundColor: '#e89b7f' }, // Peach
  claimedDot: { backgroundColor: '#a2f2a2' },   // Green

  // --- TAGS (CHIPS) STYLES ---
  tagsContainer: {
    marginTop: 15,
    height: 40, // Height for the scroll view
    paddingLeft: 20,
  },
  tagsContent: {
    paddingRight: 20,
    alignItems: 'center',
    gap: 10, // Space between tags
  },
  // STYLES COPIED FROM PostDetails.tsx AS REQUESTED
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow, // Using theme color
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: Colors.light.purple, // Using theme color
  },
  tagText: {
    color: Colors.light.purple,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginRight: 6,
  },
  removeBtn: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  }
});