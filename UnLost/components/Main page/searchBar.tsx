import React, {useState, useRef} from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Modal, Text, ScrollView, Pressable,} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For the magnifying glass icon
import { Colors } from '../../constants/theme'; // Adjust your path

type SearchBarProps = {
  onSearchChange?: (tags: string[], status: string) => void;
};

export default function SearchBar({ onSearchChange }: SearchBarProps) {
  
  // Manage changes on search bar
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Items'); // Default status filter: List all items
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 90, right: 25 });

  const filterButtonRef = useRef<View>(null);

  // Measure filter button position for dropdown
  const handleFilterPress = () => {
    if (filterButtonRef.current) {
      (filterButtonRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
        const top = y + height + 25; // 10px below button
        const right = 20; // 20px from right edge (aligns with search bar padding)
        setDropdownPosition({ top, right });
        setDropdownVisible(true);
      });
    }
  };

  // Add tag upon tapping "Enter"
  const handleAddTag = () => {
    if (inputValue.trim() === '') return;
    
    // Create new tag list/array
    const newTags = [...tags, inputValue.trim()];
    setTags(newTags);
    setInputValue(''); // Clear input
    
    // Notify parent
    if (onSearchChange) onSearchChange(newTags, statusFilter);
  };

  // Remove tag upon tapping "x", and notify parent
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
    <View style={styles.mainContainer}>
      {/* Search bar containing filter icon inside */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Search Item Traits..."
            placeholderTextColor="#999"
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleAddTag}
            returnKeyType="search"
          />

          {/* Filter Button */}
          <TouchableOpacity 
            ref={filterButtonRef}
            style={styles.filterButton} 
            onPress={handleFilterPress}
          >
            <Ionicons name="options-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        {/* Pressing background closes menu */}
        <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          
          {/* Menu Contents */}
          <View style={[
            styles.dropdownMenu, 
            { 
              top: dropdownPosition.top,
              right: dropdownPosition.right 
            }
          ]}>
            <ScrollView bounces={false} style={{ maxHeight: 250 }}>
              <Text style={styles.dropdownHeader}>Post Status</Text>
              
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => handleSelectStatus('All Items')}
              >
                <Text style={[styles.dropdownText, statusFilter === 'All Items' && styles.activeText]}>
                  All Items
                </Text>
                {statusFilter === 'All Items' && <Ionicons name="checkmark" size={16} color={Colors.light.purple} />}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => handleSelectStatus('Unclaimed')}
              >
                <View style={styles.row}>
                  <View style={[styles.dot, styles.unclaimedDot]} />
                  <Text style={[styles.dropdownText, statusFilter === 'Unclaimed' && styles.activeText]}>
                    Unclaimed
                  </Text>
                </View>
                {statusFilter === 'Unclaimed' && <Ionicons name="checkmark" size={16} color={Colors.light.purple} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => handleSelectStatus('Claimed')}
              >
                <View style={styles.row}>
                  <View style={[styles.dot, styles.claimedDot]} />
                  <Text style={[styles.dropdownText, statusFilter === 'Claimed' && styles.activeText]}>
                    Claimed
                  </Text>
                </View>
                {statusFilter === 'Claimed' && <Ionicons name="checkmark" size={16} color={Colors.light.purple} />}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Tags Container - Visible below searchBar, horizontally scrollable when needed */}
      {tags.length > 0 && (
        <View style={styles.tagsOuterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScrollContent}
            style={styles.tagsScrollView}
          >
            {tags.map((tag, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                <TouchableOpacity 
                  onPress={() => handleRemoveTag(index)} 
                  style={styles.removeBtn}
                >
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
  mainContainer: {
    backgroundColor: 'white',
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0', // Light grey background
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    marginRight: 0,
    marginLeft: 0,

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
  // Filter Button Styles
  filterButton: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#666',
    height: '60%',
    justifyContent: 'center',
  },
  // Filter Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)', // Very subtle dim
  },
  dropdownMenu: {
    position: 'absolute',
    width: 180,
    //maxHeight: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,

    // Shadow
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

  // Tags Styles
  tagsOuterContainer: {
    height: 40, // Fixed height for tags
  },
  tagsScrollView: {
    height: 40,
  },
  tagsScrollContent: {
    paddingLeft: 20, // First tag starts at 20px
    paddingRight: 20, // Allows scrolling past the right edge
    alignItems: 'center',
    gap: 8,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: Colors.light.purple,
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
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});