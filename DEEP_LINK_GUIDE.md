# Shareable Deep Deferred Links Guide

This guide explains how to use the new shareable deep deferred links feature that allows users to share restaurant venues and automatically save them to their bucket list when the link is opened.

## Overview

The deep link system supports two types of venue links:

1. **View Links**: Navigate to a venue detail screen without auto-saving
2. **Save Links**: Navigate to a venue detail screen and automatically save it to the bucket list

## URL Format

### Basic Format

```
dinnafind://restaurant/{venueId}?save=true
```

### Examples

- **View only**: `dinnafind://restaurant/4b0c8c70f964a520c8a523e3`
- **Auto-save**: `dinnafind://restaurant/4b0c8c70f964a520c8a523e3?save=true`

## How It Works

1. **Link Generation**: Create a deep link with a venue ID and optional `save=true` parameter
2. **Deferred Processing**: The link is stored using the deferred deep link mechanism
3. **App Launch**: When the app opens, it processes the stored link
4. **Navigation**: Routes to the venue detail screen
5. **Auto-Save**: If `save=true` is present, automatically saves the venue to the user's bucket list

## Implementation Details

### Deep Link Parsing

The system parses deep links in `hooks/useDeferredDeepLink.ts`:

- Extracts venue ID from the URL path
- Parses query parameters for the `save` flag
- Routes to the detail screen with appropriate parameters

### Auto-Save Logic

The auto-save functionality is implemented in `components/screens/DetailScreen/index.tsx`:

- Checks for `autoSave=true` parameter
- Automatically dispatches the save action
- Shows a confirmation message
- Refreshes the bucket list

### Utility Functions

Helper functions are available in `utils/deepLinkUtils.ts`:

- `generateVenueDeepLink(venueId, autoSave)`: Generate any type of venue link
- `generateVenueSaveDeepLink(venueId)`: Generate auto-save link
- `generateVenueViewDeepLink(venueId)`: Generate view-only link
- `parseVenueDeepLink(url)`: Parse a venue deep link

## Usage Examples

### Generating Links Programmatically

```typescript
import { generateVenueSaveDeepLink, generateVenueViewDeepLink } from '@/utils/deepLinkUtils';

// Generate a link that will auto-save the venue
const saveLink = generateVenueSaveDeepLink('4b0c8c70f964a520c8a523e3');
// Result: dinnafind://restaurant/4b0c8c70f964a520c8a523e3?save=true

// Generate a link that will just view the venue
const viewLink = generateVenueViewDeepLink('4b0c8c70f964a520c8a523e3');
// Result: dinnafind://restaurant/4b0c8c70f964a520c8a523e3
```

### Sharing Venues

The detail screen now includes a share button that generates a deep link:

```typescript
const handleShareVenue = () => {
  const venueId = venue?.id || venue?.fsq_id;
  if (venueId) {
    const deepLink = `dinnafind://restaurant/${venueId}?save=true`;
    // Share the deep link with users
  }
};
```

### Testing Deep Links

Use the test screen at `/test-venue-deep-links` to:

- Generate sample deep links
- Test the deferred link mechanism
- Verify auto-save functionality

## Testing

### Manual Testing

1. Navigate to Profile → Development Tools → Test Venue Deep Links
2. Enter a venue ID or use the default
3. Generate and test different types of links
4. Verify that auto-save works correctly

### Automated Testing

The deep link parsing can be tested with:

```typescript
import { parseVenueDeepLink } from '@/utils/deepLinkUtils';

const result = parseVenueDeepLink('dinnafind://restaurant/123?save=true');
// Result: { venueId: '123', autoSave: true }
```

## Integration with External Services

### Branch.io Integration

For production use, consider integrating with Branch.io for:

- Universal links (iOS/Android)
- Web fallbacks
- Analytics and attribution
- A/B testing

### Example Branch.io Implementation

```javascript
// Generate a Branch link
branch.link(
  {
    data: {
      venueId: '4b0c8c70f964a520c8a523e3',
      autoSave: true,
    },
    feature: 'venue_share',
    channel: 'app',
  },
  (err, link) => {
    // Share the Branch link
  }
);
```

## Security Considerations

- Validate venue IDs before processing
- Implement rate limiting for auto-save actions
- Consider user authentication requirements
- Sanitize deep link parameters

## Troubleshooting

### Common Issues

1. **Link not working**: Ensure the app is installed and the scheme is registered
2. **Auto-save not working**: Check that the venue ID is valid and the user is authenticated
3. **Navigation issues**: Verify the deep link parsing logic

### Debug Information

- Check console logs for deep link processing
- Use the test screens to verify functionality
- Monitor Redux state for save actions

## Future Enhancements

- Support for multiple venues in a single link
- Custom messaging in deep links
- Analytics tracking for link usage
- Social media integration
- QR code generation for physical sharing
