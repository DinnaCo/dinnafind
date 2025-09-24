import type React from 'react';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { useBranchDeepLink } from '@/hooks/useBranchDeepLink';
import type { BucketListItem } from '@/models/bucket-list';
import { useThemeColors } from '@/hooks/useThemeColors';

import {
  fetchBucketList,
  markAsVisited,
  removeFromBucketList,
  updateBucketListItem,
} from '@/store/slices/bucketListSlice';

// Priority options for bucket list items
const PRIORITY_OPTIONS = ['high', 'medium', 'low', 'none'];

/**
 * Edit Modal Component for inline editing of bucket list items
 */
interface EditModalProps {
  item: BucketListItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updatedItem: BucketListItem) => void;
  styles: ReturnType<typeof createStyles>;
}

const EditModal: React.FC<EditModalProps> = ({
  item,
  visible,
  onClose,
  onSave,
  styles,
}) => {
  const colors = useThemeColors();
  // State for form fields - initialized with empty values
  const [notes, setNotes] = useState<string>('');
  const [priority, setPriority] = useState<string>('none');
  const [tags, setTags] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setNotes(item.notes || '');
      setPriority(item.priority || 'none');
      setTags(item.tags ? item.tags.join(', ') : '');
      setPlannedDate(
        item.plannedVisitDate
          ? new Date(item.plannedVisitDate).toISOString().split('T')[0]
          : '',
      );
    }
  }, [item]);

  // Handle saving the edited item
  const handleSave = () => {
    if (!item) return;

    // Parse tags from comma-separated string
    const tagsList = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Create updated item
    const updatedItem: BucketListItem = {
      ...item,
      notes,
      priority:
        priority === 'none'
          ? undefined
          : (priority as 'high' | 'medium' | 'low'),
      tags: tagsList,
      plannedVisitDate: plannedDate
        ? new Date(plannedDate).getTime()
        : undefined,
    };

    onSave(updatedItem);
  };

  // Return null if no item is provided
  if (!item) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Bucket List Item</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons color={colors.text} name="close" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Restaurant Name</Text>
            <Text style={styles.restaurantName}>{item.venue.name}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              multiline
              numberOfLines={3}
              placeholder="Add any notes about this place..."
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Priority</Text>
            <View style={styles.priorityContainer}>
              {PRIORITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.priorityOption,
                    priority === option &&
                      option !== 'none' &&
                      (option === 'high'
                        ? styles.highPriority
                        : option === 'medium'
                          ? styles.mediumPriority
                          : styles.lowPriority),
                    priority === option && styles.selectedPriority,
                  ]}
                  onPress={() => setPriority(option)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === option &&
                        option !== 'none' &&
                        styles.selectedPriorityText,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tags (comma separated)</Text>
            <TextInput
              placeholder="e.g. Mexican, Brunch, Outdoor Seating"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={tags}
              onChangeText={setTags}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Planned Visit Date (YYYY-MM-DD)
            </Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              value={plannedDate}
              onChangeText={setPlannedDate}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const BucketListScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const dispatch = useAppDispatch();
  const bucketListItems = useAppSelector((state) => state.bucketList.items);
  const loading = useAppSelector((state) => state.bucketList.loading);
  const error = useAppSelector((state) => state.bucketList.error);

  // Branch deep linking for sharing
  const {
    createAndShareVenueLink,
    createAndShareBucketListLink,
    isBranchAvailable,
  } = useBranchDeepLink(() => {});

  // State for edit modal
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [currentEditItem, setCurrentEditItem] = useState<BucketListItem | null>(
    null,
  );

  // Fetch bucket list on mount
  useEffect(() => {
    if (__DEV__) {
      logger.info('🪣 Fetching bucket list on mount');
    }

    // Wrap dispatch in try-catch to handle async errors gracefully
    try {
      // @ts-expect-error: fetchBucketList is a thunk action, which is allowed here
      dispatch(fetchBucketList());
    } catch (error) {
      logger.error('🪣 Error fetching bucket list:', error);
      // The error will be handled by Redux state, but we log it here for debugging
    }
  }, [dispatch]);

  // Debug effect to track state changes
  useEffect(() => {
    if (__DEV__) {
      logger.info(
        '🪣 BucketListScreen: Items count changed to',
        bucketListItems.length,
      );
      if (bucketListItems.length > 0) {
        logger.info(
          'Items:',
          bucketListItems.map((item) => item.venue.name),
        );
      }
    }
  }, [bucketListItems]);

  const handleRemoveItem = (item: BucketListItem) => {
    Alert.alert(
      'Remove from Bucket List',
      `Are you sure you want to remove ${item.venue.name} from your bucket list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // @ts-expect-error: removeFromBucketList is a thunk action, which is allowed here
            dispatch(removeFromBucketList(item.id));
          },
        },
      ],
    );
  };

  const handleMarkAsVisited = (item: BucketListItem) => {
    Alert.alert('Mark as Visited', `Mark ${item.venue.name} as visited?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Mark Visited',
        onPress: () => {
          // @ts-expect-error: markAsVisited is a thunk action, which is allowed here
          dispatch(markAsVisited({ id: item.id }));
        },
      },
    ]);
  };

  const handleItemPress = (item: BucketListItem) => {
    // Pass the complete venue data to avoid re-fetching with incompatible ID
    const venueData = {
      id: item.venue.id,
      fsq_id: item.fsq_id || item.venue.id,
      name: item.venue.name,
      categories: item.venue.categories || [],
      location: item.venue.location,
      geocodes: item.venue.geocodes,
      rating: item.venue.rating,
      iconUrl: item.venue.iconUrl,
    };

    router.push({
      pathname: '/detail',
      params: {
        data: encodeURIComponent(JSON.stringify(venueData)),
      },
    });
  };

  // Handle editing an item
  const handleEditItem = (item: BucketListItem) => {
    setCurrentEditItem(item);
    setEditModalVisible(true);
  };

  // Handle saving edited item
  const handleSaveEdit = (updatedItem: BucketListItem) => {
    dispatch(
      updateBucketListItem({
        id: updatedItem.id,
        updates: {
          notes: updatedItem.notes,
          priority: updatedItem.priority,
          tags: updatedItem.tags,
          plannedVisitDate: updatedItem.plannedVisitDate,
        },
      }) as any, // Type assertion to satisfy dispatch typing
    );
    setEditModalVisible(false);
    setCurrentEditItem(null);
  };

  // Handle closing edit modal
  const handleCloseEditModal = () => {
    setEditModalVisible(false);
    setCurrentEditItem(null);
  };

  const renderBucketListItem = ({
    item,
    index,
  }: {
    item: BucketListItem;
    index: number;
  }) => {
    const isVisited = !!item.visitedAt;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        key={item.fsq_id}
        style={[styles.itemContainer, isVisited && styles.visitedItemContainer]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemContent}>
          {/* Venue Image/Icon */}
          <View style={styles.imageContainer}>
            {item.venue.photo ? (
              <View style={styles.placeholderImage}>
                <Ionicons
                  color={colors.textSecondary}
                  name="restaurant"
                  size={24}
                />
              </View>
            ) : (
              // <Image
              //   key={item.fsq_id}
              //   source={{ uri: item.venue.photo }}
              //   style={styles.venueImage}
              // />
              <View style={styles.placeholderImage}>
                <Ionicons
                  color={colors.textSecondary}
                  name="restaurant"
                  size={24}
                />
              </View>
            )}
            {/* Priority badge - only show if priority exists */}
            {item.priority && (
              <View
                style={[
                  styles.priorityBadge,
                  item.priority === 'high'
                    ? styles.highPriority
                    : item.priority === 'medium'
                      ? styles.mediumPriority
                      : styles.lowPriority,
                ]}
              >
                <Ionicons color="#fff" name="flag" size={10} />
              </View>
            )}
            {/* Visited overlay */}
            {isVisited && (
              <View style={styles.visitedOverlay}>
                <Ionicons
                  color={colors.success}
                  name="checkmark-circle"
                  size={20}
                />
              </View>
            )}
          </View>

          {/* Venue Details */}
          <View style={styles.detailsContainer}>
            <Text
              numberOfLines={1}
              style={[styles.venueName, isVisited && styles.visitedText]}
            >
              {item.venue.name}
            </Text>
            <Text numberOfLines={1} style={styles.venueCategory}>
              {item.venue.categories && item.venue.categories.length > 0
                ? item.venue.categories[0].name
                : item.venue.category || 'Restaurant'}
            </Text>
            <Text numberOfLines={2} style={styles.venueAddress}>
              {item.venue.location?.formatted_address ||
                item.venue.location?.formattedAddress ||
                item.venue.location?.address ||
                item.venue.address ||
                'Address not available'}
            </Text>

            {/* Rating and visited status */}
            <View style={styles.statusRow}>
              {typeof item.venue.rating === 'number' && !isNaN(item.venue.rating) && item.venue.rating > 0 && (
                <View style={styles.ratingContainer}>
                  <Ionicons color="#FFD700" name="star" size={12} />
                  <Text style={styles.ratingText}>{String(item.venue.rating.toFixed(1))}/10</Text>
                </View>
              )}

              {isVisited && item.visitedAt && (
                <View style={styles.visitedBadge}>
                  <Ionicons color={colors.success} name="checkmark" size={12} />
                  <Text style={styles.visitedBadgeText}>
                    Visited {new Date(item.visitedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {!isVisited && item.plannedVisitDate && (
                <View style={styles.plannedBadge}>
                  <Ionicons color="#2196F3" nam e="calendar" size={12} />
                  <Text style={styles.plannedBadgeText}>
                    Planned
                    {new Date(item.plannedVisitDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <View key={`${item.id}-tag-${index}`} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>
                    +{item.tags.length - 3}
                  </Text>
                )}
              </View>
            )}

            {/* Notes preview */}
            {item.notes && (
              <Text numberOfLines={1} style={styles.notesText}>
                <Ionicons
                  color={colors.textSecondary}
                  name="document-text-outline"
                  size={10}
                />{' '}
                {item.notes}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {!isVisited && (
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.markVisitedButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleMarkAsVisited(item);
                }}
              >
                <Ionicons
                  color={colors.success}
                  name="checkmark-outline"
                  size={18}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditItem(item);
              }}
            >
              <Ionicons color="#2196F3" name="create-outline" size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.removeButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRemoveItem(item);
              }}
            >
              <Ionicons color={colors.primary} name="trash-outline" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons color={colors.textSecondary} name="bookmark-outline" size={64} />
      <Text style={styles.emptyTitle}>Your Bucket List is Empty</Text>
      <Text style={styles.emptyDescription}>
        Start exploring restaurants and save your favorites to build your bucket
        list!
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => router.push('/(tabs)/search')}
      >
        <Text style={styles.exploreButtonText}>Explore Restaurants</Text>
      </TouchableOpacity>
    </View>
  );

  // If we're fetching data for the first time, show loading indicator
  if (loading && bucketListItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bucket List</Text>
          <View style={styles.headerStats}>
            <Ionicons color={colors.success} name="bookmark" size={16} />
            <Text style={styles.statsText}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading bucket list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If there's an error and no items, show error state
  if (error && bucketListItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bucket List</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            color={colors.primary}
            name="alert-circle-outline"
            size={64}
          />
          <Text style={styles.errorText}>Error loading bucket list</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // @ts-ignore
              dispatch(fetchBucketList());
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bucket List</Text>
        <View style={styles.headerActions}>
          <View style={styles.headerStats}>
            <Ionicons color={colors.success} name="bookmark" size={16} />
            <Text style={styles.statsText}>{bucketListItems.length} saved</Text>
          </View>
          {bucketListItems.length > 0 && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={async () => {
                if (isBranchAvailable) {
                  const link = await createAndShareBucketListLink({
                    channel: 'app_share',
                    feature: 'bucket_list',
                    campaign: 'bucket_list_share',
                  });
                  // You can add a share dialog here
                  logger.info('Share this link:', link);
                }
              }}
            >
              <Ionicons color={colors.primary} name="share-outline" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bucket List */}
      <FlatList
        contentContainerStyle={styles.listContainer}
        data={bucketListItems}
        keyExtractor={(item, index) => item.fsq_id + index.toString()}
        ListEmptyComponent={renderEmptyList}
        refreshing={loading}
        renderItem={renderBucketListItem}
        showsVerticalScrollIndicator={false}
        onRefresh={() => {
          // @ts-ignore
          dispatch(fetchBucketList());
        }}
      />

      {/* Edit Modal */}
      <EditModal
        item={currentEditItem}
        visible={editModalVisible}
        onClose={handleCloseEditModal}
        onSave={handleSaveEdit}
        styles={styles}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  itemContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitedItemContainer: {
    opacity: 0.8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  itemContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  venueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.grey5,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.grey5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  highPriority: {
    backgroundColor: '#FF5252',
  },
  mediumPriority: {
    backgroundColor: '#FFC107',
  },
  lowPriority: {
    backgroundColor: '#8BC34A',
  },
  visitedOverlay: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 2,
  },
  detailsContainer: {
    flex: 1,
    marginRight: 8,
  },
  venueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  visitedText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  venueCategory: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },
  venueAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 2,
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.isDark ? colors.success + '20' : colors.success + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  visitedBadgeText: {
    fontSize: 10,
    color: colors.success,
    marginLeft: 2,
    fontWeight: '600',
  },
  plannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  plannedBadgeText: {
    fontSize: 10,
    color: '#2196F3',
    marginLeft: 2,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    alignItems: 'center',
  },
  tagBadge: {
    backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.1)' : '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  moreTagsText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  markVisitedButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 5,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.grey4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.grey4,
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  selectedPriority: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  priorityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedPriorityText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey4,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
  },
  saveButtonText: {
    color: colors.isDark ? colors.text : '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default BucketListScreen;
