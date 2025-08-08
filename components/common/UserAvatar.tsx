import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '@/theme';

interface UserAvatarProps {
  user: {
    photoUrl?: string;
    displayName?: string;
    email?: string;
  } | null;
  size?: number;
  style?: any;
}

export function UserAvatar({ user, size = 80, style }: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    // Reset image error when user or photoUrl changes
    setImageError(false);
  }, [user]);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return name[0]?.toUpperCase() || '';
    }

    if (email) {
      return email[0]?.toUpperCase() || '';
    }

    return '?';
  };

  const getBackgroundColor = (name?: string, email?: string) => {
    const text = (name || email || '').toLowerCase();
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: getBackgroundColor(user?.displayName, user?.email),
    },
    style,
  ];

  const textStyle = [
    styles.initials,
    {
      fontSize: size * 0.4,
      color: 'white',
    },
  ];

  // If we have a photo URL and no image error, show the image
  if (user?.photoUrl && !imageError) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: user.photoUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          testID="user-avatar-image"
          onError={() => {
            setImageError(true);
          }}
        />
      </View>
    );
  }

  // Show initials (either no photo URL or image failed to load)
  return (
    <View style={containerStyle}>
      <Text style={textStyle} testID="user-avatar-initials">
        {getInitials(user?.displayName, user?.email)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  initials: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
