/**
 * Google Maps API Integration
 * Address validation, geocoding, and place details
 */

import { logger } from '@/utils/logger';

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: AddressComponent[];
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  place_id: string;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  address_components: AddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
}

export interface ValidatedAddress {
  isValid: boolean;
  formattedAddress?: string;
  components?: {
    street?: string;
    streetNumber?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    zipCode?: string;
    country?: string;
    countryCode?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeId?: string;
  error?: string;
}

export interface PlaceAutocompleteResult {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

/**
 * Check if Google Maps API is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

/**
 * Get Google Maps API key
 */
function getApiKey(): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
  }
  return apiKey;
}

/**
 * Validate and geocode an address
 */
export async function validateAddress(address: string): Promise<ValidatedAddress> {
  if (!isGoogleMapsConfigured()) {
    return {
      isValid: false,
      error: 'Google Maps API not configured',
    };
  }

  try {
    const apiKey = getApiKey();
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        isValid: false,
        error: data.status === 'ZERO_RESULTS' ? 'Address not found' : `Geocoding failed: ${data.status}`,
      };
    }

    const result: GeocodeResult = data.results[0];
    const components = parseAddressComponents(result.address_components);

    return {
      isValid: true,
      formattedAddress: result.formatted_address,
      components,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      placeId: result.place_id,
    };
  } catch (error) {
    logger.error('Address validation error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Parse address components from Google Maps response
 */
function parseAddressComponents(components: AddressComponent[]): ValidatedAddress['components'] {
  const parsed: ValidatedAddress['components'] = {};

  for (const component of components) {
    if (component.types.includes('street_number')) {
      parsed.streetNumber = component.long_name;
    } else if (component.types.includes('route')) {
      parsed.street = component.long_name;
    } else if (component.types.includes('locality')) {
      parsed.city = component.long_name;
    } else if (component.types.includes('administrative_area_level_1')) {
      parsed.state = component.long_name;
      parsed.stateCode = component.short_name;
    } else if (component.types.includes('postal_code')) {
      parsed.zipCode = component.long_name;
    } else if (component.types.includes('country')) {
      parsed.country = component.long_name;
      parsed.countryCode = component.short_name;
    }
  }

  // Combine street number and route
  if (parsed.streetNumber && parsed.street) {
    parsed.street = `${parsed.streetNumber} ${parsed.street}`;
  }

  return parsed;
}

/**
 * Get place autocomplete suggestions
 */
export async function getPlaceAutocomplete(
  input: string,
  types: string[] = ['address'],
  componentRestrictions?: { country: string | string[] }
): Promise<PlaceAutocompleteResult[]> {
  if (!isGoogleMapsConfigured()) {
    return [];
  }

  if (!input || input.length < 3) {
    return [];
  }

  try {
    const apiKey = getApiKey();
    const encodedInput = encodeURIComponent(input);
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedInput}&key=${apiKey}`;

    if (types.length > 0) {
      url += `&types=${types.join('|')}`;
    }

    if (componentRestrictions?.country) {
      const countries = Array.isArray(componentRestrictions.country)
        ? componentRestrictions.country.join('|')
        : componentRestrictions.country;
      url += `&components=country:${countries}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.predictions) {
      return [];
    }

    return data.predictions.map((prediction: {
      description: string;
      place_id: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
    }) => ({
      description: prediction.description,
      placeId: prediction.place_id,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text,
    }));
  } catch (error) {
    logger.error('Autocomplete error:', error);
    return [];
  }
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId: string): Promise<ValidatedAddress | null> {
  if (!isGoogleMapsConfigured()) {
    return null;
  }

  try {
    const apiKey = getApiKey();
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      return null;
    }

    const result: PlaceDetails = data.result;
    const components = parseAddressComponents(result.address_components);

    return {
      isValid: true,
      formattedAddress: result.formatted_address,
      components,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      placeId: result.place_id,
    };
  } catch (error) {
    logger.error('Place details error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ValidatedAddress | null> {
  if (!isGoogleMapsConfigured()) {
    return null;
  }

  try {
    const apiKey = getApiKey();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result: GeocodeResult = data.results[0];
    const components = parseAddressComponents(result.address_components);

    return {
      isValid: true,
      formattedAddress: result.formatted_address,
      components,
      coordinates: { lat, lng },
      placeId: result.place_id,
    };
  } catch (error) {
    logger.error('Reverse geocode error:', error);
    return null;
  }
}

/**
 * Calculate distance between two addresses
 */
export async function calculateDistance(
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<{
  distance: { text: string; value: number };
  duration: { text: string; value: number };
} | null> {
  if (!isGoogleMapsConfigured()) {
    return null;
  }

  try {
    const apiKey = getApiKey();
    const encodedOrigin = encodeURIComponent(origin);
    const encodedDestination = encodeURIComponent(destination);
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedOrigin}&destinations=${encodedDestination}&mode=${mode}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows || data.rows.length === 0) {
      return null;
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      return null;
    }

    return {
      distance: element.distance,
      duration: element.duration,
    };
  } catch (error) {
    logger.error('Distance calculation error:', error);
    return null;
  }
}

/**
 * Get nearby places (schools, parks, etc.)
 */
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  type: string,
  radius: number = 5000
): Promise<Array<{
  name: string;
  address: string;
  distance: number;
  rating?: number;
  placeId: string;
}>> {
  if (!isGoogleMapsConfigured()) {
    return [];
  }

  try {
    const apiKey = getApiKey();
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    return data.results.map((place: {
      name: string;
      vicinity: string;
      geometry: { location: { lat: number; lng: number } };
      rating?: number;
      place_id: string;
    }) => {
      // Calculate distance using Haversine formula
      const distance = calculateHaversineDistance(
        lat,
        lng,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      return {
        name: place.name,
        address: place.vicinity,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        rating: place.rating,
        placeId: place.place_id,
      };
    });
  } catch (error) {
    logger.error('Nearby places error:', error);
    return [];
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get static map image URL
 */
export function getStaticMapUrl(
  lat: number,
  lng: number,
  width: number = 600,
  height: number = 400,
  zoom: number = 15,
  markers?: Array<{ lat: number; lng: number; label?: string; color?: string }>
): string {
  if (!isGoogleMapsConfigured()) {
    return '';
  }

  const apiKey = getApiKey();
  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&key=${apiKey}`;

  // Add markers
  if (markers && markers.length > 0) {
    markers.forEach((marker) => {
      const label = marker.label ? `label:${marker.label}|` : '';
      const color = marker.color ? `color:${marker.color}|` : '';
      url += `&markers=${color}${label}${marker.lat},${marker.lng}`;
    });
  } else {
    // Add default marker at center
    url += `&markers=color:red|${lat},${lng}`;
  }

  return url;
}

/**
 * Load Google Maps JavaScript API
 */
export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.google !== 'undefined' && window.google.maps) {
      resolve();
      return;
    }

    if (!isGoogleMapsConfigured()) {
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${getApiKey()}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Maps Autocomplete widget
 */
export async function initializeAutocomplete(
  inputElement: HTMLInputElement,
  onPlaceSelected: (place: ValidatedAddress) => void,
  options?: {
    types?: string[];
    componentRestrictions?: { country: string | string[] };
  }
): Promise<void> {
  if (!isGoogleMapsConfigured()) {
    throw new Error('Google Maps API not configured');
  }

  // Load Google Maps script if not already loaded
  await loadGoogleMapsScript();

  const autocomplete = new google.maps.places.Autocomplete(inputElement, {
    types: options?.types || ['address'],
    componentRestrictions: options?.componentRestrictions,
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) {
      return;
    }

    const components = place.address_components
      ? parseAddressComponents(place.address_components as AddressComponent[])
      : {};

    onPlaceSelected({
      isValid: true,
      formattedAddress: place.formatted_address,
      components,
      coordinates: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
      placeId: place.place_id,
    });
  });
}